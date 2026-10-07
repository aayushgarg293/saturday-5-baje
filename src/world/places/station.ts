import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import type { Patch } from "../../core/floors";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { STATION, inStation } from "../station";
import type { WorldSign } from "../street";
import { cartWheels } from "../props/cartWheels";

/**
 * The station end of the station lane (world/station.ts):
 *
 *   the godown        a long tin-roofed shed on the lane's south side, two
 *                     big shutters, sacks stacked outside, a handcart
 *   the railway       its boundary walls either side of the line, the line
 *                     itself (ballast, concrete sleepers, the two rails) running
 *                     off north and south; a signal at each end of as far as
 *                     you can walk along it
 *   the crossing      concrete panels between the rails where the lane
 *                     crosses; the two barriers' posts, red and white (their
 *                     booms come down for the trains: world/railway.ts); the gateman's hut with its gate number; the
 *                     yellow warning boards
 *   the station       the platform (a ramp up from the forecourt), its
 *                     yellow edge line, the name board at each end; the
 *                     station building behind it, its arched doors, the
 *                     tin canopy on posts, benches, the drinking-water tap
 *
 * FRAME: the station's own, with its origin where the lane crosses the line
 * (so it's shown and hidden with the station: world/areas.ts): x east, z
 * south. A point at (u, v) on the station grid is (track − u, v) here.
 */

export type StationPlace = { group: THREE.Group; colliders: Box[]; floors: Patch[]; lamps: WorldLamp[]; signs: WorldSign[] };

const T = STATION.railway.track;
const at = (u: number) => T - u; // the grid's u as x here
const CEMENT = 0xa8a39a, WALL = 0xd2c8b0, COPING = 0xb8ad94, BALLAST = 0x7f776c, SLEEPER = 0x9a958c, RAIL = 0x5a5550;
const STATION_CREAM = 0xeadfc4, RAILWAY_RED = 0x9a3a2a, TIN = 0x8a8f92;
/** Facing east (toward the town), south, north (a sign faces its +z, turned by this). */
const FACE = { east: Math.PI / 2, south: 0, north: Math.PI, west: -Math.PI / 2 };

export function buildStation(): StationPlace {
  const origin = inStation(T, 0);
  const group = new THREE.Group();
  group.name = "station";
  group.position.set(origin.x, 0, origin.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const colliders: Box[] = [];
  const floors: Patch[] = [];
  const lamps: WorldLamp[] = [];
  const signs: WorldSign[] = [];
  /** A collider over x0..x1 by z0..z1 (optionally only up to height y1). */
  const box = (x0: number, x1: number, z0: number, z1: number, y1?: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push({ ...boxAt(c.x, c.z, Math.abs(x1 - x0), Math.abs(z1 - z0), 0), ...(y1 === undefined ? {} : { y1 }) });
  };
  const floor = (x0: number, x1: number, z0: number, z1: number, front: number, back: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    floors.push({ cx: c.x, cz: c.z, hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, rot: 0, front, back });
  };
  const sign = (kind: WorldSign["kind"], x: number, y: number, z: number, rotationY: number, w: number, h: number, label: string) =>
    signs.push({ kind, position: toWorld(x, y, z), rotationY, w, h, label });
  /** A wall from (x0, z0) to (x1, z1), one of the two the same, `h` high, with a coping. */
  const wall = (x0: number, z0: number, x1: number, z1: number, h = 1.9) => {
    const t = 0.25;
    const [ax0, ax1] = x0 === x1 ? [x0 - t / 2, x0 + t / 2] : [Math.min(x0, x1), Math.max(x0, x1)];
    const [az0, az1] = z0 === z1 ? [z0 - t / 2, z0 + t / 2] : [Math.min(z0, z1), Math.max(z0, z1)];
    p.slab(ax0, ax1, 0, h, az0, az1, WALL);
    p.slab(ax0 - 0.04, ax1 + 0.04, h, h + 0.08, az0 - 0.04, az1 + 0.04, COPING);
    box(ax0, ax1, az0, az1);
  };

  // --- the godown ---------------------------------------------------------------------------------
  {
    const g = { x0: at(STATION.godown.u1), x1: at(STATION.godown.u0), front: STATION.half + 0.3, back: STATION.half + 10 };
    const mid = (g.x0 + g.x1) / 2, len = g.x1 - g.x0, eaves = 4.5, ridge = 5.6, depth = g.back - g.front;
    p.slab(g.x0, g.x1, 0, eaves, g.front, g.back, 0xcfc8b8);
    p.slab(g.x0, g.x1, 0, 0.5, g.front - 0.02, g.back, 0x8a8478); // a dirty band at its foot
    // the roof: two tin slopes up to the ridge (and its gable ends, filled)
    const run = depth / 2, slope = Math.atan2(ridge - eaves, run), lenSlope = Math.hypot(run, ridge - eaves);
    p.box(len + 0.4, 0.06, lenSlope + 0.3, mid, (eaves + ridge) / 2, g.front + run / 2, TIN, { rx: -slope });
    p.box(len + 0.4, 0.06, lenSlope + 0.3, mid, (eaves + ridge) / 2, g.back - run / 2, TIN, { rx: slope });
    for (const x of [g.x0, g.x1]) {
      const gable = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(depth, 0), new THREE.Vector2(depth / 2, ridge - eaves)]);
      p.add(new THREE.ExtrudeGeometry(gable, { depth: 0.2, bevelEnabled: false }).rotateY(-Math.PI / 2), x + 0.1, eaves, g.front, 0xcfc8b8);
    }
    // the shutters, facing the lane (−z), ribbed
    for (const dx of [-len / 4, len / 4]) {
      p.box(3.4, 3.1, 0.05, mid + dx, 1.55, g.front - 0.03, 0x7a7e80);
      for (let y = 0.2; y < 3.1; y += 0.22) p.box(3.4, 0.03, 0.03, mid + dx, y, g.front - 0.07, 0x9a9ea0);
      p.box(3.6, 0.25, 0.12, mid + dx, 3.2, g.front - 0.06, 0x5a5e60); // the shutter's box at the top
    }
    sign("stallSign", mid, 3.95, g.front - 0.02, FACE.north, 5.2, 0.7, "गोयल ट्रेडर्स • गोदाम");
    // sacks stacked by the first shutter; a handcart by the second
    for (let k = 0; k < 7; k++) {
      const sack = new THREE.CapsuleGeometry(0.22, 0.5, 3, 8).rotateZ(Math.PI / 2).scale(1, 0.8, 1.15);
      p.add(sack, mid - len / 4 - 1.4 + (k % 4) * 0.9 + (k >= 4 ? 0.45 : 0), 0.2 + (k >= 4 ? 0.36 : 0), g.front - 0.45, 0xc2a46a);
    }
    box(mid - len / 4 - 1.9, mid - len / 4 + 1.9, g.front - 0.75, g.front);
    const cart = { x: mid + len / 4 + 2.6, z: g.front - 0.7 };
    p.box(1.8, 0.08, 0.9, cart.x, 0.62, cart.z, 0x8a6a44);
    cartWheels(p, { x: cart.x, z: cart.z, length: 1.8, width: 0.9, underside: 0.58, radius: 0.2 });
    p.strut({ x: cart.x - 0.9, y: 0.62, z: cart.z }, { x: cart.x - 1.5, y: 0.2, z: cart.z }, 0.03, 0x8a6a44);
    box(cart.x - 1.5, cart.x + 0.95, cart.z - 0.55, cart.z + 0.55);
    box(g.x0, g.x1, g.front, g.back);
  }

  // --- the railway's walls ------------------------------------------------------------------------------
  const R = STATION.railway, L = STATION.line, E = STATION.enclosure, P = STATION.platform;
  const gap = STATION.half + 0.5;
  // the east wall (the town's side), broken where the lane crosses
  wall(at(R.eastWall), -L.drawn, at(R.eastWall), -gap);
  wall(at(R.eastWall), gap, at(R.eastWall), L.drawn);
  // the west wall south of the station; north of it; and the station's enclosure
  wall(at(R.westWall), gap, at(R.westWall), L.drawn);
  wall(at(R.westWall), E.north, at(R.westWall), -L.drawn);
  wall(at(R.westWall), gap, at(E.west), gap);
  wall(at(E.west), gap, at(E.west), E.north);
  wall(at(R.westWall), E.north, at(E.west), E.north);
  // as far as you can walk along the line: a signal at each end (and there you stop)
  for (const z of [-L.walk, L.walk]) {
    const sx = 3.2; // (beside the line, on the town's side)
    p.cylinder(0.08, 0.1, 5.2, sx, 2.6, z, 0x4a4f50, { segments: 8 });
    p.box(0.5, 0.9, 0.06, sx, 4.6, z + 0.06 * Math.sign(z), 0x1d1b19);
    p.cylinder(0.11, 0.11, 0.04, sx, 4.85, z + 0.1 * Math.sign(z), 0xd02a20, { rx: Math.PI / 2, segments: 10 });
    p.cylinder(0.11, 0.11, 0.04, sx, 4.4, z + 0.1 * Math.sign(z), 0x2f6a3a, { rx: Math.PI / 2, segments: 10 });
    for (let y = 0.4; y < 4.4; y += 0.35) p.box(0.3, 0.03, 0.03, sx + 0.2, y, z, 0x4a4f50); // its ladder
    box(at(R.westWall), at(R.eastWall), z - 0.2, z + 0.2);
  }

  // --- the line: ballast, sleepers, rails; concrete panels where the lane crosses ------------------------
  const BED = 2.1, GAUGE = 1.676 / 2;
  p.slab(-BED, BED, 0, 0.14, -L.drawn, L.drawn, BALLAST);
  for (let z = -L.drawn + 0.3; z < L.drawn; z += 0.65) {
    if (Math.abs(z) < STATION.half) continue;
    p.box(2.6, 0.08, 0.24, 0, 0.17, z, SLEEPER);
  }
  for (const x of [-GAUGE, GAUGE]) {
    p.box(0.07, 0.14, L.drawn * 2, x, 0.28, 0, RAIL);
    p.box(0.035, 0.015, L.drawn * 2, x, 0.355, 0, 0xb9b4ac); // the bright top, polished by the wheels
  }
  p.slab(-BED, BED, 0, 0.32, -STATION.half, STATION.half, 0x9a958a); // the crossing's panels, flush with the rails
  floor(-BED, BED, -STATION.half, STATION.half, 0.32, 0.32);

  // --- the barriers' posts, and the gateman's hut ------------------------------------------------------
  // (both on the lane's north side: on the south, the walls come right up to the lane)
  for (const { x, z, dir } of [{ x: at(R.eastWall - 1.2), z: -STATION.half - 0.6, dir: 1 }, { x: at(R.westWall + 1.5), z: -STATION.half - 0.6, dir: 1 }]) {
    // the post, banded red and white
    for (let k = 0; k < 4; k++) p.box(0.28, 0.28, 0.28, x, 0.14 + k * 0.28, z, k % 2 ? 0xf2efe6 : 0xc62f2a);
    // its counterweight below the pivot (the boom itself swings up and down: world/railway.ts)
    p.box(0.22, 0.5, 0.22, x, 0.75, z - 0.3 * dir, 0x3a3f42);
    box(x - 0.2, x + 0.2, z - 0.4, z + 0.4);
  }
  {
    const hut = { x: at(73.8), z: -6.3 };
    p.box(2.5, 2.6, 2.6, hut.x, 1.3, hut.z, 0xc9a07a);
    p.box(2.8, 0.15, 2.9, hut.x, 2.67, hut.z, CEMENT);
    p.box(0.8, 1.9, 0.04, hut.x - 0.4, 0.95, hut.z + 1.32, 0x3a4a5a); // the door, facing the lane
    p.box(0.7, 0.6, 0.04, hut.x + 0.6, 1.5, hut.z + 1.32, 0x2a2622); // a window
    p.box(0.04, 0.6, 0.7, hut.x - 1.27, 1.5, hut.z, 0x2a2622); // and one looking down the line
    box(hut.x - 1.25, hut.x + 1.25, hut.z - 1.3, hut.z + 1.3);
    sign("railBoard", hut.x, 2.3, hut.z + 1.33, FACE.south, 1.3, 0.38, "फाटक संख्या 41-सी");
    // a lamp over the door
    p.box(0.1, 0.1, 0.25, hut.x + 0.3, 2.35, hut.z + 1.42, 0x3a3f3a);
    lamps.push({ kind: "bulb", position: toWorld(hut.x + 0.3, 2.25, hut.z + 1.55), rotationY: 0, w: 1, h: 1, back: 0, ground: 0 });
  }
  // the warning boards on the way in
  for (const { u, z, label } of [
    { u: 55, z: -STATION.half + 0.7, label: "सावधान!\nआगे रेलवे फाटक" },
    { u: 70, z: STATION.half - 0.7, label: "रुकिए • देखिए • सुनिए\nफिर फाटक पार कीजिए" },
  ]) {
    for (const dz of [-0.55, 0.55]) p.box(0.06, 1.9, 0.06, at(u), 0.95, z + dz, 0x2a2622);
    sign("railBoard", at(u) + 0.04, 1.6, z, FACE.east, 1.4, 0.7, label);
  }
  // (on the forecourt's south wall, facing the crossing)
  sign("railBoard", at(R.westWall) - 3.5, 1.3, gap - 0.14, FACE.north, 1.5, 0.55, "रेलवे लाइन पार करना\nदंडनीय अपराध है");

  // --- the platform, and its ramp up from the forecourt -----------------------------------------------------
  const px0 = at(P.back), px1 = at(P.edge), H = P.height;
  p.slab(px0, px1, 0, H, P.end, P.rampTop, CEMENT);
  p.slab(px1 - 0.05, px1, 0, H - 0.02, P.end, P.rampTop, 0x8a857c); // its face to the line, darker
  p.slab(px1 - 0.45, px1 - 0.3, H, H + 0.005, P.end, P.rampTop, 0xe8c22a); // the yellow line: stand behind it
  box(px0, px1, P.end, P.rampTop, 0.7); // (only stops you from below: up on it, you walk on it)
  floor(px0, px1, P.end, P.rampTop, H, H);
  const rampLen = P.rampFoot - P.rampTop;
  const wedge = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(rampLen, 0), new THREE.Vector2(rampLen, H)]);
  p.add(new THREE.ExtrudeGeometry(wedge, { depth: px1 - px0, bevelEnabled: false }).rotateY(Math.PI / 2), px0, 0, P.rampFoot, CEMENT);
  floor(px0, px1, P.rampTop, P.rampFoot, 0, H); // (its front, the foot, is to the south: +z)
  // the name boards: one at the top of the ramp, one at the far end, across the platform, facing
  // back toward the ramp (south): what you read as you come up, and looking down the platform
  const boardX = (px0 + px1) / 2;
  for (const z of [P.rampTop - 2, P.end + 6]) {
    for (const dx of [-1.5, 1.5]) p.box(0.08, 2.9, 0.08, boardX + dx, H + 1.45, z - 0.06, 0x2a2622);
    p.box(3.5, 1.25, 0.05, boardX, H + 2.2, z - 0.04, 0x1a1714); // its back
    sign("railBoard", boardX, H + 2.2, z, FACE.south, 3.4, 1.15, "दौलतबाग़\nDAULATBAGH\nसमुद्र तल से ऊँचाई 486.20 मी.");
    box(boardX - 1.6, boardX - 1.4, z - 0.15, z + 0.05);
    box(boardX + 1.4, boardX + 1.6, z - 0.15, z + 0.05);
  }

  // --- the station building, the canopy, benches, the tap ------------------------------------------------------
  const b = { x0: at(E.west - 1), x1: px0, z0: -46, z1: -18 }, top = H + 3.6;
  p.slab(b.x0, b.x1, 0, top, b.z0, b.z1, STATION_CREAM);
  p.slab(b.x1, b.x1 + 0.02, H, H + 0.5, b.z0, b.z1, RAILWAY_RED); // a red-brown band along its foot
  p.slab(b.x0 - 0.1, b.x1 + 0.12, top, top + 0.18, b.z0 - 0.1, b.z1 + 0.1, RAILWAY_RED); // the cornice
  p.slab(b.x0, b.x1, top + 0.18, top + 0.9, b.z0, b.z1, STATION_CREAM); // the parapet
  box(b.x0, b.x1, b.z0, b.z1);
  const doors = [-22, -28, -34, -40];
  const doorLabels = ["टिकट घर", "स्टेशन मास्टर", "प्रतीक्षालय", "पार्सल कार्यालय"];
  doors.forEach((z, k) => {
    p.box(0.04, 2.1, 1.3, b.x1 + 0.02, H + 1.05, z, 0x2e2a26); // the doorway (dark)
    p.box(0.04, 0.35, 0.9, b.x1 + 0.02, H + 2.25, z, 0x2e2a26); // its top, stepped in like an arch
    p.box(0.06, 0.12, 1.6, b.x1 + 0.04, H + 2.85, z, RAILWAY_RED); // the arch's hood
    sign("railBoard", b.x1 + 0.07, H + 3.2, z, FACE.east, 1.4, 0.3, doorLabels[k]);
  });
  sign("railBoard", b.x1 + 0.05, top + 0.55, (b.z0 + b.z1) / 2 + 7, FACE.east, 4.6, 0.62, "दौलतबाग़  DAULATBAGH");
  // the canopy: posts along the platform, a tin roof sloping down toward the line
  const canopy = { x: px1 - 1.4, z0: b.z0 + 1, z1: b.z1 - 1 };
  for (let z = canopy.z1; z >= canopy.z0 - 0.01; z -= 4) {
    p.cylinder(0.07, 0.07, 3.0, canopy.x, H + 1.5, z, 0x3a5a4a, { segments: 8 });
    box(canopy.x - 0.12, canopy.x + 0.12, z - 0.12, z + 0.12);
  }
  const roofRun = canopy.x - b.x1 + 0.6, roofTilt = Math.atan2(0.5, roofRun);
  p.box(roofRun + 0.4, 0.05, canopy.z1 - canopy.z0 + 1.2, (b.x1 + canopy.x) / 2 + 0.2, H + 3.25, (canopy.z0 + canopy.z1) / 2, TIN, { rz: -roofTilt });
  p.box(roofRun + 0.4, 0.04, canopy.z1 - canopy.z0 + 1.2, (b.x1 + canopy.x) / 2 + 0.2, H + 3.2, (canopy.z0 + canopy.z1) / 2, 0x6a6e70, { rz: -roofTilt });
  for (const z of [-26, -38]) {
    lamps.push({ kind: "bulb", position: toWorld((b.x1 + canopy.x) / 2, H + 3.0, z), rotationY: 0, w: 1, h: 1, back: 0, ground: H });
    p.cylinder(0.05, 0.05, 0.12, (b.x1 + canopy.x) / 2, H + 3.08, z, 0xf2ead6, { segments: 8 });
  }
  // benches against the building
  for (const z of [-25, -37]) {
    p.box(0.45, 0.06, 1.8, b.x1 + 0.4, H + 0.45, z, 0x5a3a22);
    p.box(0.06, 0.5, 1.8, b.x1 + 0.17, H + 0.75, z, 0x5a3a22);
    for (const dz of [-0.75, 0.75]) p.box(0.4, 0.45, 0.06, b.x1 + 0.4, H + 0.22, z + dz, 0x2a2622);
    box(b.x1, b.x1 + 0.65, z - 0.9, z + 0.9);
  }
  // the drinking-water tap: a tiled stand with three taps, a board over it
  {
    const t = { x: b.x1 + 0.45, z: b.z0 - 3 };
    p.box(0.6, 0.9, 1.4, t.x, H + 0.45, t.z, 0xd8dcd8);
    for (const dz of [-0.4, 0, 0.4]) p.box(0.15, 0.04, 0.04, t.x + 0.36, H + 0.75, t.z + dz, 0xb9bcc0);
    for (const dz of [-0.55, 0.55]) p.box(0.06, 1.0, 0.06, t.x - 0.2, H + 1.4, t.z + dz, 0x2a2622);
    sign("railBoard", t.x - 0.16, H + 1.75, t.z, FACE.east, 1.2, 0.4, "पीने का पानी");
    box(t.x - 0.3, t.x + 0.3, t.z - 0.7, t.z + 0.7);
  }

  group.add(p.build("stationThings"));
  return { group, colliders, floors, lamps, signs };
}

/** Where the people at the station go (people/station.ts), in this frame. */
export const STATION_SPOTS = {
  /** The gateman's chair, outside his hut, facing the lane. */
  gateman: { x: at(73.8) - 0.6, z: -4.45, turn: 0 },
  /** The platform's first bench (the coolie sits there), and a spot near the ramp's top (a passenger waiting, looking down the line). */
  bench: { x: at(STATION.platform.back) + 0.45, z: -37, turn: Math.PI / 2 },
  waiting: { x: at(STATION.platform.edge) - 1.5, z: -15, turn: 0.3 },
  height: STATION.platform.height,
};
