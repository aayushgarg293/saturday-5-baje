/**
 * Where the ground is, when it isn't the street.
 *
 * The street is flat, at height 0. Anything you can stand on above it (a
 * shop's platform, a staircase, a first floor) is a PATCH: a rectangle seen
 * from above (rotated like the building it belongs to, the same way as a
 * collision `Box`), with a height that is either flat, or a ramp rising
 * from its front edge to its back edge (a staircase: walking up it feels
 * like climbing once the camera follows it smoothly; the steps you see are
 * just the look of it).
 *
 * `groundAt` gives the height to stand at: the highest patch under you that
 * you can step up onto (no more than a step above your feet), so standing on
 * the stairs you aren't snapped to the floor above, and on the first floor
 * you don't drop through to the street below.
 */

export type Patch = {
  /** Centre, seen from above, metres. */
  cx: number;
  cz: number;
  /** Half its size along its own x and z. */
  hx: number;
  hz: number;
  /** Turned about the vertical like a Three.js `rotation.y` (as in `Box`). */
  rot: number;
  /** Height at its front edge (local +z) and its back edge (local −z). Equal: flat. */
  front: number;
  back: number;
};

/** The highest you can step up in one go, metres (a tall step, the shop platforms' 45 cm). */
export const STEP_UP = 0.5;

/** The height to stand at, at (x, z), for someone whose feet are now at `feet`. */
export function groundAt(patches: readonly Patch[], x: number, z: number, feet: number): number {
  let best = 0; // the street
  for (const p of patches) {
    // world → the patch's own frame (as in `pushOut`)
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
    const dx = x - p.cx, dz = z - p.cz;
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    if (Math.abs(lx) > p.hx || Math.abs(lz) > p.hz) continue;
    // how far from the front edge toward the back (0 → 1)
    const k = (p.hz - lz) / (2 * p.hz);
    const h = p.front + (p.back - p.front) * k;
    if (h <= feet + STEP_UP && h > best) best = h;
  }
  return best;
}
