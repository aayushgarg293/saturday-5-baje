import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { PAL } from "../render/palette";
import { flat } from "../render/toon";
import { Parts } from "./kit";
import { centreAt, pointAt } from "./layout";

/**
 * Electricity poles and the overhead wires strung between them, sagging,
 * dropping off to the houses, and knotting into bundles near some poles:
 * the tangle every Indian market street has overhead.
 *
 * All the poles are merged into one mesh and all the wires into another, so
 * the whole tangle costs two draw calls. Wires are drawn unlit, as dark
 * silhouettes against the sky, which is how you actually see them.
 */

/** Poles along the street: s = metres along, side -1 = left, +1 = right. */
const POLES = [
  { s: 9, side: -1 },
  { s: 31, side: 1 },
  { s: 52, side: -1 },
  { s: 77, side: 1 },
  { s: 101, side: -1 },
  { s: 127, side: 1 },
  { s: 149, side: -1 },
  { s: 169, side: 1 },
  { s: 193, side: -1 },
];
/** Poles stand on the verge, between the road and the drain. */
const POLE_OFFSET = 2.65;
const POLE_HEIGHT = 8.5;
const WIRE_RADIUS = 0.013;

export function buildWires(): { group: THREE.Group; colliders: Box[] } {
  const rng = makeRng(99);
  const group = new THREE.Group();
  group.name = "wires";
  const parts = new Parts();
  const colliders: Box[] = [];
  const wires: THREE.BufferGeometry[] = [];

  // --- poles, each with a crossarm near the top ---------------------------------
  const tops: THREE.Vector3[][] = []; // the points on each crossarm where wires hang
  for (const pole of POLES) {
    const at = pointAt(pole.s, pole.side * POLE_OFFSET);
    const heading = centreAt(pole.s).heading;
    parts.cylinder(0.11, 0.15, POLE_HEIGHT, at.x, POLE_HEIGHT / 2, at.z, PAL.pole, { segments: 6 });
    // crossarm, across the street direction
    parts.box(1.6, 0.12, 0.12, at.x, POLE_HEIGHT - 0.5, at.z, PAL.pole, { ry: -heading });
    colliders.push(boxAt(at.x, at.z, 0.35, 0.35));

    const across = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
    tops.push([-0.7, -0.25, 0.25, 0.7].map((k) =>
      new THREE.Vector3(at.x, POLE_HEIGHT - 0.45, at.z).addScaledVector(across, k)));
  }

  // --- wires between neighbouring poles --------------------------------------------
  for (let i = 0; i + 1 < tops.length; i++) {
    for (let k = 0; k < 4; k++) {
      wires.push(wire(tops[i][k], tops[i + 1][k], rng.range(0.5, 1.1)));
    }
  }

  // --- service wires dropping from each pole to the buildings -----------------------
  for (const pole of POLES) {
    const from = tops[POLES.indexOf(pole)][rng.next() < 0.5 ? 0 : 3];
    const drops = 2 + Math.floor(rng.next() * 3);
    for (let d = 0; d < drops; d++) {
      const s = pole.s + rng.range(-9, 9);
      const side = rng.next() < 0.6 ? pole.side : -pole.side; // some cross the street
      const wall = pointAt(s, side * 4.6); // roughly the facade line
      const to = new THREE.Vector3(wall.x, rng.range(4.9, 6.6), wall.z);
      wires.push(wire(from, to, rng.range(0.25, 0.6)));
    }
  }

  // --- a couple of tangled bundles: many loose loops near one pole ------------------
  for (const index of [2, 6]) {
    const base = tops[index][1];
    for (let n = 0; n < 7; n++) {
      const a = base.clone().add(new THREE.Vector3(rng.range(-0.4, 0.4), rng.range(-0.6, 0.1), rng.range(-0.4, 0.4)));
      const b = base.clone().add(new THREE.Vector3(rng.range(-2.5, 2.5), rng.range(-1.2, 0), rng.range(-2.5, 2.5)));
      wires.push(wire(a, b, rng.range(0.3, 0.9)));
    }
  }

  group.add(parts.build("poles"));
  const wireMesh = new THREE.Mesh(mergeGeometries(wires)!, flat(PAL.wire));
  wireMesh.name = "wires";
  group.add(wireMesh);
  wires.forEach((w) => w.dispose());
  return { group, colliders };
}

/**
 * One sagging wire from `a` to `b`: a thin tube along a curve whose middle
 * hangs `sag` metres below the straight line. (A real hanging wire is a
 * catenary; a simple curve looks the same at this size.)
 */
function wire(a: THREE.Vector3, b: THREE.Vector3, sag: number): THREE.BufferGeometry {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // a quadratic curve passes halfway to its control point, so the control
  // point goes twice as low as the sag we want
  mid.y -= sag * 2;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  return new THREE.TubeGeometry(curve, 14, WIRE_RADIUS, 3, false);
}
