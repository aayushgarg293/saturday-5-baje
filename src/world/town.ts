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
 * Built so far: the bazaar (world/layout.ts) and the chowk at its north end.
 *
 * Every row of buildings here is laid out like the bazaar's (layout.ts,
 * `planPlots`), with its own random numbers, so adding to the town never
 * changes the bazaar.
 */

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
      // court road's mouth: a short dead end for now (a house across it a few metres in), until court road is built
      fixed: [{ side: "right", s0: CHOWK.courtRoad.s0, s1: CHOWK.courtRoad.s1, type: "gali" }],
    },
  },
];

/** The world point `offset` metres across the chowk (west −, east +) at `s` metres into it from its south edge. */
export function inChowk(s: number, offset: number): { x: number; z: number } {
  return along(s, offset);
}
