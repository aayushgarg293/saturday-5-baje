import * as THREE from "three";
import type { Box } from "../core/colliders";
import { makeRng } from "../core/rng";
import type { SignSpot } from "./buildings/common";
import { Parts } from "./kit";
import { buildCrowd } from "../people/crowd";
import { ANIMALS, PARKED, SLOTS } from "./layout";
import { type Animal, buildCow, buildDog } from "./props/animals";
import { type Placement, StaticBatch, placeOnStreet } from "./props/batch";
import { chaiTapri, golgappaCart, iceGolaCart, jalebiStall, kachoriStall } from "./props/stalls";
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
  update(t: number, dt: number, player: THREE.Vector3): void;
};

/** `people`: the places the buildings offer for people (world/street.ts). */
export function buildLife(people: WorldPeopleSpot[]): Life {
  const rng = makeRng(404);
  const group = new THREE.Group();
  group.name = "life";
  const batch = new StaticBatch();
  const signs: WorldSign[] = [];

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
  }

  // --- parked vehicles ---------------------------------------------------------------
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
  }

  const statics = batch.build("streetLife");
  group.add(statics);

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

  const local = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  return {
    group,
    colliders: [...colliders, ...crowd.colliders, ...traffic.colliders],
    signs,
    traffic,
    update(t, dt, player) {
      for (const animal of animals) {
        // the player's position in the animal's own frame
        local.copy(player).applyMatrix4(inverse.copy(animal.group.matrixWorld).invert());
        animal.update(t, dt, local);
      }
      crowd.update(t, dt, player);
      traffic.update(dt, player);
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
