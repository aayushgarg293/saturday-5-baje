import * as THREE from "three";
import { makeRng } from "../core/rng";
import { storySoFar } from "../core/storySoFar";
import { timeOfDay } from "../core/timeOfDay";
import { toon } from "../render/toon";
import { say } from "../ui/caption";
import { Parts } from "../world/kit";
import { TUITION_CYCLES, TUITION_DOOR, tuitionOrigin } from "../world/places/tuition";
import { buildVehicle } from "../world/props/vehicles";
import { CRICKET_Z, SCHOOL, schoolZ } from "../world/schoolRoad";
import { makeActor, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";
import { type Stroll, walk } from "./stroll";

/**
 * The evening at Sharma Tutorials (world/places/tuition.ts), across school
 * road from the school:
 *
 *   six o'clock  the 4–6 batch lets out: six kids come out of the door one
 *                after another, bags on their backs; four wheel their cycles
 *                off the stands, and they all go, up the road to the bus
 *                stand or down it and into the cricket lane
 *   the kulfi    the kulfi-wala's cart outside, his matka wrapped in red
 *                cloth
 *   Priya        from 6:05 (she's said bye on Yaaho! at six: desktop/story.ts),
 *                with her friend Neha at the kulfi cart, a kulfi each,
 *                chatting. Come near and they talk to you: a few lines on
 *                their own (an automatic conversation), and what Priya says
 *                remembers how your chat went (core/storySoFar.ts). Then
 *                they go home, down the road and into the lane. Gone by 7:45.
 *
 * Their own random numbers (the street's people don't change). FRAME: the
 * tuition's (square to the world, x east, z south), its origin on school
 * road's west front line at the tuition's middle.
 */

export type TuitionPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** When things happen (game minutes after midnight). */
const LET_OUT = 18 * 60, LATE = 18 * 60 + 45, PRIYA_FROM = 18 * 60 + 5, PRIYA_UNTIL = 19 * 60 + 45;
/** How near you must come for Priya to notice you (metres). */
const NEAR = 4.5;

// --- the conversation -----------------------------------------------------------------------------

type Line = { who: string; says: string };
/** What Priya says when you meet, depending on how the chat went. */
function conversation(): Line[] {
  const middle: Line[] = storySoFar.isDone("songSent")
    ? [
      { who: "Priya", says: "Aur thanks… gaana mil gaya! Repeat pe sun rahi thi." },
      { who: "You", says: "Koi baat nahi." },
    ]
    : storySoFar.isDone("priyaGone")
      ? [
        { who: "Priya", says: "Wo train wala gaana… pen drive me laa doge Monday ko?" },
        { who: "You", says: "Haan, pakka." },
      ]
      : storySoFar.isDone("songMoment")
        ? [
          { who: "Priya", says: "Tum achanak offline ho gaye the!" },
          { who: "You", says: "Cafe ka ghanta khatam ho gaya tha…" },
          { who: "Priya", says: "Lol. Theek hai." },
        ]
        : [
          { who: "Priya", says: "Aaj Yaaho pe nahi aaye? Main 6 baje tak online thi." },
          { who: "You", says: "Arre… agle Saturday pakka." },
        ];
  return [
    { who: "Neha", says: "Priya… dekh, wo aa raha hai. Hehe." },
    { who: "Priya", says: "Arre… hi!" },
    { who: "You", says: "Hi! Tum yahan?" },
    { who: "Priya", says: "Kulfi khane aaye the. Ghar paas hi hai." },
    ...middle,
    { who: "Neha", says: "Chal Priya, late ho raha hai, mummy daantegi!" },
    { who: "Priya", says: "Haan haan… bye! Monday ko tuition me milte hai." },
    { who: "You", says: "Bye!" },
  ];
}
/** Seconds a line stays up: longer lines longer. */
const lineSeconds = (l: Line) => 1.8 + l.says.length * 0.045;

function propMesh(p: Parts, name: string) {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  m.name = name;
  m.castShadow = true;
  return m;
}

export function buildTuitionPeople(): TuitionPeople {
  const rng = makeRng(7771);
  const o = tuitionOrigin();
  const group = new THREE.Group();
  group.name = "tuitionPeople";
  group.position.set(o.x, 0, o.z);
  group.updateMatrixWorld(true);
  /** A world point (x, z) in this frame. */
  const here = (x: number, z: number) => v(x - o.x, 0, z - o.z);
  /** A point on school road, `s` metres down it, `off` metres east of its middle (− west). */
  const road = (s: number, off: number) => here(SCHOOL.x + off, schoolZ(s));
  const tuitionS = (SCHOOL.tuition.s0 + SCHOOL.tuition.s1) / 2;

  // --- the kids of the 4–6 batch ------------------------------------------------------------------------------
  const teen = (girl: boolean) => {
    const r = recipeFor(girl ? "woman" : "youngMan", rng);
    r.build.scale = rng.range(0.84, 0.9);
    r.face.age = 0.02;
    r.outfit.bag = "school";
    r.outfit.jacket = undefined;
    if (girl) {
      r.outfit.top = "kameez";
      r.outfit.bottom = "salwar";
      r.outfit.odhni = undefined;
      r.outfit.trim = undefined;
      r.outfit.dupatta = rng.pick([0xf4f2ec, 0xf2c8d8, 0xc8d8f0]);
      r.hair = "braid";
      r.face.noseRing = false;
    } else {
      r.outfit.top = rng.pick(["shirt", "tshirt"] as const);
      r.outfit.bottom = "trousers";
    }
    const p = buildPerson(r);
    group.add(p.root);
    p.root.visible = false;
    return p;
  };
  const door = here(o.x + TUITION_DOOR.x, o.z + TUITION_DOOR.z);
  const step = here(o.x + 1.0, o.z);
  // up the road to the bus stand; down it and west into the cricket lane
  const north = [road(tuitionS - 8, -1.6), road(4, -1.6), road(-10, -1.6)];
  // (going south they cross to the road's middle first: the kulfi cart stands on its west side)
  const south = [road(tuitionS + 4, 0.8), road(SCHOOL.lane.s0 - 4, 0.8), road(SCHOOL.lane.s0 + 2, -1.4), here(SCHOOL.x - SCHOOL.setback - 1, CRICKET_Z), here(SCHOOL.x - 40, CRICKET_Z)];
  type Kid = { stroll: Stroll; delay: number; started: boolean };
  // the kids' cycles, on their stands at the road's edge (moved here from the tuition's building: they leave)
  const cycles = TUITION_CYCLES.map((c) => {
    const bike = buildVehicle("bicycle", rng);
    const mesh = propMesh(bike.parts, "tuitionCycle");
    mesh.position.set(c.x, 0, c.z);
    mesh.rotation.y = rng.range(-0.15, 0.15);
    group.add(mesh);
    const g = bike.ride!.grip;
    return { mesh, grip: v(g.x, g.y, -g.z) };
  });
  const plan: { girl: boolean; cycle?: number; way: "north" | "south"; delay: number }[] = [
    { girl: false, cycle: 0, way: "north", delay: 0 },
    { girl: true, way: "south", delay: 2.5 },
    { girl: true, cycle: 2, way: "south", delay: 3.5 },
    { girl: false, cycle: 3, way: "north", delay: 6 },
    { girl: false, way: "south", delay: 7.5 },
    { girl: false, cycle: 5, way: "north", delay: 9.5 },
  ];
  const kids: Kid[] = plan.map((k) => {
    const person = teen(k.girl);
    const path = [door.clone(), step.clone()];
    let cycle: (typeof cycles)[number] | undefined;
    if (k.cycle !== undefined) {
      // over to their cycle (standing on its left), then off with it
      const c = TUITION_CYCLES[k.cycle];
      path.push(v(c.x - 0.7, 0, c.z));
      cycle = cycles[k.cycle];
    }
    path.push(...(k.way === "north" ? north : south).map((p) => p.clone()));
    return {
      stroll: { person, path, speed: rng.range(1.0, 1.25), travelled: 0, phase: rng.next(), moving: 0, heading: Math.PI / 2, cycle: cycle?.mesh, grip: cycle?.grip },
      delay: k.delay, started: false,
    };
  });
  let letOutAt: number | null = null;
  let batchGone = false;

  // --- the kulfi-wala and his cart ---------------------------------------------------------------------------------
  const cartAt = road(tuitionS + 8.5, -1.5);
  const cart = new Parts();
  cart.box(0.8, 0.08, 1.4, 0, 0.8, 0, 0x8a6a44);
  for (const dz of [-0.55, 0.55]) cart.cylinder(0.3, 0.3, 0.05, 0, 0.3, dz, 0x2a2622, { rx: Math.PI / 2, segments: 12 });
  cart.add(new THREE.SphereGeometry(0.32, 12, 9).scale(1, 0.95, 1), 0, 1.14, -0.2, 0xc62f2a); // the matka, wrapped in red cloth
  cart.cylinder(0.14, 0.18, 0.12, 0, 1.47, -0.2, 0xb8322a, { segments: 10 });
  cart.cylinder(0.04, 0.05, 0.08, 0.25, 0.88, 0.45, 0xd8b04a, { segments: 8 }); // his brass bell
  for (let k = 0; k < 5; k++) cart.box(0.12, 0.02, 0.12, -0.2 + (k % 3) * 0.12, 0.85, 0.35 + Math.floor(k / 3) * 0.14, 0x8a9a6a); // leaf plates
  const cartMesh = propMesh(cart, "kulfiCart");
  cartMesh.position.copy(cartAt);
  group.add(cartMesh);
  const kulfiwala = makeActor({
    person: (() => {
      const r = recipeFor("man", rng);
      r.build.scale = 1;
      r.outfit = { top: "vest", topColour: 0xe8e2d4, bottom: "dhoti", bottomColour: 0xd8cbb0, gamchha: true, feet: "chappals" };
      const p = buildPerson(r);
      group.add(p.root);
      return p;
    })(),
    at: { x: cartAt.x + 0.85, z: cartAt.z, turn: -Math.PI / 2 }, notice: "greet", phase: 1,
    actions: [
      { name: "wait", duration: 6, pose: () => ({ right: v(-0.2, 0.92, 0.35), left: v(0.2, 0.92, 0.35), look: v(0, 1.4, 4) }) },
      { name: "bell", duration: 2, pose: (u) => ({ right: v(-0.05 + Math.sin(u * 14) * 0.03, 0.95, 0.75), left: v(0.2, 0.92, 0.35), look: v(-1, 1.4, 4) }) },
      { name: "matka", duration: 4, pose: () => ({ right: v(-0.05, 1.18, 0.65), left: v(0.15, 1.2, 0.6), look: v(0, 1.0, 0.8), lean: 0.2 }) },
    ],
  });

  // --- Priya and Neha, at the kulfi cart --------------------------------------------------------------------------
  const girl = (dress: { kameez: number; salwar: number; dupatta: number }) => {
    const r = recipeFor("woman", rng);
    r.build.scale = 0.9;
    r.face.age = 0.02;
    r.face.noseRing = false;
    r.hair = "braid";
    r.outfit = { top: "kameez", topColour: dress.kameez, bottom: "salwar", bottomColour: dress.salwar, dupatta: dress.dupatta, bangles: 0xd8b04a, feet: "chappals" };
    const p = buildPerson(r);
    group.add(p.root);
    p.root.visible = false;
    return p;
  };
  const priya = girl({ kameez: 0xf2b8c6, salwar: 0xf4f2ec, dupatta: 0xf4f2ec });
  const neha = girl({ kameez: 0xe8c040, salwar: 0x3f5a8a, dupatta: 0x3f5a8a });
  const priyaAt = { x: cartAt.x - 1.1, z: cartAt.z - 0.55, turn: Math.PI / 4 };
  const nehaAt = { x: cartAt.x - 1.15, z: cartAt.z + 0.75, turn: (3 * Math.PI) / 4 };
  const kulfi = () => {
    const p = new Parts();
    p.cylinder(0.006, 0.006, 0.12, 0, -0.06, 0, 0xd8c8a0, { segments: 4 });
    p.add(new THREE.ConeGeometry(0.03, 0.11, 8).rotateX(Math.PI), 0, 0.06, 0, 0xf2e4c0);
    return propMesh(p, "kulfi");
  };
  const kulfis = [kulfi(), kulfi()];
  for (const k of kulfis) { k.visible = false; group.add(k); }
  const eat = (u: number) => ({ right: u % 4 < 1.4 ? v(-0.04, 1.33, 0.14) : v(-0.18, 1.0, 0.25), left: v(0.12, 0.85, 0.12), look: v(0.6, 1.3, 1.2), nod: u % 4 < 1.4 ? -0.05 : 0 });
  const chat = (u: number) => ({ right: v(-0.18, 1.0, 0.25), left: v(0.2 + Math.sin(u * 3) * 0.05, 1.0, 0.25), look: v(0.9, 1.35, 0.9), smile: u > 2 });
  const priyaActor = makeActor({
    person: priya, at: priyaAt, notice: "glance", phase: 0,
    actions: [{ name: "eat", duration: 6, pose: eat }, { name: "chat", duration: 5, pose: chat }, { name: "listen", duration: 4, pose: (u) => ({ ...eat(u + 2), smile: true }) }],
  });
  const nehaActor = makeActor({
    person: neha, at: nehaAt, notice: "glance", phase: 3,
    actions: [{ name: "chat", duration: 5, pose: (u) => ({ ...chat(u), look: v(-0.9, 1.35, 0.9) }) }, { name: "eat", duration: 6, pose: (u) => ({ ...eat(u), look: v(-0.6, 1.3, 1.2) }) }],
  });
  const wave = { name: "wave", duration: 2.2, pose: (u: number) => ({ right: v(-0.32, 1.55 + Math.sin(u * 9) * 0.06, 0.2), left: v(0.12, 0.85, 0.12), look: v(0, 1.5, 3), smile: true }) };
  type GirlsState = "away" | "kulfi" | "talking" | "leaving" | "gone";
  let girls: GirlsState = "away";
  let lines: Line[] = [], lineAt = 0, lineIndex = 0, leaveIn = 0;
  let strolls: Stroll[] = [];
  const homeward = (from: THREE.Vector3, lane: number) => [from.clone(), road(SCHOOL.lane.s0 + 1, lane), here(SCHOOL.x - SCHOOL.setback - 1, CRICKET_Z + lane * 0.3), here(SCHOOL.x - 45, CRICKET_Z + lane * 0.3)];
  const _local = new THREE.Vector3();

  return {
    group,
    update(t, dt, player) {
      const minutes = timeOfDay.minutes;
      kulfiwala.update(t, dt, player);
      const you = group.worldToLocal(_local.copy(player));

      // --- the batch lets out -------------------------------------------------------------------------------
      if (letOutAt === null && minutes >= LET_OUT) {
        // (come much later and they've long gone: their cycles with them)
        if (minutes > LATE) {
          batchGone = true;
          for (const k of kids) if (k.stroll.cycle) k.stroll.cycle.visible = false;
        }
        letOutAt = t;
      }
      if (letOutAt !== null && !batchGone) {
        for (const k of kids) {
          if (!k.started && t - letOutAt >= k.delay) {
            k.started = true;
            k.stroll.person.root.visible = true;
          }
          if (!k.started) continue;
          const end = walk(k.stroll, t, dt, player);
          // at the end of their way, they're gone once you're not near enough to see them go
          if (end && k.stroll.person.root.position.distanceTo(you) > 30) {
            k.stroll.person.root.visible = false;
            if (k.stroll.cycle) k.stroll.cycle.visible = false;
          }
        }
      }

      // --- Priya and Neha --------------------------------------------------------------------------------------
      if (girls === "away" && minutes >= PRIYA_FROM) {
        girls = minutes < PRIYA_UNTIL ? "kulfi" : "gone";
        if (girls === "kulfi") {
          priya.root.visible = neha.root.visible = true;
          for (const k of kulfis) k.visible = true;
        }
      }
      if (girls === "kulfi" || girls === "talking") {
        priyaActor.update(t, dt, player);
        nehaActor.update(t, dt, player);
        priyaActor.grip("R", kulfis[0].position);
        nehaActor.grip("R", kulfis[1].position);
        if (girls === "kulfi") {
          if (you.distanceTo(priya.root.position) < NEAR) {
            girls = "talking";
            lines = conversation();
            lineIndex = -1;
            lineAt = t;
          } else if (minutes >= PRIYA_UNTIL) leaveIn = 0.01;
        } else {
          // they turn to you while you talk
          const toYou = Math.atan2(you.x - priya.root.position.x, you.z - priya.root.position.z);
          let d = toYou - priya.root.rotation.y;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          priya.root.rotation.y += d * Math.min(1, dt * 2.5);
          // the lines, one after another
          const current = lineIndex >= 0 ? lines[lineIndex] : null;
          if (lineIndex < 0 || (current && t - lineAt > lineSeconds(current))) {
            lineIndex++;
            lineAt = t;
            if (lineIndex < lines.length) {
              say(lines[lineIndex].who, lines[lineIndex].says, lineSeconds(lines[lineIndex]) + 0.3);
              if (lineIndex === lines.length - 2) priyaActor.perform(wave); // ("bye!")
            } else leaveIn = 1.5;
          }
        }
        if (leaveIn > 0) {
          leaveIn -= dt;
          if (leaveIn <= 0) {
            girls = "leaving";
            for (const k of kulfis) k.visible = false; // (eaten)
            strolls = [
              { person: priya, path: homeward(priya.root.position, -1.2), speed: 1.0, travelled: 0, phase: 0, moving: 0, heading: priya.root.rotation.y },
              { person: neha, path: homeward(neha.root.position, -1.9), speed: 1.0, travelled: 0, phase: 0.5, moving: 0, heading: neha.root.rotation.y },
            ];
          }
        }
      } else if (girls === "leaving") {
        let home = true;
        for (const s of strolls) {
          const end = walk(s, t, dt, player);
          if (!end || s.person.root.position.distanceTo(you) < 30) home = false;
        }
        if (home) {
          girls = "gone";
          priya.root.visible = neha.root.visible = false;
        }
      }
    },
  };
}
