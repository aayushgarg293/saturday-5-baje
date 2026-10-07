import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { makeRng } from "../../core/rng";
import { PAL } from "../../render/palette";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { SCHOOL, schoolZ } from "../schoolRoad";
import { cartWheels } from "../props/cartWheels";

/**
 * The park, on school road's west side, where the cricket lane comes out
 * (world/schoolRoad.ts): the town's one patch of green, its south half. The
 * north half, along the cricket lane, is the evening sabzi mandi
 * (world/places/mandi.ts): a low railing between them, the mandi open to
 * the road and the lane.
 *
 *   the railing     a low wall with iron railings on top, all round; the
 *                   main gate on school road, a small one on the lane
 *   inside          grass gone thin, brick paths round it and in to the
 *                   middle, where the fountain stands dry; gulmohar trees in
 *                   flower, a neem; concrete benches
 *   the play corner swings (one of them people/schoolRoad.ts swings), a
 *                   slide, a see-saw (its plank too: it moves)
 *   outside the gate  the peanut seller's cart: his kadhai of hot sand on a
 *                   little coal stove, heaps of peanuts, paper cones
 *
 * FRAME: square to the world, its origin on the frontage (school road's
 * west front line) at the park's middle: x east (so the park is at −x), z
 * south.
 */

export type Park = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[] };

const DEPTH = SCHOOL.park.depth, HALF = (SCHOOL.park.s1 - SCHOOL.park.s0) / 2;
const IRON = 0x2a2e30, PLASTER = 0xd8cdb4, BRICK_PATH = 0xb07a5a, GRASS = 0x7f9a4e;
/** The play corner's moving things (people/schoolRoad.ts): the free swing's top bar, the see-saw's pivot. */
export const PLAY = { swing: { x: -24.2, z: 13, top: 2.4 }, seesaw: { x: -27, z: 6, y: 0.45 } };
/** The benches (where you sit: their middle, which way they face); the first is the old men's. */
export const BENCHES = [{ x: -9, z: 9.6, turn: Math.PI }, { x: -13, z: 15.6, turn: Math.PI }, { x: -20, z: 15.6, turn: Math.PI }];
/** The line between the park (south, +z) and the mandi (north): the railing along it, and the gap in it. */
export const PARK_MANDI = { z: -2.2, gap: { x0: -4.6, x1: -2.6 } };
/** The dry fountain, in the middle of the park's half. */
const FOUNTAIN = { x: -15.3, z: 9.5 };
/** The peanut seller's cart (outside the gate, at the road's edge), and where he stands, behind it. */
export const PEANUTS = { cart: { x: 1.7, z: 4.2 }, seller: { x: 2.55, z: 4.2, turn: -Math.PI / 2 } };

export function parkOrigin() {
  return { x: SCHOOL.x - SCHOOL.setback, z: schoolZ((SCHOOL.park.s0 + SCHOOL.park.s1) / 2) };
}

export function buildPark(): Park {
  const o = parkOrigin();
  const group = new THREE.Group();
  group.name = "park";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const rng = makeRng(7741);
  const colliders: Box[] = [];
  const lamps: WorldLamp[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, Math.abs(x1 - x0), Math.abs(z1 - z0), 0));
  };

  // --- the railing: a low wall, iron bars on it, a rail along their tops ------------------------------
  const railing = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = z0 === z1;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    p.box(alongX ? len : 0.25, 0.5, alongX ? 0.25 : len, mx, 0.25, mz, PLASTER);
    p.box(alongX ? len : 0.05, 0.05, alongX ? 0.05 : len, mx, 1.25, mz, IRON);
    const n = Math.round(len / 0.22);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      p.box(0.025, 0.75, 0.025, x0 + (x1 - x0) * t, 0.87, z0 + (z1 - z0) * t, IRON);
    }
    box(Math.min(x0, x1) - (alongX ? 0 : 0.15), Math.max(x0, x1) + (alongX ? 0 : 0.15), Math.min(z0, z1) - (alongX ? 0.15 : 0), Math.max(z0, z1) + (alongX ? 0.15 : 0));
  };
  const pillar = (x: number, z: number) => {
    p.box(0.45, 1.6, 0.45, x, 0.8, z, PLASTER);
    p.box(0.55, 0.12, 0.55, x, 1.66, z, 0xb8ad94);
    box(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
  };
  const GATE = 2, LANE_GATE = { x0: -6, x1: -3.6 };
  // (the mandi's front, north of the gate, is open to the road: just a pillar at its corner)
  pillar(-0.15, -HALF);
  railing(-0.15, GATE, -0.15, HALF);
  railing(-DEPTH, -HALF, LANE_GATE.x0, -HALF);
  railing(LANE_GATE.x1, -HALF, -0.15, -HALF);
  railing(-DEPTH, -HALF, -DEPTH, HALF);
  railing(-DEPTH, HALF, -0.15, HALF);
  for (const z of [-GATE, GATE]) pillar(-0.15, z);
  for (const x of [LANE_GATE.x0, LANE_GATE.x1]) pillar(x, -HALF);
  // between the park and the mandi: a railing, with a gap to walk through near the front
  const M = PARK_MANDI;
  railing(-DEPTH, M.z, M.gap.x0, M.z);
  railing(M.gap.x1, M.z, -0.4, M.z);

  // --- the grass, the paths, the fountain ---------------------------------------------------------------
  p.slab(-DEPTH + 0.15, -0.3, 0, 0.025, M.z + 0.15, HALF - 0.15, GRASS);
  // a few bare patches, worn by feet and cricket (each drawn, in turn, as before: those that fell in what's
  // now the mandi aren't laid, so the ones after them stay where they were)
  for (let k = 0; k < 7; k++) {
    const r = rng.range(0.8, 1.6), x = rng.range(-28, -4), z = rng.range(-15, 15);
    if (z - r > M.z + 0.2) p.add(new THREE.CircleGeometry(r, 9).rotateX(-Math.PI / 2), x, 0.028, z, 0xb59a74);
  }
  const path = (x0: number, x1: number, z0: number, z1: number) => p.slab(x0, x1, 0.03, 0.04, z0, z1, BRICK_PATH);
  const ring = { x0: -DEPTH + 2.5, x1: -2.5, z0: M.z + 2.5, z1: HALF - 2.5 }, pw = 1.6;
  path(ring.x0, ring.x1, ring.z0, ring.z0 + pw);
  path(ring.x0, ring.x1, ring.z1 - pw, ring.z1);
  path(ring.x0, ring.x0 + pw, ring.z0, ring.z1);
  path(ring.x1 - pw, ring.x1, ring.z0, ring.z1);
  path(ring.x1 - 0.1, -0.3, ring.z0, ring.z0 + pw); // in from the gate to the path round
  path(FOUNTAIN.x + 1.9, ring.x1, FOUNTAIN.z - 2.5, FOUNTAIN.z - 0.9); // and across to the fountain
  path(LANE_GATE.x0, LANE_GATE.x1, -HALF + 0.15, -HALF + 2.2); // in from the lane's gate (into the mandi)
  const f = FOUNTAIN;
  p.cylinder(2.3, 2.4, 0.55, f.x, 0.275, f.z, PLASTER, { segments: 20 });
  p.cylinder(2.05, 2.05, 0.02, f.x, 0.5, f.z, 0x9a9082, { segments: 20 }); // dry, dusty, a few leaves
  p.cylinder(0.3, 0.4, 1.4, f.x, 0.95, f.z, PLASTER, { segments: 10 });
  p.cylinder(0.8, 0.5, 0.25, f.x, 1.7, f.z, PLASTER, { segments: 14 }); // its bowl
  box(f.x - 2.3, f.x + 2.3, f.z - 2.3, f.z + 2.3);

  // --- the trees: gulmohars in flower, a neem -----------------------------------------------------------------
  const tree = (x: number, z: number, flowers: boolean) => {
    p.cylinder(0.2, 0.3, 3.2, x, 1.6, z, PAL.bark, { segments: 7 });
    for (const [dx, dz] of [[-1.4, 0.4], [1.3, 0.9], [0.2, -1.4]]) p.strut({ x, y: 2.8, z }, { x: x + dx, y: 4.2, z: z + dz }, 0.09, PAL.bark);
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2), rr = rng.range(0.3, 2.8);
      const clump = new THREE.IcosahedronGeometry(rng.range(0.7, 1.1), 1).scale(1, 0.55, 1);
      // a gulmohar's crown is wide and flat, and in May it's more flame than leaf
      const colour = flowers ? (i % 3 === 0 ? PAL.leafDark : i % 3 === 1 ? 0xd8461f : 0xe86a2a) : i % 3 ? PAL.leafDark : PAL.leafLight;
      p.add(clump, x + Math.cos(a) * rr, rng.range(4.1, 5.2), z + Math.sin(a) * rr, colour);
    }
    box(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
  };
  tree(-5, -15, true);
  tree(-28, -14.5, true);
  tree(-5.5, 15.5, true);
  tree(-17, -15.5, false);

  // --- the play corner ---------------------------------------------------------------------------------------
  // the swings: an A-frame at each end, the top bar; one swing hangs still, the other's a person's (people/schoolRoad.ts)
  const sw = PLAY.swing;
  for (const x of [sw.x - 3, sw.x + 1.2]) {
    for (const dz of [-0.8, 0.8]) p.strut({ x, y: 0, z: sw.z + dz }, { x, y: sw.top, z: sw.z }, 0.04, 0x3f6a8a);
    box(x - 0.15, x + 0.15, sw.z - 0.9, sw.z + 0.9);
  }
  p.strut({ x: sw.x - 3, y: sw.top, z: sw.z }, { x: sw.x + 1.2, y: sw.top, z: sw.z }, 0.04, 0x3f6a8a);
  const still = sw.x - 1.7;
  for (const dx of [-0.22, 0.22]) p.strut({ x: still + dx, y: sw.top, z: sw.z }, { x: still + dx, y: 0.48, z: sw.z }, 0.008, 0x8a8f92, 3);
  p.box(0.5, 0.04, 0.22, still, 0.46, sw.z, 0xc8a050);
  // the slide: a ladder up to a little platform, the chute down
  const sl = { x: -22, z: 8 };
  for (const dz of [-0.3, 0.3]) p.strut({ x: sl.x - 1.6, y: 0, z: sl.z + dz }, { x: sl.x - 1.2, y: 1.6, z: sl.z + dz }, 0.03, 0xc84a3a);
  for (let y = 0.3; y < 1.6; y += 0.3) p.box(0.04, 0.03, 0.6, sl.x - 1.6 + (y / 1.6) * 0.4, y, sl.z, 0xc84a3a);
  p.box(0.5, 0.05, 0.7, sl.x - 1.0, 1.6, sl.z, 0xc84a3a);
  const chute = Math.atan2(1.4, 3.0);
  p.box(3.3, 0.05, 0.55, sl.x + 0.75, 0.95, sl.z, 0xd8c040, { rz: -chute });
  for (const dz of [-0.28, 0.28]) p.box(3.3, 0.12, 0.03, sl.x + 0.75, 1.02, sl.z + dz, 0xd8c040, { rz: -chute });
  box(sl.x - 1.7, sl.x + 2.3, sl.z - 0.4, sl.z + 0.4);
  // the see-saw's stand (its plank moves: people/schoolRoad.ts)
  const ss = PLAY.seesaw;
  p.box(0.3, ss.y, 0.4, ss.x, ss.y / 2, ss.z, 0x3f6a8a);
  box(ss.x - 0.25, ss.x + 0.25, ss.z - 0.25, ss.z + 0.25);

  // --- the benches -------------------------------------------------------------------------------------------
  for (const b of BENCHES) {
    const bench = new Parts();
    bench.box(1.9, 0.07, 0.45, 0, 0.45, 0, 0x7a8a6a);
    bench.box(1.9, 0.4, 0.06, 0, 0.75, -0.22, 0x7a8a6a);
    for (const dx of [-0.75, 0.75]) bench.box(0.1, 0.45, 0.4, dx, 0.22, 0, 0x8a8478);
    p.addParts(bench, new THREE.Matrix4().makeTranslation(b.x, 0, b.z).multiply(new THREE.Matrix4().makeRotationY(b.turn)));
    const wide = Math.abs(Math.sin(b.turn)) > 0.5;
    box(b.x - (wide ? 0.3 : 1.0), b.x + (wide ? 0.3 : 1.0), b.z - (wide ? 1.0 : 0.3), b.z + (wide ? 1.0 : 0.3));
  }

  // --- the peanut seller's cart, outside the gate -----------------------------------------------------------
  const c = PEANUTS.cart;
  p.box(0.8, 0.08, 1.5, c.x, 0.82, c.z, 0x8a6a44);
  cartWheels(p, { x: c.x, z: c.z, length: 1.5, width: 0.8, underside: 0.78, along: "z", radius: 0.2 });
  p.cylinder(0.14, 0.16, 0.2, c.x, 0.96, c.z - 0.35, 0x3a3634, { segments: 10 }); // the little coal stove
  p.cylinder(0.3, 0.18, 0.12, c.x, 1.12, c.z - 0.35, 0x2a2622, { segments: 12 }); // the kadhai
  p.cylinder(0.27, 0.27, 0.02, c.x, 1.17, c.z - 0.35, 0x9a8a6a, { segments: 12 }); // its hot sand, peanuts in it
  for (let k = 0; k < 14; k++) p.add(new THREE.IcosahedronGeometry(0.035, 0).scale(1.4, 0.8, 1), c.x + rng.range(-0.25, 0.25), 0.9, c.z + 0.25 + rng.range(-0.25, 0.3), 0xa0703e); // the heap
  p.add(new THREE.ConeGeometry(0.3, 0.2, 10), c.x, 0.96, c.z + 0.35, 0xa0703e);
  for (let k = 0; k < 5; k++) p.add(new THREE.ConeGeometry(0.04, 0.14, 6).rotateX(Math.PI), c.x + 0.3, 0.93, c.z + 0.6 - k * 0.07, 0xe8e0c8); // paper cones
  lamps.push({ kind: "fire", position: toWorld(c.x, 0.95, c.z - 0.35), rotationY: 0, w: 1, h: 1, back: 0, ground: 0 });
  box(c.x - 0.45, c.x + 0.45, c.z - 0.8, c.z + 0.8);

  // --- the lamps ---------------------------------------------------------------------------------------------
  for (const [x, z] of [[-3.2, -3], [-28, 3]]) {
    p.cylinder(0.07, 0.1, 4.5, x, 2.25, z, 0x3a3f3a, { segments: 8 });
    p.add(new THREE.SphereGeometry(0.2, 10, 8), x, 4.6, z, 0xf2ead6);
    lamps.push({ kind: "bulb", position: toWorld(x, 4.55, z), rotationY: 0, w: 1, h: 1, back: 0, ground: 0, pole: true });
    box(x - 0.12, x + 0.12, z - 0.12, z + 0.12);
  }

  group.add(p.build("parkThings"));
  return { group, colliders, lamps };
}
