import type { Rng } from "../core/rng";
import { BAZAAR, type PlotType, type RowPlan, STREET_LENGTH } from "./layout";
import { MOHALLA_EXTENT, inMohalla } from "./mohalla";
import { STATION_EXTENT, inStation } from "./station";
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
 * court road with the court, and the bus stand at court road's far end.
 *
 * Every row of buildings here is laid out like the bazaar's (layout.ts,
 * `planPlots`), with its own random numbers, so adding to the town never
 * changes the bazaar.
 */

/** The ground under the whole town (world x/z): the bazaar runs north from the origin, the town spreads east of it. */
export const TOWN_GROUND = { x0: -130, x1: 290, z0: -340, z1: 45 };

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
      // not every plot's built on: one across from the court fenced and for sale; one just past the
      // court begun and abandoned (in dispute: the case is in that very court); one with the builder's
      // sand and bricks dumped on it, near the bus stand end
      vacant: [
        { side: "right", s: 38, kind: "fenced" },
        { side: "left", s: 54, kind: "halfBuilt" },
        { side: "right", s: 65, kind: "bare" },
      ],
    },
  },
];

// --- the bus stand -------------------------------------------------------------------------------

/**
 * The bus stand: a dusty yard where court road ends, at the town's north-east
 * corner (world/places/busStand.ts). In court road's terms it runs from where
 * court road's buildings end (s = 80) `depth` metres further east, `half`
 * metres either side of court road's centre line (court road runs due east,
 * so the yard is square to the world).
 *
 *    north: a boundary wall; along it the waiting shed, the booking window
 *   ┌───────────────────────────────────┐
 *   │  ▭▭▭ shed ▭▭▭    [booking]        │ east:
 *   │                                   │ the dhaba,
 *   │    ▬▬ bus ▬▬      ▬▬ bus ▬▬        │ kiosks, shops
 *   ═ court road                        │
 *   │                                   │
 *   └──── shops ════ school road ═══ shops┘
 *                    (its mouth: closed for now)
 */
export const BUS_STAND = {
  s0: COURT_ROAD.length,
  depth: 36,
  half: 18,
  /** Where school road leaves the south edge (metres along that edge, from its west end). */
  schoolRoad: { s0: 22, s1: 30 },
  /** Where the highway (to Jaipur) leaves the east edge (metres along that edge, from its north end): world/busArrival.ts. */
  highway: { s0: 13, s1: 23 },
};

/** The world point `offset` metres across the bus stand (north −, south +) at `s` metres into it from its west edge. */
export function inBusStand(s: number, offset: number): { x: number; z: number } {
  return COURT_ROAD.pointAt(BUS_STAND.s0 + s, offset);
}

export const BUS_STAND_EDGES = {
  /** North to south, buildings on its left (east). */
  east: new Road({ name: "busstand-east", start: inBusStand(BUS_STAND.depth - EDGE_SETBACK, -BUS_STAND.half), heading: Math.PI, length: BUS_STAND.half * 2 }),
  /** West to east, buildings on its right (south), school road's mouth between them. */
  south: new Road({ name: "busstand-south", start: inBusStand(0, BUS_STAND.half - EDGE_SETBACK), heading: Math.PI / 2, length: BUS_STAND.depth }),
};

const busStandShops = (rng: Rng): PlotType => (rng.next() < 0.85 ? "shop" : "house");

export const BUS_STAND_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: BUS_STAND_EDGES.east, seed: 7401,
    plan: {
      length: BUS_STAND.half * 2, sides: ["left"], pick: busStandShops, setback: { min: EDGE_SETBACK, max: EDGE_SETBACK },
      // the highway's mouth: the buses come in from Jaipur, and go, this way (world/busArrival.ts)
      fixed: [{ side: "left", s0: BUS_STAND.highway.s0, s1: BUS_STAND.highway.s1, type: "open" }],
    },
  },
  {
    road: BUS_STAND_EDGES.south, seed: 7402,
    plan: {
      length: BUS_STAND.depth, sides: ["right"], pick: busStandShops, setback: { min: EDGE_SETBACK, max: EDGE_SETBACK },
      // school road's mouth: a short dead end for now (a house across it a few metres in), until school road is built
      fixed: [{ side: "right", s0: BUS_STAND.schoolRoad.s0, s1: BUS_STAND.schoolRoad.s1, type: "gali" }],
      // a house going up, facing the yard: the labourers at work (people/construction.ts)
      vacant: [{ side: "right", s: 18, kind: "construction" }],
    },
  },
];

// --- what's drawn when (world/areas.ts) ---------------------------------------------------------------

/**
 * The parts of the town shown only while you're near them (world/areas.ts):
 * a box on the ground (world x/z) round each, and how near you must be to it
 * (metres) for it to be drawn: 70–100 m, out in the haze, so you don't see
 * them come on. (They were 20–25 m once: buildings appeared as you came up,
 * washing hung in the air before them.) Anything outside every box (the bazaar, the
 * chowk: its tower is seen all the way down the bazaar) is always drawn.
 */
export type AreaBox = { x0: number; x1: number; z0: number; z1: number };
export type AreaSpec = {
  name: string;
  box: AreaBox;
  reach: number;
  /** Also shown from anywhere inside these (the far ends of long, straight views of it). */
  seenFrom?: AreaBox[];
};

const courtStart = COURT_ROAD.pointAt(0, 0);
export const AREAS: AreaSpec[] = [
  // court road: seen from the chowk, not from the bazaar (the chowk's east edge is in the way). Its box
  // starts 2 m in, so the chowk's own east buildings, whose fronts are on the edge, aren't in it.
  { name: "court road", box: { x0: courtStart.x + 2, x1: courtStart.x + COURT_ROAD.length, z0: courtStart.z - 20, z1: courtStart.z + 20 }, reach: 80 },
  // the bus stand: seen all down court road (it closes the view), and from the chowk
  {
    name: "bus stand",
    box: { x0: courtStart.x + BUS_STAND.s0 + 1, x1: courtStart.x + BUS_STAND.s0 + BUS_STAND.depth + 14, z0: courtStart.z - 30, z1: courtStart.z + 30 },
    reach: 100,
  },
  // the old mohalla (world/mohalla.ts): seen only down its lanes, and from the bazaar only through the
  // gali, near it. (Its box starts well west of the bazaar's own buildings, whose fronts are what place them.)
  { name: "mohalla", box: boxAround(MOHALLA_EXTENT, inMohalla), reach: 70 },
  // the way to the station (world/station.ts): round the corner of the north side road's back lane
  { name: "station", box: boxAround(STATION_EXTENT, inStation), reach: 70 },
];

/** The world box round a stretch of a grid (the mohalla's, the station's: its corners, maybe turned a little). */
export function boxAround(e: { u0: number; u1: number; v0: number; v1: number }, grid: (u: number, v: number) => { x: number; z: number }) {
  const corners = [grid(e.u0, e.v0), grid(e.u1, e.v0), grid(e.u1, e.v1), grid(e.u0, e.v1)];
  const xs = corners.map((c) => c.x), zs = corners.map((c) => c.z);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}
