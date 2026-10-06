import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { cue } from "../core/cues";
import { makeRng } from "../core/rng";
import { flat, toon } from "../render/toon";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, type Actor, makeActor, seenFrom, v } from "./actor";
import { buildPerson } from "./body";
import type { HairStyle } from "./clothes";
import { SALOON_MIRROR_Y, SALOON_RADIO } from "../world/props/goods";
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

export type Saloon = {
  group: THREE.Group;
  update(t: number, dt: number, player: THREE.Vector3): void;
  /** You, in the chair (activities/haircut.ts). */
  you: SaloonChair;
};

/**
 * Your turn in the chair: the customer's done and gone, you sit in the cape,
 * and the mirror shows you (a real reflection, switched on only while you're
 * there: it costs a second look at the whole scene every frame).
 */
export type SaloonChair = {
  /** Where you stand on the street, in front of the saloon, to ask (world, on the ground). */
  front: THREE.Vector3;
  /** The middle of the mirror (world). */
  mirror: THREE.Vector3;
  /** Its radio, on the mirror ledge (world): it plays the station (audio/radio.ts). */
  radio: THREE.Vector3;
  /** You sit down (in place of the customer), with this hair. */
  sit(hair: HairStyle): void;
  /** Your hair, as it is now (the barber's work, in the mirror). */
  setHair(hair: HairStyle): void;
  /** The champi: his hands drumming on your head, for `seconds`. */
  champi(seconds: number): void;
  /** You get up; the next customer's in the chair. */
  getUp(): void;
  /** Where your eyes are (world), and which way your head faces. */
  eye(out: THREE.Vector3): THREE.Vector3;
};

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
/** A layer (Three.js: things a camera can be told to see or not) only the mirror's camera sees. */
const MIRROR_ONLY = 5;

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
  // the champi: both hands drumming on the top of the head, in turn
  const tap = (u: number) => Math.max(0, Math.sin(u * 18)) * 0.05;
  const champiAction: Action = {
    name: "champi", duration: 1.6,
    pose: (u) => ({ right: near(-0.06, 0.16 + tap(u), 0.0), left: near(0.06, 0.16 + tap(u + 0.17), 0.0), look: head, lean: 0.2, nod: 0.2, smile: true }),
  };
  let champiUntil = -1;

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
  const snipAt = new THREE.Vector3();
  let lastClose = 0;

  // --- your turn in the chair -------------------------------------------------------------------
  let you: { actor: Actor; root: THREE.Object3D } | null = null;
  let clock = 0;
  /** You, sitting as the customer sat, with `style` hair, watching yourself in the mirror. */
  const seatYou = (style: HairStyle) => {
    if (you) group.remove(you.root);
    const r = recipeFor("youngMan", makeRng(1507)); // (you: the same face every time)
    r.build.scale = 0.97;
    r.hair = style;
    r.hairColour = 0x1d1714;
    r.outfit.top = "halfShirt";
    r.outfit.jacket = undefined;
    const person = buildPerson(r);
    person.root.traverse((o) => { o.castShadow = true; });
    group.add(person.root);
    const actor = makeActor({
      person, at: { x: 0, z: 0, turn: 0 }, seat: SEAT, notice: "none",
      actions: [{ name: "still", duration: 9, pose: (u) => ({ right: knees.r, left: knees.l, look: MIRROR, nod: 0.04 + Math.sin(u * 0.7) * 0.01 }) }],
    });
    you = { actor, root: person.root };
  };
  // the mirror's reflection: over the glass (goods.ts paints the frame and glass), facing the chair
  let reflection: Reflector | null = null;
  const mirrorWorld = group.localToWorld(MIRROR.clone().setY(SALOON_MIRROR_Y));
  const frontWorld = group.localToWorld(v(2.8, -spot.position.y, 0));
  // (the ledge is 0.87 m in front of the chair, 0.8 m up: world/props/goods.ts)
  const radioWorld = group.localToWorld(v(0, 0.795 + SALOON_RADIO.y, 0.87));

  const chair: SaloonChair = {
    front: frontWorld,
    radio: radioWorld,
    mirror: mirrorWorld,
    sit(style) {
      customerPerson.root.visible = false;
      seatYou(style);
      if (!reflection) {
        reflection = new Reflector(new THREE.PlaneGeometry(0.96, 1.06), { textureWidth: 512, textureHeight: 512, color: 0xc4ccd0 });
        reflection.position.set(0, SALOON_MIRROR_Y, 0.898);
        reflection.rotation.y = Math.PI;
        // the mirror sees one more layer than you do: the cape, while you're in it (below)
        const camFor = reflection.getReflectionCamera.bind(reflection);
        reflection.getReflectionCamera = (camera: THREE.Camera) => {
          const c = camFor(camera);
          c.layers.enable(MIRROR_ONLY);
          return c;
        };
        group.add(reflection);
      }
      reflection.visible = true;
      // seen from inside it, the cape would fill the bottom of your view: only the mirror shows it now
      cape.layers.set(MIRROR_ONLY);
    },
    setHair(style) {
      seatYou(style);
    },
    champi(seconds) {
      champiUntil = clock + seconds;
    },
    getUp() {
      if (you) group.remove(you.root);
      you = null;
      customerPerson.root.visible = true;
      cape.layers.set(0);
      if (reflection) reflection.visible = false;
    },
    eye(out) {
      // a little in front of the middle of your head (so your own face doesn't get in the way)
      const headBone = you?.actor.person.bone("head");
      if (!headBone) return out.copy(mirrorWorld);
      return headBone.localToWorld(out.set(0, 0.035, 0.1));
    },
  };

  return {
    group,
    you: chair,
    update(t, dt, player) {
      clock = t;
      if (you) you.actor.update(t, dt, player);
      else customer.update(t, dt, player);
      if (champiUntil > t && barber.now.name !== "champi") barber.perform(champiAction);
      barber.update(t, dt, player);
      comb.position.copy(barber.grip("L", hand));
      scissors.position.copy(barber.grip("R", hand));
      // the scissors open and close as he snips (and you hear each snip as they close: audio/street.ts)
      const snipping = barber.now.name === "cut" || barber.now.name === "sides";
      const open = snipping ? 0.1 + Math.abs(Math.sin(t * 11)) * 0.35 : 0.1;
      const closedNow = Math.floor((t * 11) / Math.PI);
      if (snipping && closedNow !== lastClose) {
        group.localToWorld(snipAt.copy(scissors.position));
        cue("snip", snipAt);
      }
      lastClose = closedNow;
      scissors.children[0].rotation.z = open;
      scissors.children[1].rotation.z = -open;
    },
  };
}
