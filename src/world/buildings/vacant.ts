import * as THREE from "three";
import type { VacantKind } from "../layout";
import { PLOT_DEPTH } from "../layout";
import type { BuildContext, BuildResult, LocalBox } from "./common";

/**
 * Plots with no building on them (world/layout.ts, VacantKind): not every
 * plot in a town is built on. Some are fenced off and for sale, some have
 * the builder's sand and bricks dumped on them, some were started years ago
 * and left (the money ran out, or the family went to court over it), and one
 * is going up right now, by the bus stand.
 *
 * Each has the plot's back boundary wall (an old plastered wall: whoever's
 * behind), and the neighbours' bare side walls show either side, as they do
 * in a real gap (street.ts paints ads and murals on them).
 *
 * FRAME: the builders' usual: x along the frontage, +z toward the road, z = 0
 * the plot's front edge, the back at z = −PLOT_DEPTH. Random choices only from
 * `c.rng` (the plot's own stream), so nothing else in the row changes.
 */

const BRICK = 0xa4553c, BRICK_DARK = 0x8e4632, MORTAR = 0xb9ad9a, CONCRETE = 0xa8a39a, RUST = 0x6e3b26;
const DIRT = 0xb59a74, SAND = 0xd9b77a, GRAVEL = 0x8e8a84, BAMBOO = 0x9a7a4a, CEMENT_BAG = 0xd8d2c4;
const WEEDS = [0x7a8a3e, 0x5f7a36, 0x8a8f48];

/**
 * The construction site's layout, for a plot `w` wide (shared with the
 * labourers, people/construction.ts, so they stand where the things are):
 * the front wall's line and its doorway, the brick stack, the sand heap and
 * the mortar heap out front on the yard.
 */
export function constructionSite(w: number) {
  const W = w / 2;
  return {
    front: -0.6,
    door: { x0: -0.5, x1: 0.5 },
    /** The front wall's right-hand part, where the mason is: from the doorway to the corner, rising 1.0 → 0.55 m. */
    rising: { x0: 0.5, x1: W - 0.3, h0: 1.0, h1: 0.55 },
    stack: { x: -W + 0.7, z: 1.8 },
    sand: { x: -W - 0.4, z: 3.4 },
    mortar: { x: W - 0.9, z: 2.4 },
  };
}

export function buildVacant(kind: VacantKind) {
  return (c: BuildContext): BuildResult => {
    const colliders: LocalBox[] = [];
    // the ground: bare earth, a shade darker than the street's dust, and the back boundary wall
    c.parts.slab(-c.w / 2, c.w / 2, 0, 0.02, -PLOT_DEPTH, 0, DIRT);
    c.parts.slab(-c.w / 2, c.w / 2, 0, 2.4, -PLOT_DEPTH, -PLOT_DEPTH + 0.3, c.wall);
    colliders.push({ x0: -c.w / 2, x1: c.w / 2, z0: -PLOT_DEPTH, z1: -PLOT_DEPTH + 0.3 });
    const signs = BUILD[kind](c, colliders);
    return { height: 0, signs, colliders };
  };
}

type Builder = (c: BuildContext, colliders: LocalBox[]) => BuildResult["signs"];

const BUILD: Record<VacantKind, Builder> = {
  /** Barbed wire on concrete posts along the front and both sides; weeds inside; a "for sale" board. */
  fenced(c, colliders) {
    const p = c.parts, W = c.w / 2 - 0.15, front = -0.25;
    // the posts: every 2 m or so along the front, and down each side to the back wall
    const along = Math.max(2, Math.round((2 * W) / 2));
    const posts: [number, number][] = [];
    for (let k = 0; k <= along; k++) posts.push([-W + (2 * W * k) / along, front]);
    for (const x of [-W, W]) for (let z = front - 2.2; z > -PLOT_DEPTH + 0.5; z -= 2.2) posts.push([x, z]);
    for (const [x, z] of posts) p.box(0.11, 1.5, 0.11, x, 0.75, z, CONCRETE, { rx: c.rng.range(-0.04, 0.04), rz: c.rng.range(-0.04, 0.04) });
    // three strands of wire, sagging a little between posts (drawn post to post)
    const wire = (ax: number, az: number, bx: number, bz: number) => {
      for (const y of [0.45, 0.85, 1.25]) {
        const sag = 0.04;
        const mid = { x: (ax + bx) / 2, y: y - sag, z: (az + bz) / 2 };
        p.strut({ x: ax, y, z: az }, mid, 0.008, 0x3a3634, 3);
        p.strut(mid, { x: bx, y, z: bz }, 0.008, 0x3a3634, 3);
      }
    };
    for (let k = 0; k < along; k++) wire(-W + (2 * W * k) / along, front, -W + (2 * W * (k + 1)) / along, front);
    for (const x of [-W, W]) wire(x, front, x, -PLOT_DEPTH + 0.3);
    colliders.push({ x0: -W - 0.1, x1: W + 0.1, z0: front - 0.1, z1: front + 0.1 });
    weeds(c, 26);
    rubble(c, 5);
    // the board, on two posts just inside the wire, facing the road
    const bx = c.rng.range(-W + 1, W - 1);
    for (const dx of [-0.55, 0.55]) p.box(0.06, 1.7, 0.06, bx + dx, 0.85, front - 0.5, 0x6a5a44);
    return [{ kind: "plotBoard", x: bx, y: 1.45, z: front - 0.45, w: 1.4, h: 0.62, label: "यह प्लॉट बिकाऊ है\nसंपर्क: गुप्ता प्रॉपर्टीज़" }];
  },

  /** No fence: the builder's sand, gravel and bricks dumped and waiting, and weeds round them. */
  bare(c, colliders) {
    weeds(c, 14);
    const W = c.w / 2;
    heap(c, colliders, -W + 1.3, -2.4, 1.1, 0.75, SAND);
    heap(c, colliders, W - 1.0, -5.5, 0.85, 0.55, GRAVEL);
    brickStack(c, colliders, 0.6, -5.8, 1.6, 0.9, 0.9);
    looseBricks(c, 6, -1.2);
    rubble(c, 4);
    return [];
  },

  /**
   * Begun years ago, then left: the plinth, the columns with their steel rods
   * still sticking up for a floor that never came, the walls half up, weeds
   * everywhere. A board says why.
   */
  halfBuilt(c, colliders) {
    const p = c.parts, W = c.w / 2;
    plinth(c, -1.0);
    const xs = c.w > 5 ? [-W + 0.3, 0, W - 0.3] : [-W + 0.3, W - 0.3];
    for (const x of xs) for (const z of [-1.2, -4.8, -PLOT_DEPTH + 0.6]) column(c, colliders, x, z, z === -1.2 ? 2.2 : 3.0, true);
    // the walls: the back one a few courses short of full, the sides stepping down toward the road
    brickWall(c, colliders, -W + 0.3, W - 0.3, -PLOT_DEPTH + 0.6, 2.1, 2.1);
    brickWall(c, colliders, -W + 0.3, -W + 0.3, -1.2, 0.6, 1.9, -PLOT_DEPTH + 0.6);
    brickWall(c, colliders, W - 0.3, W - 0.3, -4.8, 0.9, 1.2, -PLOT_DEPTH + 0.6);
    weeds(c, 30, 0.25);
    // a peepal sapling that's found a crack in the back wall
    p.add(new THREE.IcosahedronGeometry(0.28, 0), -W + 0.9, 2.3, -PLOT_DEPTH + 0.7, 0x5f7a36);
    // the board: why it's stood like this
    for (const dx of [-0.6, 0.6]) p.box(0.06, 1.6, 0.06, dx, 0.8, -0.4, 0x6a5a44);
    return [{ kind: "plotBoard", x: 0, y: 1.35, z: -0.35, w: 1.5, h: 0.62, label: "विवादित संपत्ति\nमामला न्यायालय में विचाराधीन" }];
  },

  /**
   * Going up right now: the ground floor's roof was cast last week (the
   * bamboo props are still under it, the steel for the next floor's columns
   * sticking up from it); the walls are up at the back and sides; the front
   * wall's rising, a course at a time, where the mason is. Out front: the
   * brick stack, the sand, the cement bags, the mortar being mixed. The
   * labourers are people/construction.ts (this plot offers them a spot).
   */
  construction(c, colliders) {
    const p = c.parts, W = c.w / 2, top = 3.1, back = -PLOT_DEPTH + 0.6;
    plinth(c, -0.3);
    for (const x of [-W + 0.3, W - 0.3]) for (const z of [-0.6, -4.6, back]) column(c, colliders, x, z, top, false);
    // the roof slab, fresh grey, with the next floor's rods sticking up at the column heads
    p.slab(-W + 0.15, W - 0.15, top, top + 0.15, back - 0.15, -0.45, CONCRETE);
    for (const x of [-W + 0.3, W - 0.3]) for (const z of [-0.6, -4.6, back]) rods(c, x, top + 0.15, z, 0.9);
    // the props under it: bamboo poles, a forest of them
    for (let x = -W + 1.0; x < W - 0.7; x += 0.9) for (let z = -1.6; z > back + 0.5; z -= 1.1) {
      p.cylinder(0.035, 0.04, top, x + c.rng.range(-0.15, 0.15), top / 2, z + c.rng.range(-0.15, 0.15), BAMBOO, { segments: 5 });
    }
    // the walls: back and sides full height; the front rising, higher at the left, the mason at work on the right
    brickWall(c, colliders, -W + 0.3, W - 0.3, back, top, top);
    for (const x of [-W + 0.3, W - 0.3]) brickWall(c, colliders, x, x, -0.6, top, top, back);
    const site = constructionSite(c.w), r = site.rising;
    brickWall(c, colliders, -W + 0.3, site.door.x0, site.front, 1.4, 1.4);
    brickWall(c, colliders, r.x0, r.x1, site.front, r.h0, r.h1);
    // out front, on the yard: the brick stack, the sand, the cement bags, the mortar heap, a water drum
    brickStack(c, colliders, site.stack.x, site.stack.z, 1.4, 0.9, 1.0);
    heap(c, colliders, site.sand.x, site.sand.z, 1.0, 0.7, SAND);
    for (let k = 0; k < 5; k++) p.box(0.6, 0.15, 0.4, W - 0.6, 0.08 + k * 0.15, -1.3 + (k % 2) * 0.05, CEMENT_BAG); // (inside, out of the sun)
    const m = site.mortar;
    p.cylinder(0.7, 0.85, 0.12, m.x, 0.06, m.z, 0x8a8478, { segments: 12 }); // the mortar heap, wet grey
    p.cylinder(0.3, 0.3, 0.85, m.x + 1.1, 0.43, m.z + 1.2, 0x2f5a8a, { segments: 12 }); // the water drum
    colliders.push({ x0: m.x + 0.75, x1: m.x + 1.45, z0: m.z + 0.85, z1: m.z + 1.55 }, { x0: m.x - 0.7, x1: m.x + 0.7, z0: m.z - 0.7, z1: m.z + 0.7 });
    looseBricks(c, 5, 1.0);
    // where the labourers work (people/construction.ts places them from here)
    c.people.push({ kind: "construction", x: 0, y: 0, z: 0, turn: 0, w: c.w });
    return [];
  },
};

// --- the pieces ---------------------------------------------------------------------------------------

/** A low concrete plinth over the plot, from its front at `zFront` to the back. */
function plinth(c: BuildContext, zFront: number) {
  c.parts.slab(-c.w / 2 + 0.1, c.w / 2 - 0.1, 0, 0.2, -PLOT_DEPTH + 0.3, zFront, CONCRETE);
}

/** A concrete column, `h` tall, its steel rods sticking out of the top if the work stopped there (`bare`). */
function column(c: BuildContext, colliders: LocalBox[], x: number, z: number, h: number, bare: boolean) {
  c.parts.box(0.25, h, 0.25, x, h / 2, z, CONCRETE);
  if (bare) rods(c, x, h, z, 0.7);
  colliders.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 });
}

/** Four steel rods sticking up from (x, y, z), rusted, a little bent. */
function rods(c: BuildContext, x: number, y: number, z: number, length: number) {
  for (const [dx, dz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) {
    const lean = { x: dx * 0.6 + c.rng.range(-0.05, 0.05), z: dz * 0.6 + c.rng.range(-0.05, 0.05) };
    c.parts.strut({ x: x + dx, y, z: z + dz }, { x: x + dx + lean.x, y: y + length, z: z + dz + lean.z }, 0.012, RUST, 4);
  }
}

/**
 * A wall of bare brick, unplastered: along x from x0 to x1 at z (or, when
 * `z1` is given, along z from z to z1 at x = x0), rising from `h0` at its
 * first end to `h1` at its last in steps (a wall going up a course at a time
 * is higher where the mason started). Mortar lines every few courses.
 */
function brickWall(c: BuildContext, colliders: LocalBox[], x0: number, x1: number, z: number, h0: number, h1: number, z1?: number) {
  const p = c.parts, T = 0.23;
  const alongZ = z1 !== undefined;
  const a = alongZ ? z : x0, b = alongZ ? z1! : x1;
  const n = Math.max(1, Math.round(Math.abs(b - a) / 0.6));
  for (let k = 0; k < n; k++) {
    const s0 = a + ((b - a) * k) / n, s1 = a + ((b - a) * (k + 1)) / n;
    const h = Math.round((h0 + ((h1 - h0) * (k + 0.5)) / n) / 0.075) * 0.075; // whole courses
    const len = Math.abs(s1 - s0), mid = (s0 + s1) / 2;
    const colour = k % 3 === 1 ? BRICK_DARK : BRICK;
    if (alongZ) p.box(T, h, len, x0, h / 2, mid, colour);
    else p.box(len, h, T, mid, h / 2, z, colour);
    // mortar lines, every four courses, standing proud of both faces by a hair
    for (let y = 0.3; y < h - 0.05; y += 0.3) {
      if (alongZ) p.box(T + 0.01, 0.015, len, x0, y, mid, MORTAR);
      else p.box(len, 0.015, T + 0.01, mid, y, z, MORTAR);
    }
  }
  if (alongZ) colliders.push({ x0: x0 - T / 2, x1: x0 + T / 2, z0: Math.min(a, b), z1: Math.max(a, b) });
  else colliders.push({ x0: Math.min(a, b), x1: Math.max(a, b), z0: z - T / 2, z1: z + T / 2 });
}

/** A heap (sand, gravel): a low cone, flattened, its foot spread a little unevenly. */
function heap(c: BuildContext, colliders: LocalBox[], x: number, z: number, r: number, h: number, colour: number) {
  c.parts.add(new THREE.ConeGeometry(r, h, 9).scale(1, 1, c.rng.range(0.8, 1.1)), x, h / 2, z, colour, { ry: c.rng.range(0, 3) });
  colliders.push({ x0: x - r * 0.6, x1: x + r * 0.6, z0: z - r * 0.6, z1: z + r * 0.6 });
}

/** A stack of bricks, criss-crossed in layers (one box per layer, alternate layers turned). */
function brickStack(c: BuildContext, colliders: LocalBox[], x: number, z: number, lx: number, lz: number, h: number) {
  for (let y = 0, k = 0; y < h; y += 0.15, k++) c.parts.box(lx - (k % 2) * 0.06, 0.14, lz - ((k + 1) % 2) * 0.06, x, y + 0.07, z, k % 2 ? BRICK : BRICK_DARK);
  colliders.push({ x0: x - lx / 2, x1: x + lx / 2, z0: z - lz / 2, z1: z + lz / 2 });
}

/** A few bricks lying about, around z. */
function looseBricks(c: BuildContext, count: number, z: number) {
  for (let k = 0; k < count; k++) {
    c.parts.box(0.23, 0.075, 0.11, c.rng.range(-c.w / 2 + 0.5, c.w / 2 - 0.5), 0.04, z + c.rng.range(-0.8, 0.8), BRICK, { ry: c.rng.range(0, Math.PI) });
  }
}

/** Clumps of weeds and dry grass, scattered (on a plinth `y` up, if there is one). */
function weeds(c: BuildContext, count: number, y = 0.02) {
  for (let k = 0; k < count; k++) {
    const h = c.rng.range(0.15, 0.45);
    const x = c.rng.range(-c.w / 2 + 0.3, c.w / 2 - 0.3), z = c.rng.range(-PLOT_DEPTH + 0.6, -0.4);
    c.parts.add(new THREE.ConeGeometry(c.rng.range(0.12, 0.3), h, 5), x, y + h / 2, z, c.rng.pick(WEEDS), { ry: c.rng.range(0, 3) });
  }
}

/** Broken bits of brick and stone. */
function rubble(c: BuildContext, count: number) {
  for (let k = 0; k < count; k++) {
    const r = c.rng.range(0.08, 0.18);
    c.parts.add(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.6, 1), c.rng.range(-c.w / 2 + 0.5, c.w / 2 - 0.5), r * 0.3, c.rng.range(-PLOT_DEPTH + 1, -0.8), c.rng.pick([BRICK_DARK, GRAVEL, CONCRETE]));
  }
}
