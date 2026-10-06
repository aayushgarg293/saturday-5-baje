import type { Rng } from "../core/rng";
import { BAZAAR, PLOT_DEPTH, type Plot, type PlotType, type RowPlan } from "./layout";
import { Road } from "./roads";

/**
 * THE OLD MOHALLA, as data: the narrow lanes west of the bazaar, through the
 * left gali by the chai tapri (layout.ts, s 58–61).
 *
 * Laid out on its own grid, square to the gali: `u` metres west from the
 * bazaar's centre line, `v` metres south (−v north) of the gali's middle
 * (`inMohalla(u, v)` turns them into world x/z).
 *
 *        v
 *   −16  ┌──── houses ────┐
 *        │                │
 *    −7  │    the square   │ houses
 *  ══ A ═╡   (the peepal   │ (the house that closed
 *  gali  │  on its chabutra)│  the gali, moved here)
 *     7  ├── houses ╥─────┘
 *        │          ║ B
 *        D          ║
 *  21.4  ╚═══ C ════╝
 *       u=24        u=47      u=54
 *
 *   A  from the gali west to the square
 *   B  out of the square's south side, south
 *   C  east, along the bottom
 *   D  north, back up into A: a loop, so you come out where you went in
 *
 * The lanes are narrow (house front to house front, 2 × LANE: under 4 m),
 * paved with bricks set on edge, a little drain down each side. Each lane
 * runs on past its ends by LANE, to the far side of the lane it meets, so
 * the rows of houses meet neatly at the corners. Where a house would stand
 * in another lane (or in the bazaar's own row), it's left out:
 * `fitMohallaPlots`.
 */

/** Half a lane's width: from its middle to the house fronts. */
export const LANE = 1.9;
/** Where the gali leaves the bazaar (metres along it), and the mohalla's grid turned square to the bazaar there. */
const GALI_S = 59.5;
const ORIGIN = BAZAAR.centreAt(GALI_S);
const NORTH = ORIGIN.heading, WEST = NORTH - Math.PI / 2, SOUTH = NORTH + Math.PI, EAST = NORTH + Math.PI / 2;

/** The world point `u` metres west of the bazaar's centre line, `v` metres south of the gali's middle. */
export function inMohalla(u: number, v: number): { x: number; z: number } {
  // west: the bazaar's direction turned a quarter left; south: straight back
  const wx = Math.sin(WEST), wz = -Math.cos(WEST);
  const sx = Math.sin(SOUTH), sz = -Math.cos(SOUTH);
  return { x: ORIGIN.x + wx * u + sx * v, z: ORIGIN.z + wz * u + sz * v };
}

/**
 * For building things on the grid (world/places/mohalla.ts): a group put
 * here, turned by this, has its own x east (−u) and z south (v). (x can't
 * run west: turning can't swap left for right.)
 */
export const MOHALLA_FRAME = { x: ORIGIN.x, z: ORIGIN.z, turn: Math.atan2(Math.cos(EAST), Math.sin(EAST)) };

/** The square, on the grid; the lanes' lines (u for B and D, v for C); the peepal's spot. */
export const MOHALLA = {
  gali: { s0: 58, s1: 61 },
  square: { u0: 40, u1: 54, v0: -7, v1: 7 },
  laneB: 47,
  laneC: 21.4,
  laneD: 24,
  peepal: { u: 47, v: -0.5 },
  /** The house that used to close the gali, moved to the square's far (west) side, facing down lane A: along the west edge's row, from s0 to s1. */
  endHouse: { s0: 4.5, s1: 9.5 },
};
const Q = MOHALLA.square;

/** The lanes (each a Road: its buildings on both sides). */
export const MOHALLA_LANES = {
  a: new Road({ name: "mohalla-a", start: inMohalla(3.3, 0), heading: WEST, length: Q.u0 - 3.3 }),
  b: new Road({ name: "mohalla-b", start: inMohalla(MOHALLA.laneB, Q.v1), heading: SOUTH, length: MOHALLA.laneC - Q.v1 + LANE }),
  c: new Road({ name: "mohalla-c", start: inMohalla(MOHALLA.laneB + LANE, MOHALLA.laneC), heading: EAST, length: MOHALLA.laneB - MOHALLA.laneD + 2 * LANE }),
  d: new Road({ name: "mohalla-d", start: inMohalla(MOHALLA.laneD, MOHALLA.laneC + LANE), heading: NORTH, length: MOHALLA.laneC + 2 * LANE }),
};

/** A line across the middle of the square, west from its east side (for paving it). */
export const SQUARE_AXIS = new Road({ name: "mohalla-square", start: inMohalla(Q.u0, 0), heading: WEST, length: Q.u1 - Q.u0 });

/**
 * Where each lane's own paving runs (metres along it): not where it crosses
 * the lane it meets at a corner (that one's paving is there already), so
 * neither the paving nor the drains overlap.
 */
export const LANE_PAVING: Record<keyof typeof MOHALLA_LANES, { s0: number; s1: number }> = {
  a: { s0: 0, s1: MOHALLA_LANES.a.length },
  b: { s0: 0, s1: MOHALLA_LANES.b.length },
  c: { s0: 2 * LANE, s1: MOHALLA_LANES.c.length },
  d: { s0: 2 * LANE, s1: MOHALLA_LANES.d.length - 2 * LANE },
};

/** The square's edges: a line just inside each edge, the houses beyond it (on its right). */
export const SQUARE_EDGES = {
  north: new Road({ name: "mohalla-sq-north", start: inMohalla(Q.u0, Q.v0 + LANE), heading: WEST, length: Q.u1 - Q.u0 }),
  west: new Road({ name: "mohalla-sq-west", start: inMohalla(Q.u1 - LANE, Q.v0), heading: SOUTH, length: Q.v1 - Q.v0 }),
  south: new Road({ name: "mohalla-sq-south", start: inMohalla(Q.u1, Q.v1 - LANE), heading: EAST, length: Q.u1 - Q.u0 }),
};

/** Mostly houses; a haveli now and then (the old families' houses, gone shabby). No shops: it's where people live. */
const mohallaHouses = (rng: Rng): PlotType => (rng.next() < 0.28 ? "haveli" : "house");
const plan = (length: number, sides: RowPlan["sides"], fixed: RowPlan["fixed"] = []): RowPlan =>
  ({ length, sides, fixed, pick: mohallaHouses, setback: { min: LANE, max: LANE + 0.15 } });

/** The rows, in the order they're fitted (earlier rows keep their houses where two would clash). */
export const MOHALLA_ROWS: { road: Road; plan: RowPlan; seed: number }[] = [
  { road: MOHALLA_LANES.a, seed: 7501, plan: plan(MOHALLA_LANES.a.length, ["left", "right"]) },
  { road: SQUARE_EDGES.north, seed: 7502, plan: plan(Q.u1 - Q.u0, ["right"]) },
  {
    road: SQUARE_EDGES.west, seed: 7503,
    plan: plan(Q.v1 - Q.v0, ["right"], [{ side: "right", s0: MOHALLA.endHouse.s0, s1: MOHALLA.endHouse.s1, type: "open" }]),
  },
  { road: SQUARE_EDGES.south, seed: 7504, plan: plan(Q.u1 - Q.u0, ["right"]) },
  { road: MOHALLA_LANES.b, seed: 7505, plan: plan(MOHALLA_LANES.b.length, ["left", "right"]) },
  { road: MOHALLA_LANES.c, seed: 7506, plan: plan(MOHALLA_LANES.c.length, ["left", "right"]) },
  { road: MOHALLA_LANES.d, seed: 7507, plan: plan(MOHALLA_LANES.d.length, ["left", "right"]) },
];

// --- fitting the rows round the corners -------------------------------------------------------------

type Pt = { x: number; z: number };
type Quad = [Pt, Pt, Pt, Pt];

/** A strip beside a road: from s0 to s1, between two offsets (any order). */
function strip(road: Road, s0: number, s1: number, o0: number, o1: number): Quad {
  return [road.pointAt(s0, o0), road.pointAt(s1, o0), road.pointAt(s1, o1), road.pointAt(s0, o1)];
}

/** Do two convex quads overlap (by more than a touch)? Separating-axis test. */
function overlap(a: Quad, b: Quad): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const p = poly[i], q = poly[(i + 1) % 4];
      const nx = q.z - p.z, nz = p.x - q.x; // the edge's normal
      const len = Math.hypot(nx, nz);
      const project = (r: Quad) => r.map((pt) => (pt.x * nx + pt.z * nz) / len);
      const pa = project(a), pb = project(b);
      if (Math.max(...pa) <= Math.min(...pb) + 0.05 || Math.max(...pb) <= Math.min(...pa) + 0.05) return false;
    }
  }
  return true;
}

/**
 * The open ground of the mohalla, where no house may stand: each lane and
 * the square; and the bazaar's own row either side of the gali.
 */
function keepClear(): Quad[] {
  const lanes = Object.values(MOHALLA_LANES).map((r) => strip(r, 0, r.length, -LANE, LANE));
  const square = [inMohalla(Q.u0, Q.v0), inMohalla(Q.u1, Q.v0), inMohalla(Q.u1, Q.v1), inMohalla(Q.u0, Q.v1)] as Quad;
  // the bazaar's left row, either side of the gali (its fronts 3.35–4.2 m out, PLOT_DEPTH deep)
  const bazaar = [strip(BAZAAR, 15, MOHALLA.gali.s0, -3.35, -4.2 - PLOT_DEPTH), strip(BAZAAR, MOHALLA.gali.s1, 100, -3.35, -4.2 - PLOT_DEPTH)];
  return [...lanes, square, ...bazaar];
}

/**
 * Leave out (`open`) every planned house that would stand in a lane, the
 * square, or the bazaar's row; or whose front would be inside a house
 * already kept; or that would block a kept house's front. (Two houses may
 * overlap at the back: their insides are never seen.) Rows are fitted in
 * order, so the earlier row keeps its house.
 */
export function fitMohallaPlots(rows: { road: Road; plots: Plot[] }[]): MohallaWall[] {
  const clear = keepClear();
  const kept: { body: Quad; front: Quad }[] = [];
  const left: { road: Road; plot: Plot }[] = [];
  for (const { road, plots } of rows) {
    for (const plot of plots) {
      if (plot.type === "open") continue;
      const sign = plot.side === "left" ? -1 : 1;
      const at = (d: number) => sign * (plot.setback + d);
      const body = strip(road, plot.s0, plot.s1, at(0), at(PLOT_DEPTH));
      const front = strip(road, plot.s0, plot.s1, at(0), at(2));
      const clash = clear.some((q) => overlap(body, q))
        || kept.some((k) => overlap(front, k.body) || overlap(body, k.front));
      if (clash) {
        plot.type = "open";
        left.push({ road, plot });
      } else kept.push({ body, front });
    }
  }
  // Where a house was left out, a compound wall along its front closes the gap, as far as it can go
  // without standing in a lane or the square, or in front of (or inside) a house: in 0.5 m pieces,
  // joined into runs, only runs over a metre long kept.
  const walls: MohallaWall[] = [];
  const blocked = [...clear, ...kept.map((k) => k.body)];
  for (const { road, plot } of left) {
    const sign = plot.side === "left" ? -1 : 1;
    let run: number | null = null;
    const STEP = 0.5;
    for (let s = plot.s0; s < plot.s1 + 0.01; s += STEP) {
      const s1 = Math.min(s + STEP, plot.s1);
      const piece = strip(road, s, s1, sign * (plot.setback + 0.02), sign * (plot.setback + 0.35));
      const ok = s1 - s > 0.05 && !blocked.some((q) => overlap(piece, q));
      if (ok && run === null) run = s;
      if ((!ok || s1 >= plot.s1) && run !== null) {
        const end = ok ? s1 : s;
        if (end - run > 1) walls.push({ road, side: plot.side, s0: run, s1: end, setback: plot.setback });
        run = null;
      }
      if (s1 >= plot.s1) break;
    }
  }
  return walls;
}

/** A compound wall closing a gap in a row (where a house was left out), along its front from s0 to s1. */
export type MohallaWall = { road: Road; side: Plot["side"]; s0: number; s1: number; setback: number };

/** The mohalla's extent on the grid (for its area box: world/town.ts, AREAS); starting well clear of the bazaar's row. */
export const MOHALLA_EXTENT = { u0: 16, u1: Q.u1 + PLOT_DEPTH + 2, v0: Q.v0 - PLOT_DEPTH - 2, v1: MOHALLA.laneC + LANE + PLOT_DEPTH + 2 };
