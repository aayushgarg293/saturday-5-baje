import * as THREE from "three";
import type { Rng } from "../../core/rng";
import { PAL } from "../../render/palette";
import { Parts } from "../kit";

/**
 * Cows and stray dogs: part of every Indian street, and mostly still.
 *
 * Each is a few rounded shapes, smoothly cel-shaded, split into pieces that
 * can move: the body, the head (turning on the neck), the tail. Their
 * `update` gives the small idle motions: a cow chewing and swishing its
 * tail, a dog breathing and lifting its head to watch you go by.
 *
 * Frame: +x is where the animal faces, y up, origin on the ground at its middle.
 */

export type Animal = {
  group: THREE.Group;
  /** Footprint for its collider: length (x) and width (z). */
  size: [number, number];
  /** Advance the idle motion. `toPlayer` is the player's position in the animal's own frame. */
  update(t: number, dt: number, toPlayer: THREE.Vector3): void;
};

/** A capsule lying along x (Three.js makes them standing up). */
function lyingCapsule(radius: number, length: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, length, 6, 14).rotateZ(Math.PI / 2);
}

/** A sphere stretched to (sx, sy, sz) times `radius`: an egg, a lump, a muzzle. */
function blob(radius: number, sx: number, sy: number, sz: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, 14, 10).scale(sx, sy, sz);
}

/** A pivot: an empty group at a joint, so a part can turn about that point. */
function pivot(parent: THREE.Object3D, x: number, y: number, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function buildCow(rng: Rng): Animal {
  const group = new THREE.Group();
  const white = rng.next() < 0.7 ? PAL.cowWhite : 0xd8c7a6; // mostly white, some sandy

  // Sitting: a long rounded body low to the ground, the hump over the
  // shoulders, and the folded legs as rounded bumps tucked along the sides.
  const body = new Parts();
  const trunk = lyingCapsule(0.34, 0.9);
  trunk.scale(1, 0.85, 1);
  body.add(trunk, 0, 0.32, 0, white);
  body.add(blob(0.2, 1.1, 0.8, 0.9), 0.36, 0.6, 0, PAL.cowShade); // the hump
  body.add(blob(0.13, 1.8, 0.6, 0.8), 0.45, 0.08, 0.2, PAL.cowShade); // front legs folded under
  body.add(blob(0.13, 1.8, 0.6, 0.8), 0.45, 0.08, -0.2, PAL.cowShade);
  body.add(blob(0.15, 2.0, 0.7, 0.9), -0.35, 0.1, 0.3, white); // a back leg along the flank
  group.add(body.build("cow", { smooth: true }));

  // The head on its neck: long, rounded, with a darker muzzle, horns and ears.
  const neck = pivot(group, 0.58, 0.5);
  const head = new Parts();
  head.strut({ x: 0, y: 0, z: 0 }, { x: 0.2, y: 0.02, z: 0 }, 0.14, white, 10); // neck
  head.add(blob(0.15, 1.6, 0.95, 0.85), 0.3, -0.02, 0, white);
  head.add(blob(0.1, 0.9, 0.8, 1.0), 0.5, -0.08, 0, 0xc2ada3); // muzzle
  for (const z of [0.07, -0.07]) {
    head.cylinder(0.012, 0.035, 0.2, 0.2, 0.15, z * 1.8, PAL.horn, { rx: z > 0 ? -0.55 : 0.55, segments: 6 }); // horns
    head.add(blob(0.07, 0.6, 0.35, 1.3), 0.18, 0.02, z * 2.8, white); // ears, sideways
  }
  neck.add(head.build("cowHead", { smooth: true }));

  const tailRoot = pivot(group, -0.72, 0.42);
  const tail = new Parts();
  tail.strut({ x: 0, y: 0, z: 0 }, { x: -0.12, y: -0.38, z: 0 }, 0.02, white);
  tail.add(blob(0.05, 1, 1.6, 1), -0.13, -0.44, 0, PAL.dogBlack);
  tailRoot.add(tail.build("cowTail", { smooth: true }));

  const phase = rng.range(0, 10);
  let flick = 0;
  return {
    group,
    size: [1.9, 0.95],
    update(t) {
      // chewing: a small steady bob; now and then a slow look round
      neck.rotation.z = Math.sin((t + phase) * 5.2) * 0.03;
      neck.rotation.y = Math.sin((t + phase) * 0.23) * 0.35;
      // the tail swishes in slow arcs, faster every so often (flies)
      tailRoot.rotation.x = Math.sin((t + phase) * 1.4) * (0.35 + 0.25 * Math.max(0, Math.sin((t + phase) * 0.17)));
      // an occasional quick shake of the head
      flick = Math.max(0, flick - 0.02);
      if (Math.sin((t + phase) * 0.61) > 0.998) flick = 1;
      neck.rotation.x = Math.sin(t * 30) * 0.06 * flick;
    },
  };
}

export function buildDog(rng: Rng): Animal {
  const group = new THREE.Group();
  const coat = rng.pick([PAL.dogTan, PAL.dogTan, PAL.dogBrown, PAL.dogBlack]);

  // Lying down: a lean body, front legs stretched out ahead, a back leg tucked in.
  const chest = pivot(group, 0, 0); // the whole body breathes, very slightly
  const body = new Parts();
  body.add(lyingCapsule(0.13, 0.4), 0, 0.13, 0, coat);
  body.add(blob(0.14, 1.1, 0.9, 1.0), 0.18, 0.15, 0, coat); // chest
  for (const z of [0.07, -0.07]) body.add(lyingCapsule(0.035, 0.25), 0.36, 0.035, z, coat); // front legs
  body.add(blob(0.08, 1.6, 0.8, 0.8), -0.18, 0.06, 0.13, coat); // a back leg tucked in
  chest.add(body.build("dog", { smooth: true }));

  const neck = pivot(group, 0.3, 0.2);
  const head = new Parts();
  head.add(blob(0.085, 1.1, 0.95, 0.95), 0.06, 0, 0, coat);
  head.add(blob(0.05, 1.5, 0.8, 0.85), 0.17, -0.03, 0, coat); // snout
  head.add(blob(0.018, 1, 1, 1), 0.245, -0.02, 0, PAL.dogBlack); // nose
  for (const z of [0.05, -0.05]) head.cylinder(0, 0.035, 0.09, 0.03, 0.1, z, coat, { segments: 4 }); // pointed ears
  neck.add(head.build("dogHead", { smooth: true }));

  const tailRoot = pivot(group, -0.33, 0.13);
  const tail = new Parts();
  tail.strut({ x: 0, y: 0, z: 0 }, { x: -0.2, y: 0.03, z: 0.12 }, 0.022, coat);
  tailRoot.add(tail.build("dogTail", { smooth: true }));

  const phase = rng.range(0, 10);
  let alert = 0; // 0 = head resting on paws, 1 = up and watching
  return {
    group,
    size: [0.8, 0.4],
    update(t, dt, toPlayer) {
      chest.scale.y = 1 + Math.sin((t + phase) * 2.2) * 0.04; // breathing
      // lift the head and watch when the player comes within 5 m
      const near = toPlayer.length() < 5;
      alert += ((near ? 1 : 0) - alert) * (1 - Math.exp(-3 * dt));
      const look = Math.atan2(toPlayer.z, toPlayer.x);
      neck.rotation.z = -0.35 + alert * 0.55;
      neck.rotation.y = alert * THREE.MathUtils.clamp(-look, -1.1, 1.1);
      // a lazy tail thump now and then
      tailRoot.rotation.y = Math.max(0, Math.sin((t + phase) * 3)) * 0.4 * (Math.sin((t + phase) * 0.3) > 0.6 ? 1 : 0);
    },
  };
}
