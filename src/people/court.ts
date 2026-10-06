import * as THREE from "three";
import { makeRng } from "../core/rng";
import { CLIENT, TYPIST_TABLES } from "../world/places/court";
import { COURT, COURT_ROAD } from "../world/town";
import { type Action, makeActor, seenFrom, track, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * The people outside the court (world/places/court.ts), on the footpath
 * under the neem tree:
 *
 *   the typists       three, each on his stool at his table: pecking at the
 *                     keys with two fingers, the left hand flinging the
 *                     carriage back at the end of a line, stopping to read
 *                     what he's typed, looking up at the road
 *   the stamp vendor  at the last table, by his tin box: waiting, counting
 *                     out stamp papers, watching the road
 *   a client          standing at the middle typist's table, hands behind
 *                     his back, watching his affidavit being typed
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * court's (world/places/court.ts): x along court road, +z toward the road;
 * everyone at a table faces the road.
 */

export type CourtPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

const SEAT = 0.5;
/** In a typist's own frame: the keys, the sheet in the machine, the carriage lever; the road. */
const KEYS = v(0, 0.92, 0.42), SHEET = v(0, 1.06, 0.6), LEVER = v(-0.3, 0.97, 0.58), ROAD = v(0.5, 1.3, 4);

export function buildCourtPeople(): CourtPeople {
  const rng = makeRng(7321);
  const mid = COURT_ROAD.pointAt((COURT.s0 + COURT.s1) / 2, 0);
  const group = new THREE.Group();
  group.name = "courtPeople";
  group.position.set(mid.x, 0, mid.z);
  group.updateMatrixWorld(true);
  const actors: ReturnType<typeof makeActor>[] = [];

  const person = (role: "man" | "uncle" | "shopkeeper") => {
    const r = recipeFor(role, rng);
    r.build.scale = 1;
    if (r.outfit.top === "kurta") r.outfit.top = "halfShirt"; // (seated: a kurta's tails would hang through the stool)
    r.outfit.jacket = undefined;
    const p = buildPerson(r);
    group.add(p.root);
    return p;
  };

  // the typists: two fingers on the keys, a fling of the carriage at each line's end
  const peck = (u: number, every: number) => Math.max(0, Math.sin((u / every) * Math.PI * 2)) ** 6 * 0.035;
  const typing = (speed: number): Action[] => [
    {
      name: "type", duration: 6 / speed,
      pose: (u) => ({
        right: KEYS.clone().add(v(-0.07 + Math.sin(u * 1.7) * 0.04, peck(u, 0.32 / speed), 0)),
        left: KEYS.clone().add(v(0.07 + Math.sin(u * 1.3) * 0.03, peck(u + 0.15, 0.36 / speed), 0)),
        look: KEYS.clone().lerp(SHEET, 0.6), lean: 0.3, nod: 0.15,
      }),
    },
    {
      name: "return", duration: 1.1,
      pose: (u) => ({
        right: KEYS.clone().add(v(-0.07, 0.02, 0)),
        left: track(u, [0, 0.35, 0.7, 1.1], [KEYS.clone().add(v(0.07, 0, 0)), LEVER, LEVER.clone().add(v(0.32, 0, 0)), KEYS.clone().add(v(0.07, 0, 0))]),
        look: SHEET, lean: 0.2,
      }),
    },
    { name: "type", duration: 5 / speed, pose: (u) => ({ right: KEYS.clone().add(v(-0.06, peck(u, 0.3 / speed), 0)), left: KEYS.clone().add(v(0.08, peck(u + 0.11, 0.34 / speed), 0)), look: SHEET, lean: 0.3, nod: 0.15 }) },
    { name: "read", duration: 3, pose: () => ({ right: v(-0.15, 0.8, 0.35), left: v(0.15, 0.8, 0.35), look: SHEET, lean: 0.05, nod: 0.05 }) },
    { name: "road", duration: 2.5, pose: () => ({ right: v(-0.15, 0.8, 0.35), left: v(0.15, 0.8, 0.35), look: ROAD, lean: -0.05 }) },
  ];

  TYPIST_TABLES.forEach(({ x, z }, k) => {
    const vendor = k === TYPIST_TABLES.length - 1;
    const p = person(vendor ? "uncle" : k === 1 ? "shopkeeper" : "man");
    const at = { x, z, turn: 0 };
    const actions: Action[] = vendor
      ? [
        { name: "wait", duration: 6, pose: () => ({ right: v(-0.2, 0.86, 0.42), left: v(0.05, 0.86, 0.45), look: ROAD, lean: 0.05 }) },
        { name: "count", duration: 4, pose: (u) => ({ right: v(0.22 + Math.sin(u * 6) * 0.03, 0.82, 0.45), left: v(0.3, 0.8, 0.42), look: v(0.28, 0.76, 0.45), lean: 0.3, nod: 0.25 }) },
        { name: "road", duration: 4, pose: () => ({ right: v(-0.15, 0.8, 0.35), left: v(0.15, 0.8, 0.35), look: ROAD.clone().setX(-3) }) },
      ]
      : typing(k === 1 ? 1.3 : 1);
    actors.push(makeActor({ person: p, at, seat: SEAT, actions, notice: "glance", phase: rng.range(0, 8) }));
  });

  // the client at the middle typist's table, watching his affidavit come off the machine
  {
    const p = person("man");
    const at = CLIENT;
    const desk = TYPIST_TABLES[1];
    const sheet = seenFrom(at, desk.x, 1.05, desk.z + 0.6);
    actors.push(makeActor({
      person: p, at, notice: "glance", phase: 3,
      actions: [
        { name: "watch", duration: 7, pose: () => ({ right: v(-0.08, 0.95, -0.14), left: v(0.08, 0.95, -0.14), look: sheet, lean: 0.15, nod: 0.1 }) },
        { name: "road", duration: 3, pose: () => ({ right: v(-0.08, 0.95, -0.14), left: v(0.08, 0.95, -0.14), look: v(-3, 1.4, 2) }) },
      ],
    }));
  }

  return {
    group,
    update(t, dt, player) {
      for (const a of actors) a.update(t, dt, player);
    },
  };
}
