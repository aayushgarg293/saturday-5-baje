import type { Box } from "../core/colliders";
import { STREET_LENGTH, pointAt, streetCoords } from "../world/layout";

/**
 * Where a walker can walk: for each side of the street, every quarter metre
 * along it, which distances from the centre line have room for a body.
 * Worked out once, when the street is built, from everything solid.
 *
 * People walk at the road's edge (the verge beyond it is full of parked
 * scooters, stalls and cows). `lane(side, s, want)` gives the free distance
 * nearest to the one they want, looking a little ahead and behind, so they
 * start to swing round a stall or a cow before they reach it, not at it.
 */

const STEP = 0.25; // metres along the street between samples
const INNER = 1.1, OUTER = 2.5, ACROSS = 0.05; // the distances from the centre line that are tried
const BODY = 0.32; // a walker's radius, plus a little room
const LOOK = 0.9; // metres ahead and behind that must also be clear

export type Lanes = {
  /** The free distance from the centre line (positive) nearest to `want`, at `s` on `side` (−1 left, +1 right). */
  lane(side: -1 | 1, s: number, want: number): number;
  /** Is there room for a body at (s, side × distance)? */
  free(side: -1 | 1, s: number, distance: number): boolean;
};

export function planLanes(boxes: readonly Box[]): Lanes {
  // put each box in the 5 m stretches of street it reaches into, so each test
  // only looks at the few boxes nearby
  const buckets: Box[][] = [];
  for (const b of boxes) {
    const { s } = streetCoords(b.cx, b.cz);
    const reach = Math.max(b.hx, b.hz) + 1;
    for (let k = Math.floor((s - reach) / 5); k <= Math.floor((s + reach) / 5); k++) {
      if (k < 0 || k > STREET_LENGTH / 5 + 2) continue;
      (buckets[k] ??= []).push(b);
    }
  }
  const hits = (x: number, z: number, s: number) => (buckets[Math.floor(s / 5)] ?? []).some((b) => overlaps(x, z, BODY, b));

  // free[side][i][j]: room at s = i × STEP, distance = INNER + j × ACROSS
  const cols = Math.round((OUTER - INNER) / ACROSS) + 1;
  const rows = Math.ceil(STREET_LENGTH / STEP) + 1;
  const table = { [-1]: [] as boolean[][], [1]: [] as boolean[][] } as Record<-1 | 1, boolean[][]>;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < rows; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < cols; j++) {
        const p = pointAt(i * STEP, side * (INNER + j * ACROSS));
        row.push(!hits(p.x, p.z, i * STEP));
      }
      table[side].push(row);
    }
  }

  const rowAt = (s: number) => Math.max(0, Math.min(rows - 1, Math.round(s / STEP)));
  const colAt = (d: number) => Math.max(0, Math.min(cols - 1, Math.round((d - INNER) / ACROSS)));
  const free = (side: -1 | 1, s: number, d: number) => table[side][rowAt(s)][colAt(d)];
  // clear here and a little ahead and behind
  const clearAround = (side: -1 | 1, s: number, j: number) => {
    for (let ds = -LOOK; ds <= LOOK; ds += STEP) if (!table[side][rowAt(s + ds)][j]) return false;
    return true;
  };

  return {
    free,
    lane(side, s, want) {
      const j0 = colAt(want);
      for (let k = 0; k < cols; k++) {
        // try the wanted distance, then alternately a little further in and out
        for (const j of [j0 - k, j0 + k]) if (j >= 0 && j < cols && clearAround(side, s, j)) return INNER + j * ACROSS;
      }
      return want; // nowhere clear (shouldn't happen on this street): carry on
    },
  };
}

/** Does a circle at (x, z) of radius r overlap box b? (The test inside `pushOut`, without the push.) */
function overlaps(x: number, z: number, r: number, b: Box): boolean {
  const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
  const dx = x - b.cx, dz = z - b.cz;
  const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
  return Math.abs(lx) < b.hx + r && Math.abs(lz) < b.hz + r;
}
