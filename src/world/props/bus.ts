import * as THREE from "three";
import { type Rng, makeRng } from "../../core/rng";
import { Parts } from "../kit";
import type { WorldSign } from "../street";

/**
 * A roadways bus of the time: the long cream body with a red and a blue
 * stripe, the band of open windows with cream pillars between them (some
 * with their sliding panes half across), and inside, the rows of seats and
 * the passengers sitting at the windows, the driver at the wheel; luggage
 * roped onto the roof carrier, a ladder up the back to reach it, the door
 * on the left side near the front, six wheels (doubled at the back), round
 * headlamps, and the destination board over the windscreen.
 *
 * Its words (the company on each side, the destination in front) are
 * painted by world/signs.ts: `busSigns` says where.
 *
 * FRAME: the bus's own: +x forward, y up, +z to its right (as the street's
 * vehicles: world/props/vehicles.ts); its middle on the ground at the origin.
 */

export const BUS = { length: 10.6, width: 2.5, height: 3.05 };

const CREAM = 0xece4cc, RED = 0xb8322a, BLUE = 0x2f4f9a, TYRE = 0x1d1b19, CHROME = 0xb9bcc0;
const SKIN = [0x8d5a3b, 0xa06a48, 0x6e4430, 0xb07a52];
const SHIRTS = [0xf2efe6, 0x5a7fb0, 0xc0603a, 0x6a8a5a, 0xd8c08a, 0x9a4a6a, 0xe8e2d0];

/**
 * Someone sitting on a seat at (x, z), seen from the shoulders up through
 * the window: a shirt or a sari's shoulder, a head, hair (or a turban, or a
 * woman's odhni over her head). Built into the bus's own mesh: they sit
 * still, as people on a waiting bus do.
 */
function passenger(p: Parts, rng: Rng, x: number, z: number, driver = false) {
  const shirt = driver ? 0xb8a26a : rng.pick(SHIRTS);
  // the body: rounded shoulders (a capsule, flattened front to back) sitting up from the cushion; seen
  // from the ground, the window sill hides everything below the chest, so the head and shoulders are
  // what reads: both a little big, as the street's people are
  p.add(new THREE.CapsuleGeometry(0.17, 0.32, 4, 10).scale(0.8, 1, 1.1), x, 1.86, z, shirt);
  const headY = 2.3;
  p.add(new THREE.SphereGeometry(0.12, 10, 8), x, headY, z, rng.pick(SKIN));
  const r = rng.next();
  if (!driver && r < 0.2) p.add(new THREE.SphereGeometry(0.145, 10, 8).scale(1, 1.05, 1.1), x - 0.02, headY + 0.02, z, rng.pick([0xc2186b, 0xe65100, 0xf9a825, 0x2e7d32])); // an odhni
  else if (!driver && r < 0.35) p.cylinder(0.135, 0.145, 0.13, x, headY + 0.09, z, rng.pick([0xd8402a, 0xf2c81f, 0xf4f2ea]), { segments: 10 }); // a turban
  else p.add(new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), x - 0.01, headY + 0.01, z, 0x1d1714); // hair
}

/** Who's on board: the seats taken, by chance (the bus's own `seed`, so each bus is the same every time). */
export function buildBus(seed: number): THREE.Mesh {
  const p = new Parts();
  const rng = makeRng(seed);
  const L = BUS.length / 2, W = BUS.width / 2;
  // the body: below the windows, cream, with the two stripes
  p.box(BUS.length, 1.1, BUS.width, 0, 1.0, 0, CREAM);
  p.box(BUS.length + 0.02, 0.16, BUS.width + 0.02, 0, 1.32, 0, RED);
  p.box(BUS.length + 0.02, 0.1, BUS.width + 0.02, 0, 1.16, 0, BLUE);
  // the window band: open windows between cream pillars, a rail above them; the roof band
  const pillars: number[] = [];
  for (let x = -L + 0.4; x <= L - 0.6; x += 0.95) pillars.push(x);
  for (const x of pillars) for (const z of [-W + 0.02, W - 0.02]) p.box(0.12, 1.0, 0.05, x, 2.05, z, CREAM);
  for (const z of [-W + 0.02, W - 0.02]) {
    p.box(BUS.length - 0.1, 0.06, 0.06, 0, 1.58, z, 0x9a9488); // the sill
    // here and there a sliding pane pulled half across: dusty glass in an aluminium frame (dark enough
    // that it reads as glass, not as a white board)
    pillars.slice(0, -1).forEach((x, k) => {
      if (rng.next() >= 0.4) return;
      const px = x + 0.3 + (k % 2) * 0.2, pz = z + Math.sign(z) * 0.03;
      p.box(0.42, 0.86, 0.015, px, 2.05, pz, 0x5f7276);
      for (const dy of [-0.44, 0.44]) p.box(0.44, 0.03, 0.03, px, 2.05 + dy, pz, CHROME);
    });
  }
  p.box(BUS.length, 0.5, BUS.width, 0, 2.8, 0, CREAM);
  // inside: the floor, the rows of seats (two on the left, three on the right of the aisle), the
  // passengers sitting at the windows, the driver up front on the right at his big steering wheel
  p.box(BUS.length - 0.3, 0.04, BUS.width - 0.1, 0, 1.08, 0, 0x4a4440);
  const seatZ = [-0.95, -0.55, 0.3, 0.68, 1.02];
  pillars.slice(0, -2).forEach((x) => {
    for (const z of seatZ) {
      const w = z < 0 ? 0.38 : 0.34;
      p.box(0.4, 0.08, w, x + 0.5, 1.5, z, 0x6a2a24); // the cushion
      p.box(0.06, 0.55, w, x + 0.3, 1.8, z, 0x7a3028); // the back
      if (rng.next() < 0.55) passenger(p, rng, x + 0.55, z);
    }
  });
  passenger(p, rng, L - 1.0, 0.75, true); // the driver
  p.add(new THREE.TorusGeometry(0.22, 0.025, 6, 16).rotateY(Math.PI / 2).rotateZ(0.5), L - 0.6, 1.85, 0.75, 0x1d1b19);
  p.box(BUS.length + 0.04, 0.1, BUS.width + 0.04, 0, 3.07, 0, 0xd9d0b4); // the roof's lip
  // the front: the windscreen's frame and its divider (no glass to speak of: you see the driver),
  // the destination board's frame above it, lamps, bumper
  for (const z of [-W + 0.08, 0, W - 0.08]) p.box(0.07, 0.95, 0.08, L + 0.03, 2.05, z, CREAM);
  p.box(0.08, 0.32, 1.5, L + 0.03, 2.78, 0, 0x1f1d1b); // the board's frame
  for (const z of [-0.85, 0.85]) {
    p.cylinder(0.12, 0.12, 0.06, L + 0.04, 0.85, z, 0xf2ead6, { rz: Math.PI / 2, segments: 12 });
    p.cylinder(0.15, 0.15, 0.04, L + 0.02, 0.85, z, CHROME, { rz: Math.PI / 2, segments: 12 });
  }
  p.box(0.12, 0.2, BUS.width + 0.06, L + 0.06, 0.48, 0, 0x2a2826); // the bumper
  p.box(0.05, 0.3, 1.0, L + 0.03, 0.75, 0, 0x4a4844); // the grille
  // the back: a window (its frame), a ladder to the roof, the bumper
  p.box(0.06, 0.8, 0.12, -L - 0.02, 2.05, -W + 0.2, CREAM);
  p.box(0.06, 0.8, 0.12, -L - 0.02, 2.05, W - 0.2, CREAM);
  for (const z of [0.55, 0.85]) p.box(0.04, 2.4, 0.04, -L - 0.08, 1.85, z, CHROME);
  for (let y = 0.9; y <= 2.9; y += 0.3) p.box(0.04, 0.03, 0.34, -L - 0.08, y, 0.7, CHROME);
  p.box(0.12, 0.2, BUS.width + 0.06, -L - 0.06, 0.48, 0, 0x2a2826);
  // the door, on the left, near the front: dark, with a step below
  p.box(0.9, 1.9, 0.04, L - 1.3, 1.45, -W - 0.01, 0x2a2a2c);
  p.box(0.9, 0.12, 0.3, L - 1.3, 0.4, -W - 0.1, 0x6a6a6c);
  // the roof carrier: rails, and the luggage roped onto it (tin trunks, a bedroll, bags)
  for (const z of [-W + 0.15, W - 0.15]) p.box(BUS.length * 0.6, 0.06, 0.06, -0.8, 3.4, z, CHROME);
  for (let x = -L + 1.5; x <= L - 2.5; x += 1.2) for (const z of [-W + 0.15, W - 0.15]) p.box(0.05, 0.3, 0.05, x, 3.25, z, CHROME);
  const luggage: [number, number, number, number, number, number, number][] = [
    [-2.6, 3.32, -0.4, 0.9, 0.4, 0.6, 0x3f5f8a], [-1.6, 3.3, 0.5, 0.7, 0.35, 0.55, 0x8a2a24],
    [-0.4, 3.28, -0.2, 0.6, 0.32, 0.9, 0x5a6a3a], [0.6, 3.3, 0.45, 0.8, 0.4, 0.5, 0x2a2a2c],
  ];
  for (const [x, y, z, l, h, w, colour] of luggage) p.box(l, h, w, x, y, z, colour);
  p.cylinder(0.22, 0.22, 1.1, 1.8, 3.35, -0.2, 0xc9a24a, { rx: Math.PI / 2, segments: 10 }); // a bedroll
  // the wheels: one each side at the front, doubled at the back; dark mudguards over them
  for (const [x, doubled] of [[L - 2.0, false], [-L + 2.6, true]] as const) {
    for (const side of [-1, 1]) {
      const zs = doubled ? [side * (W - 0.15), side * (W - 0.45)] : [side * (W - 0.18)];
      for (const z of zs) p.cylinder(0.5, 0.5, 0.28, x, 0.5, z, TYRE, { rx: Math.PI / 2, segments: 16 });
      p.cylinder(0.18, 0.18, 0.3, x, 0.5, side * (W - 0.02), CHROME, { rx: Math.PI / 2, segments: 10 }); // the hub
    }
    p.box(1.3, 0.12, BUS.width + 0.04, x, 1.07, 0, 0x2a2826); // the arch over them
  }
  return p.build("bus");
}

/**
 * Where a bus's words go, once it's placed (`matrix`, and `rot`: which way
 * it faces): the company on both sides, the destination board in front.
 */
export function busSigns(matrix: THREE.Matrix4, rot: number, destination: string): WorldSign[] {
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(matrix);
  const L = BUS.length / 2, W = BUS.width / 2;
  return [
    // (a sign faces its own +z turned by its rotationY; turned by the bus's `rot`, that's the bus's right
    // side: its left side's faces the other way, and the front's a quarter turn round)
    { kind: "busSide", position: at(-0.6, 0.85, W + 0.01), rotationY: rot, w: 6.2, h: 0.55 },
    { kind: "busSide", position: at(-0.6, 0.85, -W - 0.01), rotationY: rot + Math.PI, w: 6.2, h: 0.55 },
    { kind: "busDestination", position: at(L + 0.08, 2.78, 0), rotationY: rot + Math.PI / 2, w: 1.4, h: 0.28, label: destination },
  ];
}
