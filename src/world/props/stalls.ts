import * as THREE from "three";
import type { Rng } from "../../core/rng";
import { PAL } from "../../render/palette";
import type { SignSpot } from "../buildings/common";
import { Parts } from "../kit";

/**
 * The street's food stalls, the heart of the walk.
 *
 * Each is built in its own frame: x along the street, +z toward the middle of
 * the street (where the customers stand), y up, origin on the ground at the
 * centre. Each returns its parts, the footprint to collide with, and a small
 * board for the sign painter.
 */

export type Stall = {
  parts: Parts;
  /** Footprint for the collider, metres (x along the street, z across). */
  size: [number, number];
  signs: SignSpot[];
};

/** A small painted board with a word on it (painted by world/signs.ts). */
function board(label: string, x: number, y: number, z: number, w: number, h: number, ry = 0): SignSpot {
  return { kind: "stallSign", label, x, y, z, w, h, ry };
}

/** A shallow bowl or kadhai: the bottom half of a sphere, squashed. */
function bowl(radius: number, depth: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  g.scale(1, depth / radius, 1);
  return g;
}

/** Four legs under a tabletop spanning x0..x1, z0..z1, at height `top`. */
function legs(p: Parts, x0: number, x1: number, z0: number, z1: number, top: number, colour: number) {
  for (const x of [x0 + 0.05, x1 - 0.05]) for (const z of [z0 + 0.05, z1 - 0.05]) {
    p.box(0.06, top, 0.06, x, top / 2, z, colour);
  }
}

/** A wooden handcart: deck on two big wheels at one end and legs at the other, with a handle. */
function handcart(p: Parts, length: number, width: number, deckY: number) {
  p.box(length, 0.08, width, 0, deckY, 0, PAL.woodLight);
  p.box(length, 0.18, 0.04, 0, deckY + 0.1, width / 2, PAL.woodLight); // side rails
  p.box(length, 0.18, 0.04, 0, deckY + 0.1, -width / 2, PAL.woodLight);
  for (const z of [width / 2 + 0.06, -width / 2 - 0.06]) {
    const wheel = new THREE.TorusGeometry(0.32, 0.03, 6, 18);
    p.add(wheel, length / 2 - 0.35, 0.32, z, PAL.tyre);
    p.box(0.03, 0.6, 0.03, length / 2 - 0.35, 0.32, z, PAL.tyre); // spokes, crossed
    p.box(0.6, 0.03, 0.03, length / 2 - 0.35, 0.32, z, PAL.tyre);
  }
  p.box(0.06, 0.1, width, length / 2 - 0.35, 0.32, 0, PAL.metal); // axle
  for (const z of [width / 2 - 0.05, -width / 2 + 0.05]) {
    p.box(0.06, deckY, 0.06, -length / 2 + 0.1, deckY / 2, z, PAL.woodLight); // legs
  }
  p.strut({ x: -length / 2, y: deckY, z: width / 2 - 0.05 }, { x: -length / 2 - 0.5, y: deckY + 0.1, z: width / 2 - 0.05 }, 0.025, PAL.woodLight);
  p.strut({ x: -length / 2, y: deckY, z: -width / 2 + 0.05 }, { x: -length / 2 - 0.5, y: deckY + 0.1, z: -width / 2 + 0.05 }, 0.025, PAL.woodLight);
}

/** The chai tapri: a counter under a tarp on bamboo poles, the stove and kettle, glasses, and two benches. */
export function chaiTapri(rng: Rng): Stall {
  const p = new Parts();
  const top = 0.9;
  p.slab(-0.8, 0.8, 0, top, -0.35, 0.35, PAL.woodLight); // counter
  p.slab(-0.85, 0.85, top, top + 0.04, -0.4, 0.4, PAL.wood); // its top
  // stove and a steaming pan of chai; a big kettle; a row of glass tumblers on a tray
  p.cylinder(0.17, 0.19, 0.14, -0.45, top + 0.11, 0, PAL.ironBlack, { segments: 12 });
  p.cylinder(0.16, 0.15, 0.14, -0.45, top + 0.25, 0, PAL.steel, { segments: 14 });
  p.cylinder(0.14, 0.15, 0.03, -0.45, top + 0.31, 0, 0xc88f5a, { segments: 14 }); // the chai itself
  p.cylinder(0.1, 0.12, 0.26, 0.05, top + 0.17, -0.12, PAL.steel, { segments: 12 });
  p.strut({ x: 0.13, y: top + 0.2, z: -0.12 }, { x: 0.25, y: top + 0.28, z: -0.12 }, 0.015, PAL.steel); // spout
  p.box(0.6, 0.02, 0.2, 0.45, top + 0.05, 0.15, PAL.steel); // tray
  for (let i = 0; i < 6; i++) p.cylinder(0.035, 0.028, 0.09, 0.2 + i * 0.1, top + 0.11, 0.15, PAL.glassPale, { segments: 8 });
  // glass jars of rusk and biscuits along the back
  const lids = [PAL.crateRed, PAL.boardBlue, PAL.boardYellow];
  for (let i = 0; i < 3; i++) {
    p.cylinder(0.08, 0.08, 0.2, 0.25 + i * 0.19, top + 0.14, -0.25, PAL.glassPale, { segments: 10 });
    p.cylinder(0.08, 0.08, 0.04, 0.25 + i * 0.19, top + 0.26, -0.25, lids[i], { segments: 10 });
  }
  // tarp roof on four bamboo poles, sloping down toward the street
  for (const x of [-1.1, 1.1]) for (const z of [-0.6, 0.9]) p.cylinder(0.03, 0.03, z < 0 ? 2.4 : 2.1, x, (z < 0 ? 2.4 : 2.1) / 2, z, PAL.bamboo, { segments: 6 });
  p.box(2.5, 0.03, 1.9, 0, 2.25, 0.15, PAL.tarp, { rx: 0.16 });
  // two benches either side, for sipping
  for (const x of [-1.45, 1.45]) {
    p.slab(x - 0.2, x + 0.2, 0.38, 0.44, -0.6, 0.9, PAL.woodLight);
    legs(p, x - 0.2, x + 0.2, -0.6, 0.9, 0.38, PAL.woodLight);
  }
  if (rng.next() < 0.7) p.cylinder(0.2, 0.2, 0.5, -0.9, 0.25, -0.35, PAL.steel, { segments: 12 }); // a water drum
  return { parts: p, size: [3.4, 1.6], signs: [board("चाय", 0, 0.55, 0.36, 1.1, 0.4)] };
}

/** The golgappa cart: a glass case of puris, the clay matka of spicy water, steel bowls. */
export function golgappaCart(_rng: Rng): Stall {
  const p = new Parts();
  const deck = 0.85;
  handcart(p, 1.5, 0.8, deck);
  // glass case with a wooden frame, puris piled inside
  p.slab(-0.5, 0.4, deck + 0.05, deck + 0.5, -0.3, 0.2, PAL.glassPale);
  for (const x of [-0.5, 0.4]) for (const z of [-0.3, 0.2]) p.box(0.03, 0.46, 0.03, x, deck + 0.28, z, PAL.wood);
  for (let i = 0; i < 9; i++) {
    const puri = new THREE.SphereGeometry(0.05, 8, 5);
    p.add(puri, -0.4 + (i % 5) * 0.18, deck + 0.52 + Math.floor(i / 5) * 0.06, -0.1 + (i % 2) * 0.12, PAL.oilGold);
  }
  // the matka (clay pot) of spicy water, wrapped in red cloth, and steel bowls
  p.add(new THREE.SphereGeometry(0.2, 12, 8), 0.52, deck + 0.24, 0, PAL.terracotta);
  p.cylinder(0.21, 0.21, 0.08, 0.52, deck + 0.22, 0, PAL.crateRed, { segments: 12 });
  p.add(bowl(0.15, 0.08), 0.5, deck + 0.1, 0.3, PAL.steel);
  p.add(bowl(0.12, 0.07), -0.2, deck + 0.1, 0.32, PAL.steel);
  return { parts: p, size: [2.2, 1.0], signs: [board("गोलगप्पे", -0.05, deck + 0.3, 0.21, 0.8, 0.22)] };
}

/** Kachori and samosa: a brick stove with a big kadhai of hot oil, and a table of trays. */
export function kachoriStall(_rng: Rng): Stall {
  const p = new Parts();
  // brick stove, with the dark fire-mouth facing the street
  p.slab(-1.2, -0.4, 0, 0.6, -0.4, 0.4, 0x9a5a3f);
  p.slab(-0.95, -0.65, 0.1, 0.35, 0.4, 0.42, PAL.ironBlack);
  p.add(bowl(0.48, 0.2), -0.8, 0.72, 0, PAL.ironBlack);
  p.cylinder(0.43, 0.43, 0.02, -0.8, 0.66, 0, PAL.oilGold, { segments: 16 }); // the oil
  for (let i = 0; i < 5; i++) {
    const k = new THREE.SphereGeometry(0.07, 8, 5);
    k.scale(1, 0.55, 1);
    p.add(k, -0.95 + (i % 3) * 0.15, 0.69, -0.1 + Math.floor(i / 3) * 0.2, 0xb87a2e);
  }
  // table with trays of kachoris and samosas, under a glass cover
  p.slab(-0.2, 1.1, 0.8, 0.84, -0.4, 0.4, PAL.woodLight);
  legs(p, -0.2, 1.1, -0.4, 0.4, 0.8, PAL.woodLight);
  for (const [x, colour] of [[0.1, 0xc98a3a], [0.5, 0xd9a441], [0.9, 0xc07a30]] as const) {
    p.cylinder(0.2, 0.18, 0.03, x, 0.86, 0.05, PAL.steel, { segments: 14 });
    for (let i = 0; i < 4; i++) {
      const samosa = new THREE.ConeGeometry(0.06, 0.08, 3); // three-sided: a samosa
      p.add(samosa, x - 0.07 + (i % 2) * 0.14, 0.92, Math.floor(i / 2) * 0.12, colour);
    }
  }
  p.slab(-0.15, 1.05, 0.84, 1.2, -0.35, -0.05, PAL.glassPale);
  return { parts: p, size: [2.6, 1.0], signs: [board("कचौरी • समोसा", 0.45, 0.55, 0.42, 1.2, 0.3)] };
}

/** Jalebi: a wide flat kadhai with orange spirals frying, and trays stacked with them. */
export function jalebiStall(_rng: Rng): Stall {
  const p = new Parts();
  p.slab(-1, 1, 0, 0.75, -0.4, 0.4, PAL.woodLight); // counter
  p.cylinder(0.3, 0.32, 0.15, -0.5, 0.82, 0, PAL.ironBlack, { segments: 12 }); // stove
  p.cylinder(0.5, 0.45, 0.1, -0.5, 0.95, 0, PAL.ironBlack, { segments: 18 }); // flat kadhai
  p.cylinder(0.46, 0.46, 0.02, -0.5, 1.0, 0, PAL.oilGold, { segments: 18 });
  const coil = (x: number, y: number, z: number, r: number) => {
    const g = new THREE.TorusGeometry(r, r * 0.22, 5, 14);
    g.rotateX(Math.PI / 2); // lying flat
    p.add(g, x, y, z, PAL.jalebiOrange);
    const inner = new THREE.TorusGeometry(r * 0.5, r * 0.2, 5, 10);
    inner.rotateX(Math.PI / 2);
    p.add(inner, x, y, z, PAL.jalebiOrange);
  };
  for (let i = 0; i < 5; i++) coil(-0.7 + (i % 3) * 0.2, 1.03, -0.15 + Math.floor(i / 3) * 0.25, 0.08);
  // a stacked tray of finished jalebis
  p.cylinder(0.3, 0.28, 0.04, 0.5, 0.78, 0, PAL.steel, { segments: 16 });
  for (let i = 0; i < 9; i++) coil(0.35 + (i % 3) * 0.15, 0.83 + Math.floor(i / 3) * 0.04, -0.15 + ((i * 7) % 3) * 0.15, 0.065);
  return { parts: p, size: [2.2, 1.0], signs: [board("जलेबी", 0.3, 0.45, 0.41, 0.9, 0.3)] };
}

/** The ice gola cart: a block of ice, a row of bright syrup bottles, and a striped umbrella. */
export function iceGolaCart(_rng: Rng): Stall {
  const p = new Parts();
  const deck = 0.85;
  handcart(p, 1.4, 0.8, deck);
  p.slab(-0.45, 0.0, deck + 0.05, deck + 0.35, -0.2, 0.15, PAL.ice); // the ice block
  p.slab(0.05, 0.3, deck + 0.05, deck + 0.2, -0.15, 0.1, PAL.steel); // the shaver
  const syrups = [0xd6283a, 0x2e9e47, 0xf28a1d, 0xf2d024, 0x2a67c6, 0xd6283a, 0x8a3fb0];
  syrups.forEach((c, i) => {
    p.cylinder(0.035, 0.04, 0.26, -0.55 + i * 0.11, deck + 0.18, 0.28, c, { segments: 8 });
    p.cylinder(0.015, 0.015, 0.05, -0.55 + i * 0.11, deck + 0.33, 0.28, PAL.steel, { segments: 6 });
  });
  // the umbrella: eight alternating red and yellow wedges on a pole
  p.cylinder(0.02, 0.02, 1.4, 0.4, deck + 0.7, -0.25, PAL.metal, { segments: 6 });
  for (let k = 0; k < 8; k++) {
    const wedge = new THREE.ConeGeometry(1.05, 0.35, 1, 1, true, (k / 8) * Math.PI * 2, Math.PI / 4);
    // (a one-segment open cone slice is a single flat triangle panel)
    // Surfaces are only drawn from their front, and you look at an umbrella
    // from underneath: a mirrored copy faces the other way, as its lining.
    // (Cloned before `add`, which moves the shape it's given.)
    const lining = wedge.clone().scale(1, 1, -1);
    p.add(wedge, 0.4, deck + 1.55, -0.25, k % 2 ? PAL.boardYellow : PAL.crateRed);
    p.add(lining, 0.4, deck + 1.55, -0.25, k % 2 ? PAL.crateRed : PAL.boardYellow);
  }
  return { parts: p, size: [2.0, 1.0], signs: [board("बर्फ़ का गोला", -0.2, deck - 0.2, 0.46, 0.9, 0.24)] };
}
