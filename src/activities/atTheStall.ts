import * as THREE from "three";
import type { Input } from "../core/input";
import { toon } from "../render/toon";

/**
 * What every "eat something at a stall" moment shares (activities/kachori.ts,
 * chai.ts, jalebi.ts): stepping up to the stall and back, looking around a
 * little while you stand there, your arm holding out the dona (or the glass,
 * or the paper), and steam off something hot.
 *
 * The pani puri cart (activities/paniPuri.ts) came first and has its own copy
 * of these; it's left as it is.
 */

/** How far the mouse can turn your head from facing the stall, radians. */
export type Turn = { yaw: number; up: number; down: number };

/** Your eye height standing, metres; how long stepping up and back takes, seconds. */
const EYE = 1.55;
const EASE = 0.8;
/** Mouse sensitivity, radians per pixel (the same as walking). */
const MOUSE = 0.0022;

/**
 * The camera while you stand at a stall: it eases from where you were to your
 * place in front of the stall, lets the mouse turn your head a little, and
 * eases half a step back when you leave. While you're there, the player can't
 * walk (`player.frozen`, set by the activity).
 */
export class StallView {
  /** Your eyes, standing at the stall. */
  readonly eye = new THREE.Vector3();
  /** The way you face the stall (yaw) and look down at the work (pitch). */
  baseYaw = 0;
  basePitch = 0;
  private yaw = 0;
  private pitch = 0;
  private stand = new THREE.Vector3();
  private ease: { from: THREE.Vector3; fromLook: [number, number]; t: number; back: boolean } | null = null;
  /** Leaning in (0–1): your head goes down and forward a little, toward what's in your hand. */
  private lean = 0;
  private leanTo = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: Input,
    private turn: Turn,
  ) {}

  /** Still stepping up or back? */
  get easing(): boolean {
    return this.ease !== null;
  }

  /** Step up to `stand` (on the ground), facing `lookAt`. */
  arrive(stand: THREE.Vector3, lookAt: THREE.Vector3) {
    this.stand.copy(stand);
    this.eye.copy(stand).setY(stand.y + EYE);
    [this.baseYaw, this.basePitch] = look(this.eye, lookAt);
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    this.lean = this.leanTo = 0;
    this.startEase(false);
  }

  /** Step half a metre back from the stall. */
  leave() {
    this.leanTo = 0;
    this.startEase(true);
  }

  /** Where you stand once you've stepped back. */
  stepBack(): THREE.Vector3 {
    return this.stand.clone().add(back(this.baseYaw, 0.5));
  }

  /** Lean in toward your hand (blowing on a hot kachori), or straighten up. */
  leanIn(on: boolean) {
    this.leanTo = on ? 1 : 0;
  }

  /**
   * Each frame. Returns "arrived" on the frame the step up finishes, "left" on the frame the step back
   * finishes, otherwise null. `bob` moves your eyes up and down a touch (chewing).
   */
  update(dt: number, bob = 0): "arrived" | "left" | null {
    if (this.ease) {
      const e = this.ease;
      e.t = Math.min(1, e.t + dt / EASE);
      const k = e.t * e.t * (3 - 2 * e.t);
      const to = e.back ? this.stepBack().setY(this.stand.y + EYE) : this.eye;
      this.camera.position.lerpVectors(e.from, to, k);
      this.camera.rotation.set(THREE.MathUtils.lerp(e.fromLook[1], e.back ? -0.1 : this.basePitch, k), lerpAngle(e.fromLook[0], this.baseYaw, k), 0);
      if (e.t < 1) return null;
      this.ease = null;
      return e.back ? "left" : "arrived";
    }
    // the mouse turns your head, within limits
    const { dx, dy } = this.input.takeMouseMovement();
    this.yaw = this.baseYaw + THREE.MathUtils.clamp(angleDiff(this.yaw - dx * MOUSE, this.baseYaw), -this.turn.yaw, this.turn.yaw);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE, this.basePitch - this.turn.down, this.basePitch + this.turn.up);
    this.lean += (this.leanTo - this.lean) * (1 - Math.exp(-10 * dt));
    const ahead = new THREE.Vector3(-Math.sin(this.baseYaw), 0, -Math.cos(this.baseYaw));
    this.camera.position.copy(this.eye).addScaledVector(ahead, this.lean * 0.12).setY(this.eye.y + bob - this.lean * 0.1);
    this.camera.rotation.set(this.pitch - this.lean * 0.15, this.yaw, 0);
    return null;
  }

  /** A point just in front of your mouth, where food goes in. */
  mouth(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.camera.position).add(new THREE.Vector3(0, -0.12, -0.15).applyEuler(this.camera.rotation));
  }

  private startEase(back: boolean) {
    this.ease = { from: this.camera.position.clone(), fromLook: [this.camera.rotation.y, this.camera.rotation.x], t: 0, back };
  }
}

/**
 * Your arm, from the bottom right of the view out to your hand: a shirt sleeve to the elbow, the forearm,
 * and a cupped hand. `place` puts the hand at a point in the world.
 */
export class YourArm {
  readonly group = new THREE.Group();
  private sleeve: THREE.Mesh;
  private forearm: THREE.Mesh;
  private palm: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 1, 8).translate(0, 0.5, 0), toon({ color: 0x3b6fb6 }));
    this.forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 1, 8).translate(0, 0.5, 0), toon({ color: 0x9a6644 }));
    this.palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6).scale(1, 0.45, 1.1), toon({ color: 0x9a6644 }));
    this.group.add(this.sleeve, this.forearm, this.palm);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Reach from your shoulder (below and right of `eye`, facing `yaw`) to `hand`. */
  place(eye: THREE.Vector3, yaw: number, hand: THREE.Vector3) {
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const ahead = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const shoulder = eye.clone().addScaledVector(right, 0.2).add(new THREE.Vector3(0, -0.3, 0));
    const elbow = eye.clone().addScaledVector(right, 0.24).addScaledVector(ahead, 0.18).add(new THREE.Vector3(0, -0.62, 0));
    span(this.sleeve, shoulder, elbow);
    span(this.forearm, elbow, hand);
    this.palm.position.copy(hand);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }
}

/** Stretch a unit-tall piece (built standing up from its base) from `from` to `to`. */
function span(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  m.position.copy(from);
  m.scale.set(1, from.distanceTo(to), 1);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
}

/** A dona: a little bowl pressed from leaves. Turned like a pot from its outline, so it has a floor. */
export function dona(radius = 0.1): THREE.Mesh {
  const k = radius / 0.1;
  const outline = [[0, -0.02], [0.065, -0.02], [0.09, 0.006], [0.1, 0.02]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
  const m = new THREE.Mesh(new THREE.LatheGeometry(outline, 14), toon({ color: 0x7c9a4c }));
  (m.material as THREE.Material).side = THREE.DoubleSide;
  m.visible = false;
  return m;
}

/**
 * Steam rising off something hot: a few soft white puffs that drift up and fade, round and round.
 * `strength` (0–1) is how hot it still is; `blow` pushes the puffs away from you for a moment.
 */
export class Steam {
  readonly group = new THREE.Group();
  private puffs: { mesh: THREE.Mesh; phase: number; side: number }[] = [];
  private gust = 0;
  private away = new THREE.Vector3();

  constructor(scene: THREE.Scene, count = 5) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), material);
      this.group.add(mesh);
      this.puffs.push({ mesh, phase: i / count, side: Math.sin(i * 2.4) });
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Blow on it: the puffs go `away` (a direction, along the ground) for a second. */
  blow(away: THREE.Vector3) {
    this.away.copy(away).setY(0).normalize();
    this.gust = 1;
  }

  update(dt: number, time: number, at: THREE.Vector3, strength: number) {
    this.group.visible = strength > 0.02;
    if (!this.group.visible) return;
    this.gust = Math.max(0, this.gust - dt * 1.2);
    for (const p of this.puffs) {
      const k = (time * 0.7 + p.phase) % 1; // 0 → 1 as each puff rises
      const pos = p.mesh.position.copy(at);
      pos.y += 0.02 + k * 0.14 * (1 - this.gust * 0.6);
      pos.x += Math.sin(k * 5 + p.side * 3) * 0.015;
      pos.z += Math.cos(k * 4 + p.side * 2) * 0.015;
      pos.addScaledVector(this.away, this.gust * k * 0.18);
      p.mesh.scale.setScalar(0.6 + k * 1.6);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = strength * 0.28 * Math.sin(k * Math.PI);
    }
  }

  hide() {
    this.group.visible = false;
  }
}

/**
 * A tint at the edges of the view (watering eyes, a burnt tongue), laid over the game. `set(0–1)` sets how
 * strong it is.
 */
export function edgeTint(rgb: string): { set(amount: number): void } {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed", inset: "0", pointerEvents: "none", opacity: "0", zIndex: "5",
    background: `radial-gradient(ellipse at center, transparent 45%, rgba(${rgb},0.4) 100%)`,
  });
  document.body.append(el);
  return { set: (amount) => void (el.style.opacity = String(Math.max(0, Math.min(1, amount)))) };
}

/** A step backward from the way you're facing (yaw), `d` metres. */
export function back(yaw: number, d: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
}

/** The yaw and pitch that look from `from` to `to` (the camera looks down −z). */
export function look(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const d = to.clone().sub(from);
  return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))];
}

function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function lerpAngle(a: number, b: number, k: number): number {
  return a + angleDiff(b, a) * k;
}

/** Any of these lines, picked at random. */
export function anyOf(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}
