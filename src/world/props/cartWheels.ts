import type { Parts } from "../kit";

/**
 * Four wheels under a cart (a thela, the kulfi cart, the peanut seller's):
 * every cart in town stands on four, small ones for a small cart, tucked
 * under the platform's edges (it overhangs them a little). Each pair
 * shares an axle under the platform, and a bracket at each wheel holds the
 * axle up to the platform's underside, so the wheels are plainly what it
 * stands on.
 *
 * The cart's platform is centred at (x, z), its underside at `underside`;
 * `length` runs along x (or z, with `along: "z"`), `width` across. No random
 * numbers: it changes only how a cart looks.
 */
export type CartWheels = {
  x: number;
  z: number;
  length: number;
  width: number;
  /** Height of the platform's underside. */
  underside: number;
  /** Which way the cart's length runs. */
  along?: "x" | "z";
  /** Wheel radius (kept clear of the platform). */
  radius?: number;
};

const TYRE = 0x2a2622, IRON = 0x3a3634, HUB = 0x8a8a84;

export function cartWheels(p: Parts, c: CartWheels) {
  const r = Math.min(c.radius ?? 0.22, c.underside * 0.45);
  const alongX = (c.along ?? "x") === "x";
  // (a point given as metres along the cart's length and across it)
  const at = (l: number, w: number) => (alongX ? { x: c.x + l, z: c.z + w } : { x: c.x + w, z: c.z + l });
  const inset = Math.min(r + 0.08, c.length / 2 - 0.05);
  const side = c.width / 2 - 0.06; // (wheels just inside the platform's sides: it overhangs them)
  for (const l of [-(c.length / 2 - inset), c.length / 2 - inset]) {
    // the axle, across under the platform
    const mid = at(l, 0);
    if (alongX) p.box(0.04, 0.04, 2 * side + 0.05, mid.x, r, mid.z, IRON);
    else p.box(2 * side + 0.05, 0.04, 0.04, mid.x, r, mid.z, IRON);
    for (const w of [-side, side]) {
      const wheel = at(l, w);
      // the wheel: a disc on its edge, a hub in the middle
      const turn = alongX ? { rx: Math.PI / 2 } : { rz: Math.PI / 2 };
      p.cylinder(r, r, 0.045, wheel.x, r, wheel.z, TYRE, { ...turn, segments: 16 });
      p.cylinder(r * 0.35, r * 0.35, 0.06, wheel.x, r, wheel.z, HUB, { ...turn, segments: 10 });
      // the bracket: from the axle's end up to the platform's underside, just inside the wheel
      const b = at(l, w - Math.sign(w) * 0.055);
      p.box(0.035, c.underside - r + 0.02, 0.035, b.x, (r + c.underside) / 2, b.z, IRON);
    }
  }
}
