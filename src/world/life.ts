import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { type WorldLamp, lampToWorld } from "./evening";
import type { Box } from "../core/colliders";
import { makeRng } from "../core/rng";
import type { SignSpot } from "./buildings/common";
import { Parts } from "./kit";
import { buildCrowd } from "../people/crowd";
import type { Saloon } from "../people/saloon";
import type { GolgappaCrew } from "../people/sellers";
import { planLanes } from "../people/lanes";
import { type Walkers, buildWalkers } from "../people/walkers";
import { ANIMALS, PARKED, SLOTS } from "./layout";
import { type Animal, buildCow, buildDog } from "./props/animals";
import { type Placement, StaticBatch, placeOnStreet } from "./props/batch";
import { RADIO_AT, chaiTapri, golgappaCart, iceGolaCart, jalebiStall, kachoriStall } from "./props/stalls";
import { marksGeometry, marksMaterial } from "./props/vehicleMarks";
import { type VehicleKind, buildVehicle } from "./props/vehicles";
import type { WorldPeopleSpot, WorldSign } from "./street";
import { type Traffic, buildTraffic } from "./traffic";

/**
 * Street life: puts the stalls, parked vehicles, animals and passing traffic
 * on the street (the spots are in layout.ts), and moves what moves.
 *
 * Everything that never moves (stalls, parked vehicles) is merged into one
 * batch: one draw call for all of it.
 */

export type Life = {
  group: THREE.Group;
  colliders: Box[];
  /** Stall boards, for world/signs.ts to paint. */
  signs: WorldSign[];
  traffic: Traffic;
  walkers: Walkers;
  /** Where the chai tapri's radio is (audio/radio.ts plays from here). */
  radioAt: THREE.Vector3;
  /** The stalls' bulbs and stove fires (world/evening.ts). */
  lamps: WorldLamp[];
  /** The golgappa cart, which can serve you (activities/paniPuri.ts). */
  golgappa: GolgappaCrew;
  /** The saloon's chair, which can be yours (activities/haircut.ts). */
  saloon: Saloon;
  update(t: number, dt: number, player: THREE.Vector3): void;
};

/**
 * `people`: the places the buildings offer for people (world/street.ts).
 * `solid`: everything solid already on the street (buildings, poles), so the
 * people walking it know where there's room.
 */
export function buildLife(people: WorldPeopleSpot[], solid: readonly Box[]): Life {
  const rng = makeRng(404);
  const group = new THREE.Group();
  group.name = "life";
  const batch = new StaticBatch();
  const signs: WorldSign[] = [];
  const lamps: WorldLamp[] = [];

  // --- the food stalls ----------------------------------------------------------
  const stalls = [
    [chaiTapri, SLOTS.chaiTapri],
    [golgappaCart, SLOTS.golgappa],
    [kachoriStall, SLOTS.kachoriSamosa],
    [jalebiStall, SLOTS.jalebi],
    [iceGolaCart, SLOTS.iceGola],
  ] as const;
  for (const [build, spot] of stalls) {
    const stall = build(rng);
    const where = placeOnStreet(spot.s, spot.offset);
    batch.add(stall.parts, where);
    batch.collide(where, stall.size[0], stall.size[1]);
    for (const sp of stall.signs) signs.push(toWorld(sp, where));
    for (const sp of stall.lamps ?? []) lamps.push(lampToWorld(sp, where.matrix, where.rot));
  }

  // --- parked vehicles ---------------------------------------------------------------
  const parkedMarks: THREE.BufferGeometry[] = [];
  for (const spot of PARKED) {
    const side = spot.side === "left" ? -1 : 1;
    const kind: VehicleKind = spot.kind ?? rng.pick(["scooter", "scooter", "motorcycle", "motorcycle", "bicycle"] as const);
    const v = buildVehicle(kind, rng);
    // Two-wheelers are parked slanting, nose toward the shops; the auto and the
    // rickshaw stand along the kerb. (The prop frame's +z faces the street's
    // middle; turning a vehicle by +90° points its nose at the shops.)
    const along = kind === "auto" || kind === "rickshaw";
    const turn = along ? (rng.next() < 0.5 ? 0 : Math.PI) : Math.PI / 2 + rng.range(0.85, 1.15) * (rng.next() < 0.5 ? 1 : -1);
    const offset = side * (along ? 2.75 : 2.85);
    const where = placeOnStreet(spot.s, offset);
    const prop = new Parts();
    prop.addParts(v.parts, new THREE.Matrix4().makeRotationY(turn));
    batch.add(prop, where);
    batch.collide(where, v.size[0], v.size[1], 0, 0, turn);
    const marks = marksGeometry(kind, v.marks, where.matrix.clone().multiply(new THREE.Matrix4().makeRotationY(turn)));
    if (marks) parkedMarks.push(marks);
  }

  const statics = batch.build("streetLife");
  group.add(statics);
  // their plates and paintwork, all in one mesh (world/props/vehicleMarks.ts)
  if (parkedMarks.length) group.add(new THREE.Mesh(mergeGeometries(parkedMarks)!, marksMaterial()));

  // --- animals ------------------------------------------------------------------------
  const animals: Animal[] = [];
  const colliders: Box[] = [...batch.colliders];
  const addAnimal = (animal: Animal, s: number, offset: number, turn: number) => {
    const where = placeOnStreet(s, offset, turn);
    animal.group.applyMatrix4(where.matrix);
    animal.group.updateMatrixWorld(true);
    group.add(animal.group);
    animals.push(animal);
    const extra = new StaticBatch();
    extra.collide(where, animal.size[0], animal.size[1]);
    colliders.push(...extra.colliders);
  };
  // cows sit along the street (their +x is the prop frame's +x: along the street)
  for (const c of ANIMALS.cows) addAnimal(buildCow(rng), c.s, c.offset, rng.range(-0.3, 0.3) + (rng.next() < 0.5 ? Math.PI : 0));
  for (const d of ANIMALS.dogs) addAnimal(buildDog(rng), d.s, d.offset, rng.range(-0.6, 0.6) + (rng.next() < 0.5 ? Math.PI : 0));
  for (const animal of animals) animal.group.traverse((o) => { o.castShadow = true; });

  // --- people (people/crowd.ts) ------------------------------------------------------
  const crowd = buildCrowd(people);
  group.add(crowd.group);

  // --- passing traffic ----------------------------------------------------------------
  const traffic = buildTraffic();
  group.add(traffic.group);
  traffic.group.traverse((o) => { o.castShadow = true; });

  // --- people walking the street (they need to know where everything solid is) --------
  const walkers = buildWalkers(planLanes([...solid, ...colliders, ...crowd.colliders]));
  group.add(walkers.group);
  walkers.group.traverse((o) => { o.castShadow = true; });

  const local = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  return {
    group,
    colliders: [...colliders, ...crowd.colliders, ...traffic.colliders, ...walkers.colliders],
    signs,
    lamps,
    traffic,
    walkers,
    golgappa: crowd.golgappa,
    saloon: crowd.saloon,
    // the radio's speaker, in the world: the tapri's frame applied to its spot on the counter
    radioAt: new THREE.Vector3(RADIO_AT.x - 0.05, RADIO_AT.y + 0.08, RADIO_AT.z).applyMatrix4(placeOnStreet(SLOTS.chaiTapri.s, SLOTS.chaiTapri.offset).matrix),
    update(t, dt, player) {
      for (const animal of animals) {
        // the player's position in the animal's own frame
        local.copy(player).applyMatrix4(inverse.copy(animal.group.matrixWorld).invert());
        animal.update(t, dt, local);
      }
      crowd.update(t, dt, player);
      walkers.update(t, dt, player, traffic.colliders);
      traffic.update(dt, player, walkers.positions);
    },
  };
}

/** A sign spot given in a prop's own frame, as a world sign. */
function toWorld(sp: SignSpot, where: Placement): WorldSign {
  return {
    kind: sp.kind,
    position: new THREE.Vector3(sp.x, sp.y, sp.z).applyMatrix4(where.matrix),
    rotationY: where.rot + (sp.ry ?? 0),
    w: sp.w,
    h: sp.h,
    label: sp.label,
  };
}
