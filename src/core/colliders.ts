/**
 * Collision boxes.
 *
 * Every solid thing the player can bump into (a building, a wall, a pole,
 * later a stall or a parked scooter) registers one of these: a rectangle on
 * the ground, seen from above. The player is a circle, and after every small
 * step it is pushed back out of any box it has moved into.
 *
 * Boxes can be **rotated**, because the street curves and the buildings along
 * it aren't lined up with the x/z axes. Height is ignored: the street is flat.
 */

export type Box = {
  /** Centre of the box on the ground, in metres. */
  cx: number;
  cz: number;
  /** Half its size along its own x and z axes (half-width, half-depth). */
  hx: number;
  hz: number;
  /**
   * Rotation about the vertical axis, in radians, using the same convention
   * as a Three.js object's `rotation.y`, so a building's mesh and its
   * collider can share one angle.
   */
  rot: number;
};

/** A box from its centre, full size and rotation. */
export function boxAt(cx: number, cz: number, sizeX: number, sizeZ: number, rot = 0): Box {
  return { cx, cz, hx: sizeX / 2, hz: sizeZ / 2, rot };
}

/**
 * Push a circle (centre `p`, radius `r`) out of every box it overlaps.
 *
 * For each box: turn the point into the box's own frame (as if the box were
 * not rotated), grow the box by the radius so "does a circle hit a box"
 * becomes "is a point inside a bigger box", push the point out through the
 * nearest side, then turn it back into the world.
 */
export function pushOut(p: { x: number; z: number }, r: number, boxes: readonly Box[]) {
  for (const b of boxes) {
    // world → box frame (the inverse of a rotation.y of b.rot)
    const cos = Math.cos(b.rot), sin = Math.sin(b.rot);
    const dx = p.x - b.cx, dz = p.z - b.cz;
    let lx = dx * cos - dz * sin;
    let lz = dx * sin + dz * cos;

    const ex = b.hx + r, ez = b.hz + r;
    if (lx <= -ex || lx >= ex || lz <= -ez || lz >= ez) continue;

    // the smallest push that gets the point outside wins
    const toMinX = lx + ex, toMaxX = ex - lx;
    const toMinZ = lz + ez, toMaxZ = ez - lz;
    const nearest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
    if (nearest === toMinX) lx = -ex;
    else if (nearest === toMaxX) lx = ex;
    else if (nearest === toMinZ) lz = -ez;
    else lz = ez;

    // box frame → world
    p.x = b.cx + lx * cos + lz * sin;
    p.z = b.cz - lx * sin + lz * cos;
  }
}
