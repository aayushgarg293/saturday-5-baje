import * as THREE from "three";
import { toon } from "../../render/toon";
import { Parts } from "../kit";
import { COACH, ENGINE } from "../trainTimetable";

/**
 * A train's cars (world/railway.ts): a diesel engine, the kind that pulled
 * every passenger train in Rajasthan then (long hood, the cab near the front,
 * a short nose ahead of it; dark blue with a cream band), and coaches (the
 * old steel kind: maroon for the general class, blue for the sleepers),
 * windows with bars, doors at each end, a rounded grey roof, two bogies
 * under each.
 *
 * Each car is one mesh, built in its own frame: +x forward (the engine's nose
 * is at +x), its middle at the origin, y = 0 at the ground (the rails' tops
 * at RAIL). No random numbers.
 */

export const RAIL = 0.355;
const WHEEL = 0.46, BOGIE = 2.9; // (wheel radius; the two axles of a bogie, this far apart)
const DARK = 0x1d1b19, BOGIE_GREY = 0x2e2c2a, ROOF = 0x8e8c86, WINDOW = 0x24282a, BARS = 0x9a968e;

/** The axles of a car, as metres from its middle along it (for the wheels' clatter: audio/train.ts). */
export function axles(length: number): number[] {
  const b = length / 2 - 3.2; // (the bogies' middles)
  return [b + BOGIE / 2, b - BOGIE / 2, -b + BOGIE / 2, -b - BOGIE / 2];
}

/** Two bogies under a car: their frames, springs, the wheels on the rails. */
function bogies(p: Parts, length: number, width: number) {
  for (const x of [length / 2 - 3.2, -(length / 2 - 3.2)]) {
    p.box(BOGIE + 1.0, 0.45, width - 0.5, x, RAIL + WHEEL + 0.05, 0, BOGIE_GREY);
    for (const dx of [-BOGIE / 2, BOGIE / 2]) {
      for (const z of [-0.84, 0.84]) p.cylinder(WHEEL, WHEEL, 0.12, x + dx, RAIL + WHEEL - 0.04, z, DARK, { rx: Math.PI / 2, segments: 14 });
    }
  }
}

/** A coach: `colour` its sides (maroon general, blue sleeper). */
export function buildCoach(colour: number): THREE.Mesh {
  const p = new Parts();
  const L = COACH - 0.6, W = 3.2, y0 = 1.25, y1 = 3.85; // (a little short of its 22 m: the gap between coaches)
  p.box(L, y1 - y0, W, 0, (y0 + y1) / 2, 0, colour);
  // the roof: a flattened half-cylinder along it
  p.add(new THREE.CylinderGeometry(W / 2, W / 2, L, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.22, 1), 0, y1, 0, ROOF);
  // under the floor: the battery boxes, the bogies
  p.box(L * 0.4, 0.5, W - 0.9, 0, y0 - 0.25, 0, DARK);
  bogies(p, L, W);
  for (const side of [-1, 1]) {
    const z = side * (W / 2 + 0.01);
    // windows: a row of barred openings between the doors
    for (let x = -L / 2 + 2.4; x <= L / 2 - 2.4; x += 1.45) {
      p.box(0.95, 0.78, 0.02, x, 2.62, z, WINDOW);
      for (let k = -1; k <= 1; k++) p.box(0.02, 0.78, 0.03, x + k * 0.3, 2.62, z + side * 0.005, BARS);
    }
    // the doors, one at each end, and the steps under them
    for (const x of [-L / 2 + 1.0, L / 2 - 1.0]) {
      p.box(0.75, 2.05, 0.02, x, 2.3, z, shade(colour, 0.75));
      p.box(0.7, 0.08, 0.3, x, y0 - 0.15, side * (W / 2 + 0.1), DARK);
    }
    // a thin cream line along under the windows
    p.box(L, 0.06, 0.02, 0, 2.12, z + side * 0.002, 0xe8dcb0);
  }
  // the gangways at the ends (the bellows between coaches)
  for (const x of [-L / 2 - 0.25, L / 2 + 0.25]) p.box(0.5, 2.2, 1.3, x, 2.4, 0, DARK);
  return mesh(p, "coach");
}

/** The diesel engine, nose at +x: a short nose, the cab, then the long hood back to the rear. */
export function buildEngine(): THREE.Mesh {
  const p = new Parts();
  const L = ENGINE - 0.4, W = 3.1, deck = 1.45;
  const BLUE = 0x24407a, CREAM = 0xe8dcb0, RED = 0xb8322a;
  // the running board along its whole length, and the buffers and cow-catcher at each end
  p.box(L, 0.25, W, 0, deck - 0.12, 0, DARK);
  for (const x of [L / 2, -L / 2]) {
    p.box(0.3, 0.6, W - 0.3, x, deck - 0.5, 0, RED);
    for (const z of [-0.9, 0.9]) p.cylinder(0.17, 0.17, 0.35, x + Math.sign(x) * 0.25, deck - 0.45, z, 0x5a5652, { rz: Math.PI / 2, segments: 10 });
  }
  bogies(p, L, W);
  // the cab, 3 m back from the nose: full width, tall, windows all round
  const cab = { x0: L / 2 - 4.6, x1: L / 2 - 2.0 }, top = 4.15;
  p.slab(cab.x0, cab.x1, deck, top, -W / 2 + 0.05, W / 2 - 0.05, BLUE);
  p.slab(cab.x0 - 0.05, cab.x1 + 0.05, top, top + 0.12, -W / 2, W / 2, CREAM); // its roof
  p.box(0.02, 0.85, W - 0.6, cab.x1 + 0.01, 3.3, 0, WINDOW); // the front windows
  for (const z of [-W / 2 + 0.04, W / 2 - 0.04]) p.box(1.2, 0.8, 0.02, (cab.x0 + cab.x1) / 2 + 0.3, 3.3, z, WINDOW);
  // the short nose in front of the cab, lower; its headlight on top
  p.slab(cab.x1, L / 2 - 0.2, deck, 3.0, -W / 2 + 0.45, W / 2 - 0.45, BLUE);
  p.cylinder(0.16, 0.16, 0.12, L / 2 - 0.25, 3.15, 0, 0xf2ead6, { rz: Math.PI / 2, segments: 12 });
  // the long hood back from the cab: narrower, its grilles and doors, the radiator fans on top
  p.slab(-L / 2 + 0.3, cab.x0, deck, 3.75, -W / 2 + 0.5, W / 2 - 0.5, BLUE);
  for (let x = -L / 2 + 1; x < cab.x0 - 0.5; x += 1.4) for (const z of [-W / 2 + 0.49, W / 2 - 0.49]) p.box(0.9, 1.3, 0.02, x, 2.55, z, shade(BLUE, 0.7));
  for (const x of [-L / 2 + 2.2, -L / 2 + 4.2]) p.cylinder(0.55, 0.55, 0.08, x, 3.8, 0, 0x3a3f42, { segments: 14 });
  p.cylinder(0.14, 0.18, 0.4, cab.x0 - 2.5, 3.95, 0, DARK, { segments: 8 }); // the exhaust
  // the cream band all along, and red stripes on the nose
  for (const z of [-1, 1]) {
    p.box(L - 0.8, 0.22, 0.02, 0, 2.05, z * (W / 2 - 0.44), CREAM);
    p.box(cab.x1 - cab.x0, 0.22, 0.02, (cab.x0 + cab.x1) / 2, 2.05, z * (W / 2 - 0.03), CREAM);
  }
  for (let k = 0; k < 3; k++) p.box(0.02, 0.12, W - 1.0, L / 2 - 0.19, 1.8 + k * 0.32, 0, k % 2 ? CREAM : RED);
  // the handrails along the running board
  for (const z of [-W / 2 + 0.1, W / 2 - 0.1]) p.box(L - 1.2, 0.04, 0.04, -0.6, deck + 0.95, z, 0xd8d0b8);
  return mesh(p, "engine");
}

function mesh(p: Parts, name: string): THREE.Mesh {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true }));
  m.name = name;
  m.castShadow = true;
  return m;
}

function shade(hex: number, f: number): number {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}
