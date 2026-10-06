import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { makeRng } from "../../core/rng";
import { PAL } from "../../render/palette";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { LANE, MOHALLA, MOHALLA_FRAME } from "../mohalla";

/**
 * The old mohalla's square (world/mohalla.ts): its houses are rows like the
 * bazaar's; these are the things standing in it:
 *
 *   the peepal        old and huge, on its chabutra: a plastered platform
 *                     round the trunk, knee high, where the old men sit; red
 *                     threads tied round the trunk for wishes
 *   the handpump      by the square's south side, on its cement platform,
 *                     the matka under the spout (people/mohalla.ts works the
 *                     handle: `PUMP`)
 *   the shrine        a little whitewashed one in the north-east corner, a
 *                     stone smeared with sindoor in its niche, a saffron flag
 *   lamps             a bulb on a pole in the square, one at the far corner
 *                     of the loop
 *
 * FRAME: the mohalla's (MOHALLA_FRAME): x east, z south, the bazaar's centre
 * line at x = 0 by the gali. So a point at (u, v) on the grid is (−u, v) here.
 */

export type MohallaSquare = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[] };

const at = (u: number, v: number) => ({ x: -u, z: v });
/** The chabutra: its middle, half its width, its height (the old men sit on its edge). */
export const CHABUTRA = { ...at(MOHALLA.peepal.u, MOHALLA.peepal.v), half: 2.2, height: 0.55 };
/** The handpump: where it stands (its spout faces north, into the square), and its handle's pivot. */
export const PUMP = { ...at(51.5, 4.6), pivotY: 1.0 };
const PLASTER = 0xe2d6bc, OCHRE = 0xc9894a, IRON = 0x3a3f42, CEMENT = 0xa8a39a;

export function buildMohallaSquare(): MohallaSquare {
  const group = new THREE.Group();
  group.name = "mohallaSquare";
  group.position.set(MOHALLA_FRAME.x, 0, MOHALLA_FRAME.z);
  group.rotation.y = MOHALLA_FRAME.turn;
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const colliders: Box[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, MOHALLA_FRAME.turn));
  };
  const p = new Parts();
  const rng = makeRng(7521);

  // --- the chabutra and the peepal -------------------------------------------------------------
  const { x: cx, z: cz, half: ch, height: chH } = CHABUTRA;
  p.box(ch * 2, chH, ch * 2, cx, chH / 2, cz, PLASTER);
  p.box(ch * 2 + 0.08, 0.08, ch * 2 + 0.08, cx, chH + 0.04, cz, 0xcfc2a6); // its top edge
  p.box(ch * 2 + 0.02, 0.14, ch * 2 + 0.02, cx, 0.07, cz, OCHRE); // an ochre band round its foot
  box(cx - ch, cx + ch, cz - ch, cz + ch);
  // the trunk: thick and fluted (a few trunks grown together), roots spreading over the platform
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    p.cylinder(0.28, 0.42, 5.2, cx + Math.cos(a) * 0.22, chH + 2.6, cz + Math.sin(a) * 0.22, PAL.bark, { segments: 7 });
    p.strut({ x: cx + Math.cos(a) * 0.4, y: chH + 0.4, z: cz + Math.sin(a) * 0.4 }, { x: cx + Math.cos(a) * 1.3, y: chH + 0.03, z: cz + Math.sin(a) * 1.3 }, 0.1, PAL.bark);
  }
  // red and yellow threads wound round it, for wishes
  for (const [y, colour] of [[chH + 1.0, 0xc62f2a], [chH + 1.1, 0xe8b830], [chH + 1.22, 0xc62f2a]] as const) {
    p.add(new THREE.TorusGeometry(0.62, 0.015, 4, 20).rotateX(Math.PI / 2), cx, y, cz, colour);
  }
  // branches, and the great spreading crown (bigger than the street's trees: it's been here longest)
  for (const [dx, dz, y] of [[-2.6, 0.8, 6.6], [2.4, 1.6, 7.0], [0.4, -2.6, 7.2], [-1.2, 2.6, 6.8], [1.8, -1.2, 7.6]]) {
    p.strut({ x: cx, y: chH + 4.4, z: cz }, { x: cx + dx, y, z: cz + dz }, 0.16, PAL.bark);
  }
  for (let i = 0; i < 34; i++) {
    const a = rng.range(0, Math.PI * 2), rr = rng.range(0.5, 4.6);
    const clump = new THREE.IcosahedronGeometry(rng.range(1.0, 1.5), 1).scale(1, 0.62, 1);
    p.add(clump, cx + Math.cos(a) * rr, rng.range(6.2, 8.8), cz + Math.sin(a) * rr, i % 3 ? PAL.leafDark : PAL.leafLight);
  }
  // a clay diya and a few flowers left at its foot
  p.cylinder(0.05, 0.035, 0.03, cx + 0.75, chH + 0.1, cz - 0.6, 0xa0522d, { segments: 8 });
  for (let k = 0; k < 4; k++) p.add(new THREE.IcosahedronGeometry(0.035, 0), cx + 0.6 + k * 0.06, chH + 0.11, cz - 0.75 + (k % 2) * 0.05, 0xf08a24);

  // --- the handpump --------------------------------------------------------------------------------
  const { x: px, z: pz } = PUMP;
  p.box(1.5, 0.12, 1.5, px, 0.06, pz, CEMENT); // the platform, wet-dark in the middle
  p.box(1.0, 0.005, 1.0, px, 0.125, pz - 0.15, 0x7a7670);
  for (const [dx, dz, lx, lz] of [[0, -0.73, 1.5, 0.06], [0, 0.73, 1.5, 0.06], [-0.73, 0, 0.06, 1.5], [0.73, 0, 0.06, 1.5]]) p.box(lx, 0.08, lz, px + dx, 0.16, pz + dz, CEMENT); // its rim
  p.box(0.3, 0.05, 1.2, px + 0.9, 0.03, pz - 1.0, 0x8a8478, { ry: 0.5 }); // the runnel the water drains away down
  p.cylinder(0.075, 0.09, 0.95, px, 0.6, pz + 0.15, IRON, { segments: 10 }); // the body
  p.cylinder(0.1, 0.1, 0.12, px, 1.1, pz + 0.15, IRON, { segments: 10 }); // its head
  p.strut({ x: px, y: 0.85, z: pz + 0.1 }, { x: px, y: 0.72, z: pz - 0.22 }, 0.035, IRON); // the spout, toward the square
  p.box(0.03, 0.18, 0.06, px, PUMP.pivotY + 0.05, pz + 0.22, IRON); // the handle's bracket (the handle moves: people/mohalla.ts)
  box(px - 0.2, px + 0.2, pz - 0.1, pz + 0.4);

  // --- the shrine in the north-east corner ---------------------------------------------------------
  // A whitewashed box on a low step, its niche facing west into the square (−x here), a band of
  // saffron under the cornice, a four-sided spire with a little kalash on top, and a saffron flag.
  // (Everything that's on its face is built outward from the face: a box can't have a hole cut in it.)
  const sh = at(41.3, -5.5);
  const W = 0.9, face = sh.x - W / 2; // its west face
  p.box(W + 0.24, 0.18, W + 0.24, sh.x, 0.09, sh.z, CEMENT); // the step
  p.box(W, 0.95, W, sh.x, 0.18 + 0.475, sh.z, 0xf2ecdc); // the body
  p.box(W + 0.02, 0.1, W + 0.02, sh.x, 1.08, sh.z, 0xf08a24); // the saffron band
  p.box(W + 0.12, 0.08, W + 0.12, sh.x, 1.17, sh.z, 0xf2ecdc); // the cornice
  // the spire: a square pyramid as wide as the body's top (a 4-sided cone, turned so its sides line up)
  const spireH = 0.8, spireR = (W / 2) * Math.SQRT2;
  p.add(new THREE.ConeGeometry(spireR, spireH, 4).rotateY(Math.PI / 4), sh.x, 1.21 + spireH / 2, sh.z, 0xf2ecdc);
  p.add(new THREE.SphereGeometry(0.06, 8, 6), sh.x, 1.21 + spireH + 0.03, sh.z, 0xd8a030); // the kalash
  // the niche on the west face: a dark opening with an arch-like top, a sindoor-red frame, a little sill
  p.box(0.03, 0.46, 0.4, face - 0.015, 0.68, sh.z, 0x2e2420);
  p.box(0.03, 0.12, 0.26, face - 0.015, 0.95, sh.z, 0x2e2420); // (its rounded top, roughly)
  for (const dz of [-0.23, 0.23]) p.box(0.04, 0.6, 0.05, face - 0.02, 0.72, sh.z + dz, 0xb8322a);
  p.box(0.04, 0.05, 0.5, face - 0.02, 1.03, sh.z, 0xb8322a);
  p.box(0.16, 0.04, 0.5, face - 0.07, 0.44, sh.z, 0xe2d6bc); // the sill
  // on the sill: the stone, smeared with sindoor; a diya beside it; marigolds
  p.add(new THREE.IcosahedronGeometry(0.1, 1).scale(0.8, 1.25, 0.9), face - 0.08, 0.57, sh.z, 0xe0521c);
  p.cylinder(0.035, 0.025, 0.025, face - 0.08, 0.475, sh.z + 0.16, 0xa0522d, { segments: 8 });
  for (let k = 0; k < 3; k++) p.add(new THREE.IcosahedronGeometry(0.028, 0), face - 0.09, 0.48, sh.z - 0.12 - k * 0.04, 0xf08a24);
  // the flag: a pole from the spire's tip, a saffron triangle (a thin three-sided slab, so it's seen
  // from both sides), facing the square
  const poleTop = 1.21 + spireH + 0.85;
  p.cylinder(0.01, 0.01, 0.85, sh.x, poleTop - 0.425, sh.z, 0x6a5a44, { segments: 5 });
  const flag = new THREE.CylinderGeometry(0.2, 0.2, 0.012, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 0.7, 1).rotateY(Math.PI / 2);
  p.add(flag, sh.x, poleTop - 0.12, sh.z - 0.1, 0xf08a24);
  box(sh.x - W / 2 - 0.12, sh.x + W / 2 + 0.12, sh.z - W / 2 - 0.12, sh.z + W / 2 + 0.12);

  // --- the lamps ----------------------------------------------------------------------------------
  const lamps: WorldLamp[] = [];
  for (const { u, v, out } of [{ u: 53.0, v: -5.8, out: -1 }, { u: MOHALLA.laneB + LANE - 0.3, v: MOHALLA.laneC + LANE - 0.3, out: -1 }]) {
    const { x, z } = at(u, v);
    p.cylinder(0.07, 0.1, 5, x, 2.5, z, 0x3a3f3a, { segments: 8 });
    p.box(0.8, 0.07, 0.08, x - out * 0.35, 5.0, z, 0x3a3f3a);
    p.box(0.36, 0.1, 0.2, x - out * 0.72, 4.95, z, 0xf2ead6);
    lamps.push({ kind: "bulb", position: toWorld(x - out * 0.72, 4.87, z), rotationY: 0, w: 1, h: 1, back: 0, ground: 0, pole: true });
    box(x - 0.12, x + 0.12, z - 0.12, z + 0.12);
  }

  group.add(p.build("mohallaSquareThings"));
  return { group, colliders, lamps };
}
