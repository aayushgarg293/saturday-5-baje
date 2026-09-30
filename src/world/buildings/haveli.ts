import * as THREE from "three";
import { PAL } from "../../render/palette";
import { type BuildContext, type BuildResult, FACADE, body, ledge, roof, windowAt } from "./common";

/**
 * A haveli: an older, taller townhouse. What makes it read as Rajasthani:
 * - an arched doorway with a stone frame
 * - jharokhas: carved windows that jut out from the upper floors on a
 *   bracket, with a small domed canopy on top (simplified to boxes and a dome)
 * - a stone band (cornice) at every floor
 * - sometimes a chhatri (a little domed pavilion) on the roof
 */

const FLOOR = 3.3;

export function buildHaveli(c: BuildContext): BuildResult {
  const p = c.parts;
  const r = c.rng;
  const face = -FACADE.house;
  const floors = r.next() < 0.5 ? 2 : 3;
  const top = floors * FLOOR;

  // a stone platform along the front, and the main mass
  p.slab(-c.w / 2, c.w / 2, 0, 0.35, face, 0, PAL.plinth);
  body(c, 0, top, face);

  // arched doorway, slightly off-centre
  const doorX = r.range(-c.w / 6, c.w / 6);
  archedDoor(c, doorX, face);
  // its carved stone nameplate, to the right of the door's frame
  if (doorX + 1.3 + 0.35 < c.w / 2) c.plates.push({ kind: "haveli", x: doorX + 1.3, y: 1.75, z: face + 0.02, w: 0.5, h: 0.32 });
  // small ground-floor windows either side of the door
  for (const side of [-1, 1]) {
    const x = doorX + side * Math.min(2.2, c.w / 3);
    if (Math.abs(x) < c.w / 2 - 0.7) windowAt(c, x, 1.9, face, 0.7, 0.9);
  }

  // upper floors: cornices and jharokhas
  for (let i = 1; i < floors; i++) {
    const floorY = i * FLOOR;
    ledge(c, floorY, face, 0.35);
    const count = Math.max(1, Math.floor(c.w / 3.2));
    for (let j = 0; j < count; j++) {
      const x = -c.w / 2 + (c.w / count) * (j + 0.5);
      jharokha(c, x, floorY + 0.5, face);
    }
  }
  ledge(c, top - 0.25, face, 0.4); // the heavier cornice under the roof

  const height = roof(c, top, face);
  if (r.next() < 0.35) chhatri(c, r.range(-c.w / 2 + 1.4, c.w / 2 - 1.4), top, face - 1.6);
  return { height, signs: [] };
}

/** A wooden door under a round arch, in a raised stone frame. */
function archedDoor(c: BuildContext, x: number, face: number) {
  const p = c.parts;
  const dw = 1.3, dh = 2.2, archR = dw / 2;
  p.slab(x - dw / 2 - 0.25, x + dw / 2 + 0.25, 0.35, 0.35 + dh, face, face + 0.08, PAL.stoneTrim); // frame
  p.add(halfDisc(archR + 0.25), x, 0.35 + dh, face + 0.04, PAL.stoneTrim);
  p.slab(x - dw / 2, x + dw / 2, 0.35, 0.35 + dh, face + 0.08, face + 0.14, PAL.wood); // door leaves
  p.add(halfDisc(archR), x, 0.35 + dh, face + 0.11, PAL.windowDark); // the dark fanlight in the arch
}

/**
 * A flat half-disc standing upright and facing the street (+z), flat side
 * down: the top of an arch. Made from a thin cylinder turned on its side.
 */
function halfDisc(radius: number): THREE.BufferGeometry {
  // thetaStart/Length pick the half that ends up on top after the turn
  const g = new THREE.CylinderGeometry(radius, radius, 0.06, 14, 1, false, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  return g;
}

/** A jharokha: a projecting window box on a tapered bracket, under a small dome. */
function jharokha(c: BuildContext, x: number, y: number, face: number) {
  const p = c.parts;
  const w = 1.4, h = 1.6, d = 0.65;
  // bracket underneath, narrower at the bottom
  p.box(w * 0.8, 0.35, d * 0.8, x, y - 0.2, face + d * 0.4, PAL.stoneTrim);
  // the box itself, with a carved wooden screen and a dark opening
  p.slab(x - w / 2, x + w / 2, y, y + h, face, face + d, c.wall);
  p.slab(x - w / 2 + 0.15, x + w / 2 - 0.15, y + 0.15, y + h - 0.2, face + d, face + d + 0.04, PAL.wood);
  p.slab(x - w / 2 + 0.3, x + w / 2 - 0.3, y + 0.35, y + h - 0.35, face + d + 0.04, face + d + 0.07, PAL.windowDark);
  // canopy slab and a squashed dome on top
  p.box(w + 0.3, 0.1, d + 0.3, x, y + h + 0.05, face + d / 2, PAL.stoneTrim);
  const dome = new THREE.SphereGeometry(w * 0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.7, 0.75);
  p.add(dome, x, y + h + 0.1, face + d / 2, PAL.stoneTrim);
}

/** A chhatri: four slim pillars holding up a little dome, on the roof. */
function chhatri(c: BuildContext, x: number, roofY: number, z: number) {
  const p = c.parts;
  const s = 0.8; // half the footprint
  p.box(s * 2 + 0.3, 0.2, s * 2 + 0.3, x, roofY + 0.1, z, PAL.stoneTrim);
  for (const dx of [-s, s]) for (const dz of [-s, s]) p.box(0.14, 1.5, 0.14, x + dx, roofY + 0.95, z + dz, PAL.stoneTrim);
  p.box(s * 2 + 0.4, 0.14, s * 2 + 0.4, x, roofY + 1.75, z, PAL.stoneTrim);
  const dome = new THREE.SphereGeometry(s + 0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  p.add(dome, x, roofY + 1.8, z, c.wall);
}
