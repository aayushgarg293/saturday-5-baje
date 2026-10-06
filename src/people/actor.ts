import * as THREE from "three";
import type { Person } from "./body";
import { lookAt, plant, reach } from "./pose";

/**
 * An actor: a person at a fixed spot doing a loop of actions (sipping chai,
 * frying kachoris, waiting for a gola), the way the chaiwala does.
 *
 * Each action is a POSE over time: where the hands are, what the eyes look
 * at, how the body leans. Arms reach there by IK (pose.ts); one action blends
 * into the next. Around the actions the actor is alive: breathing, shifting
 * weight, blinking, and noticing you when you come close.
 *
 * Positions in a pose are in the PERSON'S OWN frame: origin on the ground
 * where they stand (or under where they sit), facing +z, +x their left.
 */

export type Pose = {
  right: THREE.Vector3;
  left: THREE.Vector3;
  look: THREE.Vector3;
  /** Upper body leaning forward, radians. */
  lean?: number;
  /** Upper body turned, radians (+ = toward their left). */
  twist?: number;
  /** Shoulders rocking side to side, radians. */
  rock?: number;
  /** Head nodded down (+) or tipped back (−), radians, on top of looking. */
  nod?: number;
  smile?: boolean;
  /** Eyes closed (praying, dozing). */
  closed?: boolean;
  /** Knees bent, standing (0 = straight, 1 = a deep squat): the hips drop and the feet stay put. */
  crouch?: number;
};

export type Action = { name: string; duration: number; pose: (u: number) => Pose };

export type ActorSpec = {
  person: Person;
  /** Where they stand in the parent's frame, and which way they face (radians, 0 = +z). */
  at: { x: number; z: number; turn: number };
  actions: Action[];
  /** Seat height, if they sit: the body lowers onto it and the feet rest on the ground. */
  seat?: number;
  /** How they react when you come close in front: smile and nod, just look, or carry on. */
  notice: "greet" | "glance" | "none";
  /** Seconds into the loop at the start, so neighbours don't move in step. */
  phase?: number;
};

export type Actor = {
  person: Person;
  /** The current action, and seconds into it (for props that follow the action). */
  now: { name: string; u: number };
  update(t: number, dt: number, player: THREE.Vector3): void;
  /** Where the hand grips, in the parent's frame (for placing held things). */
  grip(side: "L" | "R", out: THREE.Vector3): THREE.Vector3;
  /**
   * Break off the loop for a one-off action (the owner pointing you to your
   * booth), blending in and out of it; the loop carries on afterwards.
   */
  perform(action: Action): void;
};

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const smooth = (k: number) => k * k * (3 - 2 * k);
/** How long one action takes to blend into the next, seconds. */
const BLEND = 0.6;
/** Elbows point down, out and back; knees point forward (person frame). */
const POLE = { R: v(-0.7, -0.5, -0.4), L: v(0.7, -0.5, -0.4), knee: v(0, 0.3, 1) };

/** Blend two poses: `k` = 0 is all `a`, 1 is all `b`. */
function mix(a: Pose, b: Pose, k: number): Required<Pose> {
  const n = (x: number | undefined, y: number | undefined) => THREE.MathUtils.lerp(x ?? 0, y ?? 0, k);
  return {
    right: a.right.clone().lerp(b.right, k),
    left: a.left.clone().lerp(b.left, k),
    look: a.look.clone().lerp(b.look, k),
    lean: n(a.lean, b.lean),
    twist: n(a.twist, b.twist),
    rock: n(a.rock, b.rock),
    nod: n(a.nod, b.nod),
    smile: (k < 0.5 ? a.smile : b.smile) ?? false,
    closed: (k < 0.5 ? a.closed : b.closed) ?? false,
    crouch: n(a.crouch, b.crouch),
  };
}

export function makeActor(spec: ActorSpec): Actor {
  const { person, actions } = spec;
  const root = person.root;
  root.position.set(spec.at.x, 0, spec.at.z);
  root.rotation.y = spec.at.turn;
  const k = person.scale;
  const loop = actions.reduce((sum, a) => sum + a.duration, 0);

  const world = (p: THREE.Vector3) => root.localToWorld(p.clone());
  const worldDir = (d: THREE.Vector3) => d.clone().transformDirection(root.matrixWorld);
  const now = { name: actions[0].name, u: 0 };
  let attention = 0;
  let greeting = 0; // seconds left of the smile-and-nod
  let greeted = false;
  let blinkIn = 1 + Math.random() * 3;
  let oneOff: { action: Action; u: number } | null = null;
  const local = new THREE.Vector3(), playerHead = new THREE.Vector3();
  const hand = new THREE.Vector3(), elbow = new THREE.Vector3();

  return {
    person,
    now,
    update(t, dt, player) {
      // which action, and how far into it; blend into the next near its end
      let u = (t + (spec.phase ?? 0)) % loop;
      let i = 0;
      while (u > actions[i].duration) { u -= actions[i].duration; i++; }
      now.name = actions[i].name;
      now.u = u;
      const blend = smooth(THREE.MathUtils.clamp((u - (actions[i].duration - BLEND)) / BLEND, 0, 1));
      let pose = mix(actions[i].pose(u), actions[(i + 1) % actions.length].pose(0), blend);
      // a one-off action takes over, blending in at its start and out at its end
      if (oneOff) {
        oneOff.u += dt;
        const { action, u: ou } = oneOff;
        const w = smooth(THREE.MathUtils.clamp(Math.min(ou / BLEND, (action.duration - ou) / BLEND), 0, 1));
        pose = mix(pose, action.pose(ou), w);
        now.name = action.name;
        now.u = ou;
        if (ou >= action.duration) oneOff = null;
      }

      // --- the body: sitting or standing, breathing, leaning into the work ---
      const hips = person.bone("hips");
      const breath = Math.sin(t * 1.7 + (spec.phase ?? 0)) * 0.012;
      if (spec.seat !== undefined) {
        hips.position.set(0, spec.seat + person.seatDrop, 0); // (on the seat, not sunk into it: body.ts, seatDrop)
        hips.rotation.set(-0.08, 0, 0); // sitting back a little
      } else {
        // weight shifting slowly from hip to hip; the spine leans back the other way
        const shift = Math.sin(t * 0.35 + (spec.phase ?? 0));
        hips.position.set(shift * 0.02, (0.94 - pose.crouch * 0.36) * k, 0);
        hips.rotation.set(0, 0, -shift * 0.03);
      }
      person.bone("spine").rotation.set(pose.lean * 0.4 + breath, pose.twist * 0.4, 0);
      person.bone("chest").rotation.set(pose.lean * 0.6, pose.twist * 0.6, pose.rock);
      root.updateMatrixWorld(true);

      if (spec.seat !== undefined) {
        // feet on the ground in front of the seat, knees forward
        for (const [side, x] of [["L", 0.12], ["R", -0.12]] as const) plant(person, side, world(v(x * k, 0.06 * k, 0.42 * k)), worldDir(POLE.knee));
      } else if (pose.crouch > 0.01) {
        // feet where they stand, knees bending forward as the hips drop
        for (const [side, x] of [["L", 0.11], ["R", -0.11]] as const) plant(person, side, world(v(x * k, 0.06 * k, 0.04 * k)), worldDir(POLE.knee));
      } else {
        // straight legs: back to their rest pose (after a crouch)
        for (const leg of ["hipL", "kneeL", "footL", "hipR", "kneeR", "footR"] as const) person.bone(leg).quaternion.identity();
      }
      reach(person, "R", world(pose.right), worldDir(POLE.R));
      reach(person, "L", world(pose.left), worldDir(POLE.L));

      // --- the head: at the work, or at you if you're close and in front ---
      local.copy(player);
      root.worldToLocal(local);
      const near = spec.notice !== "none" && local.z > 0 && Math.hypot(local.x, local.z) < 4.5;
      attention += ((near ? 1 : 0) - attention) * (1 - Math.exp(-2.5 * dt));
      playerHead.copy(player).setY(1.5);
      lookAt(person, world(pose.look).lerp(playerHead, attention * (spec.notice === "glance" ? 0.7 : 1)), 1);

      // noticing you: the first time they look up at you, a smile and a nod
      if (spec.notice === "greet") {
        if (attention > 0.6 && !greeted) { greeted = true; greeting = 2.2; }
        if (attention < 0.1) greeted = false;
      }
      greeting = Math.max(0, greeting - dt);
      const head = person.bone("head");
      const nodT = 2.2 - greeting;
      head.rotation.x += pose.nod + (greeting > 0 && nodT < 0.7 ? Math.sin((nodT / 0.7) * Math.PI) * 0.22 : 0);
      head.rotation.z = Math.sin(t * 0.5 + (spec.phase ?? 0)) * 0.04 + attention * 0.06;

      blinkIn -= dt;
      if (blinkIn < -0.13) blinkIn = 2 + Math.random() * 3;
      person.face.set(blinkIn < 0 || pose.closed ? "blink" : greeting > 0 || pose.smile ? "smile" : "neutral");
    },
    perform(action) {
      oneOff = { action, u: 0 };
    },
    grip(side, out) {
      // a little past the wrist, along the forearm: the middle of the fist
      person.bone(`hand${side}`).getWorldPosition(hand);
      person.bone(`elbow${side}`).getWorldPosition(elbow);
      out.copy(hand).addScaledVector(hand.clone().sub(elbow).normalize(), 0.06 * k);
      return root.parent ? root.parent.worldToLocal(out) : out;
    },
  };
}

/** A point given in a parent frame, seen from a person standing at `at` in it (for looks and reaches). */
export function seenFrom(at: { x: number; z: number; turn: number }, x: number, y: number, z: number): THREE.Vector3 {
  const dx = x - at.x, dz = z - at.z;
  const c = Math.cos(at.turn), s = Math.sin(at.turn);
  // undo the turn: rotate by −turn about y
  return v(dx * c - dz * s, y, dx * s + dz * c);
}

/**
 * A hand's path through keyframes: at `times[i]` seconds it's at `points[i]`,
 * easing between them (before the first and after the last, it waits there).
 */
export function track(u: number, times: number[], points: THREE.Vector3[]): THREE.Vector3 {
  let i = 0;
  while (i < times.length - 2 && u > times[i + 1]) i++;
  const k = smooth(THREE.MathUtils.clamp((u - times[i]) / (times[i + 1] - times[i]), 0, 1));
  return points[i].clone().lerp(points[i + 1], k);
}
