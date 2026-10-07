import type { Box } from "../core/colliders";
import type { Road } from "../world/roads";
import type { Lanes } from "./lanes";

/**
 * Where a walker can walk on one of the town's roads (world/roads.ts): the
 * same as the bazaar's (people/lanes.ts), for any road. For each side,
 * every quarter metre along it from `s0` to `s1`, which distances from the
 * middle (`inner` to `outer`) have room for a body. Worked out once, from
 * everything solid. `lane(side, s, want)` gives the free distance nearest
 * the one wanted, clear a little ahead and behind, so a walker swings round
 * a cart or a charpai before reaching it.
 */

const STEP = 0.25, ACROSS = 0.05, BODY = 0.32, LOOK = 0.9;

export type RoadLanes = Lanes & { road: Road; s0: number; s1: number };

export function planRoadLanes(road: Road, boxes: readonly Box[], s0: number, s1: number, inner: number, outer: number): RoadLanes {
  // only the boxes near this stretch of road: first by a box round it, then bucketed by where along it
  const pts: { x: number; z: number }[] = [];
  for (let s = s0; s <= s1; s += 2) for (const o of [-outer, outer]) pts.push(road.pointAt(s, o));
  const margin = 3;
  const x0 = Math.min(...pts.map((p) => p.x)) - margin, x1 = Math.max(...pts.map((p) => p.x)) + margin;
  const z0 = Math.min(...pts.map((p) => p.z)) - margin, z1 = Math.max(...pts.map((p) => p.z)) + margin;
  const buckets: Box[][] = [];
  for (const b of boxes) {
    const r = Math.max(b.hx, b.hz) + 1;
    if (b.cx + r < x0 || b.cx - r > x1 || b.cz + r < z0 || b.cz - r > z1) continue;
    const { s } = road.roadCoords(b.cx, b.cz);
    for (let k = Math.floor((s - r) / 5); k <= Math.floor((s + r) / 5); k++) if (k >= 0) (buckets[k] ??= []).push(b);
  }
  const hits = (x: number, z: number, s: number) => (buckets[Math.floor(s / 5)] ?? []).some((b) => overlaps(x, z, BODY, b));

  const cols = Math.round((outer - inner) / ACROSS) + 1;
  const rows = Math.ceil((s1 - s0) / STEP) + 1;
  const table: Record<-1 | 1, boolean[][]> = { [-1]: [], [1]: [] } as Record<-1 | 1, boolean[][]>;
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < rows; i++) {
      const s = s0 + i * STEP;
      const row: boolean[] = [];
      for (let j = 0; j < cols; j++) {
        const p = road.pointAt(s, side * (inner + j * ACROSS));
        row.push(!hits(p.x, p.z, s));
      }
      table[side].push(row);
    }
  }
  const rowAt = (s: number) => Math.max(0, Math.min(rows - 1, Math.round((s - s0) / STEP)));
  const colAt = (d: number) => Math.max(0, Math.min(cols - 1, Math.round((d - inner) / ACROSS)));
  const clearAround = (side: -1 | 1, s: number, j: number) => {
    for (let ds = -LOOK; ds <= LOOK; ds += STEP) if (!table[side][rowAt(s + ds)][j]) return false;
    return true;
  };
  return {
    road, s0, s1,
    free: (side, s, d) => table[side][rowAt(s)][colAt(d)],
    lane(side, s, want) {
      const j0 = colAt(want);
      for (let k = 0; k < cols; k++) for (const j of [j0 - k, j0 + k]) if (j >= 0 && j < cols && clearAround(side, s, j)) return inner + j * ACROSS;
      return want;
    },
  };
}

/** Does a circle at (x, z) of radius r overlap box b? (As in people/lanes.ts.) */
function overlaps(x: number, z: number, r: number, b: Box): boolean {
  const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
  const dx = x - b.cx, dz = z - b.cz;
  const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
  return Math.abs(lx) < b.hx + r && Math.abs(lz) < b.hz + r;
}
