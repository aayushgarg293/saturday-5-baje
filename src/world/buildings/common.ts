import type { Rng } from "../../core/rng";
import { PAL } from "../../render/palette";
import type { Parts } from "../kit";
import { PLOT_DEPTH } from "../layout";

/**
 * Shared building pieces: walls, windows, ledges, rooftops.
 *
 * Every building is built in its own local frame:
 *   x   along the frontage, from -w/2 to +w/2
 *   y   up from the ground
 *   z   toward the street; z = 0 is the front edge of the plot (the edge of
 *       the raised platform), and the building goes back to z = -PLOT_DEPTH
 *
 * A rule learned from Sakura Crossing: you cannot carve a hole into a box.
 * Openings (shopfronts, doors) are built from pieces around the gap, and
 * details (window frames, ledges) are built OUTWARD from the wall face,
 * never sunk into it, or they disappear inside the wall.
 */

/** Everything a building builder needs. */
export type BuildContext = {
  parts: Parts;
  /** Frontage width, metres. */
  w: number;
  rng: Rng;
  /** Main wall colour. */
  wall: number;
  /** For shops: which name it has (world/names.ts), which also decides its goods. */
  shopName?: number;
  /** Builders add places where a person could be (a shopkeeper's stool, the temple). */
  people: PeopleSpot[];
  /** …and where lights come on in the evening (world/evening.ts). No random choices here: evening.ts makes those. */
  lamps: LampSpot[];
  /** …and where a nameplate or a painted blessing goes (world/nameplates.ts says which, and paints it). */
  plates: PlateSpot[];
  /** …and the fronts of the goods in shops, for their printed labels (world/props/labels.ts). */
  labels: LabelSpot[];
  /** …and where a ceiling fan hangs (world/fans.ts builds and turns them). */
  fans: FanSpot[];
  /** …and where washing could be hung out: a balcony's railing, a line on the roof (world/laundry.ts decides). */
  lines: LineSpot[];
};

/**
 * A ceiling fan in a shop, in the builder's frame: `x, z` under its middle,
 * `y` the ceiling it hangs from, `r` how far its blades reach (narrow shops
 * get smaller fans).
 */
export type FanSpot = { x: number; y: number; z: number; r: number };

/**
 * Where washing could hang, in the builder's frame: along x from `x0` to
 * `x1`, hanging from height `y` at `z`.
 *   rail  over a balcony's front railing
 *   roof  on a line strung across the roof, behind the parapet (the poles
 *         at its ends are built with the washing, only if it's used)
 */
export type LineSpot = { kind: "rail" | "roof"; x0: number; x1: number; y: number; z: number };

/**
 * The front of a box on a shop's shelf, or of a snack packet hanging in its
 * doorway, for a printed label (world/props/labels.ts picks the product and
 * paints it). `shelf`: what kind of shop; `shop`: which (so neighbours stock differently); `run`:
 * boxes of the same run hold the same product, as shops stack them; `packet`:
 * a hanging packet (else a box on a shelf).
 */
export type LabelSpot = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  shelf: import("../names").Shelf;
  shop: number;
  run: number;
  packet?: boolean;
  /** Leaning back by this much (a photo frame on its stand). */
  tilt?: number;
};

/**
 * A place for a house's nameplate or blessing, in the builder's frame:
 *   name      beside a house's door, at eye level ("चौधरी सदन", "The Agrawals"…)
 *   haveli    beside a haveli's arched door (a carved stone one)
 *   blessing  painted on the wall over a door ("॥ श्री गणेशाय नमः ॥", "शुभ लाभ"…)
 * `x, y, z`: its middle, on the wall's face; `w, h`: its size.
 */
export type PlateSpot = { kind: "name" | "haveli" | "blessing"; x: number; y: number; z: number; w: number; h: number };

/**
 * A light that comes on in the evening, in the builder's frame (world/evening.ts
 * decides when, and draws it):
 *   tube    a tubelight along x (`w` long), at the top of a shop's opening; its
 *           room's back wall is `back` metres behind it and `h` high
 *   bulb    a bare bulb (at a stall, on a pole, over a door)
 *   fire    a stove's fire (always burning; it just shows more as it gets dark)
 *   window  a window that may light up: `w` by `h`
 * `ry`: which way it faces (radians about the vertical, 0 = +z); `ground`: the
 * height of the ground below, for its pool of light.
 */
export type LampSpot = {
  kind: "tube" | "bulb" | "fire" | "window";
  x: number;
  y: number;
  z: number;
  w?: number;
  h?: number;
  back?: number;
  ry?: number;
  ground?: number;
  /** Always lit once it's evening, from 6 (home's door bulb and window). */
  always?: boolean;
};

/**
 * A place for a person, in the building's frame: where they are, which way
 * they face (radians about the vertical, 0 = toward the street), and what
 * kind of place it is. people/crowd.ts decides who's there.
 */
export type PeopleSpot = {
  kind: "counter" | "platform" | "temple" | "door" | "saloon" | "tailor" | "pco" | "construction";
  x: number;
  /** The floor they're on. */
  y: number;
  z: number;
  turn: number;
  /** For the construction site: the plot's frontage (the labourers' places are worked out from it). */
  w?: number;
  /** The shop's trade, for a shopkeeper. */
  trade?: import("../names").Trade;
  /** For the temple: the bell, relative to the spot, in the spot's own frame. */
  bell?: [number, number, number];
};

/** Where a signboard is, so phase 3 can paint text onto it. Local frame. */
export type SignSpot = {
  kind:
    | "shop" | "stdShop" | "cafe" | "cafeBlade" | "cafeDoor" | "wallAd" | "posters" | "stallSign" | "polePoster"
    // inside the cafe (world/cafe/furniture.ts)
    | "rateBoard" | "notice" | "gamePoster" | "calendar" | "boothNumber"
    // in the STD booth under it (world/cafe/pco.ts)
    | "pcoRates"
    // the town (world/places/)
    | "courtBoard" | "busSide" | "busDestination" | "timetable"
    // the vacant plots (world/buildings/vacant.ts)
    | "plotBoard"
    // the railway (world/places/station.ts)
    | "railBoard"
    // the school (world/places/school.ts)
    | "schoolBoard";
  /** The word(s) on a stall's board. */
  label?: string;
  /** Which entry of SHOP_NAMES (world/names.ts) a shop board shows. */
  nameIndex?: number;
  /** Centre of the board's front face. */
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  /** Extra turn about the vertical axis (the blade sign faces along the street). */
  ry?: number;
  /**
   * For boards readable from both sides (the blade sign): how far behind
   * the front face the back face is, so it can be painted too.
   */
  backOffset?: number;
};

export type BuildResult = {
  /** Total height, including the parapet. */
  height: number;
  signs: SignSpot[];
  /**
   * Walls to bump into, if the building is more than one solid block (the
   * cafe, which you can go inside). Left out, the whole plot is solid.
   */
  colliders?: LocalBox[];
  /** Floors to stand on above the street (stairs, upper floors). */
  floors?: LocalFloor[];
};

/** A collision box in the building's frame: x0..x1 by z0..z1, and (if not full height) only between heights y0..y1. */
export type LocalBox = { x0: number; x1: number; z0: number; z1: number; y0?: number; y1?: number };

/**
 * A floor patch in the building's frame (see core/floors.ts): x0..x1 by
 * z0..z1, at height `front` along its front edge (z1, toward the street)
 * rising or falling to `back` at its back edge (z0). Flat if they're equal.
 */
export type LocalFloor = { x0: number; x1: number; z0: number; z1: number; front: number; back: number };

export const FLOOR_HEIGHT = 3.1;
/** How far the building's facade sits behind the plot front (houses have a step, shops a platform). */
export const FACADE = { shop: 1.1, house: 0.6 };

/** The solid mass of a building: one big box from the facade to the back. */
export function body(c: BuildContext, y0: number, y1: number, zFront: number) {
  c.parts.slab(-c.w / 2, c.w / 2, y0, y1, -PLOT_DEPTH, zFront, c.wall);
}

/**
 * A window on a facade at `zFace`: a wooden frame, a dark pane in front of
 * it (so a rim of frame shows around the pane), and a stone sill.
 */
export function windowAt(c: BuildContext, x: number, y: number, zFace: number, w = 0.9, h = 1.25) {
  const p = c.parts;
  c.lamps.push({ kind: "window", x, y, z: zFace + 0.09, w, h });
  p.box(w + 0.16, h + 0.16, 0.05, x, y, zFace + 0.025, PAL.wood);
  p.box(w, h, 0.05, x, y, zFace + 0.06, PAL.windowDark);
  p.box(w + 0.3, 0.08, 0.2, x, y - h / 2 - 0.1, zFace + 0.1, PAL.stoneTrim);
}

/** A row of windows across one floor, evenly spaced. */
export function windowRow(c: BuildContext, y: number, zFace: number, maxCount = 4) {
  const count = Math.max(1, Math.min(maxCount, Math.floor(c.w / 1.9)));
  for (let i = 0; i < count; i++) {
    const x = -c.w / 2 + (c.w / count) * (i + 0.5);
    windowAt(c, x, y, zFace);
  }
}

/** A chajja: the thin ledge that sticks out over each floor line to throw off rain and sun. */
export function ledge(c: BuildContext, y: number, zFace: number, depth = 0.45) {
  c.parts.box(c.w + 0.1, 0.1, depth, 0, y, zFace + depth / 2, PAL.stoneTrim);
}

/**
 * A small balcony: a slab and an iron railing (a top rail on thin bars),
 * centred on the frontage.
 */
export function balcony(c: BuildContext, y: number, zFace: number) {
  const p = c.parts;
  const bw = Math.min(c.w * 0.6, 3.2);
  const depth = 0.8;
  const railY = y + 0.95;
  const front = zFace + depth - 0.03;
  p.box(bw, 0.14, depth, 0, y, zFace + depth / 2, PAL.stoneTrim);
  // top rails: front and both sides
  p.box(bw, 0.05, 0.05, 0, railY, front, PAL.railing);
  p.box(0.05, 0.05, depth, -bw / 2 + 0.03, railY, zFace + depth / 2, PAL.railing);
  p.box(0.05, 0.05, depth, bw / 2 - 0.03, railY, zFace + depth / 2, PAL.railing);
  // bars, about every 15 cm
  const bar = (x: number, z: number) => p.box(0.025, 0.88, 0.025, x, y + 0.51, z, PAL.railing);
  for (let x = -bw / 2 + 0.03; x <= bw / 2; x += 0.15) bar(x, front);
  for (let z = zFace + 0.15; z < front; z += 0.15) {
    bar(-bw / 2 + 0.03, z);
    bar(bw / 2 - 0.03, z);
  }
  c.lines.push({ kind: "rail", x0: -bw / 2 + 0.1, x1: bw / 2 - 0.1, y: railY + 0.03, z: front + 0.04 });
}

/**
 * The flat roof: a parapet round the front and sides, and the rooftop clutter
 * of the time: a black water tank, a TV antenna, sometimes a dish.
 * Returns the height of the top of the parapet.
 */
export function roof(c: BuildContext, roofY: number, zFace: number): number {
  const p = c.parts;
  const r = c.rng;
  const para = 0.85; // parapet height
  const t = 0.2; // parapet thickness
  p.slab(-c.w / 2, c.w / 2, roofY, roofY + para, zFace - t, zFace, c.wall); // front
  p.slab(-c.w / 2, -c.w / 2 + t, roofY, roofY + para, -PLOT_DEPTH, zFace, c.wall); // sides
  p.slab(c.w / 2 - t, c.w / 2, roofY, roofY + para, -PLOT_DEPTH, zFace, c.wall);
  p.box(c.w + 0.12, 0.08, 0.34, 0, roofY + para + 0.04, zFace - 0.1, PAL.stoneTrim); // coping
  // a place for a washing line, just behind the parapet and high enough that the washing shows
  // over it from the street (in front of the dish and the tank)
  c.lines.push({ kind: "roof", x0: -c.w / 2 + 0.5, x1: c.w / 2 - 0.5, y: roofY + 2.0, z: zFace - 0.45 });

  // Water tank on a little stand, toward the back of the roof.
  if (r.next() < 0.75) {
    const tx = r.range(-c.w / 2 + 1, c.w / 2 - 1);
    const tz = r.range(-PLOT_DEPTH + 1.2, -PLOT_DEPTH / 2);
    const tankR = r.range(0.45, 0.65);
    p.slab(tx - 0.6, tx + 0.6, roofY, roofY + 0.5, tz - 0.6, tz + 0.6, PAL.plinth);
    p.cylinder(tankR, tankR, 1.1, tx, roofY + 0.5 + 0.55, tz, PAL.waterTank, { segments: 12 });
    p.cylinder(0.2, 0.2, 0.08, tx, roofY + 1.64, tz, PAL.waterTank, { segments: 8 }); // lid
  }

  // TV antenna: a pole with crossbars, the unmistakable 2000s roofline.
  if (r.next() < 0.55) {
    const ax = r.range(-c.w / 2 + 0.6, c.w / 2 - 0.6);
    const az = r.range(-PLOT_DEPTH + 1, zFace - 1);
    const poleH = r.range(2.2, 3.2);
    p.cylinder(0.025, 0.025, poleH, ax, roofY + poleH / 2, az, PAL.metal, { segments: 5 });
    for (let i = 0; i < 4; i++) {
      const len = 1.1 - i * 0.18;
      p.box(len, 0.03, 0.03, ax, roofY + poleH - 0.1 - i * 0.28, az, PAL.metal, { ry: r.range(-0.3, 0.3) });
    }
  }

  // A satellite dish (arriving in the later 2000s), tilted up at the sky.
  if (r.next() < 0.25) {
    const dx = r.range(-c.w / 2 + 0.7, c.w / 2 - 0.7);
    p.cylinder(0.38, 0.06, 0.16, dx, roofY + 1.1, zFace - 0.9, PAL.boardWhite, { rx: -0.9, segments: 12 });
    p.box(0.05, 1.0, 0.05, dx, roofY + 0.5, zFace - 0.9, PAL.metal);
  }
  return roofY + para;
}
