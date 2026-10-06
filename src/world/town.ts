import type { Rng } from "../core/rng";
import { BAZAAR, type PlotType, type RowPlan, STREET_LENGTH } from "./layout";
import { Road } from "./roads";

/**
 * THE TOWN, as data: the roads beyond the bazaar, and where they meet.
 *
 *            (hills and the fort beyond)
 *    ┌── CHOWK ──── COURT ROAD ──── BUS STAND ┐
 *    │  clock tower                           │
 *  BAZAAR                                  SCHOOL ROAD
 *    │  (the cafe)                    (school, park)
 *    │                                        │
 *  HOME ──────────── HOME LANE ───────────────┘
 *
 * Built so far: the bazaar (world/layout.ts), the chowk at its north end,
 * and court road, with the court.
 *
 * Every row of buildings here is laid out like the bazaar's (layout.ts,
 * `planPlots`), with its own random numbers, so adding to the town never
 * changes the bazaar.
 */

/** The ground under the whole town (world x/z): the bazaar runs north from the origin, the town spreads east of it. */
export const TOWN_GROUND = { x0: -70, x1: 210, z0: -300, z1: 45 };

// --- the chowk ------------------------------------------------------------------------------------

/**
 * The chowk: a paved square at the bazaar's north end, the clock tower on a
 * round island in the middle. In the bazaar's terms it runs from where the
 * bazaar ends (s = STREET_LENGTH) `depth` metres further north, and `half`
 * metres either side of the bazaar's centre line (the bazaar runs straight
 * north here, so the square is square to it).
 *
 *            north edge: shops, low houses (the fort shows over them)
 *        ┌────────────────────────────────┐
 *   west │            ( ◉ )               │ east: the mouth of court road
 *   edge │       the clock tower           ═══  (closed for now, a few
 *        │                                │      metres in)
 *        └────────┐  bazaar  ┌────────────┘
 */
export const CHOWK = {
  s0: STREET_LENGTH,
  depth: 36,
  half: 16,
  /** The round island the clock tower stands on: its radius. */
  island: 4.6,
  /** Where court road leaves the east edge (metres along that edge, from its south end). */
  courtRoad: { s0: 14, s1: 22 },
};

/** The middle of the chowk (world x/z). */
export const CHOWK_MIDDLE = BAZAAR.pointAt(CHOWK.s0 + CHOWK.depth / 2, 0);

/**
 * The three edges with buildings, each a short straight road along the
 * inside of the edge, 3.5 m in: its buildings stand at that setback, so their
 * fronts are exactly on the edge. (The south edge is the bazaar's last
 * buildings and the end of its north back lane.)
 */
const EDGE_SETBACK = 3.5;
const along = (s: number, offset: number) => BAZAAR.pointAt(CHOWK.s0 + s, offset);

export const CHOWK_EDGES = {
  /** West to east, buildings on its left (north). */
  north: new Road({ name: "chowk-north", start: along(CHOWK.depth - EDGE_SETBACK, -CHOWK.half), heading: Math.PI / 2, length: CHOWK.half * 2 }),
  /** South to north, buildings on its left (west). Starts a metre in, clear of the bazaar's back-lane wall. */
  west: new Road({ name: "chowk-west", start: along(1, -CHOWK.half + EDGE_SETBACK), heading: 0, length: CHOWK.depth - 1 }),
  /** South to north, buildings on its right (east), the mouth of court road between them. */
  east: new Road({ name: "chowk-east", start: along(0, CHOWK.half - EDGE_SETBACK), heading: 0, length: CHOWK.depth }),
};

/** Shops and havelis round the chowk; on the north edge, mostly houses (kept low: the fort shows over them). */
const chowkShops = (rng: Rng): PlotType => {
  const r = rng.next();
  return r < 0.25 ? "haveli" : r < 0.85 ? "shop" : "house";
};
const chowkHouses = (rng: Rng): PlotType => (rng.next() < 0.7 ? "house" : "shop");

export const CHOWK_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  { road: CHOWK_EDGES.north, seed: 7101, plan: { length: CHOWK.half * 2, sides: ["left"], fixed: [], pick: chowkHouses, setback: { min: EDGE_SETBACK, max: EDGE_SETBACK } } },
  { road: CHOWK_EDGES.west, seed: 7102, plan: { length: CHOWK.depth - 1, sides: ["left"], fixed: [], pick: chowkShops, setback: { min: EDGE_SETBACK, max: EDGE_SETBACK } } },
  {
    road: CHOWK_EDGES.east, seed: 7103,
    plan: {
      length: CHOWK.depth, sides: ["right"], pick: chowkShops, setback: { min: EDGE_SETBACK, max: EDGE_SETBACK },
      // court road's mouth: left open, court road runs on from here
      fixed: [{ side: "right", s0: CHOWK.courtRoad.s0, s1: CHOWK.courtRoad.s1, type: "open" }],
    },
  },
];

/** The world point `offset` metres across the chowk (west −, east +) at `s` metres into it from its south edge. */
export function inChowk(s: number, offset: number): { x: number; z: number } {
  return along(s, offset);
}

// --- court road ----------------------------------------------------------------------------------

/**
 * Court road: from the middle of the chowk's east edge, 80 m due east to the
 * bus stand. On its north side (its left, going east), set back behind a
 * whitewashed compound wall, the district court; on the wide footpath in
 * front of the wall, under a neem tree, the typists at their tables and the
 * stamp vendor (world/places/court.ts, people/court.ts). Opposite, a row of
 * advocates' chambers, typing and photostat shops, a bhojnalaya, a tea stall.
 *
 *     north   ┌────────── the court ──────────┐
 *             │        (the yard, the gate)    │
 *    ═════════╧═══ wall ══ gate ═══ wall ══════╧═════════  ← the footpath, the neem,
 *    chowk →   ─────────── court road ─────────────────── → bus stand        the typists
 *    ═══════════ chambers, typists, chai ═════════════════
 */
export const COURT_ROAD = new Road({ name: "court", start: along(CHOWK.depth / 2, CHOWK.half), heading: Math.PI / 2, length: 80 });

/**
 * The court's frontage on court road (metres along it), and in the court's own
 * frame (world/places/court.ts: x along the road from the frontage's middle,
 * z toward the road; the road's centre line is at z = 0, north is −z): where
 * the compound wall runs, its gate, the neem tree, and the court building.
 */
export const COURT = {
  s0: 24,
  s1: 48,
  wall: -7.6,
  gate: 2.2, // the gate opening's half-width
  tree: { x: -6.5, z: -6.1 },
  building: { front: -19, back: -32, half: 10 },
};

/** The court road's shops and chambers. */
const courtShops = (rng: Rng): PlotType => (rng.next() < 0.8 ? "shop" : "house");

export const COURT_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: COURT_ROAD, seed: 7201,
    plan: {
      length: COURT_ROAD.length, sides: ["left", "right"], pick: courtShops, setback: { min: 3.35, max: 4.2 },
      fixed: [
        // the first 9 m are the backs of the chowk's corner buildings: left open
        { side: "left", s0: 0, s1: 9, type: "open" },
        { side: "right", s0: 0, s1: 9, type: "open" },
        // the court: its compound and building are world/places/court.ts
        { side: "left", s0: COURT.s0, s1: COURT.s1, type: "open" },
      ],
    },
  },
];
