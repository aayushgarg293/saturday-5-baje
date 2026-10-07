import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import type { VehicleKind } from "./props/vehicles";
import { HOME_LANE, LANE_ROAD, SCHOOL_TAIL } from "./homeLane";
import type { Road } from "./roads";
import { SCHOOL_ROAD } from "./schoolRoad";
import { CHOWK_MIDDLE, COURT_ROAD, inBusStand } from "./town";
import { CRUISE, buildMoverBody, drive, pose } from "./traffic";

/**
 * Traffic on the town's roads beyond the bazaar (the bazaar's own is
 * world/traffic.ts): a few vehicles going round and round the town, keeping
 * left as traffic does here.
 *
 *   the colony's    a scooter and a motorcycle: from the home lane,
 *                   up school road, round the lamp post in the bus stand's
 *                   yard, back down school road, along the home lane and
 *                   round where the back lane meets it, and on; each pauses
 *                   in the home lane now and then (dropping someone home)
 *   the auto        along court road, round the clock tower's island
 *                   (clockwise, as roundabouts go here), back, and round the
 *                   same lamp post; it pauses at the bus stand for fares
 *
 * (No bicycle: it's slower than the rest, nobody can overtake, and a convoy
 * formed behind it. The bazaar has the doodhwala's.)
 *
 * Each goes round one closed loop, always forward: nobody parks, so nobody
 * has to reverse or turn on the spot, and everyone goes round the yard's lamp
 * the same way, so nobody meets head on. They stop for you, for people
 * walking, and for each other (world/traffic.ts, `drive`); one held up by
 * another for long (it can happen where two loops cross) edges on past it.
 * You can't walk through them. Their own random numbers.
 */

export type TownTraffic = {
  group: THREE.Group;
  colliders: Box[];
  update(dt: number, player: THREE.Vector3, walkers: readonly THREE.Vector3[]): void;
  /** Where they are. */
  positions(): THREE.Vector3[];
};

/** Distances from each road's middle that each way keeps to (left of the way it's going). */
const KEEP = { lane: 0.65, road: 1.1 };
/** The roundabout round the clock tower's island: its radius. */
const ROUND = 8;
/** Riders further than this from you aren't posed. */
const RIDERS_NEAR = 45;
/** Held up by another vehicle this long (seconds), a vehicle edges on past it for a moment. */
const DEADLOCK = 6, EDGE_PAST = 2.5;

const v3 = (p: { x: number; z: number }) => new THREE.Vector3(p.x, 0, p.z);
/** Points along a road every `step` metres from s0 to s1, `offset` to the side. */
function along(road: Road, s0: number, s1: number, offset: number, step = 8): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const n = Math.max(1, Math.round(Math.abs(s1 - s0) / step));
  for (let i = 0; i <= n; i++) out.push(v3(road.pointAt(s0 + ((s1 - s0) * i) / n, offset)));
  return out;
}

/** In the bus stand's yard: x east of its middle, z south (its own frame: world/places/busStand.ts). */
const yard = (x: number, z: number) => v3(inBusStand(18 + x, z));
/**
 * Round the yard's south-east lamp post (at 10, 9), clockwise: in from the west side heading north,
 * over the top heading east, down the east side heading south. Clear of the lamp, the banana cart and
 * the buses' bays.
 */
const LAMP_TOP = [yard(7.1, 10), yard(9.5, 7.6), yard(11.9, 10)];
const c = CHOWK_MIDDLE;
/** Round the island, clockwise, from the east side of it back to the east side (court road comes in there). */
const ROUNDABOUT = [
  v3({ x: c.x + 12, z: c.z + KEEP.road }), v3({ x: c.x + 7, z: c.z + 3.6 }),
  v3({ x: c.x, z: c.z + ROUND }), v3({ x: c.x - ROUND, z: c.z }), v3({ x: c.x, z: c.z - ROUND }),
  v3({ x: c.x + 7, z: c.z - 3.6 }), v3({ x: c.x + 12, z: c.z - KEEP.road }),
];

/** The colony's loop, starting (and pausing) in the home lane at `startX`, heading east. */
function colonyLoop(startX: number): THREE.Vector3[] {
  const laneS = (x: number) => SCHOOL_ROAD.pointAt(0, 0).x - x; // (the lane runs west from school road: s grows going west)
  const tailEnd = SCHOOL_TAIL.length;
  const corner = laneS(SCHOOL_ROAD.pointAt(0, 0).x - 4); // (where the lane meets school road's last stretch)
  return [
    // east along the home lane (north side), round the corner, up school road (west side)
    ...along(LANE_ROAD, laneS(startX), corner, KEEP.lane),
    ...along(SCHOOL_TAIL, tailEnd - 4, 2, KEEP.road, 6),
    ...along(SCHOOL_ROAD, SCHOOL_ROAD.length - 4, 3, KEEP.road, 10),
    // into the yard, round the lamp post, out again
    yard(6.9, 14), ...LAMP_TOP, yard(11, 13.5), yard(9.3, 16.5),
    // down school road (east side), round the corner, west along the home lane (south side)
    ...along(SCHOOL_ROAD, 3, SCHOOL_ROAD.length - 4, -KEEP.road, 10),
    ...along(SCHOOL_TAIL, 2, tailEnd - 4, -KEEP.road, 6),
    ...along(LANE_ROAD, corner, laneS(HOME_LANE.mouth.x1 + 3), -KEEP.lane),
    // turn round where the back lane comes in: up into its mouth and round, back out heading east (north side)
    v3({ x: 13.6, z: 10.4 }), v3({ x: 14.0, z: 7.4 }), v3({ x: 16.0, z: 6.8 }), v3({ x: 17.2, z: 8.8 }), v3({ x: 18.8, z: 11.2 }),
    ...along(LANE_ROAD, laneS(HOME_LANE.mouth.x1 + 3), laneS(startX) + 6, KEEP.lane),
  ];
}

/** The auto's loop, starting (and pausing) in the yard, heading west for court road. */
function autoLoop(): THREE.Vector3[] {
  const L = COURT_ROAD.length;
  return [
    yard(-4, 6.8), yard(-12, 4.4), yard(-17, KEEP.road + 0.6),
    ...along(COURT_ROAD, L - 2, 6, KEEP.road), // west, on the south side
    ...ROUNDABOUT,
    ...along(COURT_ROAD, 6, L - 2, -KEEP.road), // east, on the north side
    yard(-17, -KEEP.road + 0.2), yard(-12, 2.4), yard(-2, 5.4), yard(4, 7.8),
    ...LAMP_TOP.slice(1), yard(9.5, 12.4), yard(5.5, 11.2), yard(1, 8.8),
  ];
}

export function buildTownTraffic(): TownTraffic {
  const rng = makeRng(7951);
  const group = new THREE.Group();
  group.name = "townTraffic";
  type Car = ReturnType<typeof buildMoverBody> & {
    kind: VehicleKind; loop: THREE.CatmullRomCurve3; route: THREE.CatmullRomCurve3 | null; routeLength: number;
    travelled: number; speed: number; cruise: number; stoppedFor: number; someoneAhead: boolean; collider: Box;
    /** Seconds left of its pause (at the start of its loop); held up by another vehicle, for how long; edging past, for how long. */
    pause: number; heldFor: number; edging: number;
  };
  // who, on which loop, and how far round it to begin (so they're spread out)
  const cast: { kind: VehicleKind; loop: THREE.Vector3[]; startAt: number; pause: number }[] = [
    { kind: "scooter", loop: colonyLoop(40), startAt: 0, pause: 3 },
    { kind: "motorcycle", loop: colonyLoop(40), startAt: 0.5, pause: 0 },
    { kind: "auto", loop: autoLoop(), startAt: 0, pause: 8 },
  ];
  const cars: Car[] = cast.map(({ kind, loop, startAt, pause: wait }) => {
    const body = buildMoverBody(kind, rng);
    group.add(body.group);
    const curve = new THREE.CatmullRomCurve3(loop, true, "centripetal");
    const length = curve.getLength();
    const car: Car = {
      ...body, kind, loop: curve, route: curve, routeLength: length, travelled: startAt * length, speed: 0,
      cruise: CRUISE[kind] * 0.85, stoppedFor: 0, someoneAhead: false, collider: boxAt(0, 0, body.length, body.width),
      pause: wait, heldFor: 0, edging: 0,
    };
    const u = car.travelled / length;
    pose(car, curve.getPointAt(u), curve.getTangentAt(u));
    car.group.updateMatrixWorld(true);
    car.riders.update(0, 0, new THREE.Vector3(1e4, 0, 1e4));
    return car;
  });

  return {
    group,
    colliders: cars.map((car) => car.collider),
    positions: () => cars.map((car) => car.group.position),
    update(dt, player, walkers) {
      for (const car of cars) {
        if (car.pause > 0) {
          car.pause -= dt;
          car.speed = 0;
        } else {
          // anyone in the way (other vehicles too, unless it's edging past one that's held it up a while)
          const others = car.edging > 0 ? [] : cars.filter((o) => o !== car).map((o) => o.group.position);
          const before = car.travelled;
          if (drive(car, dt, [player, ...walkers, ...others], () => {}, 14)) {
            // round the loop and back where it began: a pause, then round again
            car.route = car.loop;
            car.travelled = 0;
            car.pause = rng.range(4, 14);
          }
          // held up, and not by you? (people walking move on; another vehicle, coming the other way where
          // two loops cross, might not)
          const stuck = car.travelled - before < 0.01 && car.group.position.distanceTo(player) > 6;
          car.heldFor = stuck ? car.heldFor + dt : 0;
          if (car.heldFor > DEADLOCK) {
            car.edging = EDGE_PAST;
            car.heldFor = 0;
          }
          car.edging = Math.max(0, car.edging - dt);
        }
        const moving = car.pause <= 0;
        if (moving || car.group.position.distanceTo(player) < RIDERS_NEAR) car.riders.update(dt, car.speed, player);
      }
    },
  };
}
