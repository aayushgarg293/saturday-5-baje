import * as THREE from "three";
import { makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { HOME_LANE, LANE_ROAD } from "../world/homeLane";
import { Parts } from "../world/kit";
import { buildCow } from "../world/props/animals";
import { makeActor, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * The home lane's evening (world/homeLane.ts): quiet.
 *
 *   a cow     standing at the lane's edge, chewing, flicking her tail
 *   an amma   on a charpai outside her house, a steel thali of peas in her
 *             lap, shelling them; looking up the lane now and then
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * lane's middle, square to the world (x east, z south), the group placed at
 * the amma's charpai.
 */

export type HomeLanePeople = { group: THREE.Group; colliders: { x: number; z: number; sx: number; sz: number }[]; update(t: number, dt: number, player: THREE.Vector3): void };

/** Where they are (metres along the lane). */
const AMMA_S = 78, COW_S = 38;

export function buildHomeLanePeople(): HomeLanePeople {
  const rng = makeRng(7811);
  // the charpai, against her house's front on the lane's south side
  const at = LANE_ROAD.pointAt(AMMA_S, -(HOME_LANE.half - 0.5));
  const group = new THREE.Group();
  group.name = "homeLanePeople";
  group.position.set(at.x, 0, at.z);
  group.updateMatrixWorld(true);

  // --- the charpai: a wooden frame on four legs, woven string ---------------------------------------------
  const c = new Parts();
  for (const z of [-0.42, 0.42]) c.box(1.9, 0.07, 0.07, 0, 0.42, z, 0x7a5a34);
  for (const x of [-0.92, 0.92]) c.box(0.07, 0.07, 0.9, x, 0.42, 0, 0x7a5a34);
  for (const [x, z] of [[-0.92, -0.42], [0.92, -0.42], [-0.92, 0.42], [0.92, 0.42]]) c.box(0.07, 0.42, 0.07, x, 0.21, z, 0x6a4a2a);
  c.box(1.8, 0.03, 0.8, 0, 0.43, 0, 0xd8c8a0); // the woven string
  const thali = new Parts();
  thali.cylinder(0.17, 0.15, 0.03, 0, 0, 0, 0xc8ccd0, { segments: 14 });
  for (let k = 0; k < 9; k++) thali.add(new THREE.SphereGeometry(0.018, 6, 5), rng.range(-0.1, 0.1), 0.02, rng.range(-0.1, 0.1), 0x6aa040);
  const mesh = (p: Parts, name: string) => {
    const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
    m.name = name;
    m.castShadow = true;
    return m;
  };
  group.add(mesh(c, "charpai"));
  const plate = mesh(thali, "thaliOfPeas");
  plate.position.set(0.3, 0.72, -0.05);
  group.add(plate);

  // --- the amma: on the charpai's edge, facing the lane (north: −z) ---------------------------------------------
  const r = recipeFor("villageWoman", rng);
  r.build.scale = 0.93;
  r.face.age = 0.9;
  r.hairColour = 0xb8b4ac;
  const amma = buildPerson(r);
  group.add(amma.root);
  const lap = v(0, 0.66, 0.32);
  const actor = makeActor({
    person: amma, at: { x: 0.3, z: 0.1, turn: Math.PI }, seat: 0.45, notice: "greet", phase: 0,
    actions: [
      { name: "shell", duration: 8, pose: (u) => ({ right: v(-0.06 + Math.sin(u * 5) * 0.03, 0.72, 0.3), left: v(0.07, 0.72 + Math.abs(Math.sin(u * 5)) * 0.02, 0.32), look: lap, nod: 0.3, lean: 0.15 }) },
      { name: "look", duration: 4, pose: () => ({ right: v(-0.08, 0.7, 0.3), left: v(0.08, 0.7, 0.3), look: v(-2.5, 1.3, 5), lean: 0.05 }) },
    ],
  });

  // --- the cow, at the lane's north edge ---------------------------------------------------------------------
  const cow = buildCow(rng);
  const cowAt = LANE_ROAD.pointAt(COW_S, HOME_LANE.half - 0.75);
  cow.group.position.set(cowAt.x - at.x, 0, cowAt.z - at.z);
  cow.group.rotation.y = Math.PI + 0.15; // (along the lane, her head to the west)
  group.add(cow.group);
  const toPlayer = new THREE.Vector3();

  return {
    group,
    // (the charpai and the cow, to walk round: world coordinates, sizes along x and z)
    colliders: [
      { x: at.x, z: at.z, sx: 2.0, sz: 1.0 },
      { x: cowAt.x, z: cowAt.z, sx: cow.size[0], sz: cow.size[1] },
    ],
    update(t, dt, player) {
      actor.update(t, dt, player);
      cow.group.updateMatrixWorld();
      cow.update(t, dt, cow.group.worldToLocal(toPlayer.copy(player)));
    },
  };
}
