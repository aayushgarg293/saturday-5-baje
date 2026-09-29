import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { type Rng, makeRng } from "../core/rng";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "./kit";
import { PLOT_DEPTH, SIDE_ROADS, SIDE_ROAD_SETBACK, pointAt } from "./layout";
import { type VehicleKind, addRider, buildVehicle } from "./props/vehicles";

/**
 * The occasional passing vehicle.
 *
 * A few vehicles shuttle between the two side roads (layout.ts, SIDE_ROADS).
 * Each waits in the back lane round the corner, out of sight, then drives
 * out through the side road, down the street keeping left (as in India),
 * into the other side road, and waits again. Nothing ever appears or
 * vanishes.
 *
 * To keep it calm, and so they never meet head-on in a side road, only ONE
 * vehicle is on the move at a time, with a pause between them.
 *
 * They stop if you're in the way, or someone walking is (and honk: a hook
 * for phase 6's sound), and
 * you can't walk through them: each has a collider that moves with it.
 */

type End = "south" | "north";

type Mover = {
  kind: VehicleKind;
  group: THREE.Group;
  wheels: { mesh: THREE.Mesh; radius: number }[];
  collider: Box;
  length: number;
  width: number;
  cruise: number;
  /** Where it waits at each end. */
  slots: Record<End, THREE.Vector3>;
  at: End;
  /** Seconds left to wait before it may set off. */
  wait: number;
  /** While driving: the route, how far along it is, and its speed. */
  route: THREE.CatmullRomCurve3 | null;
  routeLength: number;
  travelled: number;
  speed: number;
  stoppedFor: number;
};

/** Offsets across the street of each direction's lane (Indian traffic keeps left). */
const LANE = { north: -1.0, south: 0.95 };
/** Speeds, m/s. */
const CRUISE: Record<VehicleKind, number> = { bicycle: 3, auto: 4.5, scooter: 5.5, motorcycle: 5.5, rickshaw: 2.5 };
/** Speed through the side roads and their turns. */
const SLOW = 2.0;
/** Pause between one vehicle arriving and the next setting off, seconds. */
const GAP = 7;

export type Traffic = {
  group: THREE.Group;
  colliders: Box[];
  /** `walkers`: where the people walking the street are (they stop for them too). */
  update(dt: number, player: THREE.Vector3, walkers?: readonly THREE.Vector3[]): void;
  /** Called when a vehicle honks at the player (phase 6 plays the sound). */
  onHonk: (at: THREE.Vector3) => void;
};

export function buildTraffic(): Traffic {
  const rng = makeRng(31);
  const group = new THREE.Group();
  group.name = "traffic";

  // who starts where, and how long before they first go
  const cast: { kind: VehicleKind; start: End; slot: number; firstWait: number }[] = [
    { kind: "auto", start: "south", slot: 0, firstWait: 4 },
    { kind: "scooter", start: "north", slot: 1, firstWait: 0 },
    { kind: "bicycle", start: "south", slot: 2, firstWait: 0 },
  ];
  const movers = cast.map((c, i) => makeMover(c.kind, c.slot, c.start, c.firstWait + i * 0.01, rng, group));

  let moving: Mover | null = null;
  let quietFor = 0; // seconds since the last vehicle finished

  const traffic: Traffic = {
    group,
    colliders: movers.map((m) => m.collider),
    onHonk: () => {},
    update(dt, player, walkers = []) {
      for (const m of movers) m.wait = Math.max(0, m.wait - dt);
      if (!moving) {
        quietFor += dt;
        // the vehicle that has waited longest goes next, once the street has been quiet a while
        const next = movers.filter((m) => m.wait === 0).sort((a, b) => a.wait - b.wait)[0];
        if (next && quietFor > GAP) {
          depart(next);
          moving = next;
        }
      }
      if (moving) {
        if (drive(moving, dt, [player, ...walkers], traffic.onHonk)) {
          moving.wait = rng.range(10, 30);
          moving = null;
          quietFor = 0;
        }
      }
    },
  };
  return traffic;
}

/** Make one vehicle, with its rider, waiting at its slot. */
function makeMover(kind: VehicleKind, slot: number, start: End, wait: number, rng: Rng, group: THREE.Group): Mover {
  const v = buildVehicle(kind, rng, true);
  addRider(v.parts, v.seat, rng);
  const g = new THREE.Group();
  g.name = `mover:${kind}`;
  g.add(v.parts.build(kind));
  const wheels = v.wheels.map((w) => {
    const p = new Parts();
    p.cylinder(w.radius, w.radius, w.width, 0, 0, 0, PAL.tyre, { rx: Math.PI / 2, segments: 14 });
    p.box(w.radius * 1.6, 0.03, w.width + 0.02, 0, 0, 0, PAL.chrome); // a hub bar, so you can see it turn
    const mesh = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true }));
    mesh.position.set(w.x, w.y, w.z);
    mesh.castShadow = true;
    g.add(mesh);
    return { mesh, radius: w.radius };
  });
  group.add(g);

  const slots = { south: slotPosition("south", slot), north: slotPosition("north", slot) };
  const m: Mover = {
    kind, group: g, wheels, length: v.size[0], width: v.size[1], cruise: CRUISE[kind],
    collider: boxAt(0, 0, v.size[0], v.size[1]),
    slots, at: start, wait, route: null, routeLength: 0, travelled: 0, speed: 0, stoppedFor: 0,
  };
  // park it at its slot, facing along the back lane toward the side road
  const toward = sideRoadMouth(start);
  pose(m, slots[start], new THREE.Vector3().subVectors(toward, slots[start]));
  return m;
}

/**
 * The waiting spots in a side road's back lane: along the inner half of
 * the lane (the outer half is left free to drive past them), two on one side
 * of the side road and one on the other.
 */
function slotPosition(end: End, slot: number): THREE.Vector3 {
  const r = SIDE_ROADS[end];
  const sign = r.side === "left" ? -1 : 1;
  const inner = SIDE_ROAD_SETBACK + PLOT_DEPTH + 1.7;
  // away from the street's end: toward the middle of the street
  const s = end === "south"
    ? [r.s1 + 3.5, r.s1 + 6.5, r.s0 - 3.5][slot]
    : [r.s0 - 3.5, r.s0 - 6.5, r.s1 + 3.5][slot];
  const p = pointAt(s, sign * inner);
  return new THREE.Vector3(p.x, 0, p.z);
}

/** The middle of a side road, at the back lane. */
function sideRoadMouth(end: End): THREE.Vector3 {
  const r = SIDE_ROADS[end];
  const sign = r.side === "left" ? -1 : 1;
  const p = pointAt((r.s0 + r.s1) / 2, sign * (SIDE_ROAD_SETBACK + PLOT_DEPTH + 2.5));
  return new THREE.Vector3(p.x, 0, p.z);
}

/** Plan a route from the vehicle's slot to its slot at the other end, and set off. */
function depart(m: Mover) {
  const from = m.at;
  const to: End = from === "south" ? "north" : "south";
  const points: THREE.Vector3[] = [m.slots[from].clone(), besideSlot(from, m.slots[from])];
  points.push(...sideRoadPoints(from, "out", m.slots[from]));
  // along the street, keeping left for the direction of travel
  const lane = to === "north" ? LANE.north : LANE.south;
  const sA = to === "north" ? SIDE_ROADS.south.s1 + 3 : SIDE_ROADS.north.s0 - 3;
  const sB = to === "north" ? SIDE_ROADS.north.s0 - 3 : SIDE_ROADS.south.s1 + 3;
  const step = sB > sA ? 6 : -6;
  for (let s = sA; step > 0 ? s <= sB : s >= sB; s += step) {
    const p = pointAt(s, lane);
    points.push(new THREE.Vector3(p.x, 0, p.z));
  }
  points.push(...sideRoadPoints(to, "in", m.slots[to]));
  points.push(besideSlot(to, m.slots[to]), m.slots[to].clone());
  m.route = new THREE.CatmullRomCurve3(points, false, "centripetal");
  m.routeLength = m.route.getLength();
  m.travelled = 0;
  m.speed = 0;
  m.at = to;
}

/**
 * A point in the outer half of the back lane, level with a slot but a little
 * nearer the side road. Vehicles drive along the outer half until here, and
 * only then pull in to their slot, so they pass other waiting vehicles
 * side by side instead of cutting across them.
 */
function besideSlot(end: End, slot: THREE.Vector3): THREE.Vector3 {
  const r = SIDE_ROADS[end];
  const sign = r.side === "left" ? -1 : 1;
  const mid = (r.s0 + r.s1) / 2;
  const s = sAlong(slot, mid);
  const p = pointAt(s - Math.sign(s - mid) * 1.8, sign * (SIDE_ROAD_SETBACK + PLOT_DEPTH + r.lane - 1.4));
  return new THREE.Vector3(p.x, 0, p.z);
}

/**
 * The points through a side road: from the back lane (driving along its outer
 * half, clear of the waiting vehicles), through the gap, to the street.
 * `in` gives the same points reversed. The first lane point is on the same
 * side of the gap as the vehicle's slot, so it never drives past the gap and
 * doubles back.
 */
function sideRoadPoints(end: End, dir: "out" | "in", slot: THREE.Vector3): THREE.Vector3[] {
  const r = SIDE_ROADS[end];
  const sign = r.side === "left" ? -1 : 1;
  const mid = (r.s0 + r.s1) / 2;
  const outer = SIDE_ROAD_SETBACK + PLOT_DEPTH + r.lane - 1.4;
  const slotSide = Math.sign(sAlong(slot, mid) - mid) || 1;
  const pts = [
    pointAt(mid + slotSide * 2.5, sign * outer),
    pointAt(mid, sign * (SIDE_ROAD_SETBACK + PLOT_DEPTH - 1)),
    pointAt(mid, sign * (SIDE_ROAD_SETBACK + 1)),
    pointAt(mid + (end === "south" ? 2 : -2), sign * 1.8),
  ].map((p) => new THREE.Vector3(p.x, 0, p.z));
  return dir === "out" ? pts : pts.reverse();
}

/** Roughly how far along the street a point is, searching near `guess` (good enough to tell sides). */
function sAlong(p: THREE.Vector3, guess: number): number {
  let best = guess, bestD = Infinity;
  for (let s = guess - 15; s <= guess + 15; s += 0.5) {
    const c = pointAt(s, 0);
    const d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/** Drive one frame along the route. Returns true when the vehicle has arrived. */
function drive(m: Mover, dt: number, people: readonly THREE.Vector3[], honk: (at: THREE.Vector3) => void): boolean {
  const route = m.route!;
  const u = Math.min(1, m.travelled / m.routeLength);
  const pos = route.getPointAt(u);
  const dir = route.getTangentAt(u);

  // slow near both ends of the route (the side roads and their turns)
  const fromEnds = Math.min(m.travelled, m.routeLength - m.travelled);
  let target = fromEnds < 22 ? SLOW : m.cruise;
  // stop for the player, or anyone walking, in front of us, in our path
  // (0.45 m: a body's radius plus a little; more, and someone standing at
  // the road's edge would hold traffic up forever)
  const blocked = people.some((p) => {
    const dx = p.x - pos.x, dz = p.z - pos.z;
    const ahead = dx * dir.x + dz * dir.z;
    const across = Math.abs(dx * dir.z - dz * dir.x);
    return ahead > 0 && ahead < m.length / 2 + 3.5 && across < m.width / 2 + 0.45;
  });
  if (blocked) target = 0;
  // ease toward the target speed: gentle pull-away, firmer braking
  const rate = target < m.speed ? 4 : 1.2;
  m.speed += (target - m.speed) * (1 - Math.exp(-rate * dt));
  if (blocked && m.speed < 0.3) m.speed = 0;

  // honk after being held up for a moment, then every few seconds
  if (blocked) {
    m.stoppedFor += dt;
    if (m.stoppedFor > 1.2) {
      honk(pos.clone());
      m.stoppedFor = -3.5;
    }
  } else m.stoppedFor = 0;

  m.travelled += m.speed * dt;
  const rolled = m.speed * dt;
  for (const w of m.wheels) w.mesh.rotation.z -= rolled / w.radius;
  pose(m, pos, dir);
  if (m.travelled >= m.routeLength) {
    m.route = null;
    return true;
  }
  return false;
}

/** Put the vehicle at `pos`, facing along `dir`, and move its collider with it. */
function pose(m: Mover, pos: THREE.Vector3, dir: THREE.Vector3) {
  m.group.position.copy(pos);
  // the vehicle's nose is its +x: turn +x onto the direction of travel
  m.group.rotation.y = Math.atan2(-dir.z, dir.x);
  m.collider.cx = pos.x;
  m.collider.cz = pos.z;
  m.collider.rot = m.group.rotation.y;
}
