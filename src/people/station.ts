import * as THREE from "three";
import { makeRng } from "../core/rng";
import { STATION_SPOTS } from "../world/places/station";
import { STATION, inStation } from "../world/station";
import { Parts } from "../world/kit";
import { toon } from "../render/toon";
import { type Actor, makeActor, seenFrom, v } from "./actor";
import { buildPerson } from "./body";
import { chaiGlass, stool } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * The people at the level crossing and the station (world/places/station.ts):
 *
 *   the gateman     on his stool outside his hut by the barrier: sipping
 *                   his chai, watching the lane, looking up and down the
 *                   line (nothing due)
 *   the coolie      in his red shirt and red safa, resting on the platform
 *                   bench between trains, hands on his knees, dozing a bit
 *   a passenger     standing on the platform by his tin trunk, looking down
 *                   the line for his train, checking his watch
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * station's (world/places/station.ts: x east, z south, the origin where the
 * lane crosses the line); the two on the platform in a group raised to it.
 */

export type StationPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

export function buildStationPeople(): StationPeople {
  const rng = makeRng(7621);
  const origin = inStation(STATION.railway.track, 0);
  const group = new THREE.Group();
  group.name = "stationPeople";
  group.position.set(origin.x, 0, origin.z);
  const platform = new THREE.Group();
  platform.position.y = STATION_SPOTS.height;
  group.add(platform);
  group.updateMatrixWorld(true);
  const actors: Actor[] = [];
  const person = (role: Role, parent: THREE.Object3D, dress: (o: ReturnType<typeof recipeFor>["outfit"]) => void) => {
    const r = recipeFor(role, rng);
    r.build.scale = 1;
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    dress(r.outfit);
    const p = buildPerson(r);
    parent.add(p.root);
    return p;
  };

  // --- the gateman, on his stool by the hut ------------------------------------------------------------
  const g = STATION_SPOTS.gateman;
  const seat = stool(0.45);
  seat.position.set(g.x, 0, g.z);
  group.add(seat);
  const glass = chaiGlass();
  group.add(glass);
  const lineNorth = seenFrom(g, g.x - 3.4, 1.4, g.z - 30), lineSouth = seenFrom(g, g.x - 3.4, 1.4, g.z + 30);
  const knees = { r: v(-0.13, 0.6, 0.35), l: v(0.13, 0.6, 0.35) };
  const gateman = makeActor({
    person: person("man", group, (o) => {
      o.top = "halfShirt";
      o.topColour = 0x3f5a7a; // railway blue
      o.bottom = "trousers";
      o.bottomColour = 0x2f3f52;
      o.safa = undefined;
    }),
    at: g, seat: 0.45, notice: "glance", phase: 1,
    actions: [
      { name: "sip", duration: 3, pose: (u) => ({ right: u < 1.6 ? v(-0.06, 1.42, 0.16) : v(-0.18, 0.85, 0.35), left: knees.l, look: v(0, 1.0, 2), nod: u < 1.6 ? -0.1 : 0 }) },
      { name: "hold", duration: 5, pose: () => ({ right: v(-0.18, 0.85, 0.35), left: knees.l, look: v(1.5, 1.4, 5) }) },
      { name: "north", duration: 3, pose: () => ({ right: v(-0.18, 0.85, 0.35), left: knees.l, look: lineNorth }) },
      { name: "south", duration: 3, pose: () => ({ right: v(-0.18, 0.85, 0.35), left: knees.l, look: lineSouth }) },
    ],
  });
  actors.push(gateman);

  // --- the coolie, resting on the bench --------------------------------------------------------------------
  actors.push(makeActor({
    person: person("man", platform, (o) => {
      o.top = "halfShirt";
      o.topColour = 0xc0302a; // the coolie's red
      o.bottom = "pyjama";
      o.bottomColour = 0xe8e2d4;
      o.safa = [0xc0302a, 0xd8a030];
    }),
    at: STATION_SPOTS.bench, seat: 0.45, notice: "glance", phase: 2,
    actions: [
      { name: "rest", duration: 7, pose: () => ({ right: knees.r, left: knees.l, look: v(0, 1.1, 3), nod: 0.15 }) },
      { name: "doze", duration: 6, pose: () => ({ right: knees.r, left: knees.l, look: v(0, 0.9, 1.5), nod: 0.4, closed: true }) },
      { name: "look", duration: 3, pose: () => ({ right: knees.r, left: knees.l, look: v(-3, 1.4, 4) }) },
    ],
  }));

  // --- a passenger with his trunk, waiting --------------------------------------------------------------------
  const w = STATION_SPOTS.waiting;
  const trunk = new Parts();
  trunk.box(0.75, 0.35, 0.45, 0, 0.175, 0, 0x2f4f7a);
  trunk.box(0.77, 0.03, 0.47, 0, 0.3, 0, 0x8a8f92); // its rim
  trunk.box(0.12, 0.03, 0.06, 0, 0.36, 0, 0x5a5e60); // its handle
  const trunkMesh = new THREE.Mesh(trunk.geometry(), toon({ color: 0xffffff, vertexColors: true }));
  trunkMesh.castShadow = true;
  trunkMesh.position.set(w.x + 0.55, 0, w.z - 0.1);
  trunkMesh.rotation.y = 0.4;
  platform.add(trunkMesh);
  const downLine = seenFrom(w, w.x + 1.8, 1.2, w.z + 40);
  actors.push(makeActor({
    person: person("youngMan", platform, () => {}),
    at: w, notice: "glance", phase: 0,
    actions: [
      { name: "watch", duration: 6, pose: () => ({ right: v(-0.17, 0.86, 0.06), left: v(0.17, 0.86, 0.06), look: downLine }) },
      { name: "time", duration: 2.5, pose: () => ({ right: v(-0.02, 1.1, 0.3), left: v(0.06, 1.08, 0.28), look: v(0.04, 1.1, 0.3), nod: 0.2 }) },
      { name: "wait", duration: 5, pose: () => ({ right: v(-0.18, 0.88, -0.05), left: v(0.18, 0.88, -0.05), look: v(-1, 1.5, 4) }) },
    ],
  }));

  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
      gateman.grip("R", glass.position);
    },
  };
}
