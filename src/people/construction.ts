import * as THREE from "three";
import { makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { constructionSite } from "../world/buildings/vacant";
import { Parts } from "../world/kit";
import type { WorldPeopleSpot } from "../world/street";
import { type Actor, makeActor, smooth, v } from "./actor";
import { buildPerson } from "./body";
import { lookAt, reach } from "./pose";
import { recipeFor } from "./recipes";
import { walkLegs } from "./walkers";

/**
 * The labourers at the house going up by the bus stand
 * (world/buildings/vacant.ts, "construction"):
 *
 *   the mason       at the front wall, a course at a time: a scoop of mortar
 *                   from the tasla, spread along the top with his trowel, a
 *                   brick from the pile beside him, set and tapped down;
 *                   now and then a look over his shoulder at the yard
 *   the woman       carrying bricks on her head in an iron pan, from the
 *                   stack out front to the mason's pile, and back for more:
 *                   she crouches to set the load down, and again to load up
 *   the mortar man  mixing the mortar heap with his phawda: dragging it,
 *                   chopping it, leaning on the handle for a breather,
 *                   wiping his brow
 *   their boy       sitting on the sand heap, playing with the sand
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * plot's (the builders' frame: x along the frontage, +z out toward the
 * yard, the plot's front edge at z = 0).
 */

export type ConstructionCrew = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

const IRON = 0x4a4644, MORTAR = 0x8a8478, BRICK = 0xa4553c, WOOD = 0x8a6a44;

/** An iron pan (tasla): shallow, wide; built with its base at y = 0. */
function tasla(p: Parts, x: number, y: number, z: number) {
  p.cylinder(0.27, 0.17, 0.1, x, y + 0.05, z, IRON, { segments: 12 });
}

/** A mesh from parts, shaded like the people's props (smooth, cel-shaded). */
function propMesh(p: Parts, name: string) {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  m.name = name;
  m.castShadow = true;
  return m;
}

export function buildConstruction(spot: WorldPeopleSpot): ConstructionCrew {
  const rng = makeRng(7461);
  const site = constructionSite(spot.w ?? 7);
  const group = new THREE.Group();
  group.name = "construction";
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;
  group.updateMatrixWorld(true);
  const actors: Actor[] = [];
  const dress = (role: "man" | "villageWoman" | "kid", tweak: (o: ReturnType<typeof recipeFor>["outfit"]) => void) => {
    const r = recipeFor(role, rng);
    if (role !== "kid") r.build.scale = 1;
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    tweak(r.outfit);
    return buildPerson(r);
  };

  // --- the mason, at the rising part of the front wall --------------------------------------------
  // (his own little frame: at the wall, facing it, −z in the plot's; in it the wall's top is 0.6 m in
  // front of him, the tasla of mortar at his right foot, his pile of bricks at his left)
  const r = site.rising;
  const mx = (r.x0 + r.x1) / 2;
  const station = new THREE.Group();
  station.position.set(mx, 0, 0);
  station.rotation.y = Math.PI;
  group.add(station);
  const still = new Parts();
  tasla(still, -0.5, 0, 0.25);
  still.cylinder(0.24, 0.24, 0.02, -0.5, 0.09, 0.25, MORTAR, { segments: 12 }); // the mortar in it
  for (let k = 0; k < 6; k++) still.box(0.23, 0.075, 0.11, 0.55 + (k % 2) * 0.02, 0.04 + Math.floor(k / 2) * 0.077, 0.05 + (k % 3) * 0.12, k % 3 ? BRICK : 0x8e4632, { ry: (k % 2) * 0.1 });
  station.add(still.build("masonThings"));
  const mason = dress("man", (o) => {
    o.top = "vest";
    o.topColour = 0xe8e2d4;
    o.bottom = "dhoti";
    o.bottomColour = 0xd8cbb0;
    o.safa = [0xe8e0d0, 0xc04030]; // a cloth tied round his head against the sun
    o.feet = "chappals";
  });
  station.add(mason.root);
  const wallTop = 0.82;
  actors.push(makeActor({
    person: mason, at: { x: 0, z: 0, turn: 0 }, notice: "none", phase: 0,
    actions: [
      { name: "scoop", duration: 1.6, pose: () => ({ right: v(-0.45, 0.24, 0.3), left: v(0.18, 0.62, 0.25), look: v(-0.5, 0.1, 0.28), lean: 0.55, crouch: 0.5 }) },
      { name: "spread", duration: 2.2, pose: (u) => ({ right: v(-0.15 + Math.sin(u * 3) * 0.22, wallTop + 0.05, 0.55), left: v(0.2, 0.78, 0.3), look: v(0, wallTop, 0.6), lean: 0.35, crouch: 0.2 }) },
      { name: "pick", duration: 1.4, pose: () => ({ right: v(-0.2, 0.7, 0.3), left: v(0.55, 0.2, 0.12), look: v(0.55, 0.1, 0.12), lean: 0.5, crouch: 0.5, twist: 0.3 }) },
      { name: "lay", duration: 2.4, pose: (u) => ({ right: v(-0.08, wallTop + 0.14 + Math.abs(Math.sin(u * 9)) * 0.05, 0.52), left: v(0.06, wallTop + 0.1, 0.56), look: v(0, wallTop, 0.6), lean: 0.35, crouch: 0.2 }) },
      { name: "spread", duration: 2.0, pose: (u) => ({ right: v(0.1 - Math.sin(u * 3) * 0.22, wallTop + 0.05, 0.55), left: v(0.2, 0.78, 0.3), look: v(0.1, wallTop, 0.6), lean: 0.35, crouch: 0.2 }) },
      { name: "look", duration: 2.2, pose: () => ({ right: v(-0.2, 0.86, 0.1), left: v(0.2, 0.86, 0.1), look: v(-3, 1.5, -2.5), twist: -0.4 }) },
    ],
  }));
  const masonActor = actors[actors.length - 1];
  // his trowel (karni): a flat steel blade on a wooden handle, in his right hand
  const tp = new Parts();
  tp.cylinder(0.015, 0.015, 0.1, 0, 0.0, 0, WOOD, { segments: 6 });
  tp.box(0.1, 0.006, 0.15, 0, -0.06, 0.07, 0xb9bcc0);
  const trowel = propMesh(tp, "trowel");
  station.add(trowel);
  // the brick he's carrying from the pile to the wall
  const bp = new Parts();
  bp.box(0.23, 0.075, 0.11, 0, 0, 0, BRICK);
  const heldBrick = propMesh(bp, "heldBrick");
  station.add(heldBrick);

  // --- the woman with the bricks on her head --------------------------------------------------------
  const woman = dress("villageWoman", (o) => {
    o.feet = "barefoot";
  });
  group.add(woman.root);
  const lp = new Parts();
  tasla(lp, 0, 0, 0);
  const pan = propMesh(lp, "brickPan");
  const bricks = new Parts();
  for (let k = 0; k < 8; k++) bricks.box(0.23, 0.075, 0.11, -0.12 + (k % 2) * 0.24, 0.1 + Math.floor(k / 4) * 0.077, -0.12 + Math.floor((k % 4) / 2) * 0.13, k % 3 ? BRICK : 0x8e4632, { ry: (k % 2) * 0.08 });
  const load = propMesh(bricks, "bricksInPan");
  pan.add(load);
  group.add(pan);
  const carrier = carry(woman, pan, load, {
    stack: new THREE.Vector3(site.stack.x, 0, site.stack.z + 0.9),
    pile: new THREE.Vector3(mx - 0.6, 0, 0.65),
  });

  // --- the mortar man ---------------------------------------------------------------------------------
  const mixer = dress("man", (o) => {
    o.top = "vest";
    o.topColour = 0xd8d2c0;
    o.bottom = "pyjama";
    o.bottomColour = 0x6a6a72;
    o.gamchha = true;
    o.safa = undefined;
    o.feet = "barefoot";
  });
  const mixAt = { x: site.mortar.x, z: site.mortar.z + 1.0, turn: Math.PI };
  group.add(mixer.root);
  const mixActor = makeActor({
    person: mixer, at: mixAt, notice: "glance", phase: 3,
    actions: [
      { name: "drag", duration: 4.5, pose: (u) => {
        const k = (Math.sin(u * 2.4) + 1) / 2;
        return { right: v(-0.08, 0.8 - 0.06 * k, 0.3 - 0.1 * k), left: v(0.06, 0.55, 0.5 - 0.16 * k), look: v(0, 0, 0.95), lean: 0.45, crouch: 0.25 };
      } },
      { name: "chop", duration: 3.5, pose: (u) => {
        const k = Math.abs(Math.sin(u * 4));
        return { right: v(-0.08, 0.86 + 0.16 * k, 0.3), left: v(0.06, 0.62 + 0.16 * k, 0.42), look: v(0, 0, 0.9), lean: 0.4, crouch: 0.2 };
      } },
      { name: "rest", duration: 3.0, pose: () => ({ right: v(-0.02, 1.05, 0.34), left: v(0.06, 0.92, 0.34), look: v(2.5, 1.5, 3), lean: 0.05 }) },
      { name: "wipe", duration: 1.6, pose: (u) => ({ right: v(-0.04 + Math.sin(u * 5) * 0.05, 1.62, 0.12), left: v(0.06, 0.95, 0.34), look: v(1, 1.4, 4) }) },
    ],
  });
  actors.push(mixActor);
  // his phawda: a long handle, and the wide blade at its foot, turned to drag
  const handleGeo = new Parts();
  handleGeo.cylinder(0.018, 0.018, 1, 0, -0.5, 0, WOOD, { segments: 6 });
  const handle = propMesh(handleGeo, "phawdaHandle");
  const bladeGeo = new Parts();
  bladeGeo.box(0.26, 0.012, 0.22, 0, 0, 0.09, 0x5a5a5c);
  const blade = propMesh(bladeGeo, "phawdaBlade");
  group.add(handle, blade);

  // --- their boy on the sand heap -------------------------------------------------------------------------
  // (half-way up the heap's yard side, where the sand is about his seat's height, facing the yard)
  const boyAt = { x: site.sand.x + 0.25, z: site.sand.z + 0.5, turn: 0.3 };
  const boy = dress("kid", (o) => {
    o.feet = "barefoot";
    o.topColour = rng.pick([0xc05040, 0x4a7ab0, 0xd8b040]);
  });
  group.add(boy.root);
  actors.push(makeActor({
    person: boy, at: boyAt, seat: 0.32, notice: "glance", phase: 1,
    actions: [
      { name: "dig", duration: 4, pose: (u) => ({ right: v(-0.18 + Math.sin(u * 3) * 0.06, 0.12, 0.28), left: v(0.18, 0.12, 0.26 + Math.cos(u * 3) * 0.05), look: v(0, 0, 0.35), lean: 0.35 }) },
      { name: "pour", duration: 3, pose: (u) => ({ right: v(-0.05, 0.45 + Math.sin(u * 2) * 0.05, 0.3), left: v(0.12, 0.2, 0.3), look: v(-0.05, 0.2, 0.35), smile: true }) },
      { name: "watch", duration: 3, pose: () => ({ right: v(-0.15, 0.32, 0.25), left: v(0.15, 0.32, 0.25), look: seenFromBoy(boyAt, carrier.where()) }) },
    ],
  }));

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), dir = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0), q = new THREE.Quaternion();
  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
      carrier.update(t, dt, player);
      // the mason's trowel, and the brick while he carries and sets it
      masonActor.grip("R", trowel.position);
      masonActor.grip("L", heldBrick.position);
      const { name, u } = masonActor.now;
      heldBrick.visible = (name === "pick" && u > 0.8) || (name === "lay" && u < 1.6);
      // the phawda runs from his upper hand down through the lower one to the ground (wiping his
      // brow, only the left hand holds it, upright)
      mixActor.grip("L", _b);
      if (mixActor.now.name === "wipe") _a.copy(_b).add(dir.set(0.02, 0.3, -0.04));
      else mixActor.grip("R", _a);
      dir.subVectors(_b, _a).normalize();
      const length = dir.y < -0.2 ? THREE.MathUtils.clamp((_a.y - 0.05) / -dir.y, 0.9, 1.5) : 1.2;
      q.setFromUnitVectors(down, dir);
      handle.position.copy(_a);
      handle.quaternion.copy(q);
      handle.scale.set(1, length, 1);
      blade.position.copy(_a).addScaledVector(dir, length);
      // (the blade lies flat-ish on the mortar, square to the handle's line on the ground)
      blade.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    },
  };
}

/** Where a seated boy looks to watch something at `target` (in the plot's frame). */
function seenFromBoy(at: { x: number; z: number; turn: number }, target: THREE.Vector3) {
  const dx = target.x - at.x, dz = target.z - at.z;
  const c = Math.cos(-at.turn), s = Math.sin(-at.turn);
  return v(dx * c + dz * s, 1.0, -dx * s + dz * c);
}

/**
 * The woman's round: walk from the brick stack to the mason's pile with the
 * pan of bricks on her head, crouch and set it down (the bricks go onto the
 * pile), walk back with the empty pan, crouch and load up again. She isn't
 * an actor (actors stand still): her legs are the walkers' (walkLegs), her
 * arms reach for the pan, and the pan follows her head, or her hands while
 * she's lifting it.
 */
function carry(person: ReturnType<typeof buildPerson>, pan: THREE.Object3D, load: THREE.Object3D, spots: { stack: THREE.Vector3; pile: THREE.Vector3 }) {
  const root = person.root, k = person.scale;
  const SPEED = 0.75, CROUCH_TIME = 3.2;
  const legs = { phase: 0, moving: 0 };
  // the round, as steps: walking (from → to) or crouching at a spot (setting down or loading up)
  type Step = { kind: "walk"; from: THREE.Vector3; to: THREE.Vector3 } | { kind: "down" | "up"; at: THREE.Vector3 };
  const steps: Step[] = [
    { kind: "walk", from: spots.stack, to: spots.pile },
    { kind: "down", at: spots.pile },
    { kind: "walk", from: spots.pile, to: spots.stack },
    { kind: "up", at: spots.stack },
  ];
  const durations = steps.map((s) => (s.kind === "walk" ? s.from.distanceTo(s.to) / SPEED : CROUCH_TIME));
  const loop = durations.reduce((a, b) => a + b, 0);
  let heading = Math.PI;
  const _w = new THREE.Vector3(), _h = new THREE.Vector3(), _p = new THREE.Vector3();
  const R = new THREE.Vector3(), L = new THREE.Vector3(), look = new THREE.Vector3();
  const POLE = { R: v(-0.7, -0.5, -0.4), L: v(0.7, -0.5, -0.4) };
  const local = (x: number, y: number, z: number, out: THREE.Vector3) => root.localToWorld(out.set(x, y, z));
  const where = () => root.position;

  function update(t: number, dt: number, player: THREE.Vector3) {
    let u = (t + 2) % loop, i = 0;
    while (u > durations[i]) { u -= durations[i]; i++; }
    const step = steps[i], f = u / durations[i];
    const full = i === 0 || (i === 1 && f < 0.5) || (i === 3 && f > 0.5); // bricks in the pan?
    // where she is, which way she faces (facing the spot while crouching: −z, the stack and the pile are both that way)
    let moving = 0, target = Math.PI;
    if (step.kind === "walk") {
      root.position.lerpVectors(step.from, step.to, f);
      target = Math.atan2(step.to.x - step.from.x, step.to.z - step.from.z);
      moving = 1;
    } else root.position.copy(step.at);
    // turn smoothly (the short way round)
    let d = target - heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    heading += d * Math.min(1, dt * 4);
    root.rotation.y = heading;
    legs.moving += (moving - legs.moving) * Math.min(1, dt * 5);
    legs.phase = (legs.phase + (SPEED * legs.moving * dt) / (2 * 0.62 * k)) % 1;
    // crouching: down, a moment there, back up
    const bend = step.kind === "walk" ? 0 : smooth(Math.min(1, Math.min(f, 1 - f) * 3.2));
    walkLegs(person, legs.phase, legs.moving, k, t, bend * 0.75);
    person.bone("spine").rotation.x = 0.04 + bend * 0.45;
    root.updateMatrixWorld(true);
    // the pan: on her head, or between her hands as she lowers it and lifts it again
    person.bone("head").getWorldPosition(_h);
    root.worldToLocal(_h);
    const headTop = _h.y + 0.15 * k;
    const ground = 0.12;
    const panY = THREE.MathUtils.lerp(headTop, ground, bend);
    const panZ = THREE.MathUtils.lerp(_h.z, 0.45, bend);
    // her hands at its rim: both while it's full or being lifted; walking back empty, just the right
    const oneHand = step.kind === "walk" && !full;
    const swing = 0.15 * k * legs.moving * Math.cos(Math.PI * 2 * legs.phase);
    local(-0.2 * k, panY + 0.04, panZ, R);
    if (oneHand) local(0.19 * k, 0.8 * k, 0.03 * k - swing, L);
    else local(0.2 * k, panY + 0.04, panZ, L);
    reach(person, "R", R, POLE.R.clone().transformDirection(root.matrixWorld));
    reach(person, "L", L, POLE.L.clone().transformDirection(root.matrixWorld));
    local(0, panY, panZ, _p);
    group(pan).worldToLocal(_p);
    pan.position.copy(_p);
    pan.rotation.set(0, heading, 0);
    load.visible = full;
    // eyes ahead (or on you, if you're right in front of her), down at the pan while crouching
    const toPlayer = root.worldToLocal(_w.copy(player));
    if (toPlayer.z > 0 && toPlayer.length() < 3.5) look.copy(player).setY(1.5);
    else local(0, bend > 0.2 ? 0.2 : 1.4 * k, bend > 0.2 ? 0.6 : 4, look);
    lookAt(person, look, 1);
  }
  return { update, where };
}

/** The group a thing hangs in (the pan's parent: the crew's group). */
function group(o: THREE.Object3D): THREE.Object3D {
  return o.parent!;
}
