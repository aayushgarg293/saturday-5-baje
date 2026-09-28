import * as THREE from "three";
import { PAL } from "../render/palette";
import type { Parts } from "../world/kit";
import { J, type JointName } from "./skeleton";

/**
 * Clothes and hair.
 *
 * Two kinds of clothing:
 * - COVERAGE: what colour each body segment is (a shirt colours the chest and
 *   upper arms; a choli leaves the midriff bare; shorts leave the knees bare).
 *   The body builder (body.ts) asks `coverage()` and paints its shapes.
 * - OVER-PIECES: extra shapes on top of the body: a kurta's long tail, a
 *   ghagra's flared skirt, an odhni over the head, a safa wrapped round it,
 *   a gamchha on the shoulder, bangles, a bag. `dress()` adds them.
 *
 * Everything is built in the person's rest pose, each piece on the joint it
 * should move with (a skirt with the hips, an odhni's drape with the chest).
 */

export type Top = "vest" | "shirt" | "halfShirt" | "tshirt" | "kurta" | "kameez" | "choli" | "schoolShirt";
export type Bottom = "dhoti" | "pyjama" | "trousers" | "jeans" | "shorts" | "ghagra" | "salwar";

export type Outfit = {
  top: Top;
  topColour: number;
  bottom: Bottom;
  bottomColour: number;
  /** A second colour for borders and bands (ghagra hem, odhni edge). */
  trim?: number;
  /** A sleeveless Nehru jacket over the top. */
  jacket?: number;
  /** A wrapped turban: main colour and a stripe colour. */
  safa?: [number, number];
  /** A veil over the head and shoulders: colour and border. */
  odhni?: [number, number];
  /** A long scarf over both shoulders. */
  dupatta?: number;
  /** A checked towel over the left shoulder. */
  gamchha?: boolean;
  bangles?: number;
  bag?: "jhola" | "school";
  feet: "chappals" | "shoes" | "barefoot";
};

export type HairStyle = "short" | "receding" | "kid" | "bun" | "braid";

/** What the body builder needs to add shapes (see body.ts). */
export type Kit = {
  p: Parts;
  /** Height scale and girth (torso width). */
  k: number;
  g: number;
  skin: number;
  /** Where a joint is in the rest pose. */
  at(j: JointName): THREE.Vector3;
  /** A tapering tube from one joint to another, riding on the first. */
  limb(from: JointName, to: JointName, rTop: number, rBottom: number, colour: number, fraction?: number): void;
  /** A rounded lump on a joint. */
  blob(j: JointName, r: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, colour: number): void;
  head: { centre: THREE.Vector3; scale: THREE.Vector3; radius: number };
};

/** How far a sleeve reaches: bare arm, a short cap, to above the elbow, rolled up, or to the wrist. */
export type Sleeve = "none" | "short" | "half" | "rolled" | "full";

export type Coverage = {
  chest: number;
  /** The top of the shoulders and chest (bare with a vest). */
  yoke: number;
  /** Between the chest and the hips (bare with a choli). */
  midriff: number;
  hips: number;
  sleeve: Sleeve;
  sleeveColour: number;
  thighs: number;
  shins: number;
  knees: number;
  /** How loose the legs of the garment are (a dhoti is very loose). */
  loose: number;
  feet: number;
};

export function coverage(o: Outfit, skin: number): Coverage {
  const top = o.topColour, bottom = o.bottomColour;
  const sleeve: Sleeve =
    o.top === "vest" ? "none"
      : o.top === "choli" || o.top === "tshirt" ? "short"
        : o.top === "halfShirt" || o.top === "schoolShirt" ? "half"
          : o.top === "shirt" ? "rolled"
            : "full";
  const longTop = o.top === "kurta" || o.top === "kameez";
  const legColour = o.bottom === "ghagra" ? skin : bottom; // (hidden under the skirt anyway)
  return {
    chest: top,
    yoke: o.top === "vest" ? skin : top,
    midriff: o.top === "choli" ? skin : top,
    hips: longTop ? top : bottom,
    sleeve,
    sleeveColour: top,
    thighs: legColour,
    shins: o.bottom === "shorts" ? skin : legColour,
    knees: o.bottom === "shorts" ? skin : legColour,
    loose: o.bottom === "dhoti" ? 1.45 : o.bottom === "pyjama" || o.bottom === "salwar" ? 1.3 : o.bottom === "jeans" ? 1.02 : 1.08,
    feet: o.feet === "shoes" ? 0x2f2a27 : skin,
  };
}

/** The pieces that go over the body. */
export function dress(kit: Kit, o: Outfit) {
  const { p, k, g, at, blob } = kit;
  const hips = at("hips"), chest = at("chest");
  const trim = o.trim ?? PAL.boardYellow;

  // shirt collars (no pocket: at this size the ink outlines it into a grey square)
  if (o.top === "shirt" || o.top === "halfShirt" || o.top === "schoolShirt") {
    p.setJoint(J.chest);
    p.add(new THREE.CylinderGeometry(0.066 * k, 0.08 * k, 0.045 * k, 12), 0, chest.y + 0.255 * k, 0.005, shade(o.topColour, 0.9));
  }
  // the long tails of a kurta or kameez, to the knee, loose over the hips
  if (o.top === "kurta" || o.top === "kameez") {
    p.setJoint(J.hips);
    p.add(new THREE.CylinderGeometry(0.165 * k * g, 0.21 * k * g, 0.45 * k, 16).scale(1, 1, 0.78), 0, hips.y - 0.21 * k, 0, o.topColour);
  }
  // a Nehru jacket: a sleeveless layer over the torso, just proud of it
  if (o.jacket !== undefined) {
    p.setJoint(J.spine);
    p.add(new THREE.CylinderGeometry(0.15 * k * g, 0.165 * k * g, 0.3 * k, 16).scale(1, 1, 0.78), 0, hips.y + 0.16 * k, 0, o.jacket);
    p.setJoint(J.chest);
    p.add(new THREE.CylinderGeometry(0.18 * k * g, 0.15 * k * g, 0.24 * k, 16).scale(1, 1, 0.7), 0, chest.y + 0.09 * k, 0.003, o.jacket);
  }
  // the dhoti's wrap round the waist and its loose drape between the legs
  // (under a kurta the tails hide the waist, and the wrap would poke out below them)
  if (o.bottom === "dhoti" && o.top !== "kurta") {
    blob("hips", 0.16, 0, hips.y - 0.12 * k, 0.02, 1.15 * g, 0.9, 0.9, o.bottomColour);
  }
  // the ghagra: a long flared skirt from the waist to the ankles, with a bright hem and a band
  if (o.bottom === "ghagra") {
    p.setJoint(J.hips);
    const top = hips.y + 0.05 * k, h = top - 0.03;
    p.add(new THREE.CylinderGeometry(0.16 * k * g, 0.36 * k, h, 22), 0, top - h / 2, 0, o.bottomColour);
    p.add(new THREE.CylinderGeometry(0.335 * k, 0.365 * k, 0.1 * k, 22), 0, 0.08 * k, 0, trim); // hem
    p.add(new THREE.CylinderGeometry(0.265 * k, 0.285 * k, 0.04 * k, 22), 0, top - h * 0.55, 0, trim); // band
  }
  // the salwar gathers at the ankle: a small cuff there
  if (o.bottom === "salwar") {
    for (const side of ["L", "R"] as const) {
      const f = at(`foot${side}`);
      blob(`knee${side}`, 0.05, f.x, f.y + 0.06 * k, 0, 1, 0.5, 1, o.bottomColour);
    }
  }

  if (o.gamchha) gamchha(kit);
  if (o.odhni) odhni(kit, o.odhni);
  if (o.dupatta !== undefined) dupatta(kit, o.dupatta);
  if (o.safa) safa(kit, o.safa);

  if (o.bangles !== undefined) {
    for (const side of ["L", "R"] as const) {
      const h = at(`hand${side}`);
      p.setJoint(J[`elbow${side}`]);
      for (let i = 0; i < 3; i++) {
        p.add(new THREE.TorusGeometry(0.04 * k, 0.007 * k, 5, 12).rotateX(Math.PI / 2), h.x, h.y + (0.02 + i * 0.016) * k, 0, i === 1 ? PAL.oilGold : o.bangles);
      }
    }
  }
  if (o.bag === "jhola") {
    // a cloth shopping bag, hanging from the left hand
    const h = at("handL");
    p.setJoint(J.handL);
    p.box(0.28 * k, 0.3 * k, 0.06 * k, h.x, h.y - 0.28 * k, 0.02, PAL.burlap);
    p.box(0.3 * k, 0.05 * k, 0.065 * k, h.x, h.y - 0.2 * k, 0.02, 0x9c5a3c);
    p.strut({ x: h.x - 0.08 * k, y: h.y - 0.14 * k, z: 0.02 }, { x: h.x, y: h.y - 0.05 * k, z: 0.02 }, 0.008 * k, PAL.burlap);
    p.strut({ x: h.x + 0.08 * k, y: h.y - 0.14 * k, z: 0.02 }, { x: h.x, y: h.y - 0.05 * k, z: 0.02 }, 0.008 * k, PAL.burlap);
  }
  if (o.bag === "school") {
    // a satchel-style school bag on the back, with its straps
    p.setJoint(J.chest);
    p.box(0.26 * k, 0.32 * k, 0.12 * k, 0, chest.y + 0.03 * k, -0.18 * k * g, 0x2e5f8a);
    for (const s of [-1, 1]) p.box(0.03 * k, 0.3 * k, 0.02, s * 0.08 * k, chest.y + 0.08 * k, 0.12 * k * g, 0x1d3f5e);
  }
}

/** The chaiwala's red-and-white checked towel, over the left shoulder. */
function gamchha(kit: Kit) {
  const { p, k, g, at } = kit;
  const sh = at("shoulderL");
  const x0 = sh.x * 0.55;
  p.setJoint(J.chest);
  for (let i = 0; i < 4; i++) {
    const x = x0 - 0.05 * k + i * 0.033 * k;
    const colour = i % 2 ? PAL.boardWhite : PAL.gamchhaRed;
    p.box(0.033 * k, 0.32 * k, 0.012, x, sh.y - 0.13 * k, 0.118 * k * g, colour, { rx: -0.12 });
    p.box(0.033 * k, 0.28 * k, 0.012, x, sh.y - 0.11 * k, -0.118 * k * g, colour, { rx: 0.12 });
  }
  p.add(new THREE.CylinderGeometry(0.075 * k, 0.075 * k, 0.14 * k, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2),
    x0, sh.y + 0.02 * k, 0, PAL.gamchhaRed);
}

/**
 * The odhni: a long veil worn over the head, falling over the shoulders and
 * down the back, one end drawn across the front. It leaves the face open.
 */
function odhni(kit: Kit, [colour, border]: [number, number]) {
  const { p, k, g, at, head } = kit;
  const chest = at("chest");
  // over the head: a shell over the top, back and sides, open at the face
  p.setJoint(J.head);
  const faceGap = 1.9;
  const shell = new THREE.SphereGeometry(head.radius * 1.16, 22, 14, Math.PI / 2 + faceGap / 2, Math.PI * 2 - faceGap, 0, 2.0);
  shell.scale(head.scale.x, head.scale.y, head.scale.z);
  p.add(shell, head.centre.x, head.centre.y + 0.01 * k, head.centre.z, colour);
  // its edge framing the face
  const edge = new THREE.TorusGeometry(head.radius * 1.12, 0.012 * k, 5, 20, Math.PI * 1.25);
  edge.rotateZ(-Math.PI * 0.125);
  p.add(edge, head.centre.x, head.centre.y + 0.01 * k, head.centre.z + 0.03 * k, border);
  // down the back from the shoulders to the waist: the back half of an open cone
  p.setJoint(J.chest);
  const drape = new THREE.CylinderGeometry(0.19 * k * g, 0.25 * k * g, 0.62 * k, 16, 1, true, Math.PI / 2, Math.PI);
  drape.scale(1, 1, 0.8);
  p.add(drape, 0, chest.y - 0.03 * k, 0, colour);
  p.add(new THREE.CylinderGeometry(0.252 * k * g, 0.255 * k * g, 0.05 * k, 16, 1, true, Math.PI / 2, Math.PI).scale(1, 1, 0.8),
    0, chest.y - 0.32 * k, 0, border); // its border at the bottom
  // one end drawn across the front, from the right shoulder down toward the left hip
  p.box(0.15 * k, 0.6 * k, 0.015, 0.02, chest.y + 0.02 * k, 0.13 * k * g, colour, { rz: 0.55 });
  p.box(0.03 * k, 0.6 * k, 0.018, 0.075 * k, chest.y + 0.01 * k, 0.131 * k * g, border, { rz: 0.55 });
}

/** A dupatta: a long scarf, over both shoulders, the ends hanging down the front. */
function dupatta(kit: Kit, colour: number) {
  const { p, k, g, at } = kit;
  const chest = at("chest");
  p.setJoint(J.chest);
  for (const s of [-1, 1]) {
    p.box(0.12 * k, 0.5 * k, 0.014, s * 0.12 * k * g, chest.y - 0.02 * k, 0.12 * k * g, colour, { rz: s * 0.08 });
  }
  const back = new THREE.CylinderGeometry(0.17 * k * g, 0.19 * k * g, 0.2 * k, 14, 1, true, Math.PI / 2, Math.PI).scale(1, 1, 0.75);
  p.add(back, 0, chest.y + 0.18 * k, 0, colour);
}

/**
 * The safa: a long cloth wound round and round the head. Built as a stack of
 * rings, each tipped a little differently (the wraps), alternating colours
 * (the leheriya stripes), a rounded crown, and the tail hanging down the back.
 */
function safa(kit: Kit, [main, stripe]: [number, number]) {
  const { p, k, head } = kit;
  p.setJoint(J.head);
  const c = head.centre, r = head.radius;
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.TorusGeometry(r * (1.02 - i * 0.07), r * 0.3, 8, 20);
    ring.rotateX(Math.PI / 2 + (i % 2 ? 0.14 : -0.1));
    ring.rotateZ(i % 2 ? 0.08 : -0.06);
    ring.scale(1, 1, 1.08);
    p.add(ring, c.x, c.y + r * (0.2 + i * 0.17), c.z - r * 0.05, i % 2 ? stripe : main);
  }
  p.add(new THREE.SphereGeometry(r * 0.78, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1.05), c.x, c.y + r * 0.8, c.z - r * 0.05, main);
  p.box(0.09 * k, 0.3 * k, 0.02, c.x - 0.03 * k, c.y - r * 0.6, c.z - r * 1.05, main, { rx: 0.2 }); // the tail
}

/** Hair, by style. (Under an odhni or a safa only the hairline shows, but it's still built.) */
export function hair(kit: Kit, style: HairStyle, colour: number) {
  const { p, k, head } = kit;
  p.setJoint(J.head);
  const c = head.centre, sc = head.scale;
  const rad = head.radius * 1.05;
  const cap = (thetaLength: number, tip: number) => {
    const g = new THREE.SphereGeometry(rad, 22, 12, 0, Math.PI * 2, 0, thetaLength);
    g.scale(sc.x, sc.y, sc.z);
    g.rotateX(tip);
    p.add(g, c.x, c.y + 0.005, c.z, colour);
  };
  const back = (down: number) => {
    const g = new THREE.SphereGeometry(rad * 0.99, 16, 10, Math.PI * 1.15, Math.PI * 0.7, 1.0, down);
    g.scale(sc.x, sc.y, sc.z);
    p.add(g, c.x, c.y, c.z, colour);
  };
  switch (style) {
    case "short":
      cap(1.2, -0.25);
      back(0.95);
      break;
    case "receding":
      cap(0.95, -0.25);
      back(0.95);
      break;
    case "kid":
      cap(1.25, -0.15);
      back(1.05);
      break;
    case "bun":
    case "braid":
      // long hair: parted in the middle, drawn back, covering the ears
      cap(1.35, -0.2);
      back(1.3);
      if (style === "bun") {
        p.add(new THREE.SphereGeometry(0.06 * k, 12, 10), c.x, c.y - 0.03 * k, c.z - head.radius * 1.05, colour);
      } else {
        // a plait down the back, on the chest joint so it lies against the back
        p.setJoint(J.chest);
        for (let i = 0; i < 6; i++) {
          p.add(new THREE.SphereGeometry(0.03 * k, 8, 6).scale(1, 1.3, 0.8), c.x, c.y - (0.14 + i * 0.065) * k, c.z - 0.13 * k, colour);
        }
      }
      break;
  }
}

/** A colour a little darker (for collars, pockets, shadows in cloth). */
function shade(hex: number, f: number): number {
  const c = new THREE.Color(hex).multiplyScalar(f);
  return c.getHex();
}
