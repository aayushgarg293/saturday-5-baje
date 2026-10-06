import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { SCHOOL, schoolZ } from "../schoolRoad";
import type { WorldSign } from "../street";

/**
 * Sharma Tutorials: the tuition, in a house across school road from the
 * school (world/schoolRoad.ts). Sharma-ji's family lives upstairs; the front
 * room downstairs is the class: its doors folded open, benches inside, the
 * big board across the front at the first floor, the batch timings painted
 * smaller by the door. The kids' cycles stand along the road's edge outside
 * (people/tuition.ts: the class lets out at six).
 *
 * FRAME: square to the world, its origin on the frontage (school road's
 * west front line) at the house's middle: x east (the house is at −x, the
 * road at +x), z south.
 */

export type Tuition = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[]; signs: WorldSign[] };

const W = (SCHOOL.tuition.s1 - SCHOOL.tuition.s0) / 2, DEPTH = 9, FACE = -0.6, FLOOR = 3.1;
const WALL = 0xd8c49a, TRIM = 0x8a5a3a, CEMENT = 0xa8a39a;
/** The class's doorway (in this frame): the kids come out of here. */
export const TUITION_DOOR = { x: FACE + 0.3, z: 0 };
/** Where the kids' cycles stand, along the road's edge in front. */
export const TUITION_CYCLES = Array.from({ length: 6 }, (_, k) => ({ x: 1.6, z: -3.6 + k * 1.0 + (k > 2 ? 1.2 : 0) }));

export function tuitionOrigin() {
  return { x: SCHOOL.x - SCHOOL.setback, z: schoolZ((SCHOOL.tuition.s0 + SCHOOL.tuition.s1) / 2) };
}

export function buildTuition(): Tuition {
  const o = tuitionOrigin();
  const group = new THREE.Group();
  group.name = "tuition";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const colliders: Box[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, 0));
  };
  const EAST = Math.PI / 2;

  // the house: two floors and a parapet; a step along its front
  p.slab(-DEPTH, FACE, 0, FLOOR * 2 + 0.9, -W, W, WALL);
  p.slab(FACE, 0, 0, 0.3, -W, W, CEMENT); // the step
  p.slab(FACE, FACE + 0.6, FLOOR - 0.15, FLOOR, -W, W, CEMENT); // the slab's edge, a sunshade over the class's doors
  p.slab(-DEPTH, FACE + 0.08, FLOOR * 2 + 0.75, FLOOR * 2 + 0.9, -W - 0.05, W + 0.05, TRIM); // the parapet's coping
  // the class: a wide doorway, its doors folded back, the room dark inside with its benches' ends showing
  p.box(0.05, 2.3, 3.0, FACE + 0.02, 1.45, TUITION_DOOR.z, 0x2e2a26);
  for (const dz of [-1.75, 1.75]) p.box(0.06, 2.3, 0.5, FACE + 0.05, 1.45, TUITION_DOOR.z + dz, 0x4a6a5a); // the folded doors
  for (const dz of [-1.0, 0, 1.0]) p.box(0.04, 0.45, 0.6, FACE + 0.04, 0.75, dz, 0x6a4a2a); // benches inside, just seen
  // barred windows either side, downstairs; upstairs, the family's windows and a little balcony
  for (const dz of [-W + 0.9, W - 0.9]) {
    p.box(0.05, 1.1, 1.1, FACE + 0.02, 1.7, dz, 0x2a2622);
    for (let k = -2; k <= 2; k++) p.box(0.04, 1.1, 0.025, FACE + 0.05, 1.7, dz + k * 0.22, 0x3a3f42);
  }
  for (const dz of [-2.4, 2.4]) p.box(0.05, 1.2, 1.0, FACE + 0.02, FLOOR + 1.5, dz, 0x2a2622);
  p.slab(FACE, FACE + 0.9, FLOOR + 0.1, FLOOR + 0.2, -1.2, 1.2, CEMENT);
  for (let k = 0; k <= 8; k++) p.box(0.025, 0.85, 0.025, FACE + 0.88, FLOOR + 0.6, -1.2 + k * 0.3, 0x3a3f42);
  p.box(0.04, 0.04, 2.4, FACE + 0.88, FLOOR + 1.05, 0, 0x3a3f42);
  p.box(0.05, 2.1, 0.9, FACE + 0.02, FLOOR + 1.15, 0, 0x5a3a28); // the balcony's door
  box(-DEPTH, FACE, -W, W);

  // the boards: the big one across the front at the first floor; the timings by the door
  const signs: WorldSign[] = [
    { kind: "schoolBoard", position: toWorld(FACE + 0.05, FLOOR + 2.6, 0), rotationY: EAST, w: W * 2 - 0.6, h: 0.9, label: "शर्मा ट्यूटोरियल्स\nकक्षा 6 से 12 • गणित • विज्ञान • अंग्रेज़ी • ☎ 2431178" },
    { kind: "schoolBoard", position: toWorld(FACE + 0.04, 1.75, 2.48), rotationY: EAST, w: 0.88, h: 0.62, label: "बैच\nसुबह 7–9 • शाम 4–6" },
  ];
  const lamps: WorldLamp[] = [{ kind: "bulb", position: toWorld(FACE + 0.35, 2.75, -1.9), rotationY: 0, w: 1, h: 1, back: 0, ground: 0 }];
  p.box(0.3, 0.08, 0.08, FACE + 0.15, 2.85, -1.9, 0x3a3f3a);

  // (the kids' cycles, at TUITION_CYCLES, are people/tuition.ts's: they leave with them at six)
  group.add(p.build("tuitionHouse"));
  return { group, colliders, lamps, signs };
}
