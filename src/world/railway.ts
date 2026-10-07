import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { timeOfDay } from "../core/timeOfDay";
import { buildPerson } from "../people/body";
import { type Role, recipeFor } from "../people/recipes";
import { type Stroll, walk } from "../people/stroll";
import { say } from "../ui/caption";
import { addHeadlight } from "./evening";
import { Parts } from "./kit";
import { STATION_SPOTS } from "./places/station";
import { axles, buildCoach, buildEngine } from "./props/train";
import { STATION, inStation } from "./station";
import { COACH, ENGINE, type TrainKind, type TrainNow, trainLength, trainsAt } from "./trainTimetable";

/**
 * The trains at Daulatbagh, and the level crossing working for them (when
 * and where: world/trainTimetable.ts).
 *
 *   the barriers   the bell rings, and they come down across the lane; up
 *                  again once the train's past (you can't cross while
 *                  they're down)
 *   the trains     come up the line from the south: the passenger slows in
 *                  and stands at the platform half a minute; the express
 *                  goes straight through
 *   at the stop    three people get down and walk off into town across the
 *                  crossing; three who were waiting on the platform climb
 *                  in. The announcement as it's due; the coolie asks if
 *                  you want him
 *   on the line    you can walk along it: if you're on it as a train comes,
 *                  the gateman shouts and you're out of its way at the edge
 *                  (it never goes through you)
 *
 * What it sounds like is audio/train.ts, from `sound()`.
 *
 * FRAME: the station's (world/places/station.ts): its origin where the lane
 * crosses the line, x east, z south; the track runs along z at x = 0.
 */

export type TrainSound = {
  kind: TrainKind;
  /** Where its engine is (world), and its speed (m/s); its axles' world z, now. */
  engine: THREE.Vector3;
  speed: number;
  axleZ: number[];
  /** Sounding its horn now. */
  horn: boolean;
};
export type RailwaySound = { bell: boolean; bellAt: THREE.Vector3; trackX: number; originZ: number; train: TrainSound | null };

export type Railway = {
  group: THREE.Group;
  colliders: Box[];
  update(t: number, dt: number, player: THREE.Vector3): void;
  sound(): RailwaySound;
};

/** The barriers: where each pivots (x, z: on the lane's north side), raised this far (radians up from level). */
const BARRIERS = [{ x: 6.2, z: -STATION.half - 0.6 }, { x: -6, z: -STATION.half - 0.6 }];
const RAISED = 1.35, BOOM = 6.5;
/** The coaches' colours, engine first: maroon for the general class, blue for the sleepers. */
const MAROON = 0x7a2a22, BLUE = 0x2c4a78;
const RAKES: Record<TrainKind, number[]> = {
  passenger: [MAROON, MAROON, MAROON, BLUE, MAROON],
  express: [MAROON, BLUE, BLUE, BLUE, BLUE, BLUE, MAROON, MAROON],
};
/** Horn: while the nose is between these (m from the crossing, + south), or just after pulling out. */
const HORN: Record<TrainKind, [number, number][]> = { passenger: [[170, 150], [55, 40]], express: [[230, 200], [75, 25]] };
/** On the line (|x| under this) with a train coming this near: moved to its edge. */
const TRACK_HALF = 2.2, DANGER = 45;
/** Within this of the station (m), you hear the announcements. */
const HEARD = 60;

export function buildRailway(): Railway {
  const origin = inStation(STATION.railway.track, 0);
  const group = new THREE.Group();
  group.name = "railway";
  group.position.set(origin.x, 0, origin.z);
  group.updateMatrixWorld(true);
  const colliders: Box[] = [];

  // --- the two trains: built once, shown in their turn -----------------------------------------------
  const sets = (["passenger", "express"] as TrainKind[]).map((kind) => {
    const set = new THREE.Group();
    set.name = `train:${kind}`;
    // (built nose-first along +x, like the vehicles; turned so +x runs north, −z)
    set.rotation.y = Math.PI / 2;
    const engine = buildEngine();
    engine.position.x = -ENGINE / 2;
    set.add(engine);
    addHeadlight(set, 0, 3.15, 0.9);
    RAKES[kind].forEach((colour, k) => {
      const coach = buildCoach(colour);
      coach.position.x = -(ENGINE + k * COACH + COACH / 2);
      set.add(coach);
    });
    set.visible = false;
    group.add(set);
    // (its axles, as metres back from the nose: the engine's, then each coach's)
    const axleBack = [...axles(ENGINE - 0.4).map((a) => ENGINE / 2 - a), ...RAKES[kind].flatMap((_, k) => axles(COACH - 0.6).map((a) => ENGINE + k * COACH + COACH / 2 - a))];
    const length = trainLength(kind);
    const collider = boxAt(1e5, 0, 3.3, length, 0);
    colliders.push(collider);
    return { kind, set, length, axleBack, collider, engineAt: new THREE.Vector3(), state: null as TrainNow | null };
  });

  // --- the barriers: their booms pivot (the posts and counterweights are the station's) --------------
  const booms = BARRIERS.map(({ x, z }) => {
    const p = new Parts();
    for (let k = 0; k < 10; k++) p.box(0.1, 0.1, BOOM / 10, 0, 0, (k + 0.5) * (BOOM / 10), k % 2 ? 0xf2efe6 : 0xc62f2a);
    p.box(0.04, 0.3, 0.04, 0, -0.15, BOOM - 0.1, 0xc62f2a); // the little hanging skirt at its tip
    const boom = p.build("barrierBoom");
    boom.position.set(x, 1.15, z);
    boom.rotation.x = -RAISED;
    group.add(boom);
    // across the lane while down (moved far off while up)
    const c = boxAt(1e5, 0, 0.4, STATION.half * 2 + 0.8, 0);
    colliders.push(c);
    return { boom, c, x };
  });

  // --- the passenger's people: three get down, three who were waiting climb in ----------------------
  const rng = makeRng(7681);
  const H = STATION.platform.height;
  const person = (role: Role) => {
    const r = recipeFor(role, rng);
    r.outfit.jacket = undefined;
    if (role === "man" || role === "uncle") r.outfit.bag = "jhola";
    const p = buildPerson(r);
    p.root.visible = false;
    group.add(p.root);
    return p;
  };
  const off = (["man", "woman", "uncle"] as Role[]).map(person);
  const on = (["youngMan", "woman", "man"] as Role[]).map(person);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  /** The coach doors on the platform side, where the passenger stands (its last three coaches' near ends). */
  const DOOR_X = -2.7;
  const doorsZ = [-7.5, -27.5, -29.5];
  let turnSeen = -1;
  /** Each: their walk, how long after the stop they set off, and whether they have. */
  type Going = { s: Stroll; at: number; started: boolean };
  let gettingOff: Going[] = [], gettingOn: Going[] = [];
  function setUpPassengerTurn() {
    // down at the doors, along the platform, down its ramp, across the crossing, off into the lane
    gettingOff = off.map((p, k) => ({
      at: 2 + k * 2.5, started: false,
      s: { person: p, speed: 1.0 + k * 0.08, travelled: 0, phase: k * 0.3, moving: 0, heading: Math.PI,
        path: [v(DOOR_X, H, doorsZ[k]), v(-4.2 - k * 0.5, H, doorsZ[k] + 0.6), v(-5 - k * 0.5, H, -9.3), v(-5 - k * 0.5, 0, -3.8), v(-3, 0.32, -0.6 + k * 0.6), v(8, 0, -0.4 + k * 0.6), v(45, 0, -0.6 + k * 0.7)] },
    }));
    // waiting on the platform, then to the nearest door and in
    const waits = [v(-5, H, -13), v(-6.2, H, -24), v(-4.6, H, -34)];
    gettingOn = on.map((p, k) => {
      const door = v(DOOR_X, H, [doorsZ[0], doorsZ[1], doorsZ[2]][k] - 1.2);
      return { at: 6 + k * 3, started: false, s: { person: p, speed: 0.95, travelled: 0, phase: k * 0.4, moving: 0, heading: Math.PI / 2, path: [waits[k], door] } };
    });
    for (const { s } of gettingOff) s.person.root.visible = false;
    for (const { s } of gettingOn) {
      s.person.root.visible = true;
      s.person.root.position.copy(s.path[0]);
      s.person.root.rotation.y = Math.PI / 2; // (looking down the line, the way it comes)
    }
  }

  const local = new THREE.Vector3();
  const bellAt = new THREE.Vector3(STATION_SPOTS.gateman.x + 0.6, 2.4, -6.3).add(group.position);
  const coolie = new THREE.Vector3(STATION_SPOTS.bench.x, H, STATION_SPOTS.bench.z).add(group.position);
  let trains = trainsAt(timeOfDay.minutes);
  let shouted = -1, announced = -1, coolieAsked = -1;
  const heardFrom = new THREE.Vector3();

  return {
    group,
    colliders,
    update(t, dt, player) {
      trains = trainsAt(timeOfDay.minutes);
      const now = trains[0]; // (the one whose turn it is: the other, if any, is pulling away)
      const turn = now.turn;
      const you = local.copy(player).sub(group.position);
      heardFrom.copy(player);

      // the trains: each where the timetable says, while it's in sight
      for (const s of sets) {
        s.state = trains.find((x) => x.kind === s.kind && x.running) ?? null;
        s.set.visible = s.state !== null;
        if (!s.state) {
          s.collider.cx = 1e5;
          continue;
        }
        const front = s.state.front;
        s.set.position.set(0, 0, front);
        s.collider.cx = group.position.x;
        s.collider.cz = group.position.z + front + s.length / 2;
        s.engineAt.set(0, 2, front + ENGINE / 2).add(group.position);

        // on the line with it coming: the gateman shouts, and you're at its edge (east: never in its way)
        const coming = you.z > front - DANGER && you.z < front + s.length + 1;
        if (coming && Math.abs(you.x) < TRACK_HALF && you.y < 0.6) {
          player.x = group.position.x + TRACK_HALF + 0.6;
          if (shouted !== s.state.turn) {
            shouted = s.state.turn;
            say("Gateman", "Oye! Hato patri se! Gaadi aa rahi hai!", 3);
          }
        }
      }

      // the barriers: down (and closed to you) while a train's due
      const barriers = Math.max(...trains.map((x) => x.barriers));
      for (const b of booms) {
        b.boom.rotation.x = -RAISED * (1 - smooth(barriers));
        const down = barriers > 0.6;
        b.c.cx = down ? group.position.x + b.x : 1e5;
        b.c.cz = group.position.z;
      }

      const near = you.length() < HEARD;
      // the announcement, as the passenger's due (only if you're near enough to hear the speaker)
      if (now.kind === "passenger" && now.tau > 2 && now.tau < 20 && announced !== turn && near) {
        announced = turn;
        say("Announcement", "Yatri kripya dhyan dein… gaadi sankhya 5-9-8-0-3, Jaipur–Ajmer passenger, platform sankhya ek par aa rahi hai.", 6);
      }
      if (now.kind === "express" && now.tau > 2 && now.tau < 20 && announced !== turn && near) {
        announced = turn;
        say("Announcement", "Platform sankhya ek se ek tez gaadi guzregi. Kripya patri se door rahein.", 5);
      }
      const passenger = trains.find((x) => x.kind === "passenger");
      // the coolie, while the passenger stands
      if (passenger?.stopped && coolieAsked !== passenger.turn && player.distanceTo(coolie) < 7) {
        coolieAsked = passenger.turn;
        say("Coolie", "Saamaan hai, saab? Coolie chahiye?", 3);
      }

      // the passenger's people: set up as its turn starts; down and in once it's stopped
      if (passenger && turnSeen !== passenger.turn) {
        turnSeen = passenger.turn;
        setUpPassengerTurn();
      }
      // (no passenger about: nobody's waiting for it; those who got down walk on until they're gone)
      if (!passenger) for (const g of gettingOn) g.s.person.root.visible = false;
      const stoppedFor = passenger?.stoppedFor ?? -1;
      if (you.length() > 150) return; // (out of sight: they wait where they are)
      const youHere = player.clone().sub(group.position);
      // getting down, one after another once it's stopped; off across the crossing; gone once out of sight
      for (const g of gettingOff) {
        if (!g.started && stoppedFor >= g.at) {
          g.started = true;
          g.s.person.root.visible = true;
        }
        if (!g.started || !g.s.person.root.visible) continue;
        // (at the barrier with it down: they wait for the train to go by, like everyone)
        const at = g.s.person.root.position;
        if (barriers > 0.2 && at.x > -7.5 && at.x < -2.4 && Math.abs(at.z) < STATION.half + 1) continue;
        if (walk(g.s, t, dt, youHere) && g.s.person.root.position.distanceTo(you) > 25) g.s.person.root.visible = false;
      }
      // climbing in: from where they waited (looking down the line) to the door, and in
      for (const g of gettingOn) {
        if (!g.s.person.root.visible) continue;
        if (!g.started && stoppedFor >= g.at) g.started = true;
        if (!g.started) continue;
        if (walk(g.s, t, dt, youHere)) g.s.person.root.visible = false;
      }
    },
    sound() {
      const bell = trains.some((x) => x.bell);
      const base = { bell, bellAt, trackX: group.position.x, originZ: group.position.z };
      // the running train nearest you
      const running = sets.filter((x) => x.state).sort((a, b) => a.engineAt.distanceTo(heardFrom) - b.engineAt.distanceTo(heardFrom));
      const s = running[0];
      if (!s?.state) return { ...base, train: null };
      const st = s.state;
      // (and two short toots as the passenger pulls out)
      const toot = st.pulledOutFor >= 0 && (st.pulledOutFor < 0.6 || (st.pulledOutFor > 0.9 && st.pulledOutFor < 1.5));
      const horn = HORN[st.kind].some(([a, b]) => st.front <= a && st.front >= b) || toot;
      return { ...base, train: { kind: st.kind, engine: s.engineAt, speed: st.speed, axleZ: s.axleBack.map((a) => group.position.z + st.front + a), horn } };
    },
  };
}

/** Eased 0..1 (the booms slow at each end of their swing). */
const smooth = (x: number) => x * x * (3 - 2 * x);
