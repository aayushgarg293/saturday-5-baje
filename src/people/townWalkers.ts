import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { HOME_LANE, LANE_ROAD } from "../world/homeLane";
import { LANE, MOHALLA_LANES } from "../world/mohalla";
import type { Road } from "../world/roads";
import { CRICKET_LANE, CRICKET_LANE_HALF, SCHOOL_ROAD } from "../world/schoolRoad";
import { STATION, STATION_LANE, laneS } from "../world/station";
import { COURT_ROAD } from "../world/town";
import { buildPerson, type Person } from "./body";
import { lookAt, reach } from "./pose";
import { type Role, recipeFor } from "./recipes";
import { type RoadLanes, planRoadLanes } from "./roadLanes";
import { walkLegs } from "./walkers";

/**
 * People walking along the town's roads beyond the bazaar (the bazaar has
 * its own: people/walkers.ts): up court road and back, down school road,
 * along the home lane, the station lane, the mohalla's lane, the cricket
 * lane. Each walks to the end of their stretch, crosses over and walks back
 * (keeping left, as people do here), at the road's edge, swinging round
 * carts and charpais (people/roadLanes.ts). They stop if you're right in
 * front of them, and look at you; you can't walk through them.
 *
 * Each road's walkers are one group, shown and hidden with that part of the
 * town (world/areas.ts: main.ts adds them by `area`). Each walker is updated
 * every frame when you're near, a few times a second further off, not at
 * all far away (as the crowd: people/crowd.ts). Their own random numbers.
 */

export type TownWalkers = {
  groups: { area: string; group: THREE.Group }[];
  colliders: Box[];
  update(t: number, dt: number, player: THREE.Vector3): void;
  /** Where they are (the town's traffic stops for them: world/townTraffic.ts). */
  positions(): THREE.Vector3[];
};

type Stretch = {
  area: string;
  road: Road;
  s0: number;
  s1: number;
  /** Distances from the middle they may walk at, and the one they'd like. */
  inner: number;
  outer: number;
  want: number;
  /** Who walks here. */
  roles: Role[];
};

const STRETCHES: Stretch[] = [
  { area: "court road", road: COURT_ROAD, s0: 2, s1: COURT_ROAD.length - 2, inner: 1.2, outer: 2.9, want: 2.3, roles: ["man", "uncle", "youngMan"] },
  { area: "school road", road: SCHOOL_ROAD, s0: 3, s1: SCHOOL_ROAD.length - 2, inner: 1.2, outer: 2.9, want: 2.3, roles: ["woman", "man", "schoolboy", "uncle"] },
  { area: "home lane", road: LANE_ROAD, s0: 4, s1: LANE_ROAD.length - 4, inner: 0.5, outer: HOME_LANE.half - 0.4, want: 1.5, roles: ["villageWoman", "kid"] },
  { area: "station", road: STATION_LANE, s0: 2, s1: laneS(STATION.railway.housesEnd), inner: 0.6, outer: STATION.half - 0.4, want: 1.9, roles: ["man", "uncle"] },
  { area: "mohalla", road: MOHALLA_LANES.a, s0: 12, s1: MOHALLA_LANES.a.length - 1, inner: 0.3, outer: LANE - 0.4, want: 0.9, roles: ["woman", "uncle"] },
  { area: "cricket lane", road: CRICKET_LANE, s0: 12, s1: CRICKET_LANE.length - 2, inner: 0.3, outer: CRICKET_LANE_HALF - 0.4, want: 1.0, roles: ["villageWoman", "man"] },
];

/** As the crowd: every frame within FULL metres, every SLOW seconds out to FAR, beyond that not at all. */
const FULL = 35, FAR = 120, SLOW = 0.2;

type Walker = {
  person: Person;
  lanes: RoadLanes;
  stretch: Stretch;
  s: number;
  /** +1 walking toward s1, −1 toward s0; and which side they keep to (left of the way they walk). */
  dir: 1 | -1;
  /** Signed distance from the middle, now (it eases toward the lane wanted: so they cross over at the ends). */
  offset: number;
  speed: number;
  phase: number;
  moving: number;
  heading: number;
  /** Seconds left to stand at the end of the stretch before walking back. */
  pause: number;
  look: THREE.Vector3;
  blinkIn: number;
  lastUpdate: number;
  collider: Box;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const KNEE_FREE = { R: v(-0.7, -0.5, -0.4), L: v(0.7, -0.5, -0.4) };

export function buildTownWalkers(solid: readonly Box[]): TownWalkers {
  const rng = makeRng(7901);
  const groups: TownWalkers["groups"] = [];
  const walkers: Walker[] = [];
  for (const stretch of STRETCHES) {
    const lanes = planRoadLanes(stretch.road, solid, stretch.s0, stretch.s1, stretch.inner, stretch.outer);
    const group = new THREE.Group();
    group.name = `townWalkers:${stretch.area}`;
    groups.push({ area: stretch.area, group });
    stretch.roles.forEach((role, k) => {
      const r = recipeFor(role, rng);
      r.outfit.jacket = undefined;
      const person = buildPerson(r);
      group.add(person.root);
      // spread out along the stretch, half each way
      const s = stretch.s0 + ((k + 0.5) / stretch.roles.length) * (stretch.s1 - stretch.s0);
      const dir: 1 | -1 = k % 2 ? -1 : 1;
      const p = stretch.road.pointAt(s, -dir * stretch.want);
      walkers.push({
        person, lanes, stretch, s, dir, offset: -dir * stretch.want,
        speed: rng.range(0.95, 1.25) * (role === "uncle" ? 0.8 : 1),
        phase: rng.next(), moving: 1, heading: 0, pause: 0, look: v(0, 1.4, 0), blinkIn: rng.range(1, 4), lastUpdate: -1,
        collider: boxAt(p.x, p.z, 0.5, 0.5, 0),
      });
    });
  }

  const _p = new THREE.Vector3(), _ahead = new THREE.Vector3(), _toYou = new THREE.Vector3();

  function step(w: Walker, t: number, dt: number, player: THREE.Vector3) {
    const { stretch, lanes, person } = w;
    const root = person.root, k = person.scale;
    // you, right in front of them: they stop (and look at you)
    _toYou.copy(player).sub(root.position).setY(0);
    _ahead.set(Math.sin(w.heading), 0, Math.cos(w.heading));
    const blocked = _toYou.length() < 1.3 && _toYou.dot(_ahead) > 0.2;
    // at the end of the stretch: a pause, then back the other way (crossing to keep left)
    if (w.pause > 0) w.pause -= dt;
    else if ((w.dir > 0 && w.s >= stretch.s1 - 0.5) || (w.dir < 0 && w.s <= stretch.s0 + 0.5)) {
      w.dir = (-w.dir) as 1 | -1;
      w.pause = 1 + Math.random() * 3;
    }
    const going = w.pause <= 0 && !blocked;
    w.moving += ((going ? 1 : 0) - w.moving) * Math.min(1, dt * 5);
    w.s += w.dir * w.speed * w.moving * dt;
    const side: -1 | 1 = w.dir > 0 ? -1 : 1; // keep left of the way they're going
    const want = side * lanes.lane(side, w.s, stretch.want);
    w.offset += (want - w.offset) * Math.min(1, dt * 1.6);
    const p = stretch.road.pointAt(w.s, w.offset);
    const was = root.position.clone();
    root.position.set(p.x, 0, p.z);
    // face the way they're moving (or, standing, the way they were)
    const dx = p.x - was.x, dz = p.z - was.z;
    if (dx * dx + dz * dz > 1e-6) {
      let d = Math.atan2(dx, dz) - w.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      w.heading += d * Math.min(1, dt * 6);
    }
    root.rotation.y = w.heading;
    w.collider.cx = p.x;
    w.collider.cz = p.z;

    // the body: the walkers' legs, arms swinging, eyes ahead or on you
    w.phase = (w.phase + (w.speed * w.moving * dt) / (2 * 0.62 * k)) % 1;
    walkLegs(person, w.phase, w.moving, k, t);
    root.updateMatrixWorld(true);
    const world = (x: number, y: number, z: number) => root.localToWorld(v(x, y, z));
    const pole = (d: THREE.Vector3) => d.clone().transformDirection(root.matrixWorld);
    const swing = 0.17 * k * w.moving * Math.cos(Math.PI * 2 * w.phase);
    reach(person, "R", world(-0.19 * k, 0.8 * k, 0.03 * k + swing), pole(KNEE_FREE.R));
    reach(person, "L", world(0.19 * k, 0.8 * k, 0.03 * k - swing), pole(KNEE_FREE.L));
    const close = _toYou.length() < 4 && _toYou.dot(_ahead) > 0;
    w.look.lerp(close ? _p.copy(player).setY(1.5) : world(0, 1.35 * k, 5), Math.min(1, dt * 3));
    lookAt(person, w.look, 1);
    w.blinkIn -= dt;
    if (w.blinkIn < -0.13) w.blinkIn = 2 + Math.random() * 3;
    person.face.set(w.blinkIn < 0 ? "blink" : "neutral");
  }

  return {
    groups,
    colliders: walkers.map((w) => w.collider),
    positions: () => walkers.map((w) => w.person.root.position),
    update(t, dt, player) {
      for (const w of walkers) {
        const d = w.person.root.position.distanceTo(player);
        if (d > FAR && w.lastUpdate >= 0) continue;
        if (d > FULL && t - w.lastUpdate < SLOW) continue;
        step(w, t, w.lastUpdate < 0 ? dt : Math.min(t - w.lastUpdate, 0.5), player);
        w.lastUpdate = t;
      }
    },
  };
}
