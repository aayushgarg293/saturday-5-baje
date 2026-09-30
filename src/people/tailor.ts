import * as THREE from "three";
import { makeRng } from "../core/rng";
import { flat, toon } from "../render/toon";
import { Parts } from "../world/kit";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, makeActor, smooth, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * The tailor at Royal Tailors: on his stool just inside the shop, facing the
 * street, bent over his black treadle sewing machine, a measuring tape round
 * his neck. He feeds a piece of cloth under the needle (the wheels spin, the
 * needle bobs, the treadle rocks under his feet), turns the cloth, sets the
 * needle with a turn of the hand wheel, holds the piece up to look at the
 * seam, and glances out at the street now and then.
 *
 * FRAME: the tailor's own: his stool at the origin, facing +z (the street);
 * his right hand is on the −x side. The table and machine are in front of
 * him. What stays still (the stool, the table, the machine's body, his
 * things on the table) is one mesh; what moves (the wheels, the needle, the
 * treadle, the cloth, the tape) are small meshes of their own.
 */

export type Tailor = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** His stool's height; the table's top; how far in front of him the table's middle is. */
const SEAT = 0.5;
const TOP = 0.76;
const TABLE_Z = 0.5;
/** Where the needle meets the cloth; the hand wheel (at his right end of the machine); the flywheel under the table. */
const NEEDLE = v(0.16, TOP + 0.05, TABLE_Z);
const HAND_WHEEL = v(-0.25, TOP + 0.17, TABLE_Z);
const FLYWHEEL = v(-0.36, 0.42, TABLE_Z);
const STREET = v(1.5, 1.4, 4);

const IRON = 0x1c1c1e; // the machine and its stand, black
const GOLD = 0xd8b04a; // the decals on the machine
const WOOD = 0x8a5a32;

export function buildTailor(spot: WorldPeopleSpot): Tailor {
  const rng = makeRng(4242); // (his own random numbers: the rest of the street's people don't change)
  const group = new THREE.Group();
  group.name = "tailor";
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;

  // --- the still things: stool, table, the stand, the machine, his things --------------------------
  const p = new Parts();
  p.box(0.34, 0.04, 0.3, 0, SEAT - 0.02, -0.02, WOOD); // the stool
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.1], [0.14, 0.1]]) p.box(0.04, SEAT - 0.04, 0.04, x, (SEAT - 0.04) / 2, z, WOOD);
  p.box(1.0, 0.04, 0.46, 0, TOP - 0.02, TABLE_Z, WOOD); // the table top
  p.box(1.0, 0.1, 0.02, 0, TOP - 0.09, TABLE_Z + 0.22, WOOD); // its apron, street side
  // the iron stand: a frame at each end, a bar between them low down
  for (const x of [-0.44, 0.44]) {
    p.box(0.04, TOP - 0.04, 0.05, x, (TOP - 0.04) / 2, TABLE_Z - 0.16, IRON);
    p.box(0.04, TOP - 0.04, 0.05, x, (TOP - 0.04) / 2, TABLE_Z + 0.16, IRON);
    p.box(0.04, 0.05, 0.4, x, 0.04, TABLE_Z, IRON); // the foot
  }
  p.box(0.86, 0.03, 0.03, 0, 0.2, TABLE_Z + 0.12, IRON);
  // the machine: its bed, the pillar at his right, the arm over, the head at his left
  const m = { y: TOP, z: TABLE_Z };
  p.box(0.46, 0.04, 0.2, -0.02, m.y + 0.02, m.z, IRON);
  p.box(0.07, 0.2, 0.1, -0.18, m.y + 0.14, m.z, IRON);
  p.box(0.36, 0.08, 0.09, -0.02, m.y + 0.2, m.z, IRON);
  p.box(0.08, 0.16, 0.1, NEEDLE.x, m.y + 0.16, m.z, IRON);
  p.box(0.06, 0.012, 0.08, NEEDLE.x, m.y + 0.046, m.z, 0xb9bcc0); // the needle plate
  p.cylinder(0.02, 0.02, 0.03, -0.1, m.y + 0.255, m.z, 0xb9bcc0, { segments: 8 }); // the thread spool pin, and a reel on it
  p.cylinder(0.018, 0.018, 0.04, -0.1, m.y + 0.29, m.z, 0xc62f2a, { segments: 8 });
  for (const side of [-1, 1]) p.box(0.26, 0.012, 0.004, -0.02, m.y + 0.2, m.z + side * 0.047, GOLD); // gold stripes on the arm
  p.strut({ x: HAND_WHEEL.x, y: HAND_WHEEL.y - 0.06, z: m.z }, { x: FLYWHEEL.x + 0.02, y: FLYWHEEL.y + 0.18, z: m.z }, 0.005, 0x5a3a22, 4); // the belt
  // his things on the table: a pile of folded pieces, the big scissors, chalk, a tape roll
  const pile = [0x1f3f7a, 0xf4f2ec, 0x6a1b9a, 0xe8dcc0];
  pile.forEach((colour, k) => p.box(0.24, 0.025, 0.2, 0.36, TOP + 0.013 + k * 0.026, TABLE_Z + 0.02 - k * 0.01, colour));
  p.box(0.22, 0.008, 0.03, -0.36, TOP + 0.005, TABLE_Z - 0.1, 0x3a3a3c, { ry: 0.3 });
  p.box(0.05, 0.01, 0.02, -0.4, TOP + 0.006, TABLE_Z + 0.12, 0xf4f2ec);
  p.cylinder(0.04, 0.04, 0.03, -0.28, TOP + 0.015, TABLE_Z + 0.14, 0xe8c24a, { segments: 10 });
  const still = p.build("tailorBench");
  group.add(still);

  // --- the moving parts ---------------------------------------------------------------------------
  const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14).rotateZ(Math.PI / 2), toon({ color: 0x3a3a3c }));
  hand.position.copy(HAND_WHEEL);
  const fly = new THREE.Group(); // the flywheel: a rim and spokes, so you can see it turn
  fly.position.copy(FLYWHEEL);
  fly.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 6, 20).rotateY(Math.PI / 2), toon({ color: IRON })));
  for (let k = 0; k < 3; k++) fly.add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.38, 0.02).rotateX((k / 3) * Math.PI), toon({ color: IRON })));
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), flat(0xdadde0));
  needle.position.set(NEEDLE.x, TOP + 0.09, TABLE_Z);
  const treadle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.3), toon({ color: IRON }));
  treadle.position.set(0, 0.06, TABLE_Z - 0.12);
  // the piece he's sewing: a panel of a kurta, in a colour of the day
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.005, 0.32), toon({ color: rng.pick([0x1565c0, 0xc2186b, 0x2e7d32, 0xe8dcc0, 0x6a1b9a]) }));
  // the measuring tape round his neck: two yellow ends hanging down his chest
  const tape = new THREE.Group();
  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.004).translate(0, -0.17, 0), toon({ color: 0xe8c24a }));
    end.position.x = side * 0.075;
    tape.add(end);
  }
  group.add(hand, fly, needle, treadle, cloth, tape);

  // --- the tailor -------------------------------------------------------------------------------------
  const r = recipeFor("uncle", rng);
  r.build.scale = 1;
  r.outfit.top = "halfShirt"; // (seated: a kurta's tails would hang through the stool)
  r.outfit.jacket = undefined;
  const person = buildPerson(r);
  group.add(person.root);

  const onCloth = { r: v(0.02, TOP + 0.03, TABLE_Z - 0.1), l: v(0.24, TOP + 0.03, TABLE_Z - 0.06) };
  const push = (u: number) => Math.sin(u * 3) * 0.015; // his hands easing the cloth along
  const actions: Action[] = [
    {
      // feeding the cloth under the needle, eyes on the seam
      name: "sew", duration: 8,
      pose: (u) => ({ right: onCloth.r.clone().setZ(onCloth.r.z + push(u)), left: onCloth.l.clone().setZ(onCloth.l.z + push(u)), look: NEEDLE, lean: 0.4, nod: 0.25 }),
    },
    {
      // lift the foot, turn the cloth round the corner
      name: "turn", duration: 2.5,
      pose: (u) => ({ right: v(0.02 + Math.sin(u * 2) * 0.05, TOP + 0.08, TABLE_Z - 0.04), left: v(0.26, TOP + 0.08, TABLE_Z + 0.02), look: NEEDLE, lean: 0.35, nod: 0.2 }),
    },
    {
      // a turn of the hand wheel, to set the needle
      name: "wheel", duration: 1.8,
      pose: () => ({ right: v(HAND_WHEEL.x + 0.02, HAND_WHEEL.y + 0.03, HAND_WHEEL.z - 0.06), left: onCloth.l, look: NEEDLE, lean: 0.3, nod: 0.15 }),
    },
    { name: "sew", duration: 7, pose: (u) => ({ right: onCloth.r.clone().setZ(onCloth.r.z + push(u)), left: onCloth.l.clone().setZ(onCloth.l.z + push(u)), look: NEEDLE, lean: 0.4, nod: 0.25 }) },
    {
      // holding the piece up to the light to look at the seam
      name: "hold", duration: 3.5,
      pose: () => ({ right: v(-0.18, 1.06, 0.42), left: v(0.18, 1.06, 0.42), look: v(0, 0.94, 0.44), lean: 0.08, nod: 0.15 }),
    },
    {
      // who's that going by?
      name: "street", duration: 2.5,
      pose: () => ({ right: onCloth.r, left: onCloth.l, look: STREET, lean: 0.1 }),
    },
  ];
  const tailor = makeActor({ person, at: { x: 0, z: 0, turn: 0 }, seat: SEAT, notice: "glance", phase: 3, actions });

  const neck = new THREE.Vector3(), gripR = new THREE.Vector3(), gripL = new THREE.Vector3();
  const toLocal = new THREE.Matrix4();
  let feed = 0; // how far the cloth has gone under the needle (m)
  return {
    group,
    update(t, dt, player) {
      tailor.update(t, dt, player);
      const now = tailor.now.name;
      const sewing = now === "sew";
      // the wheels: racing while he sews, a slow turn by hand to set the needle
      const spin = sewing ? 14 : now === "wheel" ? 2.5 : 0;
      hand.rotation.x -= spin * dt;
      fly.rotation.x -= spin * dt * 0.4;
      needle.position.y = TOP + 0.09 + (sewing ? Math.sin(t * 40) * 0.012 : 0);
      treadle.rotation.x = sewing ? Math.sin(t * 5.6) * 0.12 : 0;

      // the cloth: creeping away from him under the needle while he sews; turned, it starts a new seam
      if (sewing) feed = Math.min(0.14, feed + dt * 0.012);
      if (now === "turn") feed = Math.max(0, feed - dt * 0.06);
      const flatAt = new THREE.Vector3(NEEDLE.x - 0.08, TOP + 0.043, TABLE_Z - 0.06 + feed);
      // held up, it hangs from his hands (easing up from the table and back down)
      const u = tailor.now.u;
      const up = now === "hold" ? smooth(Math.min(1, u / 0.6, (3.5 - u) / 0.6)) : 0;
      tailor.grip("R", gripR);
      tailor.grip("L", gripL);
      const heldAt = gripR.add(gripL).multiplyScalar(0.5).add(v(0, -0.15, 0.02));
      cloth.position.lerpVectors(flatAt, heldAt, up);
      cloth.rotation.set((Math.PI / 2) * up, now === "turn" ? u * 0.3 : 0, 0);

      // the tape hangs straight down from his neck, whichever way he leans
      toLocal.copy(group.matrixWorld).invert();
      person.bone("neck").getWorldPosition(neck).applyMatrix4(toLocal);
      tape.position.set(neck.x, neck.y - 0.03, neck.z + 0.1);
    },
  };
}
