import * as THREE from "three";
import type { Rng } from "../core/rng";
import type { WorldPeopleSpot } from "../world/street";
import { type Action, type Actor, makeActor, smooth, track, v } from "./actor";
import { buildPerson } from "./body";
import { handFan, mobile, newspaper, stool } from "./props";
import { recipeFor } from "./recipes";

/**
 * Shopkeepers, passing the afternoon. What they do depends on the shop:
 *
 *   kirana       behind the counter, reading the paper; now and then turns a
 *                page, or lowers it to look at the street
 *   sweets       fans himself with a pankha; shoos the flies off the counter
 *   electrical   on his mobile, talking, listening, laughing; then puts it down
 *   cloth, cycle, the saloon (no counter: a stool out on the platform)
 *                watches the street, arms folded; stretches; scratches his head
 *
 * Everyone greets you with a smile and a nod when you stop in front.
 * Positions are in the shopkeeper's own frame (see actor.ts): on the shop
 * floor, facing the street. `WorldPeopleSpot` (from world/street.ts) says
 * where that is.
 */

export type Shopkeeper = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** Seat heights: a tall stool behind a counter (to see over it), a low one outside. */
const SEAT = { counter: 0.65, platform: 0.42 };
/** Hands resting on the counter (its top is at 0.9 m, 0.4–0.9 m in front of him). */
const ON_COUNTER_R = v(-0.15, 0.97, 0.5), ON_COUNTER_L = v(0.15, 0.97, 0.5);
/** Hands on the knees, sitting on the low stool. */
const KNEE_R = v(-0.13, 0.6, 0.36), KNEE_L = v(0.13, 0.6, 0.36);
const STREET = v(0, 1.4, 5);
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export function buildShopkeeper(spot: WorldPeopleSpot, rng: Rng): Shopkeeper {
  const group = new THREE.Group();
  group.name = `shopkeeper-${spot.trade}`;
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;
  group.updateMatrixWorld(true);

  const seat = spot.kind === "counter" ? SEAT.counter : SEAT.platform;
  const recipe = recipeFor(rng.next() < 0.5 ? "shopkeeper" : "uncle", rng);
  recipe.build.scale = 1;
  // seated, a kurta's stiff tails would hang through the stool (see chaiCorner.ts)
  if (recipe.outfit.top === "kurta") {
    recipe.outfit.top = "halfShirt";
    recipe.outfit.jacket = undefined;
  }
  const person = buildPerson(recipe);
  group.add(person.root, stool(seat));

  const work = WORK[spot.trade ?? "general"];
  const actor = makeActor({ person, at: { x: 0, z: 0, turn: 0 }, seat, actions: work.actions, notice: "greet", phase: rng.range(0, 10) });
  const prop = work.prop?.();
  if (prop) group.add(prop);

  return {
    group,
    update(t, dt, player) {
      actor.update(t, dt, player);
      if (prop && work.place) work.place(prop, actor);
    },
  };
}

type Work = {
  actions: Action[];
  /** Something in hand, and how to place it each frame. */
  prop?: () => THREE.Object3D;
  place?: (prop: THREE.Object3D, actor: Actor) => void;
};

// --- the kirana: the newspaper -------------------------------------------------------------

const PAPER_R = v(-0.21, 1.1, 0.38), PAPER_L = v(0.21, 1.1, 0.38);
const kirana: Work = {
  actions: [
    {
      name: "read",
      duration: 9,
      pose: (u) => ({ right: PAPER_R, left: PAPER_L, look: v(0, 1.05, 0.4), lean: 0.1, nod: 0.12 + Math.sin(u * 0.7) * 0.03 }),
    },
    {
      name: "page",
      duration: 1.6,
      // the right hand crosses over to turn the page, and back
      pose: (u) => ({ right: track(u, [0, 0.6, 1.0, 1.6], [PAPER_R, v(0.14, 1.18, 0.36), v(0.14, 1.18, 0.36), PAPER_R]), left: PAPER_L, look: v(0, 1.05, 0.4), lean: 0.1, nod: 0.12 }),
    },
    {
      name: "read",
      duration: 7,
      pose: () => ({ right: PAPER_R, left: PAPER_L, look: v(0, 1.05, 0.4), lean: 0.1, nod: 0.14 }),
    },
    {
      name: "look",
      duration: 4,
      // the paper comes down onto the counter; a look up and down the street
      pose: (u) => ({ right: ON_COUNTER_R, left: ON_COUNTER_L, look: v(Math.sin(u * 0.8) * 3, 1.4, 5), lean: 0.05 }),
    },
  ],
  prop: newspaper,
  place(paper, actor) {
    // between his hands; held up and tipped toward him, or lying flat once they're down on the counter
    actor.grip("R", _a);
    actor.grip("L", _b);
    const down = THREE.MathUtils.clamp((1.12 - Math.min(_a.y, _b.y)) / 0.14, 0, 1);
    paper.position.addVectors(_a, _b).multiplyScalar(0.5);
    paper.position.y += 0.05 * (1 - down) - 0.04 * down;
    paper.rotation.set(-0.3 - down * 1.25, 0, 0);
  },
};

// --- the sweet shop: the pankha --------------------------------------------------------------

const sweets: Work = {
  actions: [
    {
      name: "fan",
      duration: 6,
      pose: (u) => ({ right: v(-0.17, 1.2 + Math.sin(u * 9) * 0.015, 0.3), left: ON_COUNTER_L, look: STREET, lean: -0.05, nod: -0.05 }),
    },
    {
      name: "shoo",
      duration: 2,
      // a wave of the other hand over the counter: the flies
      pose: (u) => ({ right: v(-0.17, 1.15, 0.3), left: v(0.1 + Math.sin(u * 8) * 0.15, 1.02, 0.62), look: v(0, 0.9, 0.7), lean: 0.2 }),
    },
    {
      name: "rest",
      duration: 4,
      pose: () => ({ right: ON_COUNTER_R, left: ON_COUNTER_L, look: STREET, lean: 0.1 }),
    },
  ],
  prop: handFan,
  place(fan, actor) {
    // waved while fanning; otherwise in his hand, still
    actor.grip("R", fan.position);
    const fanning = actor.now.name === "fan" ? smooth(THREE.MathUtils.clamp(Math.min(actor.now.u / 0.5, (6 - actor.now.u) / 0.5), 0, 1)) : 0;
    fan.rotation.set(-0.2, 0.3 + Math.sin(actor.now.u * 9) * 0.7 * fanning, 0);
  },
};

// --- the electrical shop: the mobile -----------------------------------------------------------

const AT_EAR = v(-0.14, 1.37, 0.07);
const electrical: Work = {
  actions: [
    {
      name: "talk",
      duration: 6,
      pose: (u) => ({
        right: AT_EAR,
        // making a point to someone who isn't there
        left: u > 1.5 && u < 3.5 ? v(0.2 + Math.sin(u * 4) * 0.05, 1.08, 0.42) : ON_COUNTER_L,
        look: v(-2 + Math.sin(u * 0.5), 1.3, 4),
        nod: Math.sin(u * 5) * 0.04,
        smile: u > 4 && u < 5.3, // a laugh at something said
        twist: -0.1,
      }),
    },
    {
      name: "listen",
      duration: 3.5,
      // looking down, fingers drumming on the counter
      pose: (u) => ({ right: AT_EAR, left: v(0.15, 0.97 + Math.abs(Math.sin(u * 12)) * 0.02, 0.48), look: v(0.1, 0.9, 0.6), lean: 0.1 }),
    },
    {
      name: "off",
      duration: 5,
      pose: () => ({ right: ON_COUNTER_R, left: ON_COUNTER_L, look: STREET, lean: 0.05 }),
    },
  ],
  prop: mobile,
  place(phone, actor) {
    actor.grip("R", phone.position);
    // against his ear while he's on it; flat on the counter when he's done
    const down = actor.now.name === "off" && actor.now.u > 0.6;
    phone.rotation.set(down ? -Math.PI / 2 : 0, down ? 0 : -1.3, down ? 0 : 0.3);
  },
};

// --- no counter: a stool on the platform -----------------------------------------------------------

const outside: Work = {
  actions: [
    {
      name: "watch",
      duration: 6,
      pose: (u) => ({ right: KNEE_R, left: KNEE_L, look: v(Math.sin(u * 0.5) * 4, 1.3, 5), lean: 0.15 }),
    },
    {
      name: "fold",
      duration: 7,
      pose: (u) => ({ right: v(0.1, 0.9, 0.2), left: v(-0.1, 0.87, 0.22), look: v(Math.sin(u * 0.3 + 1) * 3, 1.3, 5), lean: -0.05 }),
    },
    {
      name: "stretch",
      duration: 3,
      // arms up over his head, a yawn, and down again
      pose: (u) => {
        const up = smooth(THREE.MathUtils.clamp(Math.min(u / 0.8, (3 - u) / 0.8), 0, 1));
        return {
          right: KNEE_R.clone().lerp(v(-0.22, 1.5, 0.05), up),
          left: KNEE_L.clone().lerp(v(0.22, 1.5, 0.05), up),
          look: STREET,
          lean: -0.15 * up,
          nod: -0.2 * up,
          closed: up > 0.8,
        };
      },
    },
    {
      name: "scratch",
      duration: 1.6,
      pose: (u) => ({ right: v(-0.08, 1.28, 0.02 + Math.sin(u * 14) * 0.02), left: KNEE_L, look: v(-2, 1.2, 4), nod: 0.08 }),
    },
  ],
};

const WORK: Record<NonNullable<WorldPeopleSpot["trade"]>, Work> = {
  kirana,
  sweets,
  electrical,
  cloth: outside,
  cycle: outside,
  general: outside,
};
