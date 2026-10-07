import * as THREE from "three";
import { makeRng } from "../core/rng";
import { townState } from "../core/townState";
import { say } from "../ui/caption";
import { BANANA_CART, BAYS, BENCH, CONDUCTOR, SHED } from "../world/places/busStand";
import { BUS_STAND, inBusStand } from "../world/town";
import { makeActor, seenFrom, track, v } from "./actor";
import { buildPerson } from "./body";
import { newspaper } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * The people at the bus stand (world/places/busStand.ts):
 *
 *   the conductor   in khaki, a leather bag across him, by the Jaipur bus's
 *                   door: calling out where it's going, waving people on,
 *                   counting his tickets. Come near and you hear him.
 *   on the benches  under the shed: a man reading the paper, an old man
 *                   dozing, a woman and her little boy
 *   standing        a man with his tin trunk, eyeing the buses
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * yard's (world/places/busStand.ts): +x east, +z south, its middle at the
 * origin.
 */

export type BusStandPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** What the conductor shouts (one at a time, every so often, while you're near enough to hear). */
const CALLS = [
  "Jaipur! Jaipur! Kishangarh, Jaipur!",
  "Chalo chalo, das minute mein nikal rahi hai!",
  "Jaipur wale aa jao! Seat khaali hai!",
  "Aage badho bhai, peeche bahut jagah hai!",
];
/**
 * Once the 6:30 from Jaipur is in (world/busArrival.ts), he calls that too: straight away as it parks,
 * then every other call. Louder (he's shouting across the yard to its bay): heard from further off.
 */
const ARRIVED_CALLS = [
  "Jaipur se aayi! Saadhe chhe wali Jaipur se aa gayi!",
  "Jaipur ka saamaan, parcel, idhar se lo!",
];
/** The banana-wala's calls (near his cart), how near you must be, and seconds between. */
const BANANA_CALLS = ["Kele le lo, kele! Darjan bees rupaye!", "Meethe kele, elaichi wale! Le lo!", "Aao bhai, kele!"];
const BANANA_EARSHOT = 7, BANANA_EVERY = 13;
/** How near you must be to hear him (metres), and seconds between calls. */
const EARSHOT = 13, EVERY = 9, ARRIVED_EARSHOT = 24;

export function buildBusStandPeople(): BusStandPeople {
  const rng = makeRng(7421);
  const mid = inBusStand(BUS_STAND.depth / 2, 0);
  const group = new THREE.Group();
  group.name = "busStandPeople";
  group.position.set(mid.x, 0, mid.z);
  group.updateMatrixWorld(true);
  const actors: ReturnType<typeof makeActor>[] = [];
  const person = (role: Role, seated: boolean, dress?: (o: ReturnType<typeof recipeFor>["outfit"]) => void) => {
    const r = recipeFor(role, rng);
    if (role !== "kid") r.build.scale = 1;
    if (seated && r.outfit.top === "kurta") r.outfit.top = "halfShirt"; // (a kurta's tails would hang through the bench)
    if (seated) r.outfit.jacket = undefined;
    dress?.(r.outfit);
    const p = buildPerson(r);
    group.add(p.root);
    return p;
  };

  // --- the conductor ------------------------------------------------------------------------------
  {
    const p = person("man", false, (o) => {
      o.top = "halfShirt";
      o.topColour = 0xb8a26a; // khaki
      o.bottom = "trousers";
      o.bottomColour = 0x8a7a50;
      o.bag = "jhola"; // (his leather cash bag)
      o.safa = undefined;
    });
    const at = CONDUCTOR;
    const door = seenFrom(at, BAYS[0].x - 1.3, 1.6, BAYS[0].z - 4);
    const mouth = v(-0.05, 1.5, 0.14);
    actors.push(makeActor({
      person: p, at, notice: "glance", phase: 0,
      actions: [
        // a hand cupped at his mouth, calling; the other waving toward the door
        { name: "call", duration: 3, pose: (u) => ({ right: mouth, left: v(0.3 + Math.sin(u * 6) * 0.08, 1.25, 0.15), look: v(0, 1.5, 5), lean: -0.05 }) },
        { name: "wave", duration: 2.5, pose: (u) => ({ right: v(-0.35, 1.3 + Math.sin(u * 7) * 0.1, 0.2), left: v(0.15, 0.95, 0.05), look: v(-2, 1.5, 4) }) },
        { name: "tickets", duration: 4, pose: (u) => ({ right: v(-0.05 + Math.sin(u * 5) * 0.03, 1.02, 0.28), left: v(0.06, 1.0, 0.28), look: v(0, 0.95, 0.35), nod: 0.25 }) },
        { name: "door", duration: 2.5, pose: () => ({ right: v(-0.2, 0.95, 0.0), left: v(0.2, 0.95, 0.0), look: door }) },
      ],
    }));
  }

  // --- the banana-wala, behind his cart (his own random numbers: the others' stay as they were) ---------
  // (on the cart's long side away from the yard, facing into it: north)
  const bananaAt = { x: BANANA_CART.x, z: BANANA_CART.z + BANANA_CART.width / 2 + 0.5, turn: Math.PI };
  {
    const own = makeRng(7431);
    const r = recipeFor("man", own);
    r.build.scale = 1;
    r.outfit.top = "vest";
    r.outfit.topColour = 0xe8e2d2;
    r.outfit.bottom = "dhoti";
    r.outfit.bottomColour = 0xe0d8c4;
    r.outfit.gamchha = true;
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    const p = buildPerson(r);
    group.add(p.root);
    // (his own frame: the cart is in front of him, its top at 0.9 m)
    const onCart = (x: number) => v(x, 0.95, 0.5);
    actors.push(makeActor({
      person: p, at: bananaAt, notice: "greet", phase: 1.5,
      actions: [
        { name: "wait", duration: 6, pose: () => ({ right: onCart(-0.2), left: onCart(0.25), look: v(0, 1.5, 5) }) },
        // shooing the flies off the bananas, with a cloth
        { name: "shoo", duration: 2.5, pose: (u) => ({ right: v(-0.2 + Math.sin(u * 9) * 0.2, 1.05, 0.55), left: onCart(0.25), look: v(0, 0.95, 0.6), nod: 0.2 }) },
        // turning a bunch over, to show its good side
        { name: "arrange", duration: 3.5, pose: (u) => ({ right: v(-0.1, 1.0, 0.55 + Math.sin(u * 2) * 0.05), left: v(0.15, 1.0, 0.55), look: v(0, 0.95, 0.55), lean: 0.2, nod: 0.25 }) },
      ],
    }));
  }

  // --- on the benches ------------------------------------------------------------------------------
  const benchSeat = (k: number) => ({ x: SHED.x0 + 1 + k * 1.15, z: BENCH.z - 0.35, turn: 0 });
  const knees = { r: v(-0.13, 0.6, 0.35), l: v(0.13, 0.6, 0.35) };
  // a man with the paper
  const paper = newspaper();
  group.add(paper);
  const reader = makeActor({
    person: person("uncle", true), at: benchSeat(1), seat: BENCH.seat, notice: "glance", phase: 2,
    actions: [
      { name: "read", duration: 9, pose: () => ({ right: v(-0.2, 1.0, 0.38), left: v(0.2, 1.0, 0.38), look: v(0, 0.95, 0.42), nod: 0.15 }) },
      { name: "look", duration: 3, pose: () => ({ right: knees.r, left: knees.l, look: v(1, 1.4, 6) }) },
    ],
  });
  actors.push(reader);
  // an old man dozing
  actors.push(makeActor({
    person: person("uncle", true), at: benchSeat(4), seat: BENCH.seat, notice: "none", phase: 5,
    actions: [{ name: "doze", duration: 12, pose: (u) => ({ right: knees.r, left: knees.l, look: v(0, 0.9, 1.2), nod: 0.45 + Math.sin(u * 0.8) * 0.03, closed: true }) }],
  }));
  // a woman waiting, her hands folded in her lap, and her boy beside her, swinging his legs
  actors.push(makeActor({
    person: person("villageWoman", true), at: benchSeat(8.35), seat: BENCH.seat, notice: "glance", phase: 1, // (seat 7 fell in the gap between two benches)
    actions: [
      { name: "wait", duration: 7, pose: () => ({ right: v(-0.08, 0.66, 0.32), left: v(0.08, 0.66, 0.32), look: seenFrom(benchSeat(8.35), BAYS[1].x, 1.6, BAYS[1].z) }) },
      { name: "boy", duration: 3, pose: () => ({ right: v(-0.08, 0.66, 0.32), left: v(0.3, 0.75, 0.05), look: v(0.8, 0.8, 0.2), smile: true }) },
    ],
  }));
  actors.push(makeActor({
    person: person("kid", true), at: benchSeat(9.15), seat: BENCH.seat * 0.9, notice: "none", phase: 2,
    actions: [{ name: "swing", duration: 6, pose: (u) => ({ right: v(-0.1, 0.5, 0.25), left: v(0.1, 0.5, 0.25), look: track(u, [0, 3, 6], [v(0, 1, 3), v(-2, 1.2, 2), v(0, 1, 3)]) }) }],
  }));

  // --- standing: a man with his tin trunk, eyeing the buses -------------------------------------------
  const trunkAt = { x: BAYS[1].x + 2.6, z: BAYS[1].z + 6.2, turn: Math.PI + 0.3 };
  actors.push(makeActor({
    person: person("man", false), at: trunkAt, notice: "glance", phase: 4,
    actions: [
      { name: "eye", duration: 6, pose: () => ({ right: v(-0.2, 0.86, 0.05), left: v(0.21, 0.95, 0.03), look: seenFrom(trunkAt, BAYS[1].x, 2.8, BAYS[1].z - 5.3) }) },
      { name: "watch", duration: 4, pose: () => ({ right: v(-0.2, 0.86, 0.05), left: v(0.21, 0.95, 0.03), look: seenFrom(trunkAt, BAYS[0].x, 1.6, BAYS[0].z) }) },
    ],
  }));

  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const conductorWorld = new THREE.Vector3(CONDUCTOR.x, 1.5, CONDUCTOR.z).applyMatrix4(group.matrixWorld);
  let nextCall = 3, called = 0, arrivedCalled = 0, busWasIn = false;
  const bananaWorld = new THREE.Vector3(bananaAt.x, 1.5, bananaAt.z).applyMatrix4(group.matrixWorld);
  let nextBanana = 4, bananaCalled = 0;
  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
      // the paper, between the reader's hands (down on his lap when he looks up)
      reader.grip("R", _a);
      reader.grip("L", _b);
      paper.position.addVectors(_a, _b).multiplyScalar(0.5);
      paper.rotation.set(reader.now.name === "read" ? -0.4 : -1.5, 0, 0);
      // the conductor's calls, while you're near enough to hear
      // the banana-wala calling, when you're by his cart (not over anyone talking with you)
      nextBanana -= dt;
      if (nextBanana <= 0 && !townState.talking && player.distanceTo(bananaWorld) < BANANA_EARSHOT) {
        say("Banana-wala", BANANA_CALLS[bananaCalled++ % BANANA_CALLS.length], 3);
        nextBanana = BANANA_EVERY;
      }
      // (the bus just in: his next call is about it, now)
      if (townState.jaipurBusIn && !busWasIn) {
        busWasIn = true;
        nextCall = 0;
      }
      nextCall -= dt;
      // (not while he's talking with you about the bus or the parcel: activities/errands.ts)
      if (townState.talking) nextCall = Math.max(nextCall, 4);
      if (nextCall <= 0) {
        const near = player.distanceTo(conductorWorld);
        // (by the Jaipur bus, out of earshot of his ordinary calls: you hear only the shouted Jaipur ones)
        const jaipurTurn = townState.jaipurBusIn && (arrivedCalled === 0 || called % 2 === 1 || near >= EARSHOT);
        if (jaipurTurn && near < ARRIVED_EARSHOT) {
          say("Conductor", ARRIVED_CALLS[arrivedCalled++ % ARRIVED_CALLS.length], 3);
          called++;
          nextCall = EVERY;
        } else if (near < EARSHOT) {
          say("Conductor", CALLS[called++ % CALLS.length], 3);
          nextCall = EVERY;
        }
      }
    },
  };
}
