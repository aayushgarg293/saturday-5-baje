import * as THREE from "three";
import { makeRng } from "../core/rng";
import { flat, toon } from "../render/toon";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, makeActor, seenFrom, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * The saloon at work: a customer in the red barber chair, a white cape
 * round him, watching himself in the mirror; the barber at his shoulder with
 * comb and scissors, snipping at the top, trimming round the ear (the one on his side), stepping
 * back to check the line in the mirror, and glancing out at the street now
 * and then.
 *
 * FRAME: the chair's (world/props/goods.ts, `saloonChair`): the customer at
 * the origin, facing +z, the mirror 0.9 m ahead; +x is toward the street.
 * Poses are in each person's own frame (actor.ts); `seenFrom` turns a point
 * in the chair's frame into theirs.
 */

export type Saloon = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** The chair's seat height; where the customer's head is (in the chair's frame); the mirror; the street. */
const SEAT = 0.55;
const HEAD = v(0, 1.24, 0.02);
const MIRROR = v(0, 1.3, 0.9);
const STREET = v(4, 1.5, 0.3);
/**
 * Where the barber stands: at the customer's far shoulder (away from the
 * street, so from the road you see both of them), a little behind, turned in.
 */
const BARBER = { x: -0.42, z: -0.32, turn: 0.9 };

export function buildSaloon(spot: WorldPeopleSpot): Saloon {
  const rng = makeRng(3113); // (their own random numbers: the rest of the street's people don't change)
  const group = new THREE.Group();
  group.name = "saloon";
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;
  group.updateMatrixWorld(true);

  // --- the customer --------------------------------------------------------------------
  const cr = recipeFor("youngMan", rng);
  cr.build.scale = 1;
  cr.outfit.top = "halfShirt"; // (seated: a kurta's tails would hang through the chair)
  cr.outfit.jacket = undefined;
  const customerPerson = buildPerson(cr);
  group.add(customerPerson.root);
  const knees = { r: v(-0.1, 0.62, 0.3), l: v(0.1, 0.62, 0.3) };
  const customer = makeActor({
    person: customerPerson, at: { x: 0, z: 0, turn: 0 }, seat: SEAT, notice: "none", phase: 2,
    actions: [
      { name: "still", duration: 6, pose: () => ({ right: knees.r, left: knees.l, look: MIRROR, nod: 0.05 }) },
      { name: "chin down", duration: 4, pose: () => ({ right: knees.r, left: knees.l, look: MIRROR, nod: 0.3, closed: true }) },
      { name: "still", duration: 5, pose: () => ({ right: knees.r, left: knees.l, look: MIRROR, nod: 0.02 }) },
      { name: "head turned", duration: 3, pose: () => ({ right: knees.r, left: knees.l, look: v(-1, 1.2, 0.6) }) },
    ],
  });
  // the white cape: tied at the neck, falling over him to his knees (his hands are under it)
  // (wide at the top, so it covers his shoulders, then flaring out over his lap)
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.44, 0.72, 16, 1, true), toon({ color: 0xf4f2ec }));
  cape.material.side = THREE.DoubleSide;
  cape.position.set(0, SEAT + 0.32, 0.06);
  group.add(cape);

  // --- the barber ------------------------------------------------------------------------
  const br = recipeFor(rng.next() < 0.5 ? "man" : "shopkeeper", rng);
  br.build.scale = 1;
  const barberPerson = buildPerson(br);
  group.add(barberPerson.root);
  const at = BARBER;
  const head = seenFrom(at, HEAD.x, HEAD.y, HEAD.z);
  const near = (dx: number, dy: number, dz: number) => seenFrom(at, HEAD.x + dx, HEAD.y + dy, HEAD.z + dz);
  const snip = (u: number) => Math.sin(u * 22) * 0.012;
  const actions: Action[] = [
    {
      // cutting at the top: comb lifting the hair, scissors snipping just under it
      name: "cut", duration: 7,
      pose: (u) => ({
        right: near(-0.02, 0.12 + snip(u), 0.02), left: near(0.03, 0.17, -0.02),
        look: head, lean: 0.28, nod: 0.25,
      }),
    },
    {
      // round the ear
      name: "sides", duration: 5,
      pose: (u) => ({
        right: near(-0.12, 0.0 + snip(u), 0.02), left: near(-0.02, 0.14, -0.02),
        look: near(-0.1, 0, 0), lean: 0.3, crouch: 0.15, nod: 0.3,
      }),
    },
    {
      // a step back (a lean back) to check the line in the mirror
      name: "check", duration: 3,
      pose: () => ({ right: v(-0.18, 0.92, 0.18), left: v(0.18, 0.95, 0.2), look: seenFrom(at, MIRROR.x, MIRROR.y, MIRROR.z), lean: -0.05 }),
    },
    { name: "cut", duration: 6, pose: (u) => ({ right: near(-0.03, 0.1 + snip(u), 0.03), left: near(0.04, 0.16, -0.01), look: head, lean: 0.25, nod: 0.25 }) },
    {
      // who's going by?
      name: "street", duration: 2.5,
      pose: () => ({ right: v(-0.2, 0.95, 0.15), left: near(0.03, 0.12, 0), look: seenFrom(at, STREET.x, STREET.y, STREET.z) }),
    },
  ];
  const barber = makeActor({ person: barberPerson, at, notice: "glance", phase: 0, actions });

  // his comb (left hand) and scissors (right)
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.004), flat(0x1a1a1a));
  const scissors = new THREE.Group();
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.003), toon({ color: 0xc9ccd0 }));
    blade.rotation.z = side * 0.25;
    scissors.add(blade);
  }
  group.add(comb, scissors);
  const hand = new THREE.Vector3();

  return {
    group,
    update(t, dt, player) {
      customer.update(t, dt, player);
      barber.update(t, dt, player);
      comb.position.copy(barber.grip("L", hand));
      scissors.position.copy(barber.grip("R", hand));
      // the scissors open and close as he snips
      const open = barber.now.name === "cut" || barber.now.name === "sides" ? 0.1 + Math.abs(Math.sin(t * 11)) * 0.35 : 0.1;
      scissors.children[0].rotation.z = open;
      scissors.children[1].rotation.z = -open;
    },
  };
}
