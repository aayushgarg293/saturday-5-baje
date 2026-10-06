import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import type { Cricket, Shot } from "../people/cricket";
import { bat } from "../people/props";
import { say } from "../ui/caption";

/**
 * Batting in the gali with the kids: walk in, E. "Bhaiya, ek over?" The
 * batter gives you his bat and watches from the wall; you stand at the
 * brick-and-stick stumps and the bowler bowls to you.
 *
 * Space (or a click) swings. Your timing, as the ball reaches you, decides
 * the shot (people/cricket.ts): spot on, a four or a six (out into the
 * street); a little off, a run or two; late, an edge off the wall that's
 * caught one-handed ("one tip one hand", out, gully rules); a miss, and it
 * may hit the stumps. Six balls, or until you're out. Then they want their
 * bat back.
 *
 * Like the pani puri, it moves the camera while it lasts; Q gives the bat back.
 */

type Stage = "off" | "arriving" | "batting" | "leaving";

/** What the kids shout after each shot, and the runs it's worth. */
const SHOTS: Record<Shot, { runs: number; out: boolean; shout: string }> = {
  six: { runs: 6, out: false, shout: "CHHAKKAAA!!! …ab ball laake do, bhaiya!" },
  four: { runs: 4, out: false, shout: "Chauka!!" },
  two: { runs: 2, out: false, shout: "Bhaago bhaago! Do run!" },
  one: { runs: 1, out: false, shout: "Ek run!" },
  caught: { runs: 0, out: true, shout: "One tip one hand! OUT!!!" },
  bowled: { runs: 0, out: true, shout: "Bowled! Out out out!" },
  beaten: { runs: 0, out: false, shout: "Arre bhaiya… dekh ke!" },
};
const BALLS = 6;
const EASE = 0.8;
const TURN = { yaw: 0.7, up: 0.4, down: 0.4 };
const MOUSE = 0.0022;
/** Your swing, seconds; your bat in hand (scaled up a little from the kids' bat). */
const SWING = 0.28;

export class CricketGame {
  stage: Stage = "off";
  private balls = 0;
  private runs = 0;
  private yaw = 0;
  private pitch = 0;
  private baseYaw = 0;
  private basePitch = 0;
  private ease: { from: THREE.Vector3; fromLook: [number, number]; t: number; back: boolean } | null = null;
  private returnTo = new THREE.Vector3();
  private bat = bat();
  private swingT = -1; // seconds into your swing (−1: not swinging)

  constructor(
    private camera: THREE.PerspectiveCamera,
    private player: Player,
    private input: Input,
    private gali: Cricket,
    scene: THREE.Scene,
  ) {
    this.bat.scale.setScalar(1.3);
    this.bat.visible = false;
    scene.add(this.bat);
    gali.you.onShot = (shot) => this.shot(shot);
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  canStart(): boolean {
    const p = this.player.pos, m = this.gali.you.middle;
    return !this.active && !this.player.frozen && this.gali.you.here() && p.y < 0.5 && Math.hypot(p.x - m.x, p.z - m.z) < 3;
  }

  prompt(): string | null {
    if (this.canStart()) return "[E] ek over khelo";
    if (this.stage === "batting") return `[Space] or [Click] maaro!    [Q] bas        ${this.runs} run, ${Math.min(this.balls, BALLS)}/${BALLS} ball`;
    return null;
  }

  start() {
    if (!this.canStart()) return;
    this.stage = "arriving";
    this.balls = 0;
    this.runs = 0;
    this.returnTo.copy(this.player.pos);
    this.player.frozen = true;
    [this.baseYaw, this.basePitch] = look(this.gali.you.eye, this.gali.you.bowler);
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    this.ease = { from: this.camera.position.clone(), fromLook: [this.camera.rotation.y, this.camera.rotation.x], t: 0, back: false };
    say("Kids", "Bhaiya, ek over! Naali mein gaya to out, diwar se one tip one hand!", 4);
  }

  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "batting") {
      if (code === "Space") this.swing();
      if (code === "KeyQ") this.finish(`Bas? Theek hai. ${this.runs} run banaye!`);
    }
    return true;
  }

  click() {
    if (this.stage === "batting") this.swing();
  }

  update(dt: number) {
    if (!this.active) return;
    if (this.ease) {
      const e = this.ease;
      e.t = Math.min(1, e.t + dt / EASE);
      const k = e.t * e.t * (3 - 2 * e.t);
      const to = e.back ? this.returnTo.clone().setY(1.55) : this.gali.you.eye;
      this.camera.position.lerpVectors(e.from, to, k);
      this.camera.rotation.set(THREE.MathUtils.lerp(e.fromLook[1], e.back ? 0 : this.basePitch, k), lerpAngle(e.fromLook[0], this.baseYaw, k), 0);
      if (e.t >= 1) {
        this.ease = null;
        if (e.back) {
          this.player.place(this.returnTo.x, this.returnTo.z, this.baseYaw, 0);
          this.player.frozen = false;
          this.stage = "off";
        } else {
          this.stage = "batting";
          this.gali.you.batting(true);
          this.bat.visible = true;
        }
      }
      return;
    }
    if (this.stage !== "batting") return;

    // at the crease: the mouse turns your head a little
    const { dx, dy } = this.input.takeMouseMovement();
    this.yaw = this.baseYaw + THREE.MathUtils.clamp(angleDiff(this.yaw - dx * MOUSE, this.baseYaw), -TURN.yaw, TURN.yaw);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE, this.basePitch - TURN.down, this.basePitch + TURN.up);
    this.camera.position.copy(this.gali.you.eye);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.holdBat(dt);
  }

  /** Your bat, in your hands at the bottom right of the view; swinging across when you swing. */
  private holdBat(dt: number) {
    if (this.swingT >= 0) {
      this.swingT += dt;
      if (this.swingT > SWING + 0.35) this.swingT = -1;
    }
    const k = this.swingT < 0 ? 0 : this.swingT < SWING ? smooth(this.swingT / SWING) : 1 - smooth(Math.min(1, (this.swingT - SWING) / 0.35));
    // held down by your right side, blade toward the ground; swung through to the left, in front
    const hands = new THREE.Vector3(0.2 - 0.34 * k, -0.2 + 0.06 * k, -0.45 - 0.1 * k);
    const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, -0.3));
    const through = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.5, 0.3, 1.3));
    const q = rest.slerp(through, k);
    this.bat.position.copy(hands.applyQuaternion(this.camera.quaternion).add(this.camera.position));
    this.bat.quaternion.copy(this.camera.quaternion).multiply(q);
  }

  private swing() {
    if (this.swingT >= 0) return;
    this.swingT = 0;
    this.gali.you.swing();
  }

  /** A ball played: the kids shout; out, or the over's done, and they want the bat back. */
  private shot(shot: Shot) {
    if (this.stage !== "batting") return;
    const s = SHOTS[shot];
    this.balls++;
    this.runs += s.runs;
    say("Kids", s.shout, 2.6);
    if (s.out) setTimeout(() => this.finish(`Out ho gaye bhaiya! ${this.runs} run. Bat do ab.`), 2400);
    else if (this.balls >= BALLS) setTimeout(() => this.finish(`Over khatam! ${this.runs} run banaye. Ab hamari baari!`), 2600);
  }

  /** They want their bat back: you give it, and step back to where you were. */
  private finish(line: string) {
    if (this.stage !== "batting") return;
    this.stage = "leaving";
    say("Kids", line, 3.5);
    this.gali.you.batting(false);
    this.bat.visible = false;
    this.ease = { from: this.camera.position.clone(), fromLook: [this.camera.rotation.y, this.camera.rotation.x], t: 0, back: true };
  }
}

const smooth = (k: number) => k * k * (3 - 2 * k);

/** The yaw and pitch that look from `from` to `to` (the camera looks down −z). */
function look(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const d = to.clone().sub(from);
  return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))];
}

function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function lerpAngle(a: number, b: number, k: number): number {
  return a + angleDiff(b, a) * k;
}
