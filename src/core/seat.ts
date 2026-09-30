import * as THREE from "three";
import type { Input } from "./input";
import type { Player } from "./player";

/**
 * Sitting down at your computer, and looking up at the clock.
 *
 * SITTING. When you're standing in your booth, E sits you down: the view
 * eases down into the chair and leans in toward the screen. Seated, you
 * can't walk, and the mouse only turns your head so far (you're sitting at
 * a desk). E again, and you get up and stand behind the chair.
 *
 * THE CLOCK. T turns your view up to the wall clock for a few seconds (to
 * see how much time has gone), then back to where you were looking. Works
 * seated or standing.
 *
 * LEANING IN. Seated, once the computer is connected, a click leans you in
 * until the screen fills your view; then the desktop (an HTML page, see
 * desktop/desktop.ts) takes over. Esc leans you back.
 *
 * While any of this is happening the player is `frozen` and this moves the
 * camera itself.
 */

/** Places for sitting, in the world: where the eyes go, what they face, where you stand up to, the clock. */
export type SeatSpots = {
  /** Your eyes, seated. */
  eye: THREE.Vector3;
  /** The middle of your screen (you face it). */
  screen: THREE.Vector3;
  /** Where you stand when you get up (behind the chair), and the floor's height there. */
  stand: THREE.Vector3;
  /** The chair, on the floor: you can sit when you're standing this close to it. */
  chair: THREE.Vector3;
  /** The wall clock. */
  clock: THREE.Vector3;
};

/** How close to the chair you must be to sit, metres. */
const REACH = 1.0;
/** Seated, how far the mouse can turn your head from the screen: sideways, and up/down (radians). */
const TURN = { yaw: 1.0, up: 0.55, down: 0.5 };
const MOUSE = 0.0022;
/** Seconds: easing into and out of the chair; the glance at the clock (turn up, hold, turn back). */
const SIT_TIME = 0.9;
const GLANCE = { turn: 0.6, hold: 2.6 };
/** Looking at the clock, the view narrows onto it (a zoom), so its hands can be read from across the hall: field of view, degrees. */
const GLANCE_FOV = 26;
/** Leaning in, your eyes stop this far from the screen (metres): close enough that it fills the view. */
const LEAN_GAP = 0.3;

type Move = { from: THREE.Vector3; to: THREE.Vector3; fromLook: [number, number]; toLook: [number, number]; t: number; done: () => void };

export class Seat {
  seated = false;
  /** Leaned in to the screen (the desktop is up). */
  leaned = false;
  /** Called the moment you've sat down (the computer connects). */
  onSit: () => void = () => {};
  /** Called once you've leaned in close (the desktop shows). */
  onLeanIn: () => void = () => {};
  private move: Move | null = null;
  private yaw = 0;
  private pitch = 0;
  private baseYaw = 0;
  private basePitch = 0;
  private glance = -1; // seconds into a glance at the clock (−1: not glancing)
  private eyes = new THREE.Vector3();
  private normalFov = 65;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private player: Player,
    private input: Input,
    readonly spots: SeatSpots,
  ) {}

  /** Can you sit down from where you are? */
  canSit(): boolean {
    const p = this.player.pos, c = this.spots.chair;
    return !this.seated && !this.move && this.glance < 0 && Math.abs(p.y - c.y) < 0.5 && Math.hypot(p.x - c.x, p.z - c.z) < REACH;
  }

  sitDown() {
    if (!this.canSit()) return;
    this.player.frozen = true;
    const [yaw, pitch] = look(this.spots.eye, this.spots.screen);
    this.baseYaw = yaw;
    this.basePitch = pitch;
    this.start(this.spots.eye, [yaw, pitch], () => {
      this.seated = true;
      this.yaw = yaw;
      this.pitch = pitch;
      this.onSit();
    });
  }

  standUp() {
    if (!this.seated || this.leaned || this.move || this.glance >= 0) return;
    this.seated = false;
    const standEye = this.spots.stand.clone().setY(this.spots.stand.y + 1.55);
    const [yaw] = look(this.spots.eye, this.spots.screen);
    this.start(standEye, [yaw, -0.15], () => {
      const s = this.spots.stand;
      this.player.place(s.x, s.z, yaw, -0.15, s.y);
      this.player.frozen = false;
    });
  }

  /** Lean in to the screen (seated). */
  leanIn() {
    if (!this.seated || this.leaned || this.move || this.glance >= 0) return;
    const { eye, screen } = this.spots;
    const to = eye.clone().sub(screen).setLength(LEAN_GAP).add(screen);
    this.start(to, look(eye, screen), () => {
      this.leaned = true;
      this.onLeanIn();
    });
  }

  /** Lean back into the chair, facing the screen. */
  leanBack() {
    if (!this.leaned || this.move) return;
    this.leaned = false;
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    this.start(this.spots.eye, [this.baseYaw, this.basePitch], () => {});
  }

  /** Look up at the clock for a moment. */
  lookAtClock() {
    if (this.move || this.glance >= 0 || this.leaned) return;
    if (!this.seated) {
      // standing: take over from the player for the glance
      this.player.frozen = true;
      this.yaw = this.player.yaw;
      this.pitch = this.player.pitch;
    }
    this.eyes.copy(this.camera.position);
    this.normalFov = this.camera.fov;
    this.glance = 0;
  }

  update(dt: number) {
    const cam = this.camera;
    // easing into or out of the chair
    if (this.move) {
      const m = this.move;
      m.t = Math.min(1, m.t + dt / SIT_TIME);
      const k = m.t * m.t * (3 - 2 * m.t);
      cam.position.lerpVectors(m.from, m.to, k);
      cam.rotation.set(THREE.MathUtils.lerp(m.fromLook[1], m.toLook[1], k), lerpAngle(m.fromLook[0], m.toLook[0], k), 0);
      if (m.t >= 1) {
        this.move = null;
        m.done();
      }
      return;
    }
    if (!this.seated && this.glance < 0) return; // the player is in charge
    if (this.leaned) return; // (held close to the screen, where leaning in left the camera)

    // seated: the mouse turns your head, within limits
    if (this.seated && this.glance < 0) {
      const { dx, dy } = this.input.takeMouseMovement();
      this.yaw = this.baseYaw + THREE.MathUtils.clamp(angleDiff(this.yaw - dx * MOUSE, this.baseYaw), -TURN.yaw, TURN.yaw);
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE, this.basePitch - TURN.down, this.basePitch + TURN.up);
    }
    let yaw = this.yaw, pitch = this.pitch;

    // a glance at the clock: turn to it, hold, turn back
    if (this.glance >= 0) {
      this.input.takeMouseMovement(); // (ignore the mouse meanwhile)
      this.glance += dt;
      const g = this.glance, total = GLANCE.turn * 2 + GLANCE.hold;
      const w = g < GLANCE.turn ? g / GLANCE.turn : g < GLANCE.turn + GLANCE.hold ? 1 : Math.max(0, (total - g) / GLANCE.turn);
      const k = w * w * (3 - 2 * w);
      const [cy, cp] = look(this.seated ? this.spots.eye : this.eyes, this.spots.clock);
      yaw = lerpAngle(yaw, cy, k);
      pitch = THREE.MathUtils.lerp(pitch, cp, k);
      cam.fov = THREE.MathUtils.lerp(this.normalFov, GLANCE_FOV, k * k); // (the zoom comes in as the turn finishes)
      cam.updateProjectionMatrix();
      if (g >= total) {
        this.glance = -1;
        cam.fov = this.normalFov;
        cam.updateProjectionMatrix();
        if (!this.seated) this.player.frozen = false;
      }
    }

    // where the eyes are: in the chair (breathing a little), or where you stood
    if (this.seated) cam.position.copy(this.spots.eye).setY(this.spots.eye.y + Math.sin(performance.now() / 700) * 0.004);
    else cam.position.copy(this.eyes);
    cam.rotation.set(pitch, yaw, 0);
  }

  private start(to: THREE.Vector3, toLook: [number, number], done: () => void) {
    this.move = {
      from: this.camera.position.clone(),
      to: to.clone(),
      fromLook: [this.camera.rotation.y, this.camera.rotation.x],
      toLook,
      t: 0,
      done,
    };
  }
}

/** Yaw and pitch (the player's convention) to look from `from` at `to`. */
function look(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  return [Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))];
}
/** The shortest turn from angle `b` to `a`. */
function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
function lerpAngle(a: number, b: number, k: number): number {
  return a + angleDiff(b, a) * k;
}
