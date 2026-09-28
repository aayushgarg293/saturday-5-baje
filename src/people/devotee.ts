import * as THREE from "three";
import type { Rng } from "../core/rng";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, makeActor, track, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * An old woman at the roadside temple (world/props/temple.ts), in front of
 * the shrine: hands folded, eyes closed, praying; she rings the bell; she
 * bends to touch the step and then her forehead. She doesn't look round at
 * you: she's busy.
 *
 * Positions are in her own frame (facing the shrine); the spot gives the
 * bell's position in that frame.
 */

export type Devotee = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

export function buildDevotee(spot: WorldPeopleSpot, rng: Rng): Devotee {
  const group = new THREE.Group();
  group.name = "devotee";
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;
  group.updateMatrixWorld(true);

  const recipe = recipeFor("villageWoman", rng);
  recipe.build.scale = 0.92; // the reaches below are for her height
  recipe.face.age = 0.9;
  recipe.hairColour = recipe.face.hair = 0x8d8680; // grey
  const person = buildPerson(recipe);
  group.add(person.root);

  const [bx, by, bz] = spot.bell ?? [-0.4, 1.12, 0.35];
  const shrine = v(0, 1.0, 2); // the idol, ahead
  const NAMASTE_R = v(-0.015, 1.1, 0.22), NAMASTE_L = v(0.015, 1.1, 0.22);
  const HANG_R = v(-0.17, 0.78, 0.04), HANG_L = v(0.17, 0.78, 0.04);

  const pray: Action = {
    name: "pray",
    duration: 7,
    pose: (u) => ({ right: NAMASTE_R, left: NAMASTE_L, look: shrine, lean: 0.12, nod: 0.18 + Math.sin(u * 1.3) * 0.04, closed: u > 0.8 && u < 6.4 }),
  };
  const bell: Action = {
    name: "bell",
    duration: 2.6,
    pose: (u) => {
      // up to the bell, swing it a few times, down again
      const at = v(bx, by - 0.02, bz - 0.04);
      const swing = u > 0.7 && u < 1.9 ? Math.sin((u - 0.7) * 10) * 0.05 : 0;
      return { right: track(u, [0, 0.7, 1.9, 2.6], [HANG_R, at, at, HANG_R]).add(v(swing, 0, 0)), left: HANG_L, look: v(bx, by + 0.1, bz), twist: -0.25, lean: 0.1 };
    },
  };
  const touch: Action = {
    name: "touch",
    duration: 3.2,
    pose: (u) => {
      // bend to touch the step, then the fingers to her forehead
      const bend = u < 1.6 ? Math.sin((u / 1.6) * Math.PI) : 0;
      return {
        right: track(u, [0, 0.8, 1.1, 1.8, 2.5, 3.2], [HANG_R, v(-0.05, 0.62, 0.45), v(-0.05, 0.62, 0.45), v(-0.03, 1.46, 0.16), v(-0.03, 1.46, 0.16), NAMASTE_R]),
        left: track(u, [0, 0.8, 1.8, 3.2], [HANG_L, v(0.2, 0.8, 0.2), HANG_L, NAMASTE_L]),
        look: v(0, 0.3, 1),
        lean: 0.1 + bend * 0.6,
        crouch: bend * 0.35,
        closed: u > 2.2,
      };
    },
  };
  const actor = makeActor({ person, at: { x: 0, z: 0, turn: 0 }, actions: [pray, bell, pray, touch], notice: "none", phase: 3 });
  return { group, update: (t, dt, player) => actor.update(t, dt, player) };
}
