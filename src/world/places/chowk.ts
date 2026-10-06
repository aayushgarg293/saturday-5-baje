import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { PAL } from "../../render/palette";
import { flat } from "../../render/toon";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { CHOWK, CHOWK_MIDDLE } from "../town";

/**
 * The chowk's middle (its buildings are rows like the bazaar's: world/town.ts,
 * world/street.ts): the paving across the whole square, and in the middle
 * the clock tower, the Ghanta Ghar, on its round island.
 *
 *   the island    a stone kerb, grass, a low iron railing round it
 *   the tower     a broad stepped base; a red sandstone shaft with arched
 *                 niches; a white band; the clock stage, a clock face on
 *                 each of its four sides; a cornice; a little domed chhatri
 *                 on four pillars, and a brass finial
 *   the lamps     four lamp posts round the island (they come on at dusk:
 *                 world/evening.ts)
 *
 * The clock's hands show the game's time (`setClock`, every frame, as the
 * cafe's wall clock does): all eight hands, the four faces' hour and minute
 * hands, are one mesh drawn many times over ("instanced").
 *
 * FRAME: the tower's own: its foot at the origin, +z toward the bazaar (south).
 */

export type Chowk = {
  group: THREE.Group;
  colliders: Box[];
  lamps: WorldLamp[];
  /** Set the clock's hands (24-hour time, minutes can be fractional). */
  setClock(hours: number, minutes: number): void;
};

const SANDSTONE = 0xb8724f, WHITE = 0xece4d4, TRIM = PAL.stoneTrim, DOME = 0xd9c3a0;
/** The clock stage: its height (the middle of the faces), the face's radius, and how far out from the middle each face is. */
const CLOCK = { y: 13.6, radius: 0.92, out: 1.33 };
const LAMP = { radius: 6.2, height: 4.6 };

export function buildChowk(): Chowk {
  const group = new THREE.Group();
  group.name = "chowk";
  group.position.set(CHOWK_MIDDLE.x, 0, CHOWK_MIDDLE.z);
  // (the bazaar runs straight north here: the tower is square to it, +z toward the bazaar)
  group.updateMatrixWorld(true);
  const p = new Parts();

  // --- the paving: the whole square, a little lighter than the bazaar's road ------------------------
  p.slab(-CHOWK.half, CHOWK.half, 0, 0.012, -CHOWK.depth / 2, CHOWK.depth / 2 + 0.2, 0x8d857c);

  // --- the island: kerb, grass, railing ---------------------------------------------------------------
  const r = CHOWK.island;
  p.cylinder(r, r + 0.05, 0.24, 0, 0.12, 0, 0xb8b0a0, { segments: 32 });
  p.cylinder(r - 0.25, r - 0.25, 0.04, 0, 0.26, 0, 0x6f8f4a, { segments: 32 });
  const posts = 28;
  for (let k = 0; k < posts; k++) {
    const a = (k / posts) * Math.PI * 2;
    const x = Math.cos(a) * (r - 0.12), z = Math.sin(a) * (r - 0.12);
    p.box(0.04, 0.6, 0.04, x, 0.54, z, 0x2f3a30);
    // the rail from this post to the next, and the spear tip on top
    const b = ((k + 1) / posts) * Math.PI * 2;
    const nx = Math.cos(b) * (r - 0.12), nz = Math.sin(b) * (r - 0.12);
    p.strut({ x, y: 0.78, z }, { x: nx, y: 0.78, z: nz }, 0.015, 0x2f3a30, 4);
    p.strut({ x, y: 0.5, z }, { x: nx, y: 0.5, z: nz }, 0.012, 0x2f3a30, 4);
  }

  // --- the tower ------------------------------------------------------------------------------------
  // the base: two broad steps, then the plinth
  p.box(4.4, 0.25, 4.4, 0, 0.38, 0, TRIM);
  p.box(3.8, 0.25, 3.8, 0, 0.63, 0, TRIM);
  p.box(3.2, 1.2, 3.2, 0, 1.35, 0, 0xc7a27a);
  // the lower shaft, red sandstone, a pointed-arch niche on each side
  p.box(2.6, 6.0, 2.6, 0, 4.95, 0, SANDSTONE);
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2;
    const out = new THREE.Vector3(0, 0, 1.31).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    p.box(1.0, 2.6, 0.04, out.x, 4.2, out.z, 0x5a3a2c, { ry }); // the niche, in shadow
    p.box(1.2, 0.12, 0.08, out.x, 5.55, out.z, WHITE, { ry }); // its arch's white line
    p.box(0.3, 0.6, 0.04, out.x, 7.0, out.z, 0x5a3a2c, { ry }); // a slit window above
  }
  // the white band, then the upper shaft
  p.box(2.95, 0.3, 2.95, 0, 8.1, 0, WHITE);
  p.box(2.3, 3.6, 2.3, 0, 10.05, 0, SANDSTONE);
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.box(0.22, 3.6, 0.22, x * 1.1, 10.05, z * 1.1, WHITE); // corner pilasters
  // the clock stage: white, a little broader, and the four faces
  p.box(2.6, 0.2, 2.6, 0, 11.95, 0, TRIM);
  p.box(2.5, 2.8, 2.5, 0, 13.45, 0, WHITE);
  for (let k = 0; k < 4; k++) {
    const ry = (k * Math.PI) / 2;
    const out = new THREE.Vector3(0, 0, CLOCK.out - 0.07).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const face = new THREE.CylinderGeometry(CLOCK.radius + 0.08, CLOCK.radius + 0.08, 0.06, 32).rotateX(Math.PI / 2).rotateY(ry);
    p.add(face, out.x, CLOCK.y, out.z, 0x2a2622); // the dark rim
    const dial = new THREE.CylinderGeometry(CLOCK.radius, CLOCK.radius, 0.06, 32).rotateX(Math.PI / 2).rotateY(ry);
    const dialAt = new THREE.Vector3(0, 0, CLOCK.out - 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    p.add(dial, dialAt.x, CLOCK.y, dialAt.z, 0xf6efd8);
    // the twelve marks
    for (let h = 0; h < 12; h++) {
      const ang = (h / 12) * Math.PI * 2;
      const local = new THREE.Vector3(Math.sin(ang) * CLOCK.radius * 0.82, Math.cos(ang) * CLOCK.radius * 0.82, CLOCK.out - 0.008); // (just proud of the dial)
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const big = h % 3 === 0;
      p.box(big ? 0.07 : 0.04, big ? 0.16 : 0.1, 0.01, local.x, CLOCK.y + local.y, local.z, 0x2a2622, { ry, rz: -ang });
    }
  }
  p.box(2.85, 0.25, 2.85, 0, 14.98, 0, TRIM); // the cornice
  // the chhatri: four slim pillars, a dome, the finial
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) p.cylinder(0.09, 0.09, 1.4, x * 0.95, 15.8, z * 0.95, WHITE, { segments: 8 });
  p.box(2.4, 0.18, 2.4, 0, 16.55, 0, TRIM);
  const dome = new THREE.SphereGeometry(1.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  p.add(dome, 0, 16.62, 0, DOME);
  p.cylinder(0.05, 0.12, 0.7, 0, 18.1, 0, 0xc9a24a, { segments: 8 });
  p.add(new THREE.SphereGeometry(0.1, 8, 6), 0, 18.5, 0, 0xc9a24a);

  // --- the lamp posts, at the island's four corners -----------------------------------------------------
  const lamps: WorldLamp[] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const x = Math.cos(a) * LAMP.radius, z = Math.sin(a) * LAMP.radius;
    p.cylinder(0.07, 0.1, LAMP.height, x, LAMP.height / 2, z, 0x3a3f3a, { segments: 8 });
    p.cylinder(0.16, 0.2, 0.3, x, 0.15, z, 0x3a3f3a, { segments: 8 }); // its foot
    p.add(new THREE.SphereGeometry(0.17, 10, 8), x, LAMP.height + 0.12, z, 0xf2ead6); // the globe
    lamps.push({ kind: "bulb", position: new THREE.Vector3(x, LAMP.height + 0.12, z).applyMatrix4(group.matrixWorld), rotationY: 0, w: 1, h: 1, back: 0, ground: 0, pole: true });
  }
  group.add(p.build("clockTower"));

  // --- the hands: one mesh, eight copies ------------------------------------------------------------
  // (built pointing up from the clock's middle, so turning a copy turns its hand round the face)
  const hand = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const hands = new THREE.InstancedMesh(hand, flat(0x1d1a17), 8);
  hands.name = "clockHands";
  group.add(hands);
  const faceTurn = (k: number) => (k * Math.PI) / 2;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  const setClock = (hours: number, minutes: number) => {
    const angles = [((hours % 12) + minutes / 60) / 12, minutes / 60].map((f) => f * Math.PI * 2);
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 2; j++) {
        // clockwise as seen from in front: a turn about the face's own z, negative
        e.set(0, faceTurn(k), -angles[j], "YXZ");
        q.setFromEuler(e);
        pos.set(0, 0, CLOCK.out + 0.01 + j * 0.01).applyAxisAngle(new THREE.Vector3(0, 1, 0), faceTurn(k)).setY(CLOCK.y);
        scale.set(j === 0 ? 0.07 : 0.045, j === 0 ? CLOCK.radius * 0.5 : CLOCK.radius * 0.78, 0.015);
        hands.setMatrixAt(k * 2 + j, m.compose(pos, q, scale));
      }
    }
    hands.instanceMatrix.needsUpdate = true;
  };
  setClock(16, 30);

  // --- what you bump into: the island, the lamp posts ------------------------------------------------
  // (colliders are boxes: eight thin bars across the island, each turned a little further, together
  // fill the round kerb with only a few centimetres over at the bars' corners)
  const colliders: Box[] = [];
  const middle = CHOWK_MIDDLE;
  for (let k = 0; k < 8; k++) colliders.push(boxAt(middle.x, middle.z, (r + 0.05) * 2, (r + 0.05) * 2 * Math.tan(Math.PI / 16), (k * Math.PI) / 8));
  for (const l of lamps) colliders.push(boxAt(l.position.x, l.position.z, 0.3, 0.3, 0));

  return { group, colliders, lamps, setClock };
}
