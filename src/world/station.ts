import type { Rng } from "../core/rng";
import { BAZAAR, PLOT_DEPTH, type PlotType, type RowPlan, SIDE_ROADS, SIDE_ROAD_SETBACK } from "./layout";
import { Road } from "./roads";

/**
 * THE WAY TO THE STATION, as data: west from the bazaar's north side road
 * (layout.ts, SIDE_ROADS.north), to the railway line and the little station
 * of Daulatbagh.
 *
 * You turn into the side road by the cafe (the vehicles wait in its back
 * lane, as always), walk south down the back lane past them, and where its
 * end used to be walled off, the station lane sets off west: houses, a
 * godown, then the level crossing (the barriers, the gateman's hut), the
 * line itself, and beyond it the station: its platform, the building, the
 * yellow name board. A dead end: the edge of town.
 *
 * Laid out on its own grid, square to the bazaar (which runs straight north
 * here): `u` metres west of the bazaar's centre line, `v` metres south (−v
 * north) of the lane's middle (`inStation(u, v)`).
 *
 *      v
 *    −72 ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐ platform's far end
 *        houses        ║ ║▐platform│station
 *   −10 ─┐ back lane   ║ ║▐ (ramp)  │building
 *     0  │═══ the lane ══╬═╬════ forecourt ═╡
 *        │ godown │houses ║ ║            │
 *        u=12     u=38   u=77  82  86.5  99
 *                       wall track wall
 */

/** Where the lane leaves the back lane (metres along the bazaar), and the grid's origin on the bazaar's centre line. */
const LANE_S = 171;
const ORIGIN = BAZAAR.centreAt(LANE_S);
const WEST = ORIGIN.heading - Math.PI / 2;

/** The world point `u` metres west of the bazaar's centre line, `v` metres south of the station lane's middle. */
export function inStation(u: number, v: number): { x: number; z: number } {
  // (the bazaar runs due north here, so the grid is the world's, flipped east–west)
  return { x: ORIGIN.x - u, z: ORIGIN.z + v };
}

const north = SIDE_ROADS.north;
/** The back lane behind the bazaar's row: from the row's back (u0) to the house across it (u1). */
const BACK = { u0: SIDE_ROAD_SETBACK + PLOT_DEPTH, u1: SIDE_ROAD_SETBACK + PLOT_DEPTH + north.lane };

export const STATION = {
  laneS: LANE_S,
  /** Half the lane's width. */
  half: 3,
  /** The back lane: across it (u), and where its south end wall used to be (v: north.s0 − reach, in the grid), now moved to the lane's south side. */
  back: { ...BACK, oldEnd: LANE_S - (north.s0 - north.reach) },
  /** The godown: on the lane's south side, from the back lane to here. */
  godown: { u0: BACK.u1, u1: BACK.u1 + 20 },
  /** The railway: its boundary walls either side (east, west), the track's middle; the lane's houses stop short of it. */
  railway: { eastWall: 77, track: 82, westWall: 86.5, housesEnd: 72 },
  /** The platform (west of the track): its edge and back (u), its ramp up from the forecourt and its far end (v). */
  platform: { edge: 84.2, back: 91, height: 0.76, rampFoot: -4, rampTop: -9, end: -70 },
  /** The station's enclosure: its far (west) wall, and its north end. */
  enclosure: { west: 99, north: -72 },
  /** How far the line runs each way you can walk along it (v), and how far it's drawn. */
  line: { walk: 75, drawn: 160 },
};
const R = STATION.railway;

/** The lane, west from the back lane to the station's far wall. Its `s` is u − back.u0. */
export const STATION_LANE = new Road({ name: "station", start: inStation(BACK.u0, 0), heading: WEST, length: STATION.enclosure.west - BACK.u0 });
/** A point `u` west, as metres along the lane. */
export const laneS = (u: number) => u - BACK.u0;

/** Houses along the lane (a haveli now and then): it's where the railway families and the old traders live. */
const laneHouses = (rng: Rng): PlotType => (rng.next() < 0.2 ? "haveli" : "house");

export const STATION_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  {
    road: STATION_LANE, seed: 7601,
    plan: {
      length: laneS(R.housesEnd), sides: ["left", "right"], pick: laneHouses, setback: { min: STATION.half, max: STATION.half + 0.25 },
      fixed: [
        // the back lane (the first few metres): open on both sides
        { side: "left", s0: 0, s1: laneS(BACK.u1), type: "open" },
        { side: "right", s0: 0, s1: laneS(BACK.u1), type: "open" },
        // the godown: world/places/station.ts
        { side: "left", s0: laneS(STATION.godown.u0), s1: laneS(STATION.godown.u1), type: "open" },
      ],
    },
  },
];

/** The station's area box (world/town.ts, AREAS): from a little west of the back lane to past the station, along the line as far as you can walk. */
export const STATION_EXTENT = { u0: 20, u1: STATION.enclosure.west + 4, v0: -STATION.line.walk - 4, v1: STATION.line.walk + 4 };
