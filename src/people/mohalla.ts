import * as THREE from "three";
import { makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import { MOHALLA_FRAME } from "../world/mohalla";
import { CHABUTRA, PUMP } from "../world/places/mohalla";
import { type Actor, makeActor, track, v } from "./actor";
import { buildPerson } from "./body";
import { type Role, recipeFor } from "./recipes";

/**
 * The people in the old mohalla's square (world/places/mohalla.ts):
 *
 *   on the chabutra   under the peepal, three old men: one holding forth,
 *                     hands going; one listening on his stick, nodding,
 *                     laughing now and then; one on the far side telling
 *                     his beads, eyes closed
 *   at the handpump   a woman working the handle, the water running into
 *                     her matka; now and then she stops to look in it
 *   two boys          crouched in the dust playing marbles (kanche), taking
 *                     turns to flick
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * mohalla's (MOHALLA_FRAME: x east, z south), the group itself placed at the
 * peepal (so it's shown and hidden with the mohalla, and updated when you're
 * near it: people/crowd.ts measures from there).
 */

export type MohallaPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** The handpump's handle: from its pivot, this long, out to the south (+z), where she holds it. */
const HANDLE = 0.75;

function propMesh(p: Parts, name: string) {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  m.name = name;
  m.castShadow = true;
  return m;
}

export function buildMohallaPeople(): MohallaPeople {
  const rng = makeRng(7531);
  // the group at the peepal, turned like the mohalla; everything inside in the mohalla's frame
  const group = new THREE.Group();
  group.name = "mohallaPeople";
  const peepal = new THREE.Vector3(CHABUTRA.x, 0, CHABUTRA.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), MOHALLA_FRAME.turn);
  group.position.set(MOHALLA_FRAME.x + peepal.x, 0, MOHALLA_FRAME.z + peepal.z);
  group.rotation.y = MOHALLA_FRAME.turn;
  const frame = new THREE.Group();
  frame.position.set(-CHABUTRA.x, 0, -CHABUTRA.z);
  group.add(frame);
  group.updateMatrixWorld(true);
  const actors: Actor[] = [];
  const person = (role: Role, seated: boolean) => {
    const r = recipeFor(role, rng);
    if (role !== "kid") r.build.scale = 1;
    if (seated && r.outfit.top === "kurta") r.outfit.top = "halfShirt"; // (a kurta's tails would hang through the platform)
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    const p = buildPerson(r);
    frame.add(p.root);
    return p;
  };
  const knees = { r: v(-0.13, 0.62, 0.35), l: v(0.13, 0.62, 0.35) };
  const seat = CHABUTRA.height + 0.08;

  // --- the old men on the chabutra -------------------------------------------------------------------
  // two on its east side, facing the lane you come in by (+x: a quarter turn)
  const east = (dz: number) => ({ x: CHABUTRA.x + CHABUTRA.half - 0.3, z: CHABUTRA.z + dz, turn: Math.PI / 2 });
  actors.push(makeActor({
    person: person("uncle", true), at: east(-0.45), seat, notice: "glance", phase: 0,
    actions: [
      { name: "tell", duration: 5, pose: (u) => ({ right: v(-0.25 + Math.sin(u * 2.3) * 0.08, 0.95 + Math.sin(u * 3.1) * 0.08, 0.3), left: knees.l, look: v(0.9, 1.0, 0.6), smile: u > 3 }) },
      { name: "point", duration: 3, pose: () => ({ right: v(-0.3, 1.15, 0.45), left: knees.l, look: v(-0.5, 1.4, 4) }) },
      { name: "rest", duration: 4, pose: () => ({ right: knees.r, left: knees.l, look: v(0.9, 1.0, 0.6) }) },
    ],
  }));
  // his friend, both hands on his stick
  const stickAt = east(0.45);
  const stick = new Parts();
  stick.cylinder(0.014, 0.014, 0.95, 0, 0.475, 0, 0x5a3a22, { segments: 6 });
  stick.add(new THREE.TorusGeometry(0.05, 0.014, 5, 10, Math.PI), 0, 0.95, 0.05, 0x5a3a22, { ry: Math.PI / 2 });
  const stickMesh = propMesh(stick, "walkingStick");
  frame.add(stickMesh);
  const listener = makeActor({
    person: person("uncle", true), at: stickAt, seat, notice: "glance", phase: 3,
    actions: [
      { name: "listen", duration: 6, pose: (u) => ({ right: v(-0.04, 0.78, 0.42), left: v(0.04, 0.8, 0.42), look: v(-0.9, 1.0, 0.6), nod: 0.1 + Math.max(0, Math.sin(u * 2.2)) * 0.12 }) },
      { name: "laugh", duration: 2.5, pose: (u) => ({ right: v(-0.04, 0.78, 0.42), left: v(0.04, 0.8, 0.42), look: v(-0.6, 1.3, 0.8), nod: -0.15 + Math.abs(Math.sin(u * 9)) * 0.08, smile: true }) },
      { name: "road", duration: 4, pose: () => ({ right: v(-0.04, 0.78, 0.42), left: v(0.04, 0.8, 0.42), look: v(0.5, 1.4, 5) }) },
    ],
  });
  actors.push(listener);
  // on the north side, facing north (−z): telling his beads, eyes closed
  actors.push(makeActor({
    person: person("uncle", true), at: { x: CHABUTRA.x + 0.6, z: CHABUTRA.z - CHABUTRA.half + 0.3, turn: Math.PI }, seat, notice: "none", phase: 1,
    actions: [{ name: "beads", duration: 8, pose: (u) => ({ right: v(-0.05, 0.92 + (u % 1) * 0.03, 0.3), left: v(0.06, 0.88, 0.3), look: v(0, 0.9, 0.5), nod: 0.25, closed: true }) }],
  }));

  // --- the woman at the handpump ------------------------------------------------------------------------
  const pivot = new THREE.Vector3(PUMP.x, PUMP.pivotY, PUMP.z + 0.22);
  const womanAt = { x: PUMP.x, z: pivot.z + HANDLE + 0.38, turn: Math.PI };
  // in her frame (facing north, −z) the handle's end is 0.38 m in front of her, at the pivot's height
  // when level: she pumps it up and down, the stroke swinging it about its pivot
  const stroke = (u: number) => Math.sin(u * 3.4) * 0.26;
  const handAt = (u: number, side: number) => v(side * 0.06, PUMP.pivotY + Math.sin(stroke(u)) * HANDLE, 0.38);
  const pumper = makeActor({
    person: person("villageWoman", false), at: womanAt, notice: "glance", phase: 0,
    actions: [
      { name: "pump", duration: 7, pose: (u) => ({ right: handAt(u, -1), left: handAt(u, 1), look: v(0, 0.3, 1.3), lean: 0.2 + Math.sin(u * 3.4) * 0.06 }) },
      { name: "check", duration: 2.5, pose: () => ({ right: handAt(0, -1), left: v(0.2, 0.85, 0.1), look: v(0.15, 0.2, 1.5), lean: 0.3 }) },
    ],
  });
  actors.push(pumper);
  const hp = new Parts();
  hp.box(0.05, 0.04, HANDLE, 0, 0, HANDLE / 2, 0x3a3f42);
  hp.cylinder(0.022, 0.022, 0.14, 0, 0, HANDLE, 0x2a2e30, { rz: Math.PI / 2, segments: 6 }); // its grip
  const handle = propMesh(hp, "pumpHandle");
  handle.position.copy(pivot);
  frame.add(handle);
  // the matka under the spout, and the water running into it while she pumps
  const mp = new Parts();
  mp.add(new THREE.SphereGeometry(0.2, 12, 9).scale(1, 0.95, 1), 0, 0.31, 0, 0xa0522d);
  mp.cylinder(0.08, 0.1, 0.07, 0, 0.53, 0, 0xa0522d, { segments: 10 }); // its neck
  const matka = propMesh(mp, "matka");
  matka.position.set(PUMP.x, 0.12, PUMP.z - 0.3);
  frame.add(matka);
  const wp = new Parts();
  wp.cylinder(0.018, 0.018, 1, 0, -0.5, 0, 0xbfd6dc, { segments: 6 });
  const water = propMesh(wp, "pumpWater");
  water.position.set(PUMP.x, 0.7, PUMP.z - 0.24);
  water.scale.set(1, 0.05, 1);
  water.castShadow = false;
  frame.add(water);

  // --- two boys playing marbles -------------------------------------------------------------------------------
  const ring = { x: CHABUTRA.x - 3.7, z: CHABUTRA.z - 4.2 };
  const marbles = new Parts();
  for (let k = 0; k < 6; k++) marbles.add(new THREE.SphereGeometry(0.018, 8, 6), ring.x + rng.range(-0.18, 0.18), 0.02, ring.z + rng.range(-0.18, 0.18), rng.pick([0x3f7fc0, 0x40a060, 0xd04040, 0xe8c040, 0xf0f0f0]));
  marbles.add(new THREE.RingGeometry(0.3, 0.32, 20).rotateX(-Math.PI / 2), ring.x, 0.006, ring.z, 0x6a5a48); // the ring scratched in the dust
  frame.add(propMesh(marbles, "marbles"));
  const flick = (u: number) => ({ right: v(-0.04, 0.06, 0.42 + (u > 1.2 && u < 1.4 ? 0.05 : 0)), left: v(0.1, 0.08, 0.32), look: v(0, 0, 0.55), lean: 0.55, crouch: 0.85 });
  const watch = (u: number) => ({ right: v(-0.18, 0.32, 0.3), left: v(0.18, 0.32, 0.3), look: track(u, [0, 1.5, 3], [v(0, 0, 0.6), v(0.05, 0.05, 0.55), v(0, 0, 0.6)]), lean: 0.4, crouch: 0.85, smile: u > 2 });
  for (const [dz, turn, phase] of [[-0.62, 0, 0], [0.62, Math.PI, 3]] as const) {
    actors.push(makeActor({
      person: person("kid", false), at: { x: ring.x, z: ring.z + dz, turn }, notice: "none", phase,
      actions: [{ name: "flick", duration: 3, pose: flick }, { name: "watch", duration: 3, pose: watch }],
    }));
  }

  const _r = new THREE.Vector3(), _l = new THREE.Vector3();
  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
      // the stick stands between the listener's hands, its foot on the ground
      listener.grip("R", _r);
      listener.grip("L", _l);
      stickMesh.position.set((_r.x + _l.x) / 2, 0, (_r.z + _l.z) / 2);
      // the handle follows her hands: tipped about its pivot to where they are
      pumper.grip("R", _r);
      pumper.grip("L", _l);
      const y = (_r.y + _l.y) / 2 - PUMP.pivotY;
      handle.rotation.x = -Math.asin(THREE.MathUtils.clamp(y / HANDLE, -0.9, 0.9));
      // water runs while she's pumping
      const pumping = pumper.now.name === "pump";
      water.scale.y += ((pumping ? 0.42 : 0.02) - water.scale.y) * Math.min(1, dt * 6);
    },
  };
}
