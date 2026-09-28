import type { Rng } from "../core/rng";

/**
 * The street plan, as data.
 *
 * Everything on the street is placed by two numbers:
 *   s       metres ALONG the street, from the south end (0) to the north end
 *   offset  metres to the SIDE of the centre line: negative = left (the west
 *           side as you walk in), positive = right (the east side)
 *
 * `pointAt(s, offset)` turns those into world x/z. That way the street can
 * curve, and nothing else has to know how.
 *
 *   north   s = STREET_LENGTH ─ closed by a building across the street
 *     ▲        cafe (right side) near the end, its sign visible from the start
 *     │        gentle S-bend in the middle
 *     │        galis, the temple, stall spots…
 *   south   s = 0 ─ closed behind the player
 */

/** Total length of the street, in metres (~1.5 min walk to the cafe, a bit beyond). */
export const STREET_LENGTH = 205;
/** Width of the paved strip down the middle. */
export const ROAD_WIDTH = 4.6;
/** The open drain (nali) runs along both sides, between these offsets. */
export const DRAIN = { inner: 2.95, outer: 3.3 };
/** Plot fronts (the edge of each shop's raised platform) are this far from the centre. */
const SETBACK = { min: 3.35, max: 4.2 };
/** How deep every building's collider goes back from its front. */
export const PLOT_DEPTH = 9;

/**
 * The curve: a gentle S-bend. Each turn gradually changes the street's
 * direction by `degrees` between `from` and `to` (positive = bends right).
 * The second turn undoes the first, so the far end of the street runs the
 * same way as the start but a few metres to the right. That keeps the cafe,
 * on the right near the end, in sight from the start.
 */
const TURNS = [
  { from: 35, to: 80, degrees: 11 },
  { from: 80, to: 122, degrees: -11 },
];

/** Street direction at `s`, in radians (0 = due north, positive = turned east). */
function headingAt(s: number): number {
  let deg = 0;
  for (const t of TURNS) {
    const k = Math.min(1, Math.max(0, (s - t.from) / (t.to - t.from)));
    deg += t.degrees * k * k * (3 - 2 * k); // smoothstep: eases in and out
  }
  return (deg * Math.PI) / 180;
}

/*
 * The centre line, worked out once: walk along the street in small steps,
 * turning as the heading says, and record where we are. `s` is then true
 * distance walked, even round the bend.
 */
const STEP = 0.5;
const table: { x: number; z: number; heading: number }[] = [];
{
  let x = 0, z = 0;
  for (let s = -10; s <= STREET_LENGTH + 10 + STEP; s += STEP) {
    const h = headingAt(s);
    table.push({ x, z, heading: h });
    x += Math.sin(h) * STEP;
    z -= Math.cos(h) * STEP;
  }
  // Shift so that s = 0 is exactly at the world origin. Copy the numbers
  // first: the origin point is itself in the table, and shifting it to zero
  // halfway through the loop would leave every later point unshifted.
  const { x: ox, z: oz } = table[10 / STEP];
  for (const p of table) {
    p.x -= ox;
    p.z -= oz;
  }
}

/** Where the centre line is at `s`, and which way the street runs there. */
export function centreAt(s: number): { x: number; z: number; heading: number } {
  const f = (s + 10) / STEP;
  const i = Math.max(0, Math.min(table.length - 2, Math.floor(f)));
  const t = Math.max(0, Math.min(1, f - i));
  const a = table[i], b = table[i + 1];
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: a.heading + (b.heading - a.heading) * t,
  };
}

/** World position of a spot `offset` metres to the side of the centre line at `s`. */
export function pointAt(s: number, offset: number): { x: number; z: number } {
  const c = centreAt(s);
  // "right" across the street is 90° clockwise from the direction of travel
  return { x: c.x + Math.cos(c.heading) * offset, z: c.z + Math.sin(c.heading) * offset };
}

/**
 * The other way round: how far along the street (`s`) a world point is, and
 * how far to the side (`offset`, left negative). Finds the nearest point on
 * the centre line (a simple search: it's only used while building).
 */
export function streetCoords(x: number, z: number): { s: number; offset: number } {
  let best = 0, bestD = Infinity;
  table.forEach((p, i) => {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  const c = table[best];
  // positive offset is to the right: 90° clockwise from the direction of travel
  const offset = (x - c.x) * Math.cos(c.heading) + (z - c.z) * Math.sin(c.heading);
  return { s: best * STEP - 10, offset };
}

/** The player's yaw for looking along the street at `s` (turn = extra turn, radians, left +). */
export function yawAlong(s: number, turn = 0): number {
  return -centreAt(s).heading + turn;
}

// --- plots ------------------------------------------------------------------------

export type Side = "left" | "right";
export type PlotType = "shop" | "haveli" | "house" | "cafe" | "gali" | "temple" | "road";

export type Plot = {
  side: Side;
  /** Where the plot starts and ends along the street. */
  s0: number;
  s1: number;
  type: PlotType;
  /** Distance from the centre line to the plot's front edge. */
  setback: number;
};

/** Plots that must be exactly here; everything else is filled in around them. */
const FIXED: Omit<Plot, "setback">[] = [
  // side roads near each end, where the moving traffic comes and goes (see SIDE_ROADS)
  { side: "right", s0: 8, s1: 14, type: "road" },
  { side: "left", s0: 190, s1: 196, type: "road" },
  { side: "left", s0: 58, s1: 61, type: "gali" },
  { side: "left", s0: 94, s1: 98, type: "temple" }, // the temple itself arrives in phase 4
  { side: "right", s0: 118, s1: 122, type: "gali" }, // the cricket gali
  { side: "right", s0: 174, s1: 184, type: "cafe" },
];

/** The cafe plot (used to aim cameras and to test the sign is visible). */
export const CAFE = FIXED.find((p) => p.type === "cafe")!;

/**
 * Fill both sides of the street with plots. Fixed plots go where they're
 * told; the gaps between them are split into buildings of random widths.
 * Havelis turn up more in the older middle stretch of the street.
 */
export function planPlots(rng: Rng): Plot[] {
  const plots: Plot[] = [];
  for (const side of ["left", "right"] as const) {
    const fixed = FIXED.filter((p) => p.side === side).sort((a, b) => a.s0 - b.s0);
    let s = 0;
    for (const next of [...fixed, null]) {
      const end = next ? next.s0 : STREET_LENGTH;
      while (end - s > 0.01) {
        const type = pickType(rng, s);
        let width = type === "haveli" ? rng.range(7, 10) : rng.range(3.6, 6.2);
        // don't leave a sliver too narrow to be a building: absorb it now
        if (end - s - width < 3.4) width = end - s;
        plots.push({ side, s0: s, s1: s + width, type, setback: rng.range(SETBACK.min, SETBACK.max) });
        s += width;
      }
      if (next) {
        const setback = next.type === "cafe" ? 3.5 : SETBACK.min;
        plots.push({ ...next, setback });
        s = next.s1;
      }
    }
  }
  return plots;
}

function pickType(rng: Rng, s: number): PlotType {
  const oldQuarter = s > 70 && s < 160; // havelis cluster in the middle
  const r = rng.next();
  if (r < (oldQuarter ? 0.3 : 0.1)) return "haveli";
  if (r < 0.8) return "shop";
  return "house";
}

// --- spots reserved for phase 4 (street life) ---------------------------------------

/**
 * Named spots on the street where later phases will put things. Keeping them
 * here means the layout stays in one file, and phase 4 just fills them in.
 * `offset` is where the thing stands: stalls sit on the verge in front of
 * the shops, a little way out from the plinths.
 */
export const SLOTS = {
  chaiTapri: { s: 56, offset: -2.7 }, // at the mouth of the first gali
  golgappa: { s: 74, offset: 2.8 },
  kachoriSamosa: { s: 38, offset: 2.9 },
  jalebi: { s: 132, offset: -2.8 },
  iceGola: { s: 150, offset: 2.7 },
  kirana1: { s: 26, offset: -3.4 },
  kirana2: { s: 108, offset: 3.4 },
  temple: { s: 96, offset: -3.4 },
  cricketGali: { s: 120, offset: 6 },
  cafeStairs: { s: 181, offset: 3.5 },
} as const;

/**
 * The side roads near each end of the street, where moving vehicles come and
 * go. Each is a 6 m gap in the row leading to a lane that runs *behind* the
 * buildings (parallel to the street), walled off a little way along. Vehicles
 * wait in the lane, round the corner, out of sight from the street.
 *
 *   `side` / `s0`..`s1`  the gap in the row
 *   `lane`               how wide the back lane is, metres
 *   `reach`              how far the back lane runs past the gap each way
 */
export const SIDE_ROADS = {
  south: { side: "right" as Side, s0: 8, s1: 14, lane: 5.5, reach: 9 },
  north: { side: "left" as Side, s0: 190, s1: 196, lane: 5.5, reach: 9 },
};
/** The side roads' setback: they're fixed plots, so they use the minimum. */
export const SIDE_ROAD_SETBACK = SETBACK.min;

export type VehicleSpot = { s: number; side: Side; kind?: "auto" | "rickshaw" | "bicycle" };

/**
 * Parked vehicles along the verges. Picked by hand to keep clear of the
 * stalls, poles, galis, side roads, the temple steps and the cafe's stair
 * door. Two-wheelers get a random kind; the auto and the rickshaw are fixed.
 * The cafe's customers leave their bicycles outside it (s 179–183, right).
 */
export const PARKED: VehicleSpot[] = [
  ...[14, 16, 29, 45.5, 47, 66, 86, 106, 140, 141.5, 158, 170].map((s) => ({ s, side: "left" as Side })),
  { s: 84, side: "left", kind: "auto" },
  ...[20, 23, 34, 49, 51, 64, 88, 112, 138, 157, 165].map((s) => ({ s, side: "right" as Side })),
  { s: 104, side: "right", kind: "rickshaw" },
  ...[179.5, 181, 182.5].map((s) => ({ s, side: "right" as Side, kind: "bicycle" as const })),
];

/** Cows sitting at the road's edge, and dogs lying in the shade. */
export const ANIMALS = {
  cows: [
    { s: 44, offset: 2.25 },
    { s: 110, offset: -2.25 },
    { s: 161, offset: 2.25 },
  ],
  dogs: [
    { s: 97.6, offset: -2.5 }, // at the temple steps (to one side, so the way up stays clear)
    { s: 53, offset: -2.25 }, // near the chai tapri
    { s: 143, offset: 2.6 }, // at a shop step
  ],
};
