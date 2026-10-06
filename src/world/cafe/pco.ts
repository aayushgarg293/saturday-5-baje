import * as THREE from "three";
import type { Parts } from "../kit";
import type { WorldSign } from "../street";

/**
 * The STD·ISD·PCO booth on the cafe building's ground floor, the shop you pass
 * just before the cafe's stair: two phone cabins with glass doors along the
 * left, a meter on the shelf by each phone, the counter on the right with the
 * red coin phone, a jar of toffees, the big meter display facing the street,
 * the receipt printer and the register, recharge cards hanging on a string,
 * the Xerox machine in the corner, the rate chart on the wall.
 *
 * This file is the booth's plan (where everything is) and its still pieces,
 * built into the cafe building's own mesh (world/buildings/cafe.ts calls
 * `furnishPco`): no extra draw calls. What moves, glows or talks (the people,
 * the meters, the handset) is people/pco.ts.
 *
 * All in the cafe BUILDING's frame (x across the frontage, +x toward the
 * stair; z back from the street; y up from the street).
 */

/** The shop room: its inside faces, its floor (the platform's top). */
export const PCO = { x0: -4.7, x1: 2.5, face: -1.1, back: -3.7, floor: 0.45 };
/** A phone cabin: its width, depth back from the front, height. Cabin 0 is the left one (from the street). */
export const CABIN = { w: 0.95, d: 1.15, h: 2.1 };
/** The cabins' fronts (their doors). */
export const CABIN_FRONT = PCO.back + CABIN.d;
/** The middle of cabin `i`, across. */
export const cabinX = (i: number) => PCO.x0 + (i + 0.5) * CABIN.w;
/** The shelf in each cabin, on the back wall: its top, how far out it comes. */
export const SHELF = { y: 1.0, z: PCO.back + 0.15 };
/** Where each cabin's phone and meter stand on the shelf (x from the cabin's middle; y above the floor). */
export const PHONE = { dx: -0.06, y: SHELF.y + 0.05 };
export const METER = { dx: 0.17, y: SHELF.y + 0.06, face: PCO.back + 0.15 + 0.051, w: 0.12, h: 0.045 };
/** The counter: its ends, front (z1) and back (z0), top (above the floor). */
export const COUNTER = { x0: 0.1, x1: 2.0, z0: -1.85, z1: -1.35, top: 0.95 };
/** The big meter display on the counter, facing the street. */
export const DISPLAY = { x: 1.15, y: COUNTER.top + 0.08, face: COUNTER.z1 - 0.08 + 0.051, w: 0.28, h: 0.09 };
/** The receipt printer (the owner tears the slips off it). */
export const PRINTER = { x: 1.62, z: COUNTER.z0 + 0.15 };
/** The owner's stool behind the counter, and its height. */
export const OWNER = { x: 1.25, z: -2.35, turn: 0, seat: 0.72 };

const WOOD = 0x7a5230, WOOD_LIGHT = 0x9c7446, PLY = 0xb08a5a, PLY_DARK = 0x6a4a2a;
const GLASS = 0xc6dde3, BEIGE = 0xe8dcc0, BLACK = 0x1c1c1e;

/** The booth's still pieces, added to the cafe building's parts. */
export function furnishPco(p: Parts) {
  const f = PCO.floor;

  // --- the two cabins ----------------------------------------------------------------------
  for (let i = 0; i < 2; i++) {
    const xa = PCO.x0 + i * CABIN.w, xb = xa + CABIN.w, cx = cabinX(i);
    const front = CABIN_FRONT;
    // plywood side walls (the room's own side wall is the first cabin's left), the header over the door
    p.slab(xb - 0.04, xb, f, f + CABIN.h, PCO.back, front, PLY);
    p.slab(xa, xb, f + CABIN.h - 0.12, f + CABIN.h, front - 0.04, front, PLY_DARK);
    p.slab(xa, xa + 0.1, f, f + CABIN.h, front - 0.04, front, PLY_DARK); // door posts
    p.slab(xb - 0.1, xb, f, f + CABIN.h, front - 0.04, front, PLY_DARK);
    // the door: hinged at its left post; the first cabin's stands open (someone's on the phone), the second's is shut
    door(p, xa + 0.1, front - 0.02, CABIN.w - 0.2, i === 0 ? 1.2 : 0);
    // the shelf, the phone, the meter beside it (its glowing numbers: people/pco.ts)
    p.box(0.62, 0.03, 0.3, cx, f + SHELF.y - 0.015, SHELF.z, WOOD);
    p.box(0.2, 0.07, 0.17, cx + PHONE.dx, f + PHONE.y - 0.015, SHELF.z, BEIGE);
    p.box(0.08, 0.004, 0.07, cx + PHONE.dx, f + PHONE.y + 0.022, SHELF.z + 0.02, 0x5a5650); // the keypad
    if (i === 1) p.box(0.2, 0.04, 0.05, cx + PHONE.dx, f + PHONE.y + 0.04, SHELF.z - 0.05, BEIGE); // its handset, hung up
    p.box(0.15, 0.09, 0.1, cx + METER.dx, f + METER.y, SHELF.z, BLACK);
    // a stool in the empty one
    if (i === 1) {
      p.cylinder(0.15, 0.15, 0.04, cx, f + 0.46, PCO.back + 0.6, WOOD_LIGHT, { segments: 12 });
      p.cylinder(0.02, 0.02, 0.44, cx, f + 0.22, PCO.back + 0.6, 0x5a5a5c, { segments: 6 });
    }
  }

  // --- the counter -------------------------------------------------------------------------
  const c = COUNTER, top = f + c.top;
  p.slab(c.x0, c.x1, f, top - 0.04, c.z0, c.z1, WOOD);
  p.slab(c.x0 - 0.03, c.x1 + 0.03, top - 0.04, top, c.z0 - 0.03, c.z1 + 0.03, WOOD_LIGHT);
  // the coin phone at the front corner, for local calls: red, with its yellow front and black handset
  p.box(0.2, 0.3, 0.15, 0.36, top + 0.15, c.z1 - 0.12, 0xc62f2a);
  p.box(0.16, 0.12, 0.01, 0.36, top + 0.2, c.z1 - 0.04, 0xf2c81f);
  p.box(0.03, 0.006, 0.004, 0.36, top + 0.27, c.z1 - 0.034, BLACK); // the coin slot
  p.box(0.05, 0.2, 0.05, 0.49, top + 0.16, c.z1 - 0.12, BLACK);
  // two jars of toffees
  for (const [x, sweets] of [[0.66, 0xe8612c], [0.8, 0xf2c81f]] as const) {
    p.cylinder(0.065, 0.065, 0.16, x, top + 0.08, c.z1 - 0.12, GLASS, { segments: 10 });
    p.cylinder(0.055, 0.055, 0.1, x, top + 0.055, c.z1 - 0.12, sweets, { segments: 10 }); // (showing through the glass)
    p.cylinder(0.07, 0.07, 0.03, x, top + 0.175, c.z1 - 0.12, 0xc62f2a, { segments: 10 });
  }
  // the big meter display, facing the street (its numbers: people/pco.ts)
  p.box(0.32, 0.12, 0.1, DISPLAY.x, f + DISPLAY.y, c.z1 - 0.08, BLACK);
  // the receipt printer, a slip curling out of it; the register, open
  p.box(0.22, 0.1, 0.2, PRINTER.x, top + 0.05, PRINTER.z, 0xd8d2c0);
  p.box(0.08, 0.12, 0.004, PRINTER.x, top + 0.14, PRINTER.z + 0.06, 0xfbfaf4);
  p.box(0.36, 0.015, 0.25, 1.15, top + 0.008, c.z0 + 0.13, 0x3a4a6a);
  p.box(0.34, 0.012, 0.23, 1.15, top + 0.02, c.z0 + 0.13, 0xf4f0e0);
  // the owner's revolving stool
  p.cylinder(0.17, 0.17, 0.05, OWNER.x, f + OWNER.seat - 0.025, OWNER.z, 0x3a3a3c, { segments: 12 });
  p.cylinder(0.025, 0.025, OWNER.seat - 0.05, OWNER.x, f + (OWNER.seat - 0.05) / 2, OWNER.z, 0x8a8c90, { segments: 6 });
  p.cylinder(0.2, 0.2, 0.03, OWNER.x, f + 0.015, OWNER.z, 0x8a8c90, { segments: 10 });
  // recharge cards hanging on a string across the front of the counter, in the networks' colours
  const stringY = f + 2.25, stringZ = c.z1 + 0.03;
  p.strut({ x: c.x0 + 0.05, y: stringY, z: stringZ }, { x: c.x1 - 0.05, y: stringY, z: stringZ }, 0.004, 0xe8e2d0, 4);
  const cards = [0xd32f2f, 0xe8612c, 0xf2c81f, 0x1f5fb0, 0xd32f2f, 0x2e7d32, 0xe8612c, 0x1f5fb0, 0xf2c81f, 0xd32f2f];
  cards.forEach((colour, k) => {
    const x = c.x0 + 0.2 + k * ((c.x1 - c.x0 - 0.4) / (cards.length - 1));
    p.box(0.07, 0.11, 0.004, x, stringY - 0.065, stringZ, colour, { rz: ((k % 3) - 1) * 0.06 });
  });

  // --- the Xerox machine, in the back corner -----------------------------------------------
  const xx = 2.08, xz = PCO.back + 0.35;
  p.box(0.6, 0.85, 0.55, xx, f + 0.425, xz, 0xd8d2c0);
  p.box(0.58, 0.04, 0.45, xx, f + 0.87, xz - 0.03, 0x4a4a4c); // the lid
  p.box(0.18, 0.03, 0.08, xx + 0.12, f + 0.865, xz + 0.23, 0x3a3a3c); // the buttons
  p.box(0.03, 0.012, 0.03, xx + 0.17, f + 0.885, xz + 0.23, 0x3fe07a);
  p.box(0.26, 0.015, 0.22, xx - 0.4, f + 0.6, xz, 0xf4f4f0); // the tray, a copy in it
  p.box(0.3, 0.16, 0.22, xx - 0.05, f + 0.08, xz + 0.52, 0xf4f4f0); // reams of paper on the floor
}

/**
 * A cabin door, hinged at (hx, hz), `w` wide, swung `open` radians out toward
 * the street: a plywood lower panel, glass above in a frame, a handle.
 */
function door(p: Parts, hx: number, hz: number, w: number, open: number) {
  const f = PCO.floor;
  const dx = Math.cos(open), dz = Math.sin(open); // (along the door, from its hinge)
  const ry = Math.atan2(-dz, dx); // (a box's own x turned to lie along the door)
  const piece = (u0: number, u1: number, y0: number, y1: number, depth: number, colour: number) => {
    const u = (u0 + u1) / 2;
    p.box(u1 - u0, y1 - y0, depth, hx + dx * u, f + (y0 + y1) / 2, hz + dz * u, colour, { ry });
  };
  piece(0, w, 0.08, 1.0, 0.03, PLY);
  piece(0, 0.05, 1.0, 1.96, 0.03, PLY_DARK);
  piece(w - 0.05, w, 1.0, 1.96, 0.03, PLY_DARK);
  piece(0, w, 1.94, 1.98, 0.03, PLY_DARK);
  piece(0.05, w - 0.05, 1.0, 1.94, 0.01, GLASS);
  piece(w - 0.1, w - 0.06, 1.02, 1.1, 0.06, 0xb9bcc0); // the handle
}

/**
 * The booth's paper and paint, in world terms, for world/signs.ts to paint:
 * the rate chart, a calendar, the cabins' numbers, "out of order" on the
 * second cabin's glass, and the counter's painted front. (Given to the
 * sign painter after every other sign, so the others' looks don't change.)
 */
export function pcoSigns(frame: THREE.Matrix4): WorldSign[] {
  const e = frame.elements;
  const rot = Math.atan2(e[8], e[10]); // (which way the building faces)
  const f = PCO.floor;
  const at = (kind: WorldSign["kind"], x: number, y: number, z: number, w: number, h: number, label?: string): WorldSign => ({
    kind, position: new THREE.Vector3(x, y, z).applyMatrix4(frame), rotationY: rot, w, h, label,
  });
  return [
    at("pcoRates", -1.55, f + 1.85, PCO.back, 0.9, 0.7),
    at("calendar", -0.45, f + 1.85, PCO.back, 0.36, 0.54),
    at("boothNumber", cabinX(0), f + CABIN.h - 0.06, CABIN_FRONT, 0.12, 0.09, "1"),
    at("boothNumber", cabinX(1), f + CABIN.h - 0.06, CABIN_FRONT, 0.12, 0.09, "2"),
    at("notice", cabinX(1), f + 1.55, CABIN_FRONT - 0.005, 0.34, 0.24, "OUT OF ORDER खराब है"),
    at("stdShop", (COUNTER.x0 + COUNTER.x1) / 2, f + 0.5, COUNTER.z1, COUNTER.x1 - COUNTER.x0 - 0.1, 0.42),
  ];
}
