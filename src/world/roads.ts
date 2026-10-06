/**
 * A road: a centre line on the ground, and the two numbers everything on it
 * is placed by (as the bazaar always has been, world/layout.ts):
 *
 *   s       metres ALONG the road, from its start (0) to its end (`length`)
 *   offset  metres to the SIDE of the centre line: negative = left (as you
 *           walk along it from its start), positive = right
 *
 * `pointAt(s, offset)` turns those into world x/z, so a road can bend and
 * nothing placed on it has to know how. The town (world/town.ts) is a few of
 * these, meeting at junctions.
 *
 * The centre line is worked out once: walk along the road in small steps,
 * turning as its bends say, and record where we are. `s` is then true
 * distance walked, even round a bend.
 */

/** A bend: between `from` and `to` (metres along the road) the road turns by `degrees` (positive = to the right). */
export type Turn = { from: number; to: number; degrees: number };

export type RoadSpec = {
  name: string;
  /** Where s = 0 is (world x/z), and which way the road sets off: radians, 0 = due north (−z), positive = turned east. */
  start: { x: number; z: number };
  heading: number;
  length: number;
  turns?: Turn[];
};

/** Metres between the centre line's recorded points; how far it's worked out past each end. */
const STEP = 0.5;
const MARGIN = 10;

export class Road {
  readonly name: string;
  readonly length: number;
  private readonly table: { x: number; z: number; heading: number }[] = [];

  constructor(spec: RoadSpec) {
    this.name = spec.name;
    this.length = spec.length;
    const turns = spec.turns ?? [];
    const headingAt = (s: number) => {
      let deg = 0;
      for (const t of turns) {
        const k = Math.min(1, Math.max(0, (s - t.from) / (t.to - t.from)));
        deg += t.degrees * k * k * (3 - 2 * k); // smoothstep: eases in and out
      }
      return spec.heading + (deg * Math.PI) / 180;
    };
    let x = 0, z = 0;
    for (let s = -MARGIN; s <= spec.length + MARGIN + STEP; s += STEP) {
      const h = headingAt(s);
      this.table.push({ x, z, heading: h });
      x += Math.sin(h) * STEP;
      z -= Math.cos(h) * STEP;
    }
    // Shift so that s = 0 is exactly at `start`. Copy the numbers first: the
    // s = 0 point is itself in the table, and shifting it halfway through the
    // loop would leave every later point unshifted.
    const { x: ox, z: oz } = this.table[MARGIN / STEP];
    for (const p of this.table) {
      p.x += spec.start.x - ox;
      p.z += spec.start.z - oz;
    }
  }

  /** Where the centre line is at `s`, and which way the road runs there. */
  centreAt(s: number): { x: number; z: number; heading: number } {
    const f = (s + MARGIN) / STEP;
    const i = Math.max(0, Math.min(this.table.length - 2, Math.floor(f)));
    const t = Math.max(0, Math.min(1, f - i));
    const a = this.table[i], b = this.table[i + 1];
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      heading: a.heading + (b.heading - a.heading) * t,
    };
  }

  /** World position of a spot `offset` metres to the side of the centre line at `s`. */
  pointAt(s: number, offset: number): { x: number; z: number } {
    const c = this.centreAt(s);
    // "right" across the road is 90° clockwise from the direction of travel
    return { x: c.x + Math.cos(c.heading) * offset, z: c.z + Math.sin(c.heading) * offset };
  }

  /**
   * The other way round: how far along the road (`s`) a world point is, and
   * how far to the side (`offset`, left negative). Finds the nearest point on
   * the centre line (a simple search: for building, and for placing things).
   */
  roadCoords(x: number, z: number): { s: number; offset: number } {
    let best = 0, bestD = Infinity;
    this.table.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    const c = this.table[best];
    // positive offset is to the right: 90° clockwise from the direction of travel
    const offset = (x - c.x) * Math.cos(c.heading) + (z - c.z) * Math.sin(c.heading);
    return { s: best * STEP - MARGIN, offset };
  }

  /** The player's yaw for looking along the road at `s` (turn = extra turn, radians, left +). */
  yawAlong(s: number, turn = 0): number {
    return -this.centreAt(s).heading + turn;
  }
}
