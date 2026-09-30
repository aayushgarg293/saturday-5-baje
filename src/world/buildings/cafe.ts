import { PAL } from "../../render/palette";
import { PLOT_DEPTH } from "../layout";
import { type BuildContext, type BuildResult, FACADE, type LocalBox, type LocalFloor, type SignSpot, ledge, roof } from "./common";
import { furnish } from "../cafe/furniture";
import { STAIR as STAIR_PLAN } from "../cafe/plan";
import { GROUND_TOP, PLINTH_H, shopfront } from "./shop";

/**
 * The cyber cafe building: the destination of the walk. You can go in.
 *
 *   front view (the cafe is on the right-hand side of the street, so from the
 *   street its local +x end is the end nearer the start)
 *
 *   ┌──────────────────────────────────┐
 *   │ [        CYBER CAFE board       ]│
 *   │ ▒▒▒▒▒▒▒ open windows ▒▒▒▒▒▒▒▒    │█ ← blade sign
 *   ├══════════════════════════════════┤█
 *   │ [ STD PCO ISD board ]    │[1st ↑]│
 *   │  open shop below          │ stair │
 *   │                           │ door  │
 *   └───────────────────────────┴───────┘
 *
 *   seen from above (x across, z back from the street):
 *
 *     z=0  ─────────── plot front ────────────
 *          platform       │ door │
 *     face ═══ STD shop ══╪══════╪═ end wall
 *          ...            │stair │
 *          first floor:   │ rises│
 *          the cafe room  │  ↓   │
 *          (over the shop)│      │
 *     −7.0                ├──────┤ top of the stair: you step off to the
 *          the room goes  │      │ left, into the room
 *          on back: a long│      │
 *          hall           │      │
 *     −12.7 ────────── back wall ─────────────
 *
 * The stair is a single steep flight, 1.2 m wide, rising from the doorway at
 * the front to a landing at the back of the first floor: the narrow
 * staircase every such cafe was reached by. Its floor for walking on is a
 * ramp (core/floors.ts); the steps are how it looks.
 *
 * Returns its own colliders (walls on each floor, at their heights) and
 * floors, because unlike every other building you can go inside it.
 */

/**
 * How deep the cafe building goes back from its plot's front: deeper than
 * its neighbours (PLOT_DEPTH), so the room is a long hall, as these cafes
 * were (the owner's choice). The extra depth is behind the row, out of sight
 * from the street.
 */
const CAFE_DEPTH = 12.7;

/** The first floor (the cafe's floor) and the ceiling above it. */
export const CAFE_FLOOR = GROUND_TOP;
const CEILING = 8.0;
const ROOF_Y = 8.2;
/** The stair's strip across the frontage, and where it ends at the back. */
const STAIR = { ...STAIR_PLAN, steps: 21 };
/** Wall thickness. */
const WALL = 0.22;
/** The loose stone step in front of the door, halfway up to the platform. */
const STONE_STEP = 0.22;
/** The window opening along the room's front, and its sill and head. */
const WINDOW = { x0: -4.4, x1: 2.6, y0: CAFE_FLOOR + 0.75, y1: CAFE_FLOOR + 2.05 };

export function buildCafe(c: BuildContext): BuildResult {
  const p = c.parts;
  const face = -FACADE.shop;
  const half = c.w / 2;
  const back = -CAFE_DEPTH;
  const floorY = CAFE_FLOOR;
  const { x0: sx0, x1: sx1 } = STAIR;

  // --- ground floor: the platform, the STD shop, the walls either side of the stair -------
  p.slab(-half, half, 0, PLINTH_H, face - 2.6, 0, PAL.plinth); // platform
  p.slab(-half, half, PLINTH_H - 0.06, PLINTH_H, -0.12, 0, PAL.stoneTrim);
  const shopSign = shopfront(c, -half, sx0 - 0.2, face, "stdShop");
  // (the shop builds the ground floor back as far as its neighbours; fill in the extra depth behind)
  p.slab(-half, sx0 - 0.2, 0, 3.7, back, -PLOT_DEPTH, c.wall);
  p.slab(sx0 - 0.2, sx0, 0, floorY, back, face, c.wall); // wall between shop and stairs
  p.slab(sx1, half, 0, ROOF_Y, back, face, c.wall); // the end wall, all the way up
  p.slab(sx0, sx1, 2.7, floorY, face - WALL, face, c.wall); // over the door
  p.slab(sx0 - 0.12, sx1 + 0.12, 2.7, 2.84, face, face + 0.06, PAL.stoneTrim); // door frame
  // The platform is a high step up from the street (45 cm), so, as people do
  // in small towns, a rough slab of stone has been put down in front of the
  // door as a step halfway. Slightly askew and not quite the door's width.
  p.box(0.95, STONE_STEP - 0.02, 0.42, (sx0 + sx1) / 2 + 0.04, (STONE_STEP - 0.02) / 2, 0.21, 0x8d8579, { ry: 0.05 });
  p.box(0.97, 0.02, 0.44, (sx0 + sx1) / 2 + 0.04, STONE_STEP - 0.01, 0.21, 0x9a9184, { ry: 0.05 }); // its worn top
  // the first floor's floor, over the shop (the shop's own ceiling is at 3.7);
  // its top stops 2 cm short of the room's floor finish laid on it, or the
  // two surfaces would flicker at the same height (z-fighting)
  p.slab(-half, sx0, 3.7, floorY - 0.02, back, face, c.wall);

  // --- the stair ---------------------------------------------------------------------------
  // inside the stairwell: old, darker walls. The left one stops at the first
  // floor (above it, the stairwell is open to the room, behind a railing).
  const well = 0x8f8676, dado = 0x5d6b62;
  p.slab(sx0, sx0 + 0.01, 0, floorY, back, face, well);
  p.slab(sx1 - 0.01, sx1, 0, ROOF_Y, STAIR.top, face, well);
  const rise = (floorY - PLINTH_H) / STAIR.steps, run = (face - STAIR.top) / STAIR.steps;
  for (let i = 0; i < STAIR.steps; i++) {
    const top = PLINTH_H + (i + 1) * rise;
    const z1 = face - i * run, z0 = z1 - run;
    p.slab(sx0 + 0.01, sx1 - 0.01, 0, top, z0, z1, PAL.plinth);
    p.slab(sx0 + 0.01, sx1 - 0.01, top - 0.03, top, z1 - 0.05, z1, PAL.stoneTrim); // the worn nosing
  }
  // a band of dark oil paint up the right-hand wall, following the slope of
  // the stair (a thin board tipped to the stair's angle), ending just short
  // of the top so it doesn't stick up above the landing
  const stairAt = (z: number) => PLINTH_H + ((face - z) / (face - STAIR.top)) * (floorY - PLINTH_H);
  const za = face + 0.2, zb = STAIR.top + 0.6;
  const slope = Math.atan2(stairAt(zb) - stairAt(za), za - zb);
  const bandH = 1.1 * Math.cos(slope);
  p.box(0.01, bandH, Math.hypot(za - zb, stairAt(zb) - stairAt(za)), sx1 - 0.017, (stairAt(za) + stairAt(zb)) / 2 + 0.6, (za + zb) / 2, dado, { rx: slope });
  // the landing at the top, and the back wall behind it
  p.slab(sx0, sx1, floorY - 0.25, floorY, back + WALL, STAIR.top, PAL.plinth);
  p.slab(sx0, sx1, 0, ROOF_Y, back, back + WALL, well);

  // --- the first floor: the cafe room (a shell: furniture comes separately) --------------
  const roomWall = 0xb7cbc4, roomFloor = 0x9c958a, ceiling = PAL.limeWhite;
  // floor, ceiling
  p.slab(-half + WALL, sx0, floorY - 0.02, floorY, back + WALL, face - WALL, roomFloor);
  // the wall beside the landing strip, beyond the top of the stairs, is the room's
  p.slab(sx1 - 0.01, sx1, floorY, CEILING, back, STAIR.top, roomWall);
  p.slab(-half, half, CEILING, ROOF_Y, back, face, ceiling);
  // back wall and the far side wall
  p.slab(-half, sx0, floorY, CEILING, back, back + WALL, roomWall);
  p.slab(-half, -half + WALL, floorY, CEILING, back, face, roomWall);
  // the front wall, round the window opening (outside: the building's wall colour)
  const front = (x0: number, x1: number, y0: number, y1: number) => {
    p.slab(x0, x1, y0, y1, face - WALL, face - WALL + 0.01, roomWall); // its inside face
    p.slab(x0, x1, y0, y1, face - WALL + 0.01, face, c.wall);
  };
  front(-half, half, floorY, WINDOW.y0); // below the sill
  front(-half, half, WINDOW.y1, CEILING); // above the window
  front(-half, WINDOW.x0, WINDOW.y0, WINDOW.y1); // the piers at each end
  front(WINDOW.x1, half, WINDOW.y0, WINDOW.y1);
  // a railing along the open side of the stairwell
  for (let z = face - WALL - 0.1; z > STAIR.top; z -= 0.14) p.box(0.025, 0.9, 0.025, sx0 - 0.1, floorY + 0.45, z, PAL.railing);
  p.box(0.06, 0.05, face - WALL - STAIR.top, sx0 - 0.1, floorY + 0.92, (face - WALL + STAIR.top) / 2, PAL.wood);

  // --- the windows: wooden frames, iron bars, no glass (a summer afternoon) ---------------
  const w = WINDOW;
  p.slab(w.x0, w.x1, w.y0 - 0.06, w.y0, face - WALL - 0.02, face + 0.06, PAL.stoneTrim); // sill
  const bays = 5;
  for (let k = 0; k <= bays; k++) {
    const x = w.x0 + ((w.x1 - w.x0) * k) / bays;
    p.slab(x - 0.05, x + 0.05, w.y0, w.y1, face - WALL, face, PAL.wood); // posts
  }
  p.slab(w.x0, w.x1, w.y1 - 0.06, w.y1, face - WALL, face, PAL.wood); // head
  for (let x = w.x0 + 0.08; x < w.x1; x += 0.12) p.box(0.018, w.y1 - w.y0, 0.018, x, (w.y0 + w.y1) / 2, face - 0.1, PAL.railing); // bars
  ledge(c, GROUND_TOP, face);

  // --- the signs (painted by world/signs.ts) --------------------------------------------------
  const doorSign: SignSpot = { kind: "cafeDoor", x: (sx0 + sx1) / 2, y: 3.3, z: face + 0.08, w: 1.4, h: 0.6 };
  p.box(doorSign.w, doorSign.h, 0.08, doorSign.x, doorSign.y, face + 0.04, PAL.cafeSign);
  const mainSign: SignSpot = { kind: "cafe", x: 0, y: 7.45, z: face + 0.1, w: c.w - 0.4, h: 1.0 };
  p.box(mainSign.w, mainSign.h, 0.1, 0, mainSign.y, face + 0.05, PAL.cafeSign);
  // the blade sign: a tall board sticking out from the wall into the street,
  // edge-on to the facade, so it can be read from far down the street
  const blade = { x: half - 0.35, y0: 4.9, y1: 7.3, z0: face, z1: 0.6 };
  p.slab(blade.x - 0.07, blade.x + 0.07, blade.y0, blade.y1, blade.z0, blade.z1, PAL.cafeSign);
  for (const y of [blade.y0 + 0.2, blade.y1 - 0.2]) {
    p.box(0.05, 0.05, blade.z1 - blade.z0 + 0.1, blade.x, y, (blade.z0 + blade.z1) / 2, PAL.metal); // brackets
  }
  const bladeSign: SignSpot = {
    kind: "cafeBlade",
    x: blade.x + 0.08, // the face toward the start of the street
    y: (blade.y0 + blade.y1) / 2,
    z: (blade.z0 + blade.z1) / 2,
    w: blade.z1 - blade.z0,
    h: blade.y1 - blade.y0,
    ry: Math.PI / 2,
    backOffset: 0.16, // the board is 0.14 thick: its other face, read by people walking the other way
  };
  // film posters: one outside beside the door, two up the stairwell wall at
  // eye height above the steps there
  const stairHeight = stairAt;
  const posters: SignSpot[] = [
    { kind: "posters", x: (sx1 + half) / 2, y: 1.55, z: face, w: 0.62, h: 0.9 },
    { kind: "posters", x: sx1 - 0.025, y: stairHeight(-2.8) + 1.35, z: -2.8, w: 0.6, h: 0.85, ry: -Math.PI / 2 },
    { kind: "posters", x: sx1 - 0.025, y: stairHeight(-5.2) + 1.35, z: -5.2, w: 0.6, h: 0.85, ry: -Math.PI / 2 },
  ];

  const height = roof(c, ROOF_Y, face);

  // the furniture (world/cafe/): booths, the counter, the fixtures
  const furniture = furnish(p, floorY);

  // --- what you bump into, floor by floor, and what you stand on --------------------------------
  const DOWN = { y0: -1, y1: floorY - 0.1 }; // the ground floor (and the stair)
  const UP = { y0: floorY - 0.1, y1: 99 }; // the first floor
  const colliders: LocalBox[] = [
    { x0: -half, x1: sx0, z0: back, z1: 0, ...DOWN }, // downstairs: the shop and its platform (upstairs they're under the floor)
    { x0: sx1, x1: half, z0: back, z1: 0 }, // the end wall, all the way up
    { x0: sx0, x1: sx1, z0: back - 0.5, z1: back + WALL }, // behind the landing
  ];
  colliders.push(
    { x0: -half, x1: sx0, z0: face - WALL, z1: 0, ...UP }, // upstairs: the front wall (you can't climb out of the window)
    { x0: -half - 0.5, x1: -half + WALL, z0: back, z1: face, ...UP }, // the far side wall
    { x0: -half, x1: sx0, z0: back - 0.5, z1: back + WALL, ...UP }, // the back wall
    { x0: sx0 - 0.15, x1: sx0 - 0.05, z0: STAIR.top, z1: face, ...UP }, // the stairwell railing
  );
  const floors: LocalFloor[] = [
    { x0: sx0 + 0.1, x1: sx1 - 0.05, z0: 0, z1: 0.42, front: STONE_STEP, back: STONE_STEP }, // the stone step
    { x0: sx0, x1: sx1, z0: face, z1: 0, front: PLINTH_H, back: PLINTH_H }, // the doorstep
    { x0: sx0, x1: sx1, z0: STAIR.top, z1: face, front: PLINTH_H, back: floorY }, // the stair
    { x0: sx0, x1: sx1, z0: back + WALL, z1: STAIR.top, front: floorY, back: floorY }, // the landing
    { x0: -half + WALL, x1: sx0, z0: back + WALL, z1: face - WALL, front: floorY, back: floorY }, // the room
  ];

  colliders.push(...furniture.colliders);
  return { height, signs: [shopSign, doorSign, mainSign, bladeSign, ...posters, ...furniture.signs], colliders, floors };
}
