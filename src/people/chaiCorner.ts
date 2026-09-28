import * as THREE from "three";
import type { Rng } from "../core/rng";
import type { Placement } from "../world/props/batch";
import { type Action, type Actor, makeActor, seenFrom, smooth, v } from "./actor";
import { buildPerson } from "./body";
import { chaiGlass } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * Three men on the chai tapri's benches (world/props/stalls.ts, `chaiTapri`),
 * glasses in hand: sipping, chatting, laughing. Two share the bench on one
 * side, the third faces them from the other bench; they talk across.
 *
 * Positions are in the tapri's frame (x along the counter, +z toward the
 * street). Poses are in each man's own frame (see actor.ts).
 */

const SEAT = 0.44; // the benches' height
const MEN: { role: Role; at: { x: number; z: number; turn: number } }[] = [
  { role: "uncle", at: { x: 1.45, z: 0.0, turn: -Math.PI / 2 } }, // right bench, facing the counter
  { role: "youngMan", at: { x: 1.45, z: 0.6, turn: -Math.PI / 2 } },
  { role: "man", at: { x: -1.45, z: 0.4, turn: Math.PI / 2 } }, // left bench, facing them
];

/** Hands at rest, seated: on the thighs. The right one holds the glass. */
const REST_R = v(-0.12, 0.64, 0.3), REST_L = v(0.13, 0.6, 0.26);
/** The mouth, seated (for a man about 1.68 m tall). */
const MOUTH = v(-0.02, 1.2, 0.15);

/**
 * A seated man's loop. `friend` is who he talks to (a point in his frame, at
 * head height); `street` where his eyes wander.
 */
function sitterActions(rng: Rng, friend: THREE.Vector3, street: THREE.Vector3): Action[] {
  const sip: Action = {
    name: "sip",
    duration: 3.2,
    pose: (u) => {
      // up to the mouth (0.8 s), sip (1 s), back down (0.8 s)
      const up = smooth(THREE.MathUtils.clamp(Math.min(u / 0.8, (2.6 - u) / 0.8), 0, 1));
      return { right: REST_R.clone().lerp(MOUTH, up), left: REST_L, look: street, nod: -0.15 * up, lean: 0.05 };
    },
  };
  const listen: Action = {
    name: "listen",
    duration: rng.range(3, 5),
    pose: (u) => ({ right: REST_R, left: REST_L, look: friend, nod: Math.max(0, Math.sin(u * 2.2)) * 0.08, lean: 0.12 }),
  };
  const talk: Action = {
    name: "talk",
    duration: rng.range(3.5, 5),
    pose: (u) => {
      // the free hand makes his point: up, open, turning, down again
      const up = smooth(THREE.MathUtils.clamp(Math.min(u / 0.5, (4 - u) / 0.5), 0, 1));
      const beat = Math.sin(u * 3.1) * 0.05;
      return {
        right: REST_R,
        left: REST_L.clone().lerp(v(0.24 + beat, 0.88 + Math.abs(beat), 0.38), up),
        look: friend,
        lean: 0.15,
        twist: 0.1 + beat,
        rock: beat * 0.5,
      };
    },
  };
  const laugh: Action = {
    name: "laugh",
    duration: 2,
    pose: (u) => ({ right: REST_R, left: REST_L.clone().add(v(0, 0.05, 0.05)), look: friend, lean: -0.08 + Math.abs(Math.sin(u * 7)) * 0.08, smile: true, nod: -0.1 }),
  };
  // everyone's day is a little different
  const order = [listen, talk, laugh, listen];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return [...order, sip];
}

export type ChaiCorner = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

export function buildChaiCorner(where: Placement, rng: Rng): ChaiCorner {
  const group = new THREE.Group();
  group.name = "chaiCorner";
  group.applyMatrix4(where.matrix);

  const glasses: THREE.Mesh[] = [];
  const actors: Actor[] = MEN.map((man, i) => {
    const recipe = recipeFor(man.role, rng);
    recipe.build.scale = 1; // the reaches above are for a man of this height
    // A kurta's long tails are stiff (they follow the hips), so seated they'd
    // hang straight down through the bench: seated men wear shirts.
    if (recipe.outfit.top === "kurta") {
      recipe.outfit.top = "halfShirt";
      recipe.outfit.jacket = undefined;
    }
    const person = buildPerson(recipe);
    group.add(person.root);
    // each looks at someone across: the two on one bench at the one opposite; he at them in turn
    const other = MEN[i === 2 ? 0 : 2].at;
    const friend = seenFrom(man.at, other.x, 1.2, other.z);
    const street = seenFrom(man.at, 0, 1.3, 4);
    const glass = chaiGlass();
    group.add(glass);
    glasses.push(glass);
    return makeActor({ person, at: man.at, seat: SEAT, actions: sitterActions(rng, friend, street), notice: "glance", phase: i * 3.7 });
  });

  const at = new THREE.Vector3();
  return {
    group,
    update(t, dt, player) {
      actors.forEach((actor, i) => {
        actor.update(t, dt, player);
        // the glass stays upright in his fist, tipping toward him as he sips
        const glass = glasses[i];
        glass.position.copy(actor.grip("R", at));
        const sipping = actor.now.name === "sip" ? smooth(THREE.MathUtils.clamp(Math.min((actor.now.u - 0.6) / 0.4, (2.4 - actor.now.u) / 0.4), 0, 1)) : 0;
        glass.rotation.set(-0.9 * sipping, MEN[i].at.turn, 0, "YXZ");
      });
    },
  };
}
