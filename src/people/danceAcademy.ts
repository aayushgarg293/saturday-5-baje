import * as THREE from "three";
import { passersby } from "../core/passersby";
import { makeRng } from "../core/rng";
import { timeOfDay } from "../core/timeOfDay";
import { ACADEMY_GATE } from "../world/places/danceAcademy";
import { CRICKET_Z, SCHOOL, schoolZ } from "../world/schoolRoad";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";
import { type Stroll, walk } from "./stroll";

/**
 * Aditi Dance Academy's evening batch going home (world/places/danceAcademy.ts):
 * at half past six, three girls come out of the gate one after another, a
 * cloth bag each (their dance things), and walk off: two together up the
 * road toward the bus stand, one down it and into the cricket lane. Come by
 * much later and they've gone.
 *
 * Their own random numbers. FRAME: a group at the academy's gate, square to
 * the world (x east, z south).
 */

export type DanceAcademyPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** When the batch lets out (game minutes after midnight), and after when they've long gone. */
const LET_OUT = 18 * 60 + 30, LATE = 18 * 60 + 45;

export function buildDanceAcademyPeople(): DanceAcademyPeople {
  const rng = makeRng(7821);
  const gate = ACADEMY_GATE.at, out = ACADEMY_GATE.out;
  const group = new THREE.Group();
  group.name = "danceAcademyPeople";
  group.position.set(gate.x, 0, gate.z);
  group.updateMatrixWorld(true);
  /** A world point (x, z), at height y, in this frame. */
  const here = (x: number, z: number, y = 0) => new THREE.Vector3(x - gate.x, y, z - gate.z);
  /** A point on school road, `s` metres down it, `off` metres east of its middle (− west). */
  const road = (s: number, off: number) => here(SCHOOL.x + off, schoolZ(s));
  const gateS = gate.z - schoolZ(0); // (how far down school road the academy is)

  // each: which way home, where on the road, how long after the batch lets out she comes down the stairs
  const plan: { way: "north" | "south"; off: number; lane?: number; delay: number; suit: [number, number, number] }[] = [
    { way: "north", off: -1.2, delay: 0, suit: [0x3f8a8a, 0xf4f2ec, 0xf2c8d8] },
    { way: "north", off: -1.9, delay: 1.6, suit: [0xd86a8a, 0x3a3f6a, 0xf4f2ec] },
    { way: "south", off: 1.7, lane: 0.4, delay: 5, suit: [0xe8b83a, 0x8a2d3b, 0x8a2d3b] },
  ];
  const girls = plan.map((g, k) => {
    const r = recipeFor("woman", rng);
    r.build.scale = rng.range(0.84, 0.92);
    r.face.age = 0.02;
    r.face.noseRing = false;
    r.hair = k === 1 ? "bun" : "braid";
    r.outfit = { top: "kameez", topColour: g.suit[0], bottom: "salwar", bottomColour: g.suit[1], dupatta: g.suit[2], bangles: 0xd8b04a, bag: "jhola", feet: "chappals" };
    const person = buildPerson(r);
    person.root.visible = false;
    group.add(person.root);
    // out of the gate (on the step), down onto the road's edge, then home
    const step = here(gate.x, gate.z, gate.y);
    const kerb = here(gate.x + out.x * 1.6, gate.z + out.z * 1.6);
    const way = g.way === "north"
      ? [road(gateS - 5, g.off), road(4, g.off), road(-9, g.off)]
      : [road(gateS + 5, g.off), road(SCHOOL.lane.s0 - 4, g.off), road(SCHOOL.lane.s0 + 2, -1.2 + (g.lane ?? 0) * 0.3),
        here(SCHOOL.x - SCHOOL.setback - 1, CRICKET_Z + (g.lane ?? 0)), here(SCHOOL.x - 40, CRICKET_Z + (g.lane ?? 0))];
    const stroll: Stroll = { person, path: [step, kerb, ...way], speed: rng.range(0.95, 1.1), travelled: 0, phase: rng.next(), moving: 0, heading: Math.atan2(out.x, out.z), swing: true };
    return { stroll, delay: g.delay, started: false };
  });

  let letOutAt: number | null = null, gone = false;
  // (the town's traffic stops for them: core/passersby.ts)
  passersby.register(() => girls.filter((g) => g.started && g.stroll.person.root.visible).map((g) => g.stroll.person.root.getWorldPosition(new THREE.Vector3())));

  const local = new THREE.Vector3();
  return {
    group,
    update(t, dt, player) {
      const minutes = timeOfDay.minutes;
      if (letOutAt === null && minutes >= LET_OUT) {
        letOutAt = t;
        gone = minutes > LATE; // (come much later: they've long gone)
      }
      if (letOutAt === null || gone) return;
      const you = group.worldToLocal(local.copy(player));
      for (const g of girls) {
        if (!g.started && t - letOutAt >= g.delay) {
          g.started = true;
          g.stroll.person.root.visible = true;
        }
        if (!g.started || !g.stroll.person.root.visible) continue;
        // at the end of her way, she's gone once you're not near enough to see her go
        if (walk(g.stroll, t, dt, you) && g.stroll.person.root.position.distanceTo(you) > 30) g.stroll.person.root.visible = false;
      }
    },
  };
}
