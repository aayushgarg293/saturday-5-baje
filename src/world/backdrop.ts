import * as THREE from "three";
import type { Look } from "../render/daylight";
import { makeRng } from "../core/rng";
import { PAL } from "../render/palette";
import { flat } from "../render/toon";
import { Parts } from "./kit";
import { STREET_LENGTH, centreAt } from "./layout";

/**
 * The skyline: the Aravalli hills in three layers, and a fort on a hilltop,
 * like Taragarh above Ajmer.
 *
 * They're far away (hundreds of metres), so they're simple flat-coloured
 * silhouettes: walls of triangles whose top edge is a ridge line, arranged
 * in rings around the town. Each layer is paler than the one in front,
 * which is what distance does to colour in real hazy air. They're drawn with
 * their haze colour already baked in, so the scene's own haze is turned off
 * for them (it would otherwise hide them completely at this distance).
 */

type Ring = { radius: number; base: number; rise: number; colour: number; seed: number };

const RINGS: Ring[] = [
  { radius: 700, base: 70, rise: 60, colour: PAL.hillFar, seed: 3 },
  { radius: 520, base: 40, rise: 50, colour: PAL.hillMid, seed: 7 },
  { radius: 380, base: 22, rise: 30, colour: PAL.hillNear, seed: 11 },
];

/** The fort stands on the middle ring. */
const FORT_RING = 1;

/** How dark each ring goes at dusk, against the sky's haze: far rings stay paler (distance), near ones darker. */
const DUSK_SHADE = [0.85, 0.7, 0.55];

export type Backdrop = { group: THREE.Group; setLook(look: Look): void };

export function buildBackdrop(): Backdrop {
  const group = new THREE.Group();
  group.name = "backdrop";
  // rings are centred on the middle of the street
  const mid = centreAt(STREET_LENGTH / 2);

  /* From inside the street you only see a narrow slot of sky straight down
   * it, so the fort goes exactly where the street points after the bend:
   * it rises over the far end, like a destination. This works out its
   * compass bearing from the ring centre. */
  const end = centreAt(STREET_LENGTH);
  const aheadX = end.x + Math.sin(end.heading) * 600;
  const aheadZ = end.z - Math.cos(end.heading) * 600;
  const FORT_BEARING = Math.atan2(aheadX - mid.x, mid.z - aheadZ);

  RINGS.forEach((ring, i) => {
    const height = ridgeProfile(ring, i === FORT_RING ? FORT_BEARING : null);
    const mesh = new THREE.Mesh(ridgeGeometry(ring, height), flat(ring.colour, { fog: false }));
    mesh.position.set(mid.x, 0, mid.z);
    mesh.renderOrder = -1; // behind everything else
    group.add(mesh);
    tintable.push(...own(mesh, i));
    if (i === FORT_RING) {
      const y = height(FORT_BEARING) - 2; // sunk a little into the hilltop
      // the fort's outer walls follow the hill down, so it needs the ground height either side
      const ground = (bearingOffset: number) => height(FORT_BEARING + bearingOffset) - y;
      const fort = buildFort(ring.radius, ground);
      fort.position.set(
        mid.x + Math.sin(FORT_BEARING) * ring.radius,
        y,
        mid.z - Math.cos(FORT_BEARING) * ring.radius,
      );
      fort.rotation.y = -FORT_BEARING; // face the town
      group.add(fort);
      tintable.push(...own(fort, i));
    }
  });
  const target = new THREE.Color();
  return {
    group,
    /**
     * The hills are painted, not lit, so the time of day recolours them: from
     * their afternoon colours toward the haze, darkened, as the evening comes,
     * until they're dusky silhouettes against the sky.
     */
    setLook(look) {
      const k = THREE.MathUtils.smoothstep(look.evening, 0, 0.8);
      for (const t of tintable) {
        target.copy(look.haze).multiplyScalar(DUSK_SHADE[t.ring]);
        t.material.color.copy(t.day).lerp(target, k);
      }
    },
  };
}

type Tintable = { material: THREE.MeshBasicMaterial; day: THREE.Color; ring: number };
const tintable: Tintable[] = [];

/**
 * Give everything in `object` its own copy of its material (flat() shares one
 * per colour across the game; recolouring a shared one would recolour other
 * things too), and remember its afternoon colour.
 */
function own(object: THREE.Object3D, ring: number): Tintable[] {
  const out: Tintable[] = [];
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh.material instanceof THREE.MeshBasicMaterial)) return;
    const material = mesh.material.clone();
    mesh.material = material;
    out.push({ material, day: material.color.clone(), ring });
  });
  return out;
}

/**
 * The height of a ridge at each compass bearing: a few overlapping waves of
 * different lengths (big hills, smaller bumps), plus, if `peakAt` is given,
 * a broad hill at that bearing for the fort to sit on.
 */
function ridgeProfile(ring: Ring, peakAt: number | null): (bearing: number) => number {
  const rng = makeRng(ring.seed);
  const waves = [1, 2, 3, 5, 8, 13].map((freq) => ({
    freq,
    phase: rng.range(0, Math.PI * 2),
    amp: rng.range(0.4, 1) / Math.sqrt(freq),
  }));
  return (b) => {
    let h = 0;
    for (const w of waves) h += Math.sin(b * w.freq + w.phase) * w.amp;
    let y = ring.base + ring.rise * (0.5 + h * 0.35);
    if (peakAt !== null) {
      // A broad hill with a flat top for the fort to sit on: level for about
      // 6° either side of the fort, easing down to the natural ridge by 22°.
      // (A pointed peak left the ends of the fort hanging in the air.)
      const d = Math.abs(Math.atan2(Math.sin(b - peakAt), Math.cos(b - peakAt))); // angle from the fort
      const k = Math.min(1, Math.max(0, (d - 0.1) / 0.28));
      const plateau = ring.base + ring.rise + 22;
      const weight = 1 - k * k * (3 - 2 * k); // 1 on the plateau, easing to 0
      y += (plateau - y) * weight;
    }
    return y;
  };
}

/** A ring-shaped wall whose top follows the ridge profile. */
function ridgeGeometry(ring: Ring, height: (bearing: number) => number): THREE.BufferGeometry {
  const segments = 360;
  const pos: number[] = [];
  for (let i = 0; i < segments; i++) {
    const b0 = (i / segments) * Math.PI * 2, b1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.sin(b0) * ring.radius, z0 = -Math.cos(b0) * ring.radius;
    const x1 = Math.sin(b1) * ring.radius, z1 = -Math.cos(b1) * ring.radius;
    const bottom = -30;
    const h0 = height(b0), h1 = height(b1);
    // two triangles, wound to face inward, toward the town
    pos.push(x0, bottom, z0, x1, bottom, z1, x0, h0, z0);
    pos.push(x1, bottom, z1, x1, h1, z1, x0, h0, z0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return geo;
}

/**
 * A Rajput hill fort, like Taragarh above Ajmer, seen from 500–600 m away.
 * At that distance only the outline reads, so every feature is big and
 * simple, and it's the features that say "fort":
 *
 *        ⌒    ⌒ ⌒ ⌒          ← chhatris (domed pavilions) on the palace
 *       ┌┴┐  ┌──────┐
 *   ▟▙▟▙│ │▟▙│palace│▟▙▟▙▟▙ ← merlons: the notched battlements on every wall top
 *  ▐██▌═╡ ├══╧══════╧══▐██▌═╗   round, tapering bastions
 *  ▐██▌ │∩│            ▐██▌ ╚═╗  ← the outer walls step down the hillside
 *        gate
 *
 * Local frame: x runs along the ridge, +z faces the town, y = 0 is the top
 * of the hill. `ground(δ)` is the hill height (relative to that) at an angle δ
 * along the ridge from the fort's centre, used to run the outer walls down
 * the slope. Everything is merged into one unlit mesh: one draw call.
 */
function buildFort(radius: number, ground: (bearingOffset: number) => number): THREE.Mesh {
  const p = new Parts();
  const WALL_TOP = 9;
  const FOOT = -10; // walls reach down into the hill, so they never float

  /** A notched row of merlons along the top of a wall from x0 to x1 at height y. */
  const merlons = (x0: number, x1: number, y: number, z: number, colour: number) => {
    for (let x = x0 + 1.4; x < x1 - 1.2; x += 4.6) p.box(2.6, 2.8, 4.2, x, y + 1.4, z, colour);
  };
  /** A round bastion, wider at the foot than the top, with merlons round its rim. */
  const bastion = (x: number, z: number, top: number, r: number) => {
    const h = top - FOOT;
    p.cylinder(r * 0.8, r, h, x, FOOT + h / 2, z, PAL.fortShade, { segments: 14 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      p.box(2.2, 2.6, 1.4, x + Math.sin(a) * r * 0.72, top + 1.3, z + Math.cos(a) * r * 0.72, PAL.fortShade, { ry: a });
    }
  };
  /** A chhatri: a slim pavilion with a dome, sitting on a roof at height y. */
  const chhatri = (x: number, y: number, z: number, r: number) => {
    p.box(r * 2.2, r * 1.3, r * 2.2, x, y + r * 0.65, z, PAL.fortShade);
    const dome = new THREE.SphereGeometry(r * 1.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    p.add(dome, x, y + r * 1.3, z, PAL.fortShade);
    p.cylinder(0.25, 0.25, r * 0.9, x, y + r * 2.4 + r * 0.45, z, PAL.fortShade, { segments: 5 }); // finial
  };

  // --- the main front, on the flat hilltop --------------------------------------
  p.slab(-46, 46, FOOT, WALL_TOP, -2, 2, PAL.fort);
  merlons(-46, -8, WALL_TOP, 0, PAL.fort);
  merlons(8, 46, WALL_TOP, 0, PAL.fort);
  for (const x of [-46, -27, 27, 46]) bastion(x, 1, WALL_TOP + 3, 6.5);

  // the gate: a tall tower in the middle with a dark arched opening, and two chhatris
  p.slab(-8, 8, FOOT, WALL_TOP + 8, -3, 4, PAL.fortShade);
  merlons(-8, 8, WALL_TOP + 8, 0.5, PAL.fortShade);
  p.slab(-2.8, 2.8, 0, 7, 4, 4.3, PAL.fortDark);
  const arch = new THREE.CylinderGeometry(2.8, 2.8, 0.3, 14, 1, false, Math.PI / 2, Math.PI);
  arch.rotateX(Math.PI / 2);
  p.add(arch, 0, 7, 4.15, PAL.fortDark);
  chhatri(-5.5, WALL_TOP + 10.8, 0.5, 2.2);
  chhatri(5.5, WALL_TOP + 10.8, 0.5, 2.2);

  // --- the palace behind the walls: taller blocks with a crown of domes -------------
  p.slab(-36, -12, FOOT, 26, -18, -6, PAL.fort);
  for (const x of [-32, -24, -16]) chhatri(x, 26, -12, 2.6);
  p.slab(14, 32, FOOT, 20, -16, -6, PAL.fort);
  chhatri(23, 20, -11, 3.4);

  // --- outer walls stepping down the hill on both sides ---------------------------
  // Each segment sits on the ring (so the wall curves round the hill like the
  // ridge does) and takes its height from the ground under it.
  for (const side of [-1, 1]) {
    for (let along = 50; along < 170; along += 8) {
      const delta = (side * along) / radius; // angle along the ridge from the centre
      const x = Math.sin(delta) * radius;
      const z = radius * (1 - Math.cos(delta)); // the ring curves toward the town
      const g = ground(delta);
      // built around the origin, then moved and turned onto the ring
      p.slab(-4.2, 4.2, g - 14, g + 7, -1.6, 1.6, PAL.fort);
      moveLast(p, x, z, -delta);
      p.box(3, 2.8, 3.4, 0, g + 8.4, 0, PAL.fort); // one merlon per segment: the notched top
      moveLast(p, x, z, -delta);
      if (along % 40 === 26) bastion(x, z, g + 9, 4.5); // a smaller bastion every so often
    }
  }
  return p.build("fort", { castShadow: false, receiveShadow: false, unlit: true });
}

/**
 * Move and turn the part most recently added to `p` (it was built around the
 * origin). Small helper for the curving outer walls.
 */
function moveLast(p: Parts, x: number, z: number, ry: number) {
  p.transformLast(new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z));
}
