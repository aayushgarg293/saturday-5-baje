import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { centreAt, pointAt } from "../world/layout";
import { buildPerson, type Person } from "./body";
import type { Lanes } from "./lanes";
import { lookAt, plant, reach } from "./pose";
import { type Role, recipeFor } from "./recipes";

/**
 * People walking up and down the street.
 *
 * Each walks a stretch of the street (`from`..`to`), keeping to the road's
 * edge on the left, as everyone in India does: going north (up the street)
 * on the left side, south on the right. At each end they look for traffic,
 * cross over, and walk back. Now and then they stop for a few seconds and
 * look at a shop.
 *
 * On the way they swing round whatever's at the edge (the lane plan in
 * lanes.ts), squeeze toward the verge when a vehicle comes, step round you
 * (or stop, if you're right in front of them), and don't walk into each
 * other. Vehicles stop for them too (traffic.ts). You can't walk through them.
 *
 * THE WALK. Each foot is on the ground for half the cycle, sliding back
 * under the body exactly as fast as the body moves forward (so it doesn't
 * skate), then lifts and swings forward for the other half; the legs reach
 * their feet by IK (`plant` in pose.ts). The hips bob and sway, the arms
 * swing opposite the legs. The cycle advances with distance walked, so
 * slowing down and stopping come out right on their own.
 */

type Style = "swing" | "handsBehind" | "straps" | "pockets";
type WalkerSpec = { role: Role; from: number; to: number; speed: number; style: Style };

const CAST: WalkerSpec[] = [
  { role: "villageWoman", from: 18, to: 96, speed: 1.0, style: "swing" }, // with her jhola, to the market
  { role: "uncle", from: 60, to: 140, speed: 0.85, style: "handsBehind" }, // an evening stroll
  { role: "schoolboy", from: 100, to: 186, speed: 1.25, style: "straps" }, // home from tuition
  { role: "youngMan", from: 128, to: 200, speed: 1.2, style: "pockets" },
  { role: "woman", from: 6, to: 70, speed: 1.05, style: "swing" },
];

/** How far from the centre line people like to walk (the road's edge). */
const EDGE = 1.55;
/** As far toward the verge as they'll squeeze when a vehicle passes. */
const SQUEEZE = 2.3;
/** Metres: a vehicle nearer than this, and they move over. */
const VEHICLE_NEAR = 14;
/** Nobody walks closer than this to anyone else (centre to centre). */
const PERSONAL = 0.62;
/** Update the pose (the IK) every frame only this near the player. */
const POSE_NEAR = 40;

type State = "walk" | "pause" | "wait" | "cross";

type Walker = {
  person: Person;
  spec: WalkerSpec;
  k: number;
  /** Where along the street, which side, how far out, which way. */
  s: number;
  side: -1 | 1;
  out: number;
  dir: 1 | -1;
  state: State;
  /** Seconds left in a pause; metres to go until the next one. */
  timer: number;
  nextPause: number;
  /** While crossing: how far across (0 → 1). */
  across: number;
  speed: number;
  phase: number;
  moving: number;
  heading: number;
  position: THREE.Vector3;
  collider: Box;
  look: THREE.Vector3;
  blinkIn: number;
  poseAt: number;
};

export type Walkers = {
  group: THREE.Group;
  colliders: Box[];
  /** Where each walker is (for the traffic to stop for them). */
  positions: THREE.Vector3[];
  update(t: number, dt: number, player: THREE.Vector3, vehicles: readonly Box[]): void;
  /** For testing: what each walker is doing. */
  debug(): { s: number; side: number; out: number; state: State; speed: number }[];
};

export function buildWalkers(lanes: Lanes): Walkers {
  const rng = makeRng(1947);
  const group = new THREE.Group();
  group.name = "walkers";

  const walkers: Walker[] = CAST.map((spec, i) => {
    const recipe = recipeFor(spec.role, rng);
    if (spec.role === "villageWoman") recipe.outfit.bag = "jhola";
    if (spec.style === "handsBehind") recipe.outfit.bag = undefined;
    const person = buildPerson(recipe);
    group.add(person.root);
    const dir = i % 2 === 0 ? 1 : -1;
    const w: Walker = {
      person, spec, k: person.scale,
      s: spec.from + (spec.to - spec.from) * rng.range(0.15, 0.85),
      side: dir === 1 ? -1 : 1, // keep left
      out: EDGE,
      dir,
      state: "walk",
      timer: 0,
      nextPause: rng.range(15, 45),
      across: 0,
      speed: 0,
      phase: rng.next(),
      moving: 0,
      heading: 0,
      position: new THREE.Vector3(),
      collider: boxAt(0, 0, 0.5, 0.5),
      look: new THREE.Vector3(),
      blinkIn: rng.range(1, 4),
      poseAt: -1,
    };
    w.out = lanes.lane(w.side, w.s, EDGE);
    place(w);
    return w;
  });

  const others = (w: Walker) => walkers.filter((o) => o !== w).map((o) => o.position);

  return {
    group,
    colliders: walkers.map((w) => w.collider),
    positions: walkers.map((w) => w.position),
    debug: () => walkers.map(({ s, side, out, state, speed }) => ({ s, side, out, state, speed })),
    update(t, dt, player, vehicles) {
      for (const w of walkers) {
        const vehicle = nearestVehicle(w, vehicles);
        think(w, dt, player, others(w), vehicle, lanes, () => rng.next());
        place(w);
        // the pose is the costly part: every frame nearby, a few times a second further away
        const far = w.position.distanceTo(player) > POSE_NEAR;
        if (!far || t - w.poseAt > 0.2) {
          pose(w, player, vehicle, t, far ? t - w.poseAt : dt);
          w.poseAt = t;
        }
      }
    },
  };
}

/** The nearest vehicle on the street (not waiting round the corner) within VEHICLE_NEAR metres. */
function nearestVehicle(w: Walker, vehicles: readonly Box[]): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null, bestD = VEHICLE_NEAR;
  for (const b of vehicles) {
    if (Math.abs(sideways(new THREE.Vector3(b.cx, 0, b.cz), w.s)) > 4) continue; // in a back lane
    const d = Math.hypot(b.cx - w.position.x, b.cz - w.position.z);
    if (d < bestD) { bestD = d; best = new THREE.Vector3(b.cx, 0, b.cz); }
  }
  return best;
}

/** Decide where to go this frame, and go there. */
function think(w: Walker, dt: number, player: THREE.Vector3, others: THREE.Vector3[], vehicle: THREE.Vector3 | null, lanes: Lanes, random: () => number) {
  const cruise = w.spec.speed;
  let want = 0; // speed wanted, m/s
  let wantOut = lanes.lane(w.side, w.s, vehicle ? SQUEEZE : EDGE);

  if (w.state === "walk") {
    want = cruise;
    // someone in the way ahead (you, or another walker): go round, slow, or stop
    for (const p of [player, ...others]) {
      const ahead = (along(p, w.s) - w.s) * w.dir;
      const theirOut = sideways(p, w.s) * w.side; // how far out on MY side (negative: the other side)
      if (ahead > 0 && ahead < 2.4 && Math.abs(theirOut - w.out) < 0.7) {
        // pass on whichever side has room: toward the verge if they're nearer the middle, else toward the middle
        const round = theirOut < w.out ? lanes.lane(w.side, w.s, theirOut + 0.85) : Math.max(0.9, theirOut - 0.85);
        wantOut = round;
        want = Math.min(want, ahead < 1.1 ? 0 : 0.55);
      }
    }
    // the end of the stretch: turn to cross
    if ((w.dir === 1 && w.s >= w.spec.to) || (w.dir === -1 && w.s <= w.spec.from)) {
      w.state = "wait";
      want = 0;
    }
    // now and then, stop and look at a shop
    w.nextPause -= w.speed * dt;
    if (w.nextPause < 0 && !vehicle) {
      w.state = "pause";
      w.timer = 2 + random() * 3;
      w.nextPause = 20 + random() * 30;
    }
  } else if (w.state === "pause") {
    w.timer -= dt;
    if (w.timer < 0) w.state = "walk";
  } else if (w.state === "wait") {
    // at the end: wait for the road to be clear, then cross
    if (!vehicle && w.speed < 0.05) {
      w.state = "cross";
      w.across = 0;
    }
  } else if (w.state === "cross") {
    want = cruise;
    // don't step out in front of a vehicle
    if (vehicle && w.across < 0.15) want = 0;
  }

  // ease toward the wanted speed
  w.speed += (want - w.speed) * (1 - Math.exp(-(want < w.speed ? 6 : 2.5) * dt));
  if (want === 0 && w.speed < 0.03) w.speed = 0;

  // move: along the street, or across it
  const before = w.position.clone();
  let s = w.s, out = w.out, side = w.side, across = w.across;
  if (w.state === "cross") {
    across = Math.min(1, across + (w.speed * dt) / (2 * EDGE));
  } else {
    s += w.dir * w.speed * dt;
    // sidestep toward the chosen distance, at a walking pace at most
    out += THREE.MathUtils.clamp(wantOut - out, -0.7 * dt, 0.7 * dt);
  }
  // Never step closer than PERSONAL to anyone (you, other walkers). If the
  // step (along and sideways) would, try just the step along the street
  // (the sidestep is often what brings them closer); if even that would,
  // hold still this frame. (Stepping AWAY from someone is always fine, or
  // two people who got close would freeze each other for good.)
  const tooClose = (next: THREE.Vector3) => [player, ...others].some((p) => {
    const d = Math.hypot(p.x - next.x, p.z - next.z);
    return d < PERSONAL && d < Math.hypot(p.x - before.x, p.z - before.z);
  });
  const at = (s: number, out: number) => new THREE.Vector3(...xz(pointAt(s, side * out)));
  if (w.state === "cross") {
    if (!tooClose(crossingPoint(s, side, across))) w.across = across;
    else w.speed = 0;
  } else if (!tooClose(at(s, out))) {
    w.s = s;
    w.out = out;
  } else if (!tooClose(at(s, w.out))) {
    w.s = s;
  } else {
    w.speed = 0;
  }
  // arrived on the other side: walk back the other way, keeping left
  if (w.state === "cross" && w.across >= 1) {
    w.side = (-w.side) as -1 | 1;
    w.dir = (-w.dir) as -1 | 1;
    w.out = EDGE;
    w.state = "walk";
  }
}

/** A point on the way across the street at `s`, from `side` to the other side, `u` of the way. */
function crossingPoint(s: number, side: -1 | 1, u: number): THREE.Vector3 {
  return new THREE.Vector3(...xz(pointAt(s, side * EDGE * (1 - 2 * u))));
}
const xz = (p: { x: number; z: number }): [number, number, number] => [p.x, 0, p.z];

/** How far along the street a point is (near `guess`), and how far to the side (signed). */
function along(p: THREE.Vector3, guess: number): number {
  const c = centreAt(guess);
  const fx = Math.sin(c.heading), fz = -Math.cos(c.heading);
  return guess + (p.x - c.x) * fx + (p.z - c.z) * fz;
}
function sideways(p: THREE.Vector3, guess: number): number {
  const c = centreAt(guess);
  return (p.x - c.x) * Math.cos(c.heading) + (p.z - c.z) * Math.sin(c.heading);
}

/** Put the walker (and its collider) where it is, facing the way it's going. */
function place(w: Walker) {
  const p = w.state === "cross" ? crossingPoint(w.s, w.side, w.across) : new THREE.Vector3(...xz(pointAt(w.s, w.side * w.out)));
  const h = centreAt(w.s).heading;
  // facing: along the street, or across it while crossing; turning smoothly
  const forward = w.state === "cross" ? Math.atan2(-w.side * Math.cos(h), -w.side * Math.sin(h)) : Math.atan2(w.dir * Math.sin(h), -w.dir * Math.cos(h));
  const turn = Math.atan2(Math.sin(forward - w.heading), Math.cos(forward - w.heading));
  w.heading += w.poseAt < 0 ? turn : turn * 0.12; // (on the first frame, straight away)
  w.position.copy(p);
  w.person.root.position.copy(p);
  w.person.root.rotation.y = w.heading;
  w.collider.cx = p.x;
  w.collider.cz = p.z;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const KNEE = v(0, 0.3, 1);
const ELBOW = { R: v(-0.7, -0.5, -0.4), L: v(0.7, -0.5, -0.4) };

/** Pose the body for this frame: legs, hips, arms, head, face. */
function pose(w: Walker, player: THREE.Vector3, vehicle: THREE.Vector3 | null, t: number, dt: number) {
  const { person, k } = w;
  const root = person.root;
  // the cycle advances with distance: one cycle = two steps = 2 × STRIDE
  const STRIDE = 0.62 * k;
  w.phase = (w.phase + (w.speed * dt) / (2 * STRIDE)) % 1;
  w.moving += (Math.min(1, w.speed / 0.4) - w.moving) * Math.min(1, dt * 6);
  const m = w.moving, p = w.phase, TAU = Math.PI * 2;

  // Where each foot is, this moment of the cycle: half the cycle on the ground
  // sliding back, half lifting and swinging forward.
  const feet = ([["L", 0.1, 0], ["R", -0.1, 0.5]] as const).map(([side, x, offset]) => {
    const q = (p + offset) % 1;
    let z: number, lift = 0;
    if (q < 0.5) z = STRIDE / 2 - (q / 0.5) * STRIDE;
    else {
      const u = (q - 0.5) / 0.5;
      z = -STRIDE / 2 + (u * u * (3 - 2 * u)) * STRIDE;
      lift = Math.sin(Math.PI * u) * 0.1 * k;
    }
    return { side, x, z: z * m, lift: lift * m, planted: q < 0.5 };
  });
  // Hips: the leg on the ground stays nearly straight, so the hips ride up
  // over it and dip as the feet pass, like an upside-down pendulum (a fixed
  // height would leave the knees bent all the way).
  const planted = feet.find((f) => f.planted)!;
  const LEG = 0.83 * k; // hip to ankle, a touch short of full stretch
  const overFoot = 0.06 * k + Math.sqrt(LEG * LEG - planted.z * planted.z) + 0.04 * k;
  const hips = person.bone("hips");
  hips.position.set(0, THREE.MathUtils.lerp(0.94 * k, overFoot, m), 0);
  hips.rotation.set(0, 0.08 * m * Math.sin(TAU * p), 0.035 * m * Math.sin(TAU * p));
  person.bone("spine").rotation.set(0.04 + Math.sin(t * 1.7) * 0.01, 0, 0);
  person.bone("chest").rotation.set(0.02, -0.12 * m * Math.sin(TAU * p), 0);
  root.updateMatrixWorld(true);

  const world = (x: number, y: number, z: number) => root.localToWorld(v(x, y, z));
  const dirOf = (d: THREE.Vector3) => d.clone().transformDirection(root.matrixWorld);

  // the legs reach their feet
  for (const f of feet) plant(person, f.side, world(f.x * k, 0.06 * k + f.lift, f.z), dirOf(KNEE));

  // arms, by style
  const swing = 0.17 * k * m * Math.cos(TAU * p); // right arm forward when the left foot is
  let right: THREE.Vector3, left: THREE.Vector3;
  switch (w.spec.style) {
    case "handsBehind":
      right = v(-0.05 * k, 0.9 * k, -0.16 * k);
      left = v(0.05 * k, 0.92 * k, -0.16 * k);
      break;
    case "straps": // holding the school bag's straps
      right = v(-0.1 * k, 1.12 * k, 0.12 * k);
      left = v(0.1 * k, 1.12 * k, 0.12 * k);
      break;
    case "pockets":
      right = v(-0.17 * k, 0.88 * k, 0.06 * k);
      left = v(0.17 * k, 0.88 * k, 0.06 * k);
      break;
    default:
      right = v(-0.19 * k, 0.8 * k, 0.03 * k + swing);
      left = v(0.19 * k, 0.8 * k, 0.03 * k - swing);
  }
  reach(person, "R", world(right.x, right.y, right.z), dirOf(ELBOW.R));
  reach(person, "L", world(left.x, left.y, left.z), dirOf(ELBOW.L));

  // eyes: on you if you're near and in front; on the vehicle while waiting to cross;
  // on the shops while pausing; otherwise a few metres ahead
  const toPlayer = root.worldToLocal(player.clone());
  const target =
    toPlayer.z > 0 && toPlayer.length() < 4 ? player.clone().setY(1.5)
    : w.state === "wait" && vehicle ? vehicle.clone().setY(1.2)
    : w.state === "wait" ? world(Math.sin(t * 1.3) * 4, 1.4 * k, 1) // looking both ways
    : w.state === "pause" ? world(3, 1.3 * k, 1.2) // at the shops (keeping left, they're always on the left)
    : world(0, 1.35 * k, 5);
  w.look.lerp(target, Math.min(1, dt * 3));
  lookAt(person, w.look, 1);

  w.blinkIn -= dt;
  if (w.blinkIn < -0.13) w.blinkIn = 2 + Math.random() * 3;
  person.face.set(w.blinkIn < 0 ? "blink" : "neutral");
}
