import * as THREE from "three";
import { makeRng } from "../core/rng";
import { townState } from "../core/townState";
import { say } from "../ui/caption";
import { AISLE, SABZIWALI, SELLERS } from "../world/places/mandi";
import { parkOrigin } from "../world/places/park";
import { type Actor, makeActor, v } from "./actor";
import { buildPerson } from "./body";
import { type Role, recipeFor } from "./recipes";
import { type Stroll, walk } from "./stroll";

/**
 * The people of the sabzi mandi (world/places/mandi.ts):
 *
 *   the sellers    nine: the ground sellers on their low crates, sorting the
 *                  heaps, calling out; the thela-walas standing behind their
 *                  carts, weighing on the hand scale, calling. The second
 *                  ground seller is the sabziwali, Mummy's tomatoes
 *                  (activities/errands.ts)
 *   shoppers       three at the stalls, picking over the heaps, haggling;
 *                  two walking up and down the aisle with their cloth bags
 *   the calls      come near a seller and you hear them (captions), every
 *                  so often; come up to a shopper at a stall and the two of
 *                  them haggle, once
 *
 * Their own random numbers. FRAME: the park's (x east, z south).
 */

export type MandiPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** What each kind of seller calls out. */
const CALLS: Record<string, string[]> = {
  potato: ["Aalu-pyaaz, sasta le lo! Bees ka do kilo!", "Naya aalu, naya aalu!"],
  tomato: ["Tamatar, laal-laal tamatar! Bees rupaye kilo!", "Le lo tamatar, ekdum taaza!"],
  bhindi: ["Bhindi taazi hai, abhi tod ke laaye!", "Lauki, baingan, bhindi, le jao!"],
  dhaniya: ["Dhaniya-mirchi, dhaniya-mirchi!", "Hari mirchi, hara dhaniya!"],
  cauliflower: ["Gobhi le lo, phool jaisi gobhi!", "Gobhi, tamatar, aao behenji!"],
  onion: ["Pyaaz le lo, Nashik ka pyaaz!", "Aalu-pyaaz, aao!"],
  brinjal: ["Baingan bharte wale, bade-bade!", "Bhindi, baingan, le lo!"],
};
/** How near you must be to hear a seller, and seconds between calls (among those near). */
const EARSHOT = 7, EVERY = 8;

/** The shoppers standing at stalls (where, which way they face: the thelas are south of the aisle, the ground sellers north), and what they haggle over. */
const AT_STALLS: { at: { x: number; z: number; turn: number }; seller: number; role: Role; haggle: [string, string][] }[] = [
  { at: { x: -10.3, z: -7.5, turn: 0 }, seller: 6, role: "woman", haggle: [
    ["Shopper", "Bhaiya, bhindi kaise di?"], ["Thela-wala", "Tees ki kilo, behenji."], ["Shopper", "Pachees lagao, roz aate hai!"], ["Thela-wala", "Achha chalo… aapke liye."],
  ] },
  { at: { x: -21.3, z: -11.9, turn: Math.PI }, seller: 2, role: "uncle", haggle: [
    ["Shopper", "Baingan dikhao… ye sab daagi hai!"], ["Sabzi-wala", "Arre nahi saab, ekdum taaza hai, chun lo."],
  ] },
  { at: { x: -4.6, z: -7.5, turn: 0 }, seller: 5, role: "woman", haggle: [
    ["Shopper", "Gobhi kitne ki?"], ["Thela-wala", "Pandrah ki ek, do lo to pachees."], ["Shopper", "Thik hai, do de do. Dhaniya daal dena."],
  ] },
];

export function buildMandiPeople(): MandiPeople {
  const rng = makeRng(7811);
  const o = parkOrigin();
  const group = new THREE.Group();
  group.name = "mandiPeople";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  const actors: Actor[] = [];
  const person = (role: Role, dress?: (r: ReturnType<typeof recipeFor>) => void) => {
    const r = recipeFor(role, rng);
    if (role !== "kid") r.build.scale = 1;
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    dress?.(r);
    const p = buildPerson(r);
    group.add(p.root);
    return p;
  };

  // --- the sellers ---------------------------------------------------------------------------------------
  SELLERS.forEach((s, k) => {
    if (s.kind === "ground") {
      // on the low crate, knees up; reaching forward to the heaps now and then
      const sabziwali = k === SABZIWALI;
      const p = person(sabziwali ? "villageWoman" : "man", (r) => {
        if (!sabziwali) {
          r.outfit.top = rng.next() < 0.5 ? "vest" : "halfShirt";
          r.outfit.bottom = rng.next() < 0.6 ? "dhoti" : "pyjama";
        }
      });
      const knees = { r: v(-0.13, 0.48, 0.32), l: v(0.13, 0.48, 0.32) };
      actors.push(makeActor({
        person: p, at: s, seat: 0.28, notice: "greet", phase: k * 1.7,
        actions: [
          { name: "wait", duration: 5, pose: () => ({ right: knees.r, left: knees.l, look: v(0, 1.2, 4) }) },
          // sorting the heap: picking out the soft ones, turning them over
          { name: "sort", duration: 4, pose: (u) => ({ right: v(-0.15 + Math.sin(u * 3) * 0.12, 0.12, 0.75), left: knees.l, look: v(0, 0.05, 0.8), lean: 0.55, nod: 0.3 }) },
          // calling out to the aisle, a hand raised
          { name: "call", duration: 2.5, pose: (u) => ({ right: v(-0.32, 1.05 + Math.sin(u * 6) * 0.05, 0.25), left: knees.l, look: v(-1, 1.3, 4) }) },
        ],
      }));
    } else {
      // standing behind the cart, hands on its rail; weighing on the scale; calling out
      const p = person(rng.next() < 0.5 ? "man" : "uncle", (r) => {
        r.outfit.top = rng.next() < 0.5 ? "halfShirt" : "kurta";
      });
      const rail = (x: number) => v(x, 0.98, 0.55);
      actors.push(makeActor({
        person: p, at: s, notice: "greet", phase: k * 1.3,
        actions: [
          { name: "wait", duration: 5, pose: () => ({ right: rail(-0.2), left: rail(0.2), look: v(0, 1.5, 5) }) },
          // the taraazu: lifting it by its beam, looking at the pans
          { name: "weigh", duration: 3.5, pose: (u) => ({ right: v(0.55, 1.5 + Math.sin(u * 2) * 0.03, 0.55), left: rail(0.0), look: v(0.55, 1.25, 0.6), nod: 0.1 }) },
          { name: "call", duration: 2.5, pose: (u) => ({ right: v(-0.05, 1.5, 0.15), left: v(0.35 + Math.sin(u * 6) * 0.06, 1.2, 0.3), look: v(1, 1.5, 5) }) },
        ],
      }));
    }
  });

  // --- shoppers at the stalls -------------------------------------------------------------------------------
  for (const s of AT_STALLS) {
    const p = person(s.role);
    actors.push(makeActor({
      person: p, at: s.at, notice: "glance", phase: rng.range(0, 6),
      actions: [
        // picking over the heap, then holding one up to look at it, then a word with the seller
        { name: "pick", duration: 4, pose: (u) => ({ right: v(-0.1 + Math.sin(u * 2.5) * 0.1, 0.95, 0.55), left: v(0.18, 0.95, 0.2), look: v(0, 0.9, 0.7), lean: 0.35, nod: 0.3 }) },
        { name: "look", duration: 2.5, pose: () => ({ right: v(-0.12, 1.35, 0.35), left: v(0.18, 0.95, 0.2), look: v(-0.12, 1.35, 0.4) }) },
        { name: "talk", duration: 3, pose: (u) => ({ right: v(-0.25 + Math.sin(u * 5) * 0.05, 1.15, 0.3), left: v(0.18, 0.95, 0.2), look: v(0, 1.45, 2) }) },
      ],
    }));
  }

  // --- two shoppers walking up and down the aisle, bags in hand -------------------------------------------------
  const walkers: Stroll[] = [0, 1].map((k) => {
    const p = person(k ? "woman" : "man", (r) => {
      r.outfit.bag = "jhola";
    });
    const z = AISLE.z + (k ? 0.55 : -0.55);
    const ends = [v(AISLE.x0, 0, z), v(-13, 0, z + (k ? 0.3 : -0.3)), v(AISLE.x1, 0, z)];
    return { person: p, path: k ? ends.reverse() : ends, speed: k ? 0.75 : 0.85, travelled: k * 6, phase: k * 0.4, moving: 0, heading: 0 };
  });
  /** Seconds each stands at the end of the aisle before turning back. */
  const pause = [0, 0];

  // --- the calls, and the haggling ---------------------------------------------------------------------------
  const sellerAt = SELLERS.map((s) => new THREE.Vector3(s.x, 1.4, s.z).applyMatrix4(group.matrixWorld));
  const stallAt = AT_STALLS.map((s) => new THREE.Vector3(s.at.x, 1.4, s.at.z).applyMatrix4(group.matrixWorld));
  let nextCall = 2, called = 0;
  const haggled = AT_STALLS.map(() => false);
  let haggling: { lines: [string, string][]; next: number; wait: number } | null = null;
  const local = new THREE.Vector3();

  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
      const you = group.worldToLocal(local.copy(player));
      walkers.forEach((w, k) => {
        if (pause[k] > 0) {
          pause[k] -= dt;
          return;
        }
        if (walk(w, t, dt, you)) {
          // at the end of the aisle: a look round, then back the other way
          w.path.reverse();
          w.travelled = 0;
          pause[k] = 2 + k * 1.5;
        }
      });

      // (not over anyone talking with you: Mummy's errands)
      if (townState.talking) return;
      // a haggle at a stall, the first time you come up to it
      if (!haggling) {
        const i = stallAt.findIndex((at, k) => !haggled[k] && player.distanceTo(at) < 4);
        if (i >= 0) {
          haggled[i] = true;
          haggling = { lines: AT_STALLS[i].haggle, next: 0, wait: 0 };
        }
      }
      if (haggling) {
        haggling.wait -= dt;
        if (haggling.wait <= 0) {
          if (haggling.next >= haggling.lines.length) haggling = null;
          else {
            const [who, line] = haggling.lines[haggling.next++];
            say(who, line, 2.8);
            haggling.wait = 3.1;
          }
        }
        return;
      }
      // the sellers' calls: the nearest within earshot, every so often
      nextCall -= dt;
      if (nextCall > 0) return;
      let best = -1, bestD = EARSHOT;
      sellerAt.forEach((at, k) => {
        const d = player.distanceTo(at);
        if (d < bestD) { bestD = d; best = k; }
      });
      if (best < 0) return;
      const goods = SELLERS[best].goods[0];
      const lines = CALLS[goods] ?? CALLS.potato;
      const who = best === SABZIWALI ? "Sabziwali" : SELLERS[best].kind === "thela" ? "Thela-wala" : "Sabzi-wala";
      say(who, lines[called++ % lines.length], 3);
      nextCall = EVERY;
    },
  };
}
