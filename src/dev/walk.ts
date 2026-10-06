import { type Box, pushOut } from "../core/colliders";
import { SIDE_ROADS, SLOTS, STREET_LENGTH, pointAt } from "../world/layout";
import { MOHALLA, MOHALLA_EXTENT, inMohalla } from "../world/mohalla";
import { STATION, inStation } from "../world/station";
import { CRICKET_LANE, SCHOOL, SCHOOL_ROAD } from "../world/schoolRoad";
import { HOME_LANE, LANE_ROAD, MOUTH_POINT, SCHOOL_TAIL } from "../world/homeLane";
import { BUS_STAND, CHOWK, COURT, COURT_ROAD } from "../world/town";

/**
 * Dev-only walk check: can the player actually get everywhere?
 *
 * Props can seal off a path without anything looking wrong (a cart parked
 * across a lane still renders perfectly). So instead of trusting screenshots,
 * this floods outward from the start over a grid, stepping only onto spots
 * where the player's body fits (the same collision test the player uses),
 * then reports which important places were reached, and the narrowest the
 * walkable street gets. (Sakura Crossing's most useful lesson.)
 *
 *   __walkCheck()   in the browser console
 */

const CELL = 0.3; // grid spacing, metres
const RADIUS = 0.3; // the player's body radius (core/player.ts)

export type WalkReport = {
  reached: Record<string, boolean>;
  /** Narrowest clear width across the street, and where. */
  narrowest: { width: number; s: number };
  cells: number;
  ms: number;
};

export function walkCheck(colliders: readonly Box[]): WalkReport {
  const t0 = performance.now();
  // the area to search: the street's bounding box, with room for galis and side roads
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  // (and on into the chowk at the bazaar's north end, and court road: world/town.ts)
  const grow = (p: { x: number; z: number }) => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  };
  for (let s = -2; s <= STREET_LENGTH + CHOWK.depth + 4; s += 2) for (const off of [-20, 20]) grow(pointAt(s, off));
  for (let s = 0; s <= COURT_ROAD.length + BUS_STAND.depth + 12; s += 2) for (const off of [-30, 30]) grow(COURT_ROAD.pointAt(s, off));
  for (let u = 0; u <= MOHALLA_EXTENT.u1; u += 2) for (const v of [MOHALLA_EXTENT.v0, MOHALLA_EXTENT.v1]) grow(inMohalla(u, v));
  for (const u of [0, STATION.enclosure.west + 2]) for (const v of [-STATION.line.walk - 2, STATION.line.walk + 2]) grow(inStation(u, v));
  for (let s = 0; s <= SCHOOL_ROAD.length; s += 10) for (const off of [-SCHOOL.school.depth - 5, SCHOOL.park.depth + 5]) grow(SCHOOL_ROAD.pointAt(s, off));
  for (let s = 0; s <= LANE_ROAD.length; s += 10) for (const off of [-HOME_LANE.half - 12, HOME_LANE.half + 12]) grow(LANE_ROAD.pointAt(s, off));
  const nx = Math.ceil((maxX - minX) / CELL), nz = Math.ceil((maxZ - minZ) / CELL);
  const index = (x: number, z: number) => Math.round((x - minX) / CELL) + Math.round((z - minZ) / CELL) * nx;

  // Only colliders near a spot matter: bucket them on a coarse grid first.
  const BUCKET = 6;
  const buckets = new Map<string, Box[]>();
  for (const b of colliders) {
    const r = Math.hypot(b.hx, b.hz) + RADIUS;
    for (let x = Math.floor((b.cx - r) / BUCKET); x <= Math.floor((b.cx + r) / BUCKET); x++) {
      for (let z = Math.floor((b.cz - r) / BUCKET); z <= Math.floor((b.cz + r) / BUCKET); z++) {
        const key = `${x},${z}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(b);
      }
    }
  }
  const probe = { x: 0, z: 0 };
  const fits = (x: number, z: number) => {
    const near = buckets.get(`${Math.floor(x / BUCKET)},${Math.floor(z / BUCKET)}`);
    if (!near) return true;
    probe.x = x; probe.z = z;
    pushOut(probe, RADIUS, near);
    return probe.x === x && probe.z === z; // nothing pushed it: the body fits here
  };

  // flood fill from the start
  const seen = new Uint8Array(nx * nz);
  const start = pointAt(1.5, 0);
  const queue: number[] = [index(start.x, start.z)];
  seen[queue[0]] = 1;
  let cells = 0;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    cells++;
    const cx = i % nx, cz = Math.floor(i / nx);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
      const j = x + z * nx;
      if (seen[j]) continue;
      seen[j] = 2; // tested
      if (!fits(minX + x * CELL, minZ + z * CELL)) continue;
      seen[j] = 1; // reachable
      queue.push(j);
    }
  }
  const isReached = (s: number, off: number) => near(pointAt(s, off));
  const onCourtRoad = (s: number, off: number) => near(COURT_ROAD.pointAt(s, off));
  function near(p: { x: number; z: number }) {
    // any reachable cell within a cell's width counts
    for (const [dx, dz] of [[0, 0], [CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) {
      if (seen[index(p.x + dx, p.z + dz)] === 1) return true;
    }
    return false;
  }

  // the places that must be reachable
  const toward = (o: number) => o - Math.sign(o) * 1.4; // in front of a stall, on the street side
  const reached: Record<string, boolean> = {
    northEnd: isReached(STREET_LENGTH - 1, 0),
    cafeStairDoor: isReached(175.4, 2.9),
    leftGali: isReached(59.5, -9),
    cricketGali: isReached(120, 9),
    templeSteps: isReached(95.4, -2.9),
    southSideRoad: isReached((SIDE_ROADS.south.s0 + SIDE_ROADS.south.s1) / 2, 11),
    northSideRoad: isReached((SIDE_ROADS.north.s0 + SIDE_ROADS.north.s1) / 2, -11),
    chaiTapri: isReached(SLOTS.chaiTapri.s, toward(SLOTS.chaiTapri.offset)),
    golgappa: isReached(SLOTS.golgappa.s, toward(SLOTS.golgappa.offset)),
    kachori: isReached(SLOTS.kachoriSamosa.s, toward(SLOTS.kachoriSamosa.offset)),
    jalebi: isReached(SLOTS.jalebi.s, toward(SLOTS.jalebi.offset)),
    iceGola: isReached(SLOTS.iceGola.s, toward(SLOTS.iceGola.offset)),
    // the chowk: round the clock tower's island, and its far corners
    chowkByTower: isReached(STREET_LENGTH + CHOWK.depth / 2, CHOWK.island + 1.2),
    chowkNorthWest: isReached(STREET_LENGTH + CHOWK.depth - 2, -CHOWK.half + 2),
    chowkNorthEast: isReached(STREET_LENGTH + CHOWK.depth - 2, CHOWK.half - 2),
    // court road: the footpath by the typists, the court's yard (through the gate), the far end
    typists: onCourtRoad(COURT.s0 + 3, -4.6),
    courtYard: onCourtRoad((COURT.s0 + COURT.s1) / 2, COURT.building.front + 4),
    courtRoadEnd: onCourtRoad(COURT_ROAD.length - 3, 0),
    // the bus stand: under the shed, by the booking windows, the far corner
    busShed: onCourtRoad(BUS_STAND.s0 + 6, -BUS_STAND.half + 2.6),
    bookingWindow: onCourtRoad(BUS_STAND.s0 + BUS_STAND.depth - 5, -BUS_STAND.half + 4.7),
    busStandFarCorner: onCourtRoad(BUS_STAND.s0 + BUS_STAND.depth - 2, BUS_STAND.half - 2),
    // the old mohalla: its square (past the peepal), the far corner of the loop, and back up lane D
    mohallaSquare: near(inMohalla(MOHALLA.square.u1 - 2.5, MOHALLA.square.v0 + 2)),
    mohallaLoopCorner: near(inMohalla(MOHALLA.laneB, MOHALLA.laneC)),
    mohallaLaneD: near(inMohalla(MOHALLA.laneD, MOHALLA.laneC / 2)),
    // the way to the station: round the back lane's corner, the crossing, along the line, up the
    // platform's ramp (the platform itself is up a step this check doesn't climb)
    // school road: its far end, through the school's gate to the playground, into the park, along the cricket lane
    schoolRoadEnd: near(SCHOOL_TAIL.pointAt(SCHOOL_TAIL.length - HOME_LANE.half, 0)),
    // the home lane: its middle, and its mouth beside home's door (the loop closed)
    homeLaneMiddle: near(LANE_ROAD.pointAt(LANE_ROAD.length / 2, 0)),
    homeLaneMouth: near(MOUTH_POINT),
    schoolPlayground: near(SCHOOL_ROAD.pointAt((SCHOOL.school.s0 + SCHOOL.school.s1) / 2 + 4, -SCHOOL.setback - 6)),
    parkFountain: near(SCHOOL_ROAD.pointAt((SCHOOL.park.s0 + SCHOOL.park.s1) / 2 - 4, SCHOOL.setback + 12)),
    cricketLane: near(CRICKET_LANE.pointAt(CRICKET_LANE.length / 2, 0)),
    stationLane: near(inStation(45, 0)),
    levelCrossing: near(inStation(STATION.railway.track, 0)),
    alongTheLine: near(inStation(STATION.railway.track + 3, 50)),
    platformRamp: near(inStation(STATION.platform.edge + 3, STATION.platform.rampTop + 0.5)),
  };

  // the narrowest clear walkable width across the street, every metre
  let narrowest = { width: Infinity, s: 0 };
  for (let s = 2; s < STREET_LENGTH - 1; s += 1) {
    let run = 0, best = 0;
    for (let off = -3.3; off <= 3.3; off += 0.1) {
      run = isReached(s, off) ? run + 0.1 : 0;
      best = Math.max(best, run);
    }
    if (best < narrowest.width) narrowest = { width: +best.toFixed(1), s };
  }
  return { reached, narrowest, cells, ms: Math.round(performance.now() - t0) };
}
