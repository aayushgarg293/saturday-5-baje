import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { makeRng, type Rng } from "../../core/rng";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { cartWheels } from "../props/cartWheels";
import { PARK_MANDI, parkOrigin } from "./park";
import { SCHOOL } from "../schoolRoad";

/**
 * The sabzi mandi, the evening vegetable market in the park's north half
 * (world/places/park.ts), along the cricket lane, open to school road:
 *
 *   the thelas      four big four-wheeled carts along its south side, heaped
 *                   high, each with a pole: a bulb on it for the evening, a
 *                   hand scale (taraazu) hanging off it, a bundle of
 *                   polythene bags on its hook, the iron weights on the deck
 *   on the ground   five sellers sitting on low crates behind gunny-sack
 *                   cloths spread with heaps: tomatoes, onions, potatoes,
 *                   bhindi, lauki, brinjal, green chillies and coriander;
 *                   each with a scale on the cloth, its weights, and a stack
 *                   of polythene bags at hand (every sabzi-wala has them)
 *   the aisle       down the middle, from the road to the back: where the
 *                   shoppers go (people/mandi.ts)
 *   the ground      trodden earth, a few crates and sacks about; the park's
 *                   gulmohars and its neem still standing in it
 *
 * Its own random numbers. FRAME: the park's (x east, so the mandi is at −x;
 * z south; the origin on the frontage at the park's middle).
 */

export type Mandi = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[] };

type Seller = { x: number; z: number; turn: number; kind: "thela" | "ground"; goods: Veg[] };
type Veg = "tomato" | "onion" | "potato" | "bhindi" | "lauki" | "brinjal" | "chilli" | "dhaniya" | "cauliflower";

/**
 * Who sells where (each one's spot: where they stand or sit, and which way they face). The thelas' sellers
 * stand behind their carts, facing the aisle (north); the ground sellers sit facing it (south); one at the
 * back faces the road (east). The sabziwali (Mummy's tomatoes: activities/errands.ts) is the second.
 */
export const SELLERS: Seller[] = [
  { kind: "ground", x: -7.5, z: -14.2, turn: 0, goods: ["potato", "onion", "potato"] },
  { kind: "ground", x: -12, z: -14.2, turn: 0, goods: ["tomato", "dhaniya", "chilli", "tomato"] },
  { kind: "ground", x: -21.5, z: -14.2, turn: 0, goods: ["brinjal", "bhindi", "lauki"] },
  { kind: "ground", x: -25.5, z: -13.4, turn: 0, goods: ["onion", "potato"] },
  { kind: "ground", x: -28.6, z: -8, turn: Math.PI / 2, goods: ["dhaniya", "chilli", "bhindi"] },
  { kind: "thela", x: -5, z: -5.1, turn: Math.PI, goods: ["tomato", "cauliflower", "tomato"] },
  { kind: "thela", x: -10.5, z: -5.1, turn: Math.PI, goods: ["bhindi", "lauki", "brinjal"] },
  { kind: "thela", x: -16, z: -5.1, turn: Math.PI, goods: ["potato", "onion", "potato"] },
  { kind: "thela", x: -21.5, z: -5.1, turn: Math.PI, goods: ["cauliflower", "tomato", "brinjal"] },
];
export const SABZIWALI = 1;
/** The aisle down the middle (z), from the road to the back (x). */
export const AISLE = { z: -10.4, x0: -2.5, x1: -26 };

const VEG: Record<Veg, { colour: number; shape: "ball" | "small" | "long" | "leafy" | "big" }> = {
  tomato: { colour: 0xd8382a, shape: "ball" },
  onion: { colour: 0xb05a78, shape: "ball" },
  potato: { colour: 0xa8834e, shape: "ball" },
  brinjal: { colour: 0x4a2a5a, shape: "long" },
  bhindi: { colour: 0x5f8a3a, shape: "small" },
  lauki: { colour: 0x8ab04a, shape: "long" },
  chilli: { colour: 0x3f8a2a, shape: "small" },
  dhaniya: { colour: 0x4f9a3a, shape: "leafy" },
  cauliflower: { colour: 0xf2ecd6, shape: "big" },
};
const GUNNY = 0xb59a6a, EARTH = 0xb39a72, CRATE = 0x9a7a4e, WOOD = 0x8a6a44, POLE = 0x3a3634;

export function buildMandi(): Mandi {
  const o = parkOrigin();
  const group = new THREE.Group();
  group.name = "mandi";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const rng = makeRng(7801);
  const colliders: Box[] = [];
  const lamps: WorldLamp[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, Math.abs(x1 - x0), Math.abs(z1 - z0), 0));
  };

  // the ground: trodden earth, from the lane's railing to the park's, the road's edge to the back
  const half = (SCHOOL.park.s1 - SCHOOL.park.s0) / 2;
  p.slab(-SCHOOL.park.depth + 0.15, -0.15, 0, 0.026, -half + 0.15, PARK_MANDI.z - 0.12, EARTH);

  // --- the sellers' pitches --------------------------------------------------------------------------------
  for (const s of SELLERS) {
    // (each built in its own frame: x across it, +z toward the aisle, the seller at the origin)
    const m = new THREE.Matrix4().makeTranslation(s.x, 0, s.z).multiply(new THREE.Matrix4().makeRotationY(s.turn));
    const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(m);
    const q = new Parts();
    if (s.kind === "thela") {
      // the cart in front of him: its deck at 0.85, heaped; its pole at his left, the bulb and the scale on it
      const deckZ = 1.05;
      q.box(1.9, 0.08, 1.0, 0, 0.85, deckZ, WOOD);
      for (const side of [-1, 1]) q.box(1.9, 0.12, 0.04, 0, 0.95, deckZ + side * 0.5, WOOD);
      cartWheels(q, { x: 0, z: deckZ, length: 1.9, width: 1.0, underside: 0.81, radius: 0.22 });
      s.goods.forEach((g, k) => heap(q, rng, g, -0.6 + k * 0.6, 0.89, deckZ, 0.56, 0.85));
      q.cylinder(0.025, 0.025, 1.6, 0.95, 1.65, deckZ - 0.45, POLE, { segments: 6 });
      q.box(0.55, 0.025, 0.025, 0.7, 2.42, deckZ - 0.45, POLE); // its arm, over the heaps
      q.cylinder(0.05, 0.05, 0.1, 0.45, 2.33, deckZ - 0.45, 0xf2ead6, { segments: 8 }); // the bulb
      lamps.push({ kind: "bulb", position: at(0.45, 2.3, deckZ - 0.45).applyMatrix4(group.matrixWorld), rotationY: 0, w: 1, h: 1, back: 0, ground: 0 });
      taraazu(q, 0.95, 1.55, deckZ - 0.45);
      // the polythene bags, a bundle hung on a hook on the pole; the weights on the deck's corner, by his hand
      bagBundle(q, 0.95, 1.15, deckZ - 0.4);
      weights(q, 0.9, 0.89, deckZ - 0.42);
      // sacks behind him
      for (let k = 0; k < 2; k++) q.add(new THREE.CapsuleGeometry(0.2, 0.35, 3, 8).scale(1, 1, 0.8), -0.5 + k * 0.6, 0.38, -0.5, GUNNY);
      const c = [at(-0.95, 0, deckZ - 0.5), at(0.95, 0, deckZ + 0.5)];
      box(Math.min(c[0].x, c[1].x), Math.max(c[0].x, c[1].x), Math.min(c[0].z, c[1].z), Math.max(c[0].z, c[1].z));
    } else {
      // the low crate he sits on; the gunny cloth in front, spread with heaps
      q.box(0.45, 0.28, 0.35, 0, 0.14, -0.05, CRATE);
      q.box(1.7, 0.012, 1.2, 0, 0.03, 0.95, GUNNY);
      s.goods.forEach((g, k) => heap(q, rng, g, -0.55 + (k % 3) * 0.55, 0.04, 0.8 + Math.floor(k / 3) * 0.48, 0.5, 0.45));
      // a basket at his side; the scale lying on the cloth at his other side, its weights; the bags, stacked
      q.cylinder(0.24, 0.18, 0.22, -0.6, 0.11, 0.05, 0xb8955a, { segments: 10 });
      scaleOnCloth(q, 0.62, 0.04, 0.32);
      weights(q, 0.38, 0.04, 0.42);
      bagStack(q, 0.6, 0.012, -0.1);
      const c = [at(-0.85, 0, 0.35), at(0.85, 0, 1.55)];
      box(Math.min(c[0].x, c[1].x), Math.max(c[0].x, c[1].x), Math.min(c[0].z, c[1].z), Math.max(c[0].z, c[1].z));
      const seat = at(0, 0, -0.05);
      box(seat.x - 0.3, seat.x + 0.3, seat.z - 0.3, seat.z + 0.3);
    }
    p.addParts(q, m);
  }

  // --- about the place: stacked crates, a few sacks, a heap of leaves swept up ---------------------------------
  for (const [x, z] of [[-2.2, -6.8], [-27.5, -4.2], [-9.8, -17.8], [-18.5, -12.6]]) {
    for (let k = 0; k < 3; k++) p.box(0.5, 0.3, 0.38, x + (k === 2 ? 0.1 : (k - 0.5) * 0.52), 0.15 + (k === 2 ? 0.3 : 0), z, CRATE);
    box(x - 0.6, x + 0.6, z - 0.25, z + 0.25);
  }
  p.add(new THREE.SphereGeometry(0.5, 8, 6).scale(1.3, 0.35, 1), -29.5, 0.05, -17.5, 0x6a7a3a);

  group.add(p.build("mandi"));
  return { group, colliders, lamps };
}

/** A heap of one vegetable, `w` wide and `d` deep, sitting at height y, centred at (x, z). */
function heap(p: Parts, rng: Rng, veg: Veg, x: number, y: number, z: number, w: number, d: number) {
  const { colour, shape } = VEG[veg];
  if (shape === "leafy") {
    // bunches of coriander: soft green clumps
    for (let k = 0; k < 5; k++) p.add(new THREE.IcosahedronGeometry(0.07, 0).scale(1, 0.7, 1), x + rng.range(-w / 2, w / 2), y + 0.05, z + rng.range(-d / 2, d / 2), k % 2 ? colour : 0x3f7a2e);
    return;
  }
  if (shape === "big") {
    for (let k = 0; k < 3; k++) {
      const cx = x + (k - 1) * w * 0.33, cz = z + rng.range(-0.05, 0.05);
      p.add(new THREE.SphereGeometry(0.11, 8, 6).scale(1, 0.75, 1), cx, y + 0.08, cz, colour);
      p.add(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 0.4, 1), cx, y + 0.04, cz, 0x5f8a3a); // its leaves round it
    }
    return;
  }
  // a mound of it, then pieces piled over the mound (more toward the middle, the top ones highest)
  p.add(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * 0.95, 0.3, d * 0.95), x, y, z, shade(colour, 0.85));
  const size = shape === "ball" ? 0.05 : 0.032;
  for (let k = 0; k < 30; k++) {
    const a = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 0.46;
    const px = x + Math.cos(a) * r * w, pz = z + Math.sin(a) * r * d;
    const py = y + 0.15 * (1 - (r / 0.5) ** 2) + size * 0.6;
    const g = shape === "ball" ? new THREE.SphereGeometry(size, 7, 5) : new THREE.CapsuleGeometry(size * 0.8, shape === "long" ? 0.18 : 0.08, 2, 5).rotateZ(Math.PI / 2).rotateY(rng.range(0, Math.PI));
    p.add(g, px, py, pz, k % 5 === 0 ? shade(colour, 1.12) : colour);
  }
}

/** The thin polythene bags of those years: black, pink, white, and a few blue. */
const POLYTHENE = [0x2a2a2c, 0xe8a8b8, 0xeeeee8, 0x2a2a2c, 0xa8c0e0, 0xeeeee8];

/** A bundle of bags hung from a hook: a fan of thin sheets, hanging. */
function bagBundle(p: Parts, x: number, y: number, z: number) {
  p.box(0.02, 0.06, 0.02, x, y + 0.03, z, 0x5a5652); // the hook
  POLYTHENE.forEach((c, k) => p.box(0.2, 0.26, 0.004, x + 0.12, y - 0.13, z + 0.005 + k * 0.006, c, { ry: (k - 2.5) * 0.08 }));
}

/** A stack of bags on the ground, folded flat, one sliding off the top. */
function bagStack(p: Parts, x: number, y: number, z: number) {
  POLYTHENE.forEach((c, k) => p.box(0.22, 0.004, 0.28, x + (k % 2) * 0.01, y + k * 0.005, z + (k % 3) * 0.008, c, { ry: (k - 2.5) * 0.12 }));
  p.box(0.2, 0.004, 0.24, x + 0.08, y + 0.035, z + 0.07, POLYTHENE[1], { ry: 0.5, rz: 0.08 });
}

/** The iron weights (baat): a kilo, half, quarter, stacked smallest on top, dark and worn. */
function weights(p: Parts, x: number, y: number, z: number) {
  let h = y;
  for (const [r, t] of [[0.045, 0.045], [0.036, 0.035], [0.028, 0.028]] as const) {
    p.cylinder(r * 0.85, r, t, x, h + t / 2, z, 0x3a3634, { segments: 6 });
    h += t;
  }
  p.cylinder(0.006, 0.006, 0.02, x, h + 0.01, z, 0x3a3634, { segments: 4 }); // its little knob
}

/** A ground seller's hand scale, put down on the cloth: the beam lying across its two pans. */
function scaleOnCloth(p: Parts, x: number, y: number, z: number) {
  for (const dx of [-0.13, 0.13]) p.cylinder(0.1, 0.07, 0.03, x + dx, y + 0.015, z, 0xa8a08a, { segments: 12 });
  p.box(0.42, 0.018, 0.018, x, y + 0.04, z - 0.02, 0x6a5a3a, { ry: 0.1 });
  for (const dx of [-0.13, 0.13]) p.box(0.004, 0.004, 0.16, x + dx, y + 0.034, z - 0.08, 0x8a8a84); // the strings, slack
}

/** The hand scale hanging off the thela's pole: a beam, two pans on strings. */
function taraazu(p: Parts, x: number, y: number, z: number) {
  p.box(0.4, 0.02, 0.02, x - 0.22, y, z, 0x6a5a3a);
  for (const dx of [-0.4, -0.04]) {
    p.strut({ x: x + dx, y, z }, { x: x + dx, y: y - 0.32, z }, 0.003, 0x8a8a84, 3);
    p.cylinder(0.09, 0.06, 0.03, x + dx, y - 0.34, z, 0xa8a08a, { segments: 10 });
  }
}

function shade(hex: number, f: number): number {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}
