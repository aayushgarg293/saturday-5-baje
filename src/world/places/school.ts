import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { PAL } from "../../render/palette";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { SCHOOL, schoolZ } from "../schoolRoad";
import type { WorldSign } from "../street";

/**
 * The school, on school road's east side (world/schoolRoad.ts): shut on a
 * Saturday evening. (The tuition is across the road: world/places/tuition.ts.)
 *
 *   the compound wall  cream, a maroon band at its foot, painted with the
 *                      slogans of the time; the gate in an arch with the
 *                      school's name over it, one leaf open
 *   the playground     dust, the flagpole on its little stepped platform,
 *                      tall ashoka trees along the front wall
 *   the school         two storeys, a verandah along each, green doors and
 *                      windows, its name on the parapet
 *   the water tank     on the playground's north side, on cement legs, its
 *                      row of taps
 *
 * FRAME: square to the world, its origin on the frontage (the front wall's
 * line) at the middle of the gate: x east (into the school), z south.
 */

export type School = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[]; signs: WorldSign[] };

const HALF = (SCHOOL.school.s1 - SCHOOL.school.s0) / 2, DEPTH = SCHOOL.school.depth;
const CREAM = 0xeadcb0, MAROON = 0x7a2a2a, GREEN = 0x2e5a3a, CEMENT = 0xa8a39a;
/** Where the chowkidar sits, just inside the gate. */
export const CHOWKIDAR = { x: 1.4, z: -3.6, turn: -Math.PI / 2 };

/** The school's frame in the world. */
export function schoolOrigin() {
  return { x: SCHOOL.x + SCHOOL.setback, z: schoolZ((SCHOOL.school.s0 + SCHOOL.school.s1) / 2) };
}

export function buildSchool(): School {
  const o = schoolOrigin();
  const group = new THREE.Group();
  group.name = "school";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const colliders: Box[] = [];
  const signs: WorldSign[] = [];
  const lamps: WorldLamp[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, 0));
  };
  const sign = (x: number, y: number, z: number, rotationY: number, w: number, h: number, label: string) =>
    signs.push({ kind: "schoolBoard", position: toWorld(x, y, z), rotationY, w, h, label });
  const WEST = -Math.PI / 2, SOUTH = 0;

  // --- the compound wall: along the front (a gap for the gate), the sides, the back ---------------------
  const wall = (x0: number, x1: number, z0: number, z1: number) => {
    p.slab(x0, x1, 0, 2.1, z0, z1, CREAM);
    p.slab(x0 - 0.01, x1 + 0.01, 0, 0.45, z0 - 0.01, z1 + 0.01, MAROON);
    p.slab(x0 - 0.05, x1 + 0.05, 2.1, 2.18, z0 - 0.05, z1 + 0.05, 0xd8c89a);
    box(x0, x1, z0, z1);
  };
  const GATE = 2.6;
  wall(0, 0.3, -HALF, -GATE - 0.35);
  wall(0, 0.3, GATE + 0.35, HALF);
  wall(0, DEPTH, -HALF - 0.3, -HALF);
  wall(0, DEPTH, HALF, HALF + 0.3);
  wall(DEPTH - 0.3, DEPTH, -HALF, HALF);
  // the slogans painted on the front wall, either side of the gate
  sign(-0.01, 1.25, -HALF / 2 - 1.5, WEST, 7.5, 1.1, "सब पढ़ें • सब बढ़ें");
  sign(-0.01, 1.25, HALF / 2 + 1.5, WEST, 7.5, 1.1, "शिक्षा ही सबसे बड़ा धन है");

  // the gate: two pillars, an arch over them carrying the name; one iron leaf closed, one swung open
  for (const z of [-GATE - 0.2, GATE + 0.2]) {
    p.box(0.7, 3.4, 0.7, 0.15, 1.7, z, CREAM);
    p.box(0.8, 0.2, 0.8, 0.15, 3.5, z, MAROON);
    box(-0.2, 0.5, z - 0.35, z + 0.35);
  }
  p.box(0.5, 0.9, GATE * 2 + 1.5, 0.15, 4.0, 0, CREAM); // the arch's beam
  p.box(0.5, 0.4, GATE * 2 - 0.6, 0.15, 4.65, 0, CREAM); // stepped up in the middle, like an arch's crown
  p.box(0.55, 0.08, GATE * 2 + 1.6, 0.15, 4.47, 0, MAROON);
  sign(-0.12, 4.0, 0, WEST, GATE * 2 + 1.2, 0.75, "आदर्श विद्या निकेतन\nउच्च माध्यमिक विद्यालय • स्थापित 1968");
  const leaf = (x: number, z0: number, z1: number, along: "z" | "x") => {
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (along === "z") p.box(0.03, 1.7, 0.03, x, 0.95, z0 + (z1 - z0) * t, 0x2a2e30);
      else p.box(0.03, 1.7, 0.03, x + (z1 - z0) * t, 0.95, z0, 0x2a2e30);
    }
    for (const y of [0.25, 1.75]) {
      if (along === "z") p.box(0.05, 0.05, Math.abs(z1 - z0), x, y, (z0 + z1) / 2, 0x2a2e30);
      else p.box(Math.abs(z1 - z0), 0.05, 0.05, x + (z1 - z0) / 2, y, z0, 0x2a2e30);
    }
  };
  leaf(0.15, -GATE + 0.1, 0, "z"); // closed, across the north half
  box(0.05, 0.25, -GATE, 0);
  leaf(0.3, GATE - 0.1, GATE - 0.1 + 2.4, "x"); // open: swung in against the wall's inside (along x, at the south pillar)

  // --- the playground: the flagpole, ashoka trees along the front wall ------------------------------------
  const flag = { x: 12, z: 2 };
  p.box(2.4, 0.25, 2.4, flag.x, 0.125, flag.z, CEMENT);
  p.box(1.6, 0.25, 1.6, flag.x, 0.375, flag.z, CEMENT);
  p.cylinder(0.04, 0.06, 7.5, flag.x, 0.5 + 3.75, flag.z, 0xf2efe6, { segments: 8 });
  p.strut({ x: flag.x + 0.05, y: 0.9, z: flag.z }, { x: flag.x + 0.05, y: 8.0, z: flag.z }, 0.006, 0xd8d2c4, 3); // its rope
  box(flag.x - 1.2, flag.x + 1.2, flag.z - 1.2, flag.z + 1.2);
  for (const z of [-HALF + 3, -HALF + 9, -9, 9, HALF - 9, HALF - 3]) {
    if (Math.abs(z) < GATE + 2) continue;
    p.cylinder(0.08, 0.12, 2, 1.6, 1, z, PAL.bark, { segments: 6 });
    // an ashoka: a tall, narrow column of drooping leaves, a little fuller low down, coming to a soft point
    for (let k = 0; k < 6; k++) {
      const r = 0.75 - k * 0.09;
      p.add(new THREE.IcosahedronGeometry(r, 1).scale(1, 1.5, 1), 1.6 + Math.sin(k * 2.1) * 0.06, 1.6 + k * 0.95, z + Math.cos(k * 1.7) * 0.06, k % 2 ? PAL.leafDark : 0x3f6a34);
    }
    box(1.4, 1.8, z - 0.2, z + 0.2);
  }

  // --- the school building: two storeys, a verandah along each ---------------------------------------------
  const sb = { x0: 22, x1: 32, z0: -HALF + 4, z1: HALF - 8 }, floorH = 3.4, verandah = 2.2;
  const front = sb.x0 + verandah; // the classrooms' wall
  p.slab(front, sb.x1, 0, floorH * 2, sb.z0, sb.z1, 0xe8d6a6);
  p.slab(sb.x0, sb.x1, 0, 0.35, sb.z0, sb.z1, CEMENT); // its plinth (the verandah's floor)
  for (const y of [floorH, floorH * 2]) p.slab(sb.x0 - 0.2, sb.x1, y - 0.2, y, sb.z0 - 0.2, sb.z1 + 0.2, CREAM); // the floor slab; the roof
  p.slab(sb.x0 - 0.2, sb.x1, floorH * 2, floorH * 2 + 0.8, sb.z0 - 0.2, sb.z1 + 0.2, 0xe8d6a6); // the parapet
  p.slab(sb.x0 - 0.22, sb.x0 - 0.18, floorH * 2 + 0.6, floorH * 2 + 0.8, sb.z0 - 0.2, sb.z1 + 0.2, MAROON);
  for (let z = sb.z0 + 0.2; z <= sb.z1 - 0.2 + 0.01; z += (sb.z1 - sb.z0 - 0.4) / 8) {
    p.box(0.35, floorH * 2, 0.35, sb.x0 + 0.2, floorH, z, CREAM); // the verandahs' pillars
  }
  // the upstairs verandah's railing; the classrooms' doors and windows on both floors
  p.slab(sb.x0 - 0.05, sb.x0 + 0.05, floorH, floorH + 0.9, sb.z0, sb.z1, CREAM);
  for (let k = 0; k < 6; k++) {
    const z = sb.z0 + 2.5 + k * ((sb.z1 - sb.z0 - 5) / 5);
    for (const y of [0.35, floorH]) {
      p.box(0.05, 2.1, 1.0, front - 0.03, y + 1.05, z - 1.0, GREEN); // a door
      p.box(0.05, 1.1, 1.3, front - 0.03, y + 1.4, z + 1.0, 0x2a2622); // a window
      p.box(0.06, 1.2, 0.05, front - 0.05, y + 1.4, z + 1.0, GREEN); // its bars (one, thick)
    }
  }
  box(sb.x0, sb.x1, sb.z0, sb.z1);
  sign(sb.x0 - 0.25, floorH * 2 + 0.4, (sb.z0 + sb.z1) / 2, WEST, 9, 0.7, "आदर्श विद्या निकेतन");

  // --- the water tank on the playground's north side: a cement tank on legs, a row of taps under it ---------
  const tank = { x: 10, z: -HALF + 3 };
  p.box(3.2, 1.2, 1.2, tank.x, 1.9, tank.z, CEMENT);
  for (const [dx, dz] of [[-1.4, -0.45], [1.4, -0.45], [-1.4, 0.45], [1.4, 0.45]]) p.box(0.15, 1.3, 0.15, tank.x + dx, 0.65, tank.z + dz, CEMENT);
  for (let k = 0; k < 5; k++) p.box(0.04, 0.12, 0.04, tank.x - 1.2 + k * 0.6, 1.24, tank.z + 0.62, 0xb9bcc0);
  p.box(3.6, 0.1, 1.0, tank.x, 0.05, tank.z + 0.9, 0x8a8478); // the wet slab under the taps
  box(tank.x - 1.6, tank.x + 1.6, tank.z - 0.6, tank.z + 0.6);
  sign(tank.x, 1.95, tank.z + 0.61, SOUTH, 2.2, 0.45, "पेयजल");

  group.add(p.build("schoolThings"));
  return { group, colliders, lamps, signs };
}
