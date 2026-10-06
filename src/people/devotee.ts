import * as THREE from "three";
import { cue } from "../core/cues";
import { timeOfDay } from "../core/timeOfDay";
import { flat, glow, toon } from "../render/toon";
import { softTexture } from "../world/evening";
import type { Rng } from "../core/rng";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, makeActor, track, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/** Moments in the bell action (seconds in) when the clapper strikes. */
const RINGS = [0.8, 1.15, 1.5];
/** When the evening aarti begins (clock minutes), and how near you must be to hear the conch that starts it. */
const AARTI_FROM = 18 * 60 + 50; // (at sunset: render/daylight.ts)
const CONCH_WITHIN = 40;
/** The handbell rings this often (seconds) through the aarti. */
const HANDBELL = 0.21;

/**
 * An old woman at the roadside temple (world/props/temple.ts), in front of
 * the shrine: hands folded, eyes closed, praying; she rings the bell; she
 * bends to touch the step and then her forehead. She doesn't look round at
 * you: she's busy.
 *
 * In the evening she does the AARTI: a brass plate with a lit diya circling
 * in her right hand before the shrine, a little handbell ringing in her left.
 * The first time you come near it, she blows the conch to begin.
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
  const aarti: Action = {
    name: "aarti",
    duration: 12,
    pose: (u) => {
      // the plate circles before the idol, clockwise, once every 1.6 s; the handbell shakes
      const a = (u / 1.6) * Math.PI * 2;
      const plate = v(-0.02 + Math.sin(a) * 0.14, 1.08 + Math.cos(a) * 0.11, 0.42);
      return { right: plate, left: v(0.2, 1.1 + Math.sin(u * 28) * 0.015, 0.3), look: shrine, lean: 0.1, nod: 0.05 };
    },
  };
  // the aarti plate: brass, with a small diya and its flame
  const plate = new THREE.Group();
  plate.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.012, 16), toon({ color: 0xc9a13b })));
  const diya = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.02, 10), toon({ color: 0xb86b45 }));
  diya.position.y = 0.016;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), flat(0xffc860));
  flame.position.y = 0.04;
  const flameGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), glow(softTexture()));
  flameGlow.material.color.set(0xff9a40);
  flameGlow.position.y = 0.04;
  plate.add(diya, flame, flameGlow);
  plate.visible = false;
  group.add(plate);
  const handbell = new THREE.Vector3();
  let conchBlown = false;
  let nextRing = 0;

  const actor = makeActor({ person, at: { x: 0, z: 0, turn: 0 }, actions: [pray, bell, pray, touch], notice: "none", phase: 3 });
  // the bell rings each time her hand swings the clapper (see `bell` above)
  const bellWorld = group.localToWorld(v(bx, by, bz));
  let before = { name: "", u: 0 };
  return {
    group,
    update(t, dt, player) {
      // the evening aarti: the conch the first time you're near, then round and round
      if (timeOfDay.minutes >= AARTI_FROM) {
        if (!conchBlown && bellWorld.distanceTo(player) < CONCH_WITHIN) {
          conchBlown = true;
          cue("conch", bellWorld);
        }
        if (conchBlown && actor.now.name !== "aarti") actor.perform(aarti);
      }
      actor.update(t, dt, player);
      const { name, u } = actor.now;
      plate.visible = name === "aarti";
      if (plate.visible) {
        actor.grip("R", plate.position);
        flameGlow.lookAt(player); // (the glow card turns to face you)
        actor.grip("L", handbell);
        if (t >= nextRing) {
          nextRing = t + HANDBELL * (0.8 + Math.random() * 0.4);
          cue("aartiBell", group.localToWorld(handbell.clone()));
        }
      }
      if (name === "bell" && before.name === "bell") {
        for (const at of RINGS) if (before.u < at && at <= u) cue("templeBell", bellWorld);
      }
      before = { name, u };
    },
  };
}
