import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { PAL } from "../../render/palette";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { BUS, buildBus, busSigns } from "../props/bus";
import type { WorldSign } from "../street";
import { BUS_STAND, inBusStand } from "../town";
import { cartWheels } from "../props/cartWheels";

/**
 * The bus stand's yard (its shops are rows like the bazaar's: world/town.ts,
 * BUS_STAND_ROWS):
 *
 *   the yard          dusty concrete, oil stains where the buses stand
 *   the north wall    a boundary wall; along it, the waiting shed: a sloping
 *                     tin roof on steel posts, concrete benches, the
 *                     timetable painted on the wall; at its east end the
 *                     booking office, two barred windows (booking, enquiry);
 *                     at its west end a chai counter
 *   the buses         two parked, noses to the shed (Jaipur, Kishangarh); a
 *                     third bay empty (the 6:30 from Jaipur pulls in there,
 *                     later: the errands)
 *   a banana cart     by the east shops
 *   lamps             two tall ones, lit at dusk
 *
 * FRAME: the yard's own: its middle at the origin, +x east, +z south (court
 * road runs due east, so it's the world's, moved). The north wall is at
 * z = −half, court road comes in at x = −depth/2.
 */

export type BusStand = { group: THREE.Group; colliders: Box[]; lamps: WorldLamp[]; signs: WorldSign[] };

const D = BUS_STAND.depth / 2, H = BUS_STAND.half;
/** The waiting shed: along the north wall, from x0 to x1, this deep. */
export const SHED = { x0: -D + 2, x1: D - 10, depth: 4.6 };
/** Where the benches are (their front edge, z), and their seat height. */
export const BENCH = { z: -H + 1.3, seat: 0.45 };
/** The bus bays: each bus's middle (x, z), noses to the shed; the third is the 6:30's. */
export const BAYS = [{ x: -9, z: -4.5 }, { x: -1, z: -4.5 }, { x: 7, z: -4.5 }];
/** Where the conductor stands: by the first bus's door (on its left: the west), and which way he faces. */
export const CONDUCTOR = { x: BAYS[0].x - BUS.width / 2 - 0.7, z: BAYS[0].z - BUS.length / 2 + 1.6, turn: -Math.PI / 2 };

/** The banana cart, by the east shops (the banana-wala stands behind it, east: people/busStand.ts). */
export const BANANA_CART = { x: D - 5.5, z: 6, length: 1.8, width: 1.0 };

const CONCRETE = 0x9a9286, WALL = 0xd8cdb4, TIN = 0x8a8f92, STEEL = 0x4a5458, CHROME_DARK = 0x6a6e70;

export function buildBusStand(): BusStand {
  const mid = inBusStand(BUS_STAND.depth / 2, 0);
  const group = new THREE.Group();
  group.name = "busStand";
  group.position.set(mid.x, 0, mid.z);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  const p = new Parts();
  const colliders: Box[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => {
    const c = toWorld((x0 + x1) / 2, 0, (z0 + z1) / 2);
    colliders.push(boxAt(c.x, c.z, x1 - x0, z1 - z0, 0));
  };

  // --- the yard: concrete, oil stains under the bays ---------------------------------------------
  p.slab(-D, D, 0, 0.012, -H, H, CONCRETE);
  for (const bay of BAYS) p.slab(bay.x - 0.9, bay.x + 0.9, 0.012, 0.016, bay.z - 2.5, bay.z + 3.5, 0x6e6a62);

  // --- the walls: the north boundary wall, and the two short bits closing the yard's west corners -------
  p.slab(-D, D, 0, 2.6, -H - 0.35, -H, WALL);
  p.slab(-D - 0.05, D + 0.05, 2.6, 2.7, -H - 0.42, -H + 0.07, PAL.stoneTrim);
  box(-D, D, -H - 0.35, -H);
  for (const side of [-1, 1]) {
    // (between court road's last buildings, 13 m out from its centre, and the yard's edge)
    const z0 = side < 0 ? -H : 12.6, z1 = side < 0 ? -12.6 : H;
    p.slab(-D - 0.35, -D, 0, 2.6, z0, z1, WALL);
    box(-D - 0.35, -D, z0, z1);
  }

  // --- the waiting shed: posts, a sloping tin roof, benches against the wall -----------------------
  const front = -H + SHED.depth;
  for (let x = SHED.x0; x <= SHED.x1 + 0.01; x += (SHED.x1 - SHED.x0) / 5) {
    p.box(0.12, 3.05, 0.12, x, 1.52, front, STEEL);
    p.box(0.12, 3.35, 0.12, x, 1.67, -H + 0.25, STEEL);
    box(x - 0.1, x + 0.1, front - 0.1, front + 0.1);
  }
  // the roof: a tin sheet from the wall (3.4 m up) down to the front posts (3.05 m)
  const slope = Math.atan2(3.4 - 3.05, SHED.depth);
  p.box(SHED.x1 - SHED.x0 + 0.6, 0.05, SHED.depth + 0.6, (SHED.x0 + SHED.x1) / 2, 3.25, -H + SHED.depth / 2, TIN, { rx: -slope });
  p.box(SHED.x1 - SHED.x0 + 0.6, 0.05, SHED.depth + 0.6, (SHED.x0 + SHED.x1) / 2, 3.2, -H + SHED.depth / 2, 0x6a6e70, { rx: -slope }); // its underside, darker
  // the benches: concrete slabs on legs
  for (let x = SHED.x0 + 1; x < SHED.x1 - 2; x += 4.4) {
    p.box(3.2, 0.08, 0.5, x + 1.6, BENCH.seat, BENCH.z - 0.25, 0xb7ab98);
    for (const dx of [0.3, 2.9]) p.box(0.12, BENCH.seat, 0.4, x + dx, BENCH.seat / 2, BENCH.z - 0.25, 0x9a9080);
    box(x, x + 3.2, BENCH.z - 0.5, BENCH.z);
  }

  // --- the booking office: a little room against the wall, two barred windows ---------------------------
  const office = { x0: SHED.x1 + 1.2, x1: D - 2.2, z1: -H + 4 };
  p.slab(office.x0, office.x1, 0, 3.1, -H, office.z1, 0xe6d9b8);
  p.slab(office.x0 - 0.1, office.x1 + 0.1, 3.1, 3.25, -H, office.z1 + 0.15, PAL.stoneTrim);
  const windows = [office.x0 + 1.4, office.x1 - 1.4];
  for (const x of windows) {
    p.box(1.3, 1.0, 0.05, x, 1.5, office.z1 + 0.025, 0x2a2622); // the opening, dark
    for (let k = -2; k <= 2; k++) p.box(0.03, 1.0, 0.03, x + k * 0.25, 1.5, office.z1 + 0.06, CHROME_DARK); // the bars
    p.box(1.4, 0.06, 0.3, x, 0.98, office.z1 + 0.15, PAL.stoneTrim); // the counter ledge
  }
  box(office.x0, office.x1, -H, office.z1);

  // --- the chai counter at the shed's west end -----------------------------------------------------
  const chai = { x: SHED.x0 + 0.6, z: front + 0.9 };
  p.box(1.4, 0.95, 0.6, chai.x + 0.7, 0.475, chai.z, 0x6a4426);
  p.cylinder(0.14, 0.12, 0.3, chai.x + 0.35, 1.1, chai.z, 0x9a9ca0, { segments: 10 }); // the kettle
  p.cylinder(0.2, 0.2, 0.12, chai.x + 0.35, 1.0, chai.z, 0x2a2622, { segments: 12 }); // the stove under it
  for (let k = 0; k < 6; k++) p.cylinder(0.03, 0.025, 0.08, chai.x + 0.8 + (k % 3) * 0.1, 0.99, chai.z - 0.1 + Math.floor(k / 3) * 0.15, 0xd8e4e4, { segments: 6 });
  box(chai.x, chai.x + 1.4, chai.z - 0.3, chai.z + 0.3);

  // --- the banana cart, by the east shops ------------------------------------------------------------
  const cart = BANANA_CART;
  p.box(1.8, 0.1, 1.0, cart.x, 0.85, cart.z, 0x7a5a34);
  cartWheels(p, { x: cart.x, z: cart.z, length: 1.8, width: 1.0, underside: 0.8, radius: 0.22 });
  for (let k = 0; k < 7; k++) {
    // bunches of bananas: curved yellow fingers, roughly (short capsules, tilted)
    const bunch = new THREE.CapsuleGeometry(0.04, 0.16, 3, 6).rotateZ(0.9 + (k % 3) * 0.2);
    for (let f = 0; f < 4; f++) p.add(bunch.clone(), cart.x - 0.7 + k * 0.22, 0.98, cart.z - 0.3 + f * 0.18, k % 4 === 0 ? 0xb8c24a : 0xe8c83a);
  }
  box(cart.x - 0.95, cart.x + 0.95, cart.z - 0.65, cart.z + 0.65);

  // --- the lamps --------------------------------------------------------------------------------------
  const lamps: WorldLamp[] = [];
  for (const [x, z] of [[-6, 9], [10, 9]]) {
    p.cylinder(0.09, 0.13, 6, x, 3, z, 0x3a3f3a, { segments: 8 });
    p.box(1.0, 0.08, 0.1, x + 0.45, 6.0, z, 0x3a3f3a);
    p.box(0.5, 0.12, 0.25, x + 0.9, 5.94, z, 0xf2ead6);
    lamps.push({ kind: "bulb", position: toWorld(x + 0.9, 5.85, z), rotationY: 0, w: 1, h: 1, back: 0, ground: 0, pole: true });
    box(x - 0.15, x + 0.15, z - 0.15, z + 0.15);
  }
  group.add(p.build("busStandYard"));

  // --- the buses, noses to the shed --------------------------------------------------------------------
  const signs: WorldSign[] = [];
  const destinations = ["जयपुर", "किशनगढ़"];
  BAYS.slice(0, 2).forEach((bay, k) => {
    const bus = buildBus(7431 + k);
    bus.position.set(bay.x, 0, bay.z);
    bus.rotation.y = Math.PI / 2; // (its +x, forward, to the north: −z)
    group.add(bus);
    bus.updateMatrixWorld(true);
    signs.push(...busSigns(bus.matrixWorld, Math.PI / 2, destinations[k]));
    box(bay.x - BUS.width / 2, bay.x + BUS.width / 2, bay.z - BUS.length / 2, bay.z + BUS.length / 2);
  });

  // --- the words on the walls: the timetable, the windows' boards -----------------------------------------
  signs.push(
    { kind: "timetable", position: toWorld(SHED.x0 + 6, 1.9, -H + 0.01), rotationY: 0, w: 3.2, h: 1.6 },
    { kind: "stallSign", position: toWorld(windows[0], 2.35, office.z1 + 0.01), rotationY: 0, w: 1.2, h: 0.32, label: "टिकट खिड़की" },
    { kind: "stallSign", position: toWorld(windows[1], 2.35, office.z1 + 0.01), rotationY: 0, w: 1.2, h: 0.32, label: "पूछताछ" },
    { kind: "stallSign", position: toWorld(chai.x + 0.7, 0.6, chai.z + 0.31), rotationY: 0, w: 1.0, h: 0.3, label: "चाय" },
  );
  return { group, colliders, lamps, signs };
}
