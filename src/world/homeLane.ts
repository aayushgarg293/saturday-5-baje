import type { Rng } from "../core/rng";
import type { PlotType, RowPlan } from "./layout";
import { Road } from "./roads";
import { SCHOOL, SCHOOL_ROAD } from "./schoolRoad";
import type { AreaSpec } from "./town";

/**
 * THE HOME LANE, as data: the loop closes at your door.
 *
 * School road runs on past where it used to stop, a few metres to a corner
 * (the house that closed it now closes the corner: you see it all the way
 * down school road); there the home lane turns west, a quiet colony lane
 * of houses, 125 m, back behind home. Near its end, the south side road's
 * back lane (layout.ts, SIDE_ROADS.south: where the autos wait) runs on
 * south into it: up the back lane, past the waiting autos, out through the
 * side road into the bazaar, ten metres from your door. (The wall that
 * closed the back lane's south end now closes the home lane's far end,
 * behind home; the house that stood right of home is built along the lane.)
 *
 *          bazaar ║  side road            school road
 *     home  ▣     ╠══╗                        │ │
 *               back ║ lane                ═══╛ │ ← its last few metres
 *   ▌wall ══════════╩════ the home lane ════════╡ the corner house
 *
 * Everything here is square to the world: x east, z south. The bazaar's
 * south end is the world's origin; home's front is at z = 0.
 */

/** The lane's middle line (z), and half its width. */
const LANE_Z = 12, HALF = 2.5;
/**
 * Where it ends (x: the wall, behind home's east side), and where the back lane comes into it (x0..x1:
 * the back lane's width, behind the bazaar's row; z0: where its end wall used to be).
 */
export const HOME_LANE = { z: LANE_Z, half: HALF, end: 4.5, mouth: { x0: 12.35, x1: 17.85, z0: 1 } };

/** School road's last stretch: from where it used to end, on to the lane's far side. */
const tailStart = SCHOOL_ROAD.pointAt(SCHOOL_ROAD.length, 0);
export const SCHOOL_TAIL = new Road({ name: "school-tail", start: tailStart, heading: Math.PI, length: LANE_Z + HALF - tailStart.z });

/** The lane: from school road's middle, west to home's side. Its `s` is (school road's x − x). */
export const LANE_ROAD = new Road({ name: "home-lane", start: { x: SCHOOL.x, z: LANE_Z }, heading: -Math.PI / 2, length: SCHOOL.x - HOME_LANE.end });
const laneS = (x: number) => SCHOOL.x - x;

/** The corner house (the one that closed school road), across the tail's end; its half-width. */
export const CORNER_HOUSE_HALF = 5;
/** The house that stood right of home, moved to the lane's south side here (metres along the lane). */
export const MOVED_HOUSE = { s0: 100, s1: 109 };

/** Mostly houses; an old haveli; a couple of little shops a colony has (a dairy, a flour mill, a kirana). */
const colony = (rng: Rng): PlotType => {
  const r = rng.next();
  return r < 0.7 ? "house" : r < 0.85 ? "haveli" : "shop";
};
const tailMix = (rng: Rng): PlotType => (rng.next() < 0.6 ? "shop" : "house");

export const HOME_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: SCHOOL_TAIL, seed: 7801,
    plan: {
      length: SCHOOL_TAIL.length, sides: ["left", "right"], pick: tailMix, setback: { min: SCHOOL.setback, max: SCHOOL.setback },
      // on the west, the lane turns off: the row stops at the lane's north edge
      fixed: [{ side: "right", s0: SCHOOL_TAIL.length - 2 * HALF, s1: SCHOOL_TAIL.length, type: "open" }],
    },
  },
  {
    road: LANE_ROAD, seed: 7802,
    plan: {
      length: LANE_ROAD.length, sides: ["left", "right"], pick: colony, setback: { min: HALF, max: HALF + 0.2 },
      fixed: [
        // the south side starts past the corner house; the north side past the tail's own houses
        { side: "left", s0: 0, s1: CORNER_HOUSE_HALF, type: "open" },
        { side: "right", s0: 0, s1: laneS(SCHOOL.x - SCHOOL.setback - 9), type: "open" },
        // the house moved from beside home
        { side: "left", s0: MOVED_HOUSE.s0, s1: MOVED_HOUSE.s1, type: "open" },
        // where the back lane comes in, on the north side
        { side: "right", s0: laneS(HOME_LANE.mouth.x1), s1: laneS(HOME_LANE.mouth.x0), type: "open" },
      ],
      vacant: [{ side: "left", s: 62, kind: "fenced" }],
    },
  },
];

/** Shown only when near (world/areas.ts): the lane, and the tail with its corner. */
export const HOME_AREAS: AreaSpec[] = [
  { name: "home lane", box: { x0: 16, x1: SCHOOL.x + SCHOOL.setback + 10, z0: LANE_Z - HALF - 10, z1: LANE_Z + HALF + 10 }, reach: 25 },
];

/** A point in the back lane's new stretch, between the side road and the home lane (for tests and cameras). */
export const MOUTH_POINT = { x: (HOME_LANE.mouth.x0 + HOME_LANE.mouth.x1) / 2, z: 5 };
