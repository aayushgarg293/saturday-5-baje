import * as THREE from "three";
import type { Person } from "./body";
import { lookAt, reach } from "./pose";
import { walkLegs } from "./walkers";

/**
 * Walking somewhere along a path: the tuition's kids (people/tuition.ts), the
 * 6:30 bus's passengers (world/busArrival.ts).
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Someone walking along a path of points (in this frame), at `speed`, with
 * the walkers' legs (people/walkers.ts, walkLegs); hands on their bag's
 * straps, or the right hand on the handlebar of the cycle they're wheeling
 * beside them.
 */
export type Stroll = {
  person: Person;
  path: THREE.Vector3[];
  speed: number;
  travelled: number;
  phase: number;
  moving: number;
  heading: number;
  cycle?: THREE.Object3D;
  /** The cycle's left grip, in its own frame (the side they walk on: its `ride.grip`, mirrored). */
  grip?: THREE.Vector3;
};

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _w = new THREE.Vector3();
const ELBOW = { R: v(-0.7, -0.5, -0.4), L: v(0.7, -0.5, -0.4) };

/** Step a stroll on; true once it's at the end of its path. */
export function walk(s: Stroll, t: number, dt: number, player: THREE.Vector3): boolean {
  const root = s.person.root, k = s.person.scale;
  // where along the path
  s.travelled += s.speed * dt;
  let left = s.travelled, i = 0;
  while (i < s.path.length - 1 && left > s.path[i].distanceTo(s.path[i + 1])) {
    left -= s.path[i].distanceTo(s.path[i + 1]);
    i++;
  }
  const done = i >= s.path.length - 1;
  if (!done) {
    _a.copy(s.path[i]);
    _b.copy(s.path[i + 1]);
    root.position.lerpVectors(_a, _b, left / _a.distanceTo(_b));
    let d = Math.atan2(_b.x - _a.x, _b.z - _a.z) - s.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    s.heading += d * Math.min(1, dt * 5);
  } else root.position.copy(s.path[s.path.length - 1]);
  root.rotation.y = s.heading;
  s.moving += ((done ? 0 : 1) - s.moving) * Math.min(1, dt * 5);
  s.phase = (s.phase + (s.speed * s.moving * dt) / (2 * 0.62 * k)) % 1;
  walkLegs(s.person, s.phase, s.moving, k, t);
  root.updateMatrixWorld(true);
  const world = (x: number, y: number, z: number) => root.localToWorld(_w.set(x, y, z)).clone();
  const pole = (d: THREE.Vector3) => d.clone().transformDirection(root.matrixWorld);
  if (s.cycle) {
    // the cycle beside them, on their right, a little ahead; the right hand on its handlebar
    const right = new THREE.Vector3(-Math.cos(s.heading), 0, Math.sin(s.heading));
    const ahead = new THREE.Vector3(Math.sin(s.heading), 0, Math.cos(s.heading));
    s.cycle.position.copy(root.position).addScaledVector(right, 0.5).addScaledVector(ahead, -0.15);
    s.cycle.rotation.y = s.heading - Math.PI / 2;
    s.cycle.updateMatrixWorld(true);
    reach(s.person, "R", s.cycle.localToWorld(s.grip!.clone()), pole(ELBOW.R));
    const swing = 0.15 * k * s.moving * Math.cos(Math.PI * 2 * s.phase);
    reach(s.person, "L", world(0.19 * k, 0.8 * k, 0.03 * k - swing), pole(ELBOW.L));
  } else {
    reach(s.person, "R", world(-0.1 * k, 1.12 * k, 0.12 * k), pole(ELBOW.R));
    reach(s.person, "L", world(0.1 * k, 1.12 * k, 0.12 * k), pole(ELBOW.L));
  }
  // eyes ahead, or on you if you're close in front
  const toYou = root.worldToLocal(_w.copy(player));
  lookAt(s.person, toYou.z > 0 && toYou.length() < 4 ? player.clone().setY(1.5) : world(0, 1.3 * k, 5), 1);
  return done;
}

