import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { timeOfDay } from "../core/timeOfDay";
import { townState } from "../core/townState";
import { buildPerson } from "../people/body";
import { recipeFor } from "../people/recipes";
import { type Stroll, walk } from "../people/stroll";
import { PAL } from "../render/palette";
import { Parts, ribbon } from "./kit";
import { BAYS } from "./places/busStand";
import { BUS, buildBus, busSigns } from "./props/bus";
import { Road } from "./roads";
import { buildSigns } from "./signs";
import type { WorldSign } from "./street";
import { BUS_STAND, inBusStand } from "./town";
import { drive, pose } from "./traffic";

/**
 * The highway out of the bus stand, east (to Jaipur), and the 6:30 bus that
 * comes in along it.
 *
 *   the highway   out through the gap in the yard's east row: tarmac, a dusty
 *                 verge, the low walls of fields either side, and a yellow
 *                 milestone ("जयपुर 132 कि.मी.") where you can go no further
 *                 (it runs on into the haze)
 *   the 6:30      from about 6:23 it comes in along the highway, slows into
 *                 the yard and noses into the empty third bay; once it's in
 *                 (townState.jaipurBusIn) its passengers get down, a few, and
 *                 walk off, and Mama's parcel can be collected
 *                 (activities/errands.ts). Come later, and it's simply there.
 *
 * FRAME: the yard's (world/places/busStand.ts): x east, z south, its middle
 * at the origin.
 */

export type BusArrival = { group: THREE.Group; colliders: Box[]; update(t: number, dt: number, player: THREE.Vector3): void };

/** When it sets off along the highway (it's in by about 6:30), and how fast it drives. */
const SETS_OFF = 18 * 60 + 23;
const CRUISE = 7;
/** How far east the highway runs (yard x), and where the milestone stops you. */
const FAR = 160, STOP = 46;
const D = BUS_STAND.depth / 2;

export function buildBusArrival(): BusArrival {
  const mid = inBusStand(D, 0);
  const group = new THREE.Group();
  group.name = "busArrival";
  group.position.set(mid.x, 0, mid.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const colliders: Box[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, 0));
  };

  // --- the highway: tarmac, dusty verges, the fields' low walls, the milestone ----------------------
  const p = new Parts();
  const half = 3.2, gapZ = (BUS_STAND.highway.s1 - BUS_STAND.highway.s0) / 2;
  const road = new Road({ name: "highway", start: { x: D - 4, z: 0 }, heading: Math.PI / 2, length: FAR });
  const strip = (o0: number, o1: number, y: number, colour: number) =>
    p.add(ribbon((t) => road.pointAt(t * FAR, o0), (t) => road.pointAt(t * FAR, o1), 40, y), 0, 0, 0, colour);
  strip(-half, half, 0.012, PAL.asphalt);
  // field walls along both sides, from the yard's east row (against its buildings' sides, so you can't
  // slip round behind them) out past the milestone
  const wallFrom = D + 0.3;
  for (const side of [-1, 1]) {
    const [z0, z1] = side < 0 ? [-gapZ, -gapZ + 0.3] : [gapZ - 0.3, gapZ];
    p.slab(wallFrom, FAR, 0, 1.1, z0, z1, 0xc8b89a);
    box(wallFrom, FAR, z0, z1);
  }
  // the milestone: a yellow-topped white stone on the verge; and there you stop
  const ms = { x: STOP, z: half + 0.9 };
  // (its broad face toward the yard; the rounded top a half-disc, painted yellow)
  p.box(0.25, 0.75, 0.5, ms.x, 0.375, ms.z, 0xf2efe6);
  p.add(new THREE.CylinderGeometry(0.25, 0.25, 0.25, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), ms.x, 0.75, ms.z, 0xe8c22a);
  box(STOP + 0.5, STOP + 1, -gapZ, gapZ);
  // (its words painted on its face, turned toward the yard: you read it walking out)
  const words: WorldSign[] = [
    { kind: "railBoard", position: new THREE.Vector3(ms.x - 0.135, 0.42, ms.z), rotationY: -Math.PI / 2, w: 0.44, h: 0.5, label: "जयपुर\n132 कि.मी." },
  ];
  group.add(p.build("highway", { castShadow: false }), buildSigns(words));

  // --- the 6:30 bus ------------------------------------------------------------------------------------
  const bay = BAYS[2];
  const bus = new THREE.Group();
  bus.name = "busFromJaipur";
  bus.add(buildBus(7433));
  // its words, painted in its own frame, so they go where it goes
  bus.add(buildSigns(busSigns(new THREE.Matrix4(), 0, "जयपुर")));
  group.add(bus);
  const path = [
    new THREE.Vector3(FAR, 0, 1.7), new THREE.Vector3(40, 0, 1.7), new THREE.Vector3(D + 4, 0, 1.9), new THREE.Vector3(14, 0, 2.4),
    new THREE.Vector3(10, 0, 2.9), new THREE.Vector3(bay.x + 0.6, 0, 0.9), new THREE.Vector3(bay.x, 0, -2), new THREE.Vector3(bay.x, 0, bay.z),
  ];
  const route = new THREE.CatmullRomCurve3(path, false, "centripetal");
  const collider = boxAt(0, 0, BUS.length, BUS.width, 0);
  const coach = {
    group: bus, wheels: [] as { mesh: THREE.Mesh; radius: number }[], collider, length: BUS.length, width: BUS.width, cruise: CRUISE,
    route: route as THREE.CatmullRomCurve3 | null, routeLength: route.getLength(), travelled: 0, speed: 0, stoppedFor: 0, someoneAhead: false,
  };
  // (the collider's in the yard's frame here: put it in the world's as it moves)
  const worldCollider = boxAt(0, 0, BUS.length, BUS.width, 0);
  colliders.push(worldCollider);
  const placeCollider = () => {
    const c = toWorld(bus.position.x, 0, bus.position.z);
    worldCollider.cx = c.x;
    worldCollider.cz = c.z;
    worldCollider.rot = bus.rotation.y;
  };
  type State = "away" | "coming" | "in";
  let state: State = "away";
  bus.visible = false;
  worldCollider.cx = 1e5;
  const parkIt = () => {
    pose(coach, route.getPointAt(1), route.getTangentAt(1));
    placeCollider();
    bus.visible = true;
    state = "in";
    townState.jaipurBusIn = true;
    getDown();
  };

  // --- its passengers getting down: a few, off to the court road side, gone once you're not near -------
  const rng = makeRng(7441);
  const strolls: Stroll[] = [];
  /** Seconds each still waits on the bus before getting down (one after another, not all at once). */
  const waits: number[] = [];
  function getDown() {
    // (the door: on the bus's left, near the front; parked noses-north, its left is the west)
    const door = new THREE.Vector3(bay.x - BUS.width / 2 - 0.5, 0, bay.z - BUS.length / 2 + 1.3);
    ["man", "woman", "uncle"].forEach((role, k) => {
      waits.push(1.5 + k * 2.5);
      const r = recipeFor(role as "man", rng);
      r.outfit.bag = role === "man" ? "jhola" : undefined;
      const person = buildPerson(r);
      group.add(person.root);
      person.root.position.copy(door);
      person.root.visible = false;
      const off = new THREE.Vector3(-4 - k * 1.5, 0, 2 + k * 2.2);
      strolls.push({
        person, path: [door.clone(), door.clone().add(new THREE.Vector3(-1.2, 0, 1.5)), door.clone().add(off), new THREE.Vector3(-D - 4, 0, 1.6 + k * 0.6), new THREE.Vector3(-D - 30, 0, 1.6 + k * 0.6)],
        speed: rng.range(0.9, 1.15), travelled: 0, phase: rng.next(), moving: 0, heading: Math.PI,
      });
    });
  }

  const _you = new THREE.Vector3();
  return {
    group, colliders,
    update(t, dt, player) {
      const minutes = timeOfDay.minutes;
      if (state === "away" && minutes >= SETS_OFF) {
        // come much later, and it's already in; otherwise it comes in along the highway
        if (minutes > SETS_OFF + 8) parkIt();
        else {
          state = "coming";
          bus.visible = true;
          pose(coach, route.getPointAt(0), route.getTangentAt(0));
        }
      }
      if (state === "coming") {
        const you = group.worldToLocal(_you.copy(player));
        if (drive(coach, dt, [you], () => {}, 30)) parkIt();
        else placeCollider();
      }
      // the passengers: walking off, gone once at the end of their way and you're not near
      const you = group.worldToLocal(_you.copy(player));
      strolls.forEach((s, k) => {
        if (waits[k] > 0) {
          waits[k] -= dt;
          s.person.root.visible = waits[k] <= 0;
          return;
        }
        if (!s.person.root.visible) return;
        if (walk(s, t, dt, you) && s.person.root.position.distanceTo(you) > 25) s.person.root.visible = false;
      });
    },
  };
}
