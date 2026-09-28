/**
 * Collision boxes.
 *
 * Every solid thing the player can bump into (a building, a wall, later a
 * stall or a parked scooter) registers one of these: a rectangle on the
 * ground, seen from above. The player is a circle, and after every small
 * step it is pushed back out of any box it has moved into.
 *
 * Height is ignored for now because the street is flat. Stairs arrive with the
 * cafe (phase 7).
 */

export type Box = {
  /** West and east edges, in metres. */
  x0: number;
  x1: number;
  /** North and south edges, in metres. */
  z0: number;
  z1: number;
};

/** A box from its centre and size, which is usually how a building is placed. */
export function boxAt(cx: number, cz: number, width: number, depth: number): Box {
  return { x0: cx - width / 2, x1: cx + width / 2, z0: cz - depth / 2, z1: cz + depth / 2 };
}

/**
 * Push a circle (centre `p`, radius `r`) out of every box it overlaps.
 *
 * Each box is grown by the radius on all sides, which turns "does a circle hit
 * a box" into "is a point inside a bigger box". If it is, the point is moved
 * out through whichever side is nearest: the smallest push that fixes it.
 */
export function pushOut(p: { x: number; z: number }, r: number, boxes: readonly Box[]) {
  for (const b of boxes) {
    const x0 = b.x0 - r, x1 = b.x1 + r;
    const z0 = b.z0 - r, z1 = b.z1 + r;
    if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;

    const toWest = p.x - x0, toEast = x1 - p.x;
    const toNorth = p.z - z0, toSouth = z1 - p.z;
    const nearest = Math.min(toWest, toEast, toNorth, toSouth);
    if (nearest === toWest) p.x = x0;
    else if (nearest === toEast) p.x = x1;
    else if (nearest === toNorth) p.z = z0;
    else p.z = z1;
  }
}
