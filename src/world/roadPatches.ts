import * as THREE from "three";
import { makeRng } from "../core/rng";
import type { Parts } from "./kit";
import { ROAD_WIDTH, STREET_LENGTH, pointAt } from "./layout";

/**
 * The road's repairs: patches of newer tar where it's been mended (darker
 * the newer they are, greying as they age), the odd square of cement, and
 * the long strips across the road where it was dug up to lay a cable or a
 * pipe and filled in again. No potholes: the road's been looked after,
 * in its way.
 *
 * Added to the ground's own mesh (world/street.ts, `buildGround`): no extra
 * draw calls. Its own random numbers, so nothing else on the street moves.
 */

/** Tar, by age: fresh and nearly black, a few months old, older and greying; and cement. */
const COLOURS = { fresh: 0x4a4541, recent: 0x57514b, old: 0x67605a, cement: 0xa9a397 };
/** How far apart patches are along the street (metres), roughly. */
const EVERY = { min: 38, max: 62 }; // (just a few along the whole street: the owner found more too many)
/** Just above the road (which is 1 cm up), so they don't flicker against it. */
const LIFT = 0.016;

export function addRoadPatches(parts: Parts) {
  const rng = makeRng(4646);
  const half = ROAD_WIDTH / 2 - 0.15;

  // a patch: an uneven four-cornered shape, `along` × `across` metres, centred at (s, offset)
  const patch = (s: number, offset: number, along: number, across: number, colour: number) => {
    // (four-cornered, as a repair is cut out and filled, its corners not quite square)
    const sides = 4;
    const corners: { x: number; z: number }[] = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + Math.PI / sides + rng.range(-0.12, 0.12);
      // a rough rectangle more than a circle: push the points out toward the corners
      const ca = Math.cos(a), sa = Math.sin(a);
      const scale = 1 / Math.max(Math.abs(ca), Math.abs(sa));
      const da = ca * scale * (along / 2) * rng.range(0.85, 1);
      const dc = Math.max(-half, Math.min(half, offset + sa * scale * (across / 2) * rng.range(0.85, 1))) - offset;
      corners.push(pointAt(s + da, offset + dc));
    }
    parts.add(fan(corners), 0, 0, 0, colour);
  };

  let s = rng.range(12, 30);
  while (s < STREET_LENGTH - 3) {
    const roll = rng.next();
    if (roll < 0.12) {
      // a cut across the road where it was dug up: a long narrow strip from one side, part or all the way
      const from = rng.next() < 0.5 ? -1 : 1;
      const reach = rng.range(0.5, 1) * ROAD_WIDTH;
      patch(s, from * (half - reach / 2), rng.range(0.45, 0.7), reach, rng.next() < 0.5 ? COLOURS.recent : COLOURS.old);
    } else {
      const colour = roll < 0.3 ? COLOURS.fresh : roll < 0.62 ? COLOURS.recent : roll < 0.92 ? COLOURS.old : COLOURS.cement;
      const size = rng.range(0.7, 1.15);
      patch(s, rng.range(-half + 0.5, half - 0.5), rng.range(0.8, 2.8) * size, rng.range(0.6, 1.8) * size, colour);
      // sometimes a smaller mend right beside it, done another year
      if (rng.next() < 0.3) patch(s + rng.range(1, 1.8), rng.range(-half + 0.4, half - 0.4), rng.range(0.4, 1), rng.range(0.4, 0.9), COLOURS.old);
    }
    s += rng.range(EVERY.min, EVERY.max);
  }
}

/** A flat shape facing up, from its corners in order (a fan of triangles from the first). */
function fan(corners: { x: number; z: number }[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let k = 1; k < corners.length - 1; k++) {
    const [a, b, c] = [corners[0], corners[k], corners[k + 1]];
    // wound so it faces up (counter-clockwise seen from above), whichever way the corners went round
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const [p, q] = cross < 0 ? [b, c] : [c, b];
    positions.push(a.x, LIFT, a.z, p.x, LIFT, p.z, q.x, LIFT, q.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
