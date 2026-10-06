import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { makeRng } from "../../core/rng";
import { PAL } from "../../render/palette";
import { Parts } from "../kit";
import type { WorldSign } from "../street";
import { COURT, COURT_ROAD } from "../town";

/**
 * The district court on court road (world/town.ts, COURT):
 *
 *   the compound wall   whitewashed, an ochre band along its foot, a gate
 *                       in the middle between two square pillars, its iron
 *                       gates swung open
 *   the footpath        wide, in front of the wall: the neem tree, and under
 *                       it the typists' tables (each with its typewriter and
 *                       a stool) and the stamp vendor's (people/court.ts
 *                       sits them there)
 *   the yard            beaten earth; a couple of scooters
 *   the building        the old ochre, two-storey sort: a verandah of arches
 *                       along the front, steps up to it, white trims, the
 *                       middle bay stepping forward under a pediment with its
 *                       name board, and the flag on top
 *
 * FRAME: the court's own: x along court road from the middle of the
 * frontage, z toward the road (the road's centre line is z = 0; the court is
 * to the north, −z). Court road runs due east, so this frame is the world's,
 * moved.
 */

export type Court = { group: THREE.Group; colliders: Box[]; signs: WorldSign[] };

/** The typists' tables (and the stamp vendor's, the last), along the wall: x, and which way the sitter faces (toward the road). */
export const TYPIST_TABLES = [-9.6, -3.9, 4.3, 8.8].map((x) => ({ x, z: COURT.wall + 1.15 }));
/** A client, standing at the middle typist's table, facing it (people/court.ts). */
export const CLIENT = { x: TYPIST_TABLES[1].x + 0.35, z: TYPIST_TABLES[1].z + 1.35, turn: Math.PI };

const OCHRE = 0xd6a052, WHITE = 0xece4d4, WALL = 0xeee8da, BAND = 0xc98a4a;

export function buildCourt(): Court {
  const mid = COURT_ROAD.pointAt((COURT.s0 + COURT.s1) / 2, 0);
  const group = new THREE.Group();
  group.name = "court";
  group.position.set(mid.x, 0, mid.z);
  group.updateMatrixWorld(true);
  const p = new Parts();
  const half = (COURT.s1 - COURT.s0) / 2;
  const { wall, gate, building: b } = COURT;
  const colliders: Box[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2).applyMatrix4(group.matrixWorld);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, 0));
  };

  // --- the footpath and the yard: a paved strip in front, beaten earth inside --------------------
  p.slab(-half, half, 0, 0.1, wall, -3.3, 0xb7ab98); // (the footpath, a kerb's height up from the road's edge)
  p.slab(-half + 0.3, half - 0.3, 0, 0.02, b.back - 2, wall, 0xc2a882);

  // --- the compound wall, with the gate ---------------------------------------------------------
  const H = 1.7;
  for (const [x0, x1] of [[-half, -gate], [gate, half]]) {
    p.slab(x0, x1, 0, H, wall - 0.3, wall, WALL);
    p.slab(x0, x1, 0, 0.45, wall - 0.31, wall + 0.01, BAND); // the ochre band along its foot
    p.slab(x0 - 0.02, x1 + 0.02, H, H + 0.08, wall - 0.34, wall + 0.04, PAL.stoneTrim); // its coping
    box(x0, x1, wall - 0.3, wall);
  }
  // its sides, back to the building's back
  for (const x of [-half, half - 0.3]) {
    p.slab(x, x + 0.3, 0, H, b.back - 2, wall, WALL);
    box(x, x + 0.3, b.back - 2, wall);
  }
  // the gate pillars, and the gates swung open against the wall
  for (const side of [-1, 1]) {
    p.box(0.7, 2.5, 0.7, side * (gate + 0.35), 1.25, wall - 0.15, WHITE);
    p.box(0.85, 0.15, 0.85, side * (gate + 0.35), 2.57, wall - 0.15, PAL.stoneTrim);
    p.add(new THREE.SphereGeometry(0.2, 10, 8), side * (gate + 0.35), 2.82, wall - 0.15, PAL.stoneTrim);
    box(side * (gate + 0.35) - 0.35, side * (gate + 0.35) + 0.35, wall - 0.5, wall + 0.2);
    // the gate leaf: a frame and bars, swung back inside against the wall
    const hinge = side * gate;
    for (let k = 0; k <= 8; k++) p.box(0.025, 1.5, 0.025, hinge - side * 0.12, 0.85, wall - 0.4 - k * 0.24, 0x2f3a30);
    p.box(0.04, 0.05, 1.95, hinge - side * 0.12, 1.6, wall - 1.35, 0x2f3a30);
    p.box(0.04, 0.05, 1.95, hinge - side * 0.12, 0.15, wall - 1.35, 0x2f3a30);
  }

  // --- the building ------------------------------------------------------------------------------
  const F1 = 4.2, F2 = 3.6; // floor heights
  const top = F1 + F2;
  // the body, behind the verandah
  p.slab(-b.half, b.half, 0, top, b.back, b.front - 2.6, OCHRE);
  // the plinth and steps up to the verandah
  p.slab(-b.half - 0.3, b.half + 0.3, 0, 0.6, b.front - 2.8, b.front + 0.2, PAL.plinth);
  for (let k = 0; k < 3; k++) p.slab(-2.4, 2.4, 0, 0.6 - k * 0.2, b.front + 0.2, b.front + 0.6 + k * 0.4, PAL.stoneTrim);
  // the verandah: a row of square pillars, arches between them (a dark recess behind), floors above
  const bays = 9;
  for (let k = 0; k <= bays; k++) {
    const x = -b.half + (k * (b.half * 2)) / bays;
    p.box(0.55, F1 - 0.6, 0.55, x, 0.6 + (F1 - 0.6) / 2, b.front - 0.3, WHITE);
    p.box(0.55, top - F1, 0.55, x, F1 + (top - F1) / 2, b.front - 0.3, WHITE); // and the pilaster above
  }
  for (let k = 0; k < bays; k++) {
    const x = -b.half + ((k + 0.5) * (b.half * 2)) / bays;
    const w = (b.half * 2) / bays - 0.55;
    // the arch: a spandrel above a round top, cut from the facade (a half-disc of shade under the lintel)
    p.box(w, 0.7, 0.3, x, F1 - 0.35, b.front - 0.3, OCHRE);
    const arch = new THREE.CircleGeometry(w / 2, 16, 0, Math.PI).rotateY(0);
    p.add(arch, x, F1 - 0.7, b.front - 0.14, 0x4a3426);
    // upstairs: a window with a white frame in each bay
    p.box(w * 0.55, 1.7, 0.08, x, F1 + 1.7, b.front - 0.26, WHITE);
    p.box(w * 0.42, 1.5, 0.08, x, F1 + 1.7, b.front - 0.22, 0x3a3f4a);
  }
  // the verandah's back wall (in shade) and its floor
  p.slab(-b.half, b.half, 0.6, F1, b.front - 2.62, b.front - 2.58, 0x5a4232);
  p.slab(-b.half, b.half, F1 - 0.1, top, b.front - 0.6, b.front - 2.6, OCHRE); // the upper floor over the verandah
  p.slab(-b.half, b.half, F1 - 0.15, F1, b.front - 0.6, b.front, WHITE); // the band between the floors
  // the parapet, white, with a cornice
  p.slab(-b.half - 0.2, b.half + 0.2, top, top + 0.2, b.back, b.front + 0.2, PAL.stoneTrim);
  p.slab(-b.half, b.half, top + 0.2, top + 0.9, b.front - 0.2, b.front, WHITE);
  // the middle bay: steps forward, a pediment over it
  p.slab(-2.6, 2.6, 0.6, top + 0.9, b.front, b.front + 0.6, OCHRE);
  const pediment = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0), new THREE.Vector3(0, 1.4, 0),
  ]);
  pediment.computeVertexNormals();
  p.add(pediment, 0, top + 0.9, b.front + 0.61, WHITE);
  p.box(6.2, 0.18, 0.8, 0, top + 0.9, b.front + 0.3, PAL.stoneTrim);
  // the flag on top
  p.cylinder(0.04, 0.05, 4, 0, top + 2.3 + 2, b.front - 1.5, 0xe8e2d0, { segments: 6 });
  // (flying out to the east, its face to the street)
  for (const [k, colour] of [[0, 0xe8873a], [1, 0xf4f2ea], [2, 0x2f8a3a]] as const) p.box(1.4, 0.32, 0.02, 0.72, top + 5.9 - k * 0.32, b.front - 1.5, colour);
  p.cylinder(0.08, 0.08, 0.01, 0.72, top + 5.58, b.front - 1.485, 0x1f3f8a, { rx: Math.PI / 2, segments: 12 }); // the wheel
  box(-b.half - 0.3, b.half + 0.3, b.back, b.front + 0.2);
  box(-2.4, 2.4, b.front + 0.2, b.front + 1.8); // (the steps)

  // a couple of scooters parked in the yard (the clerks')
  for (const [x, colour] of [[-6.8, 0x2f5fae], [-5.6, 0xd8d0b8]] as const) {
    p.box(0.35, 0.55, 1.2, x, 0.5, b.front + 3.2, colour);
    p.cylinder(0.2, 0.2, 0.1, x, 0.2, b.front + 2.7, 0x1f1d1b, { rz: Math.PI / 2, segments: 10 });
    p.cylinder(0.2, 0.2, 0.1, x, 0.2, b.front + 3.7, 0x1f1d1b, { rz: Math.PI / 2, segments: 10 });
    box(x - 0.25, x + 0.25, b.front + 2.5, b.front + 3.9);
  }

  // --- the neem tree on the footpath ---------------------------------------------------------------
  neem(p, COURT.tree.x, COURT.tree.z);
  box(COURT.tree.x - 0.3, COURT.tree.x + 0.3, COURT.tree.z - 0.3, COURT.tree.z + 0.3);

  // --- the typists' tables: a table, its typewriter, a stool behind (and the stamp vendor's, with his tin box) ---------
  TYPIST_TABLES.forEach(({ x, z }, k) => {
    const vendor = k === TYPIST_TABLES.length - 1;
    p.box(1.0, 0.04, 0.55, x, 0.74, z + 0.45, 0x8a5a32); // the top
    for (const [dx, dz] of [[-0.45, 0.2], [0.45, 0.2], [-0.45, 0.7], [0.45, 0.7]]) p.box(0.04, 0.72, 0.04, x + dx, 0.38, z + dz, 0x6a4426);
    p.box(0.34, 0.04, 0.34, x, 0.48, z - 0.05, 0x8a5a32); // the stool
    p.box(0.04, 0.46, 0.04, x, 0.24, z - 0.05, 0x6a4426);
    if (vendor) {
      p.box(0.45, 0.14, 0.32, x - 0.15, 0.83, z + 0.45, 0x8a2a24); // his tin box of stamp papers
      p.box(0.2, 0.01, 0.28, x + 0.28, 0.765, z + 0.45, 0xece6c8); // a stamp paper, out
    } else {
      // the typewriter: its body, the carriage and roller across the back, the keys in front, a sheet in it
      p.box(0.4, 0.12, 0.32, x, 0.82, z + 0.48, 0x2a2a2c);
      p.box(0.52, 0.08, 0.08, x, 0.92, z + 0.58, 0x3a3a3c);
      p.box(0.05, 0.03, 0.03, x - 0.3, 0.95, z + 0.58, 0xb9bcc0); // the carriage lever
      p.box(0.3, 0.02, 0.12, x, 0.88, z + 0.36, 0x6a6a6c, { rx: -0.3 }); // the keys
      p.box(0.28, 0.32, 0.005, x, 1.08, z + 0.6, 0xf4f2ea, { rx: 0.15 }); // the sheet
    }
    box(x - 0.55, x + 0.55, z - 0.25, z + 0.75);
  });
  box(CLIENT.x - 0.25, CLIENT.x + 0.25, CLIENT.z - 0.25, CLIENT.z + 0.25); // (the client standing there)

  // --- the court's signs: its name board under the pediment; each typist's little board -----------------
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const signs: WorldSign[] = [
    { kind: "courtBoard", position: toWorld(0, top + 0.35, b.front + 0.62), rotationY: 0, w: 4.6, h: 0.75 },
    ...TYPIST_TABLES.map(({ x, z }, k): WorldSign => ({
      kind: "stallSign", position: toWorld(x, 0.6, z + 0.73), rotationY: 0, w: 0.7, h: 0.22,
      label: k === TYPIST_TABLES.length - 1 ? "स्टाम्प विक्रेता" : ["टाइपिस्ट", "हिंदी टाइपिंग", "टाइपिस्ट"][k],
    })),
  ];

  group.add(p.build("courtCompound"));
  return { group, colliders, signs };
}

/** A neem: a trunk, branches spreading, and a broad cloud of small leafy clumps (finer than the peepal's). */
function neem(p: Parts, x: number, z: number) {
  const rng = makeRng(7311);
  p.cylinder(0.24, 0.36, 3.2, x, 1.6, z, PAL.bark, { segments: 8 });
  for (const [dx, dz, y] of [[-1.6, 0.6, 4.6], [1.5, 1.2, 4.9], [0.3, -1.4, 5.0], [-0.6, 1.8, 4.7]]) {
    p.strut({ x, y: 2.8, z }, { x: x + dx, y, z: z + dz }, 0.11, PAL.bark);
  }
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(0.4, 3.2);
    const clump = new THREE.IcosahedronGeometry(rng.range(0.8, 1.25), 1);
    clump.scale(1, 0.6, 1);
    p.add(clump, x + Math.cos(a) * rr, rng.range(4.4, 6.2), z + Math.sin(a) * rr + 0.6, i % 3 ? PAL.leafDark : PAL.leafLight);
  }
}
