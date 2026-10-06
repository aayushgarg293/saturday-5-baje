import type { Rng } from "../core/rng";
import { BAZAAR, PLOT_DEPTH, type PlotType, type RowPlan } from "./layout";
import { Road } from "./roads";
import { type AreaSpec, BUS_STAND, BUS_STAND_EDGES } from "./town";

/**
 * SCHOOL ROAD, and the lane from the cricket gali, as data.
 *
 * School road leaves the bus stand's south side (through its mouth there,
 * town.ts BUS_STAND.schoolRoad) and runs due south, the town's east side:
 * shops and houses, the school behind its compound wall on the east side,
 * the tuition in a house across from it, the park on the west. (Its far end is closed for now: the home lane, back
 * to your door, comes there next.)
 *
 * The cricket gali (layout.ts, s 118–122 on the bazaar's right) goes through
 * now: past the kids' stumps it carries on east as a narrow lane of houses,
 * 115 m, and comes out on school road at the park's corner: a shortcut
 * across the middle of the town.
 *
 *          bus stand
 *     ════╡ ╞════
 *         │ │  ┌──────────────┐
 *   shops │ │  │ the school   │
 *         │ │  │  (playground, │
 *         │ │  │   the hall)   │
 *   ══════╛ │  └──────────────┘
 *  cricket  │
 *   lane ═══╡ ┌ park ┐
 *   (from   │ │      │   houses, shops
 *   bazaar) │ └──────┘
 *           │
 *        (closed for now)
 *
 * School road runs due south, so everything on it is square to the world:
 * x east, z south.
 */

/** Where school road starts: the middle of the bus stand's mouth, on its south edge. */
const MOUTH = BUS_STAND_EDGES.south.pointAt((BUS_STAND.schoolRoad.s0 + BUS_STAND.schoolRoad.s1) / 2, 0);
const MOUTH_Z = MOUTH.z + 3.5; // (the edge road runs 3.5 m inside the yard's south edge)

export const SCHOOL_ROAD = new Road({ name: "school", start: { x: MOUTH.x, z: MOUTH_Z }, heading: Math.PI, length: 200 });

/** School road's centre line (x), and where along it things are (metres from the bus stand: s). */
export const SCHOOL = {
  x: MOUTH.x,
  /** The school's frontage (on the east side), and how deep its compound runs. */
  school: { s0: 20, s1: 72, depth: 40 },
  /** The tuition: a house across the road from the school, on the west side (world/places/tuition.ts). */
  tuition: { s0: 40, s1: 49 },
  /** The cricket lane's mouth (on the west side), and the park, south of it, how deep it runs west. */
  lane: { s0: 83, s1: 87 },
  park: { s0: 87, s1: 126.5, depth: 32 },
  /** Front lines of the two sides (the rows' setback). */
  setback: 3.35,
};
/** The world z of a point `s` metres down school road. */
export const schoolZ = (s: number) => MOUTH_Z + s;

/** Shops and houses, a haveli now and then. */
const schoolRoadMix = (rng: Rng): PlotType => {
  const r = rng.next();
  return r < 0.55 ? "shop" : r < 0.9 ? "house" : "haveli";
};

export const SCHOOL_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: SCHOOL_ROAD, seed: 7701,
    plan: {
      length: SCHOOL_ROAD.length, sides: ["left", "right"], pick: schoolRoadMix, setback: { min: SCHOOL.setback, max: 4.1 },
      fixed: [
        // the first 9 m: the bus stand's own buildings, either side of its mouth
        { side: "left", s0: 0, s1: 9, type: "open" },
        { side: "right", s0: 0, s1: 9, type: "open" },
        // the school (world/places/school.ts), on the east: left, going south
        { side: "left", s0: SCHOOL.school.s0, s1: SCHOOL.school.s1, type: "open" },
        // the tuition, across from the school (world/places/tuition.ts)
        { side: "right", s0: SCHOOL.tuition.s0, s1: SCHOOL.tuition.s1, type: "open" },
        // the cricket lane's mouth and the park (world/places/park.ts), on the west
        { side: "right", s0: SCHOOL.lane.s0, s1: SCHOOL.park.s1, type: "open" },
      ],
    },
  },
];

// --- the cricket lane -------------------------------------------------------------------------------

/** Half the lane's width (the gali's is 4 m). */
export const CRICKET_LANE_HALF = 2;
/** The cricket gali, in the bazaar's row (layout.ts): where it starts, and its middle. */
export const CRICKET_GALI_S0 = 118;
const GALI_S = 120;
const laneStart = BAZAAR.pointAt(GALI_S, 3.3);
const CRICKET_Z_ = laneStart.z;
/** From the cricket gali's mouth (just off the bazaar's drain) east to school road's west front. */
export const CRICKET_LANE = new Road({ name: "cricket-lane", start: laneStart, heading: Math.PI / 2, length: SCHOOL.x - SCHOOL.setback - laneStart.x });
/** A world x as metres along the lane. */
const laneS = (x: number) => x - laneStart.x;
/** Where the lane's houses start (past the bazaar's row) and stop (the park; school road's row). */
const BAZAAR_BACK = 13.3 - 3.3;
export const CRICKET = {
  /** The house that closed the gali, moved to the lane's north side here (s0..s1): world/street.ts. */
  endHouse: { s0: 20, s1: 26 },
  parkX: SCHOOL.x - SCHOOL.setback - SCHOOL.park.depth,
};

/** Old houses; the lane's quiet. */
const laneHouses = (rng: Rng): PlotType => (rng.next() < 0.18 ? "haveli" : "house");

export const CRICKET_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: CRICKET_LANE, seed: 7711,
    plan: {
      length: laneS(SCHOOL.x - SCHOOL.setback - PLOT_DEPTH), sides: ["left", "right"], pick: laneHouses,
      setback: { min: CRICKET_LANE_HALF, max: CRICKET_LANE_HALF + 0.15 },
      fixed: [
        { side: "left", s0: 0, s1: BAZAAR_BACK, type: "open" },
        { side: "right", s0: 0, s1: BAZAAR_BACK, type: "open" },
        { side: "left", s0: CRICKET.endHouse.s0, s1: CRICKET.endHouse.s1, type: "open" },
        // the park's north side, along the lane's south side
        { side: "right", s0: laneS(CRICKET.parkX), s1: laneS(SCHOOL.x - SCHOOL.setback - PLOT_DEPTH), type: "open" },
      ],
    },
  },
];

// --- the houses round the park ------------------------------------------------------------------------

/**
 * Houses facing the park across a strip of ground beyond its railing, on its
 * far (west) and south sides: a park in a town is ringed by houses, and
 * without them you'd see straight through to the empty land behind.
 */
const PARK_WEST_X = SCHOOL.x - SCHOOL.setback - SCHOOL.park.depth;
const PARK_SOUTH_Z = schoolZ(SCHOOL.park.s1);
/** West side: along the railing, south, from just past the lane's houses; the houses on its right (west), facing the park. */
const PARK_WEST = new Road({ name: "park-west", start: { x: PARK_WEST_X, z: CRICKET_Z_ + PLOT_DEPTH + 2 + 0.6 }, heading: Math.PI, length: PARK_SOUTH_Z - (CRICKET_Z_ + PLOT_DEPTH + 2.6) + 12 });
/** South side: along the railing, east, to school road's own houses; the houses on its right (south), facing the park. */
const PARK_SOUTH = new Road({ name: "park-south", start: { x: PARK_WEST_X - 3, z: PARK_SOUTH_Z }, heading: Math.PI / 2, length: SCHOOL.x - SCHOOL.setback - PLOT_DEPTH - (PARK_WEST_X - 3) });
export const PARK_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  { road: PARK_WEST, seed: 7721, plan: { length: PARK_WEST.length, sides: ["right"], fixed: [], pick: laneHouses, setback: { min: 3, max: 3 } } },
  { road: PARK_SOUTH, seed: 7722, plan: { length: PARK_SOUTH.length, sides: ["right"], fixed: [], pick: laneHouses, setback: { min: 3, max: 3 } } },
];

/** The lane's z (it runs due east). */
export const CRICKET_Z = laneStart.z;

/** The boxes these are drawn in (world/town.ts, AREAS): school road, and the lane (starting clear of the bazaar's row). */
export const SCHOOL_BOX = { x0: SCHOOL.x - SCHOOL.setback - PLOT_DEPTH - 1, x1: SCHOOL.x + SCHOOL.setback + SCHOOL.school.depth + 1, z0: MOUTH_Z + 1, z1: MOUTH_Z + 200 };
export const CRICKET_BOX = { x0: laneStart.x + BAZAAR_BACK + 6, x1: SCHOOL.x - SCHOOL.setback - PLOT_DEPTH - 1.5, z0: CRICKET_Z - PLOT_DEPTH - 3, z1: CRICKET_Z + PLOT_DEPTH + 3 };

/** School road and the cricket lane, drawn only near (world/areas.ts adds these to town.ts's AREAS). */
export const SCHOOL_AREAS: AreaSpec[] = [
  // school road: seen from the bus stand down its length, and from the end of the cricket lane
  { name: "school road", box: SCHOOL_BOX, reach: 25 },
  // the cricket lane: from the bazaar, only through the gali, when you're near it
  { name: "cricket lane", box: CRICKET_BOX, reach: 20 },
];
