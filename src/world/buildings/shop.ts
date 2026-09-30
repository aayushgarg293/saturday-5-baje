import { BOARD_COLOURS, PAL } from "../../render/palette";
import { PLOT_DEPTH } from "../layout";
import { SHOP_NAMES } from "../names";
import { dressShop, saloonChair } from "../props/goods";
import {
  type BuildContext, type BuildResult, type SignSpot,
  FACADE, FLOOR_HEIGHT, balcony, body, ledge, roof, windowRow,
} from "./common";

/**
 * A market shop: a raised platform (otla), an open shopfront with a dim room
 * behind it, a rolling shutter, a tin or tarp awning, a blank signboard
 * (painted in phase 3), and 0–2 floors of home above.
 *
 *   side view                     front view
 *        ┌──────┐ roof                ┌─────────────┐
 *        │ ▯ ▯  │ upper floor         │  ▯   ▯   ▯  │
 *        ├──────┤ ◄ ledge             ├═════════════┤
 *        │[SIGN]│                     │ [ SIGNBOARD ]│
 *     ╲──┤      │ ◄ awning          ╱─┴─────────────┴─╲
 *        │ shop │                     │ ░░ shop  ░░ │
 *   ▄▄▄▄▄┴──────┘ ◄ platform       ▄▄▄┴─────────────┴▄▄
 */

/** Height of the platform the shop floor sits on. */
export const PLINTH_H = 0.45;
/** Top of the shop opening. */
const OPENING_TOP = 3.7;
/** Top of the ground floor (the signboard sits between the opening and here). */
export const GROUND_TOP = 4.8;
/** How deep the open shop room is behind the shopfront. */
const ROOM_DEPTH = 2.6;

export function buildShop(c: BuildContext): BuildResult {
  const r = c.rng;
  const face = -FACADE.shop;

  // the platform runs the full width, from the plot front back under the shop
  c.parts.slab(-c.w / 2, c.w / 2, 0, PLINTH_H, face - ROOM_DEPTH, 0, PAL.plinth);
  c.parts.slab(-c.w / 2, c.w / 2, PLINTH_H - 0.06, PLINTH_H, -0.12, 0, PAL.stoneTrim); // worn edge

  const signs = [shopfront(c, -c.w / 2, c.w / 2, face)];

  // floors above the shop: 0, 1 or 2
  const roll = r.next();
  const upper = roll < 0.35 ? 0 : roll < 0.8 ? 1 : 2;
  const top = GROUND_TOP + upper * FLOOR_HEIGHT;
  body(c, OPENING_TOP, top, face); // lintel, sign wall and upper floors, one mass
  ledge(c, GROUND_TOP, face);
  for (let i = 0; i < upper; i++) {
    const floorY = GROUND_TOP + i * FLOOR_HEIGHT;
    windowRow(c, floorY + 1.55, face);
    if (i === 0 && r.next() < 0.45) balcony(c, floorY + 0.05, face);
    if (i > 0) ledge(c, floorY, face, 0.3);
  }
  const height = roof(c, top, face);
  return { height, signs };
}

/**
 * The open shopfront between `x0` and `x1`: side walls (which double as the
 * pillars), a dim room with a back wall and ceiling, the shutter and its
 * roll, the awning, and the signboard above. Used by shops and by the ground
 * floor of the cafe building. Returns where the signboard is.
 */
export function shopfront(
  c: BuildContext, x0: number, x1: number, face: number,
  kind: SignSpot["kind"] = "shop",
): SignSpot {
  const p = c.parts;
  const r = c.rng;
  const back = face - ROOM_DEPTH;
  const pillar = 0.3;
  const w = x1 - x0;
  const mid = (x0 + x1) / 2;

  // the room: side walls, back wall, ceiling
  p.slab(x0, x0 + pillar, PLINTH_H, OPENING_TOP, back, face, c.wall);
  p.slab(x1 - pillar, x1, PLINTH_H, OPENING_TOP, back, face, c.wall);
  p.slab(x0 + pillar, x1 - pillar, PLINTH_H, OPENING_TOP, back - 0.1, back, PAL.shopInside);
  p.slab(x0 + pillar, x1 - pillar, OPENING_TOP - 0.12, OPENING_TOP, back, face, PAL.shopInside);
  // the rest of the ground floor, behind the room
  p.slab(x0, x1, 0, OPENING_TOP, -PLOT_DEPTH, back - 0.1, c.wall);

  // rolling shutter: always the roll at the top; sometimes pulled half or all the way down
  const inner = w - pillar * 2;
  p.box(inner, 0.3, 0.3, mid, OPENING_TOP - 0.3, face - 0.2, PAL.shutter);
  const state = r.next();
  const shutter = state > 0.9 ? "closed" : state > 0.72 ? "half" : "open";
  if (shutter !== "open") {
    const bottom = shutter === "closed" ? PLINTH_H : r.range(1.6, 2.4);
    p.slab(x0 + pillar, x1 - pillar, bottom, OPENING_TOP - 0.45, face - 0.24, face - 0.2, PAL.shutter);
  }
  // the tubelight across the top of the opening, just inside (a closed shop's stays dark)
  if (shutter !== "closed") {
    c.lamps.push({ kind: "tube", x: mid, y: OPENING_TOP - 0.55, z: face - 0.45, w: Math.min(1.2, inner - 0.4), back: ROOM_DEPTH - 0.55, h: OPENING_TOP - PLINTH_H, ground: PLINTH_H });
  }

  // the ceiling fan, toward the back of the room (clear of the tubelight): its canopy and rod are
  // part of the building; the motor and blades turn, so world/fans.ts builds those
  if (shutter !== "closed") {
    const fz = face - 1.4;
    p.cylinder(0.07, 0.07, 0.04, mid, OPENING_TOP - 0.14, fz, 0xefeade, { segments: 10 });
    p.cylinder(0.016, 0.016, 0.3, mid, OPENING_TOP - 0.29, fz, 0xefeade, { segments: 6 });
    c.fans.push({ x: mid, y: OPENING_TOP - 0.44, z: fz, r: Math.min(0.72, inner / 2 - 0.15) });
  }

  // awning: high against the wall, sloping down toward the street
  const awningColour = r.next() < 0.6 ? PAL.tin : PAL.tarp;
  // (its top edge meets the wall at ~3.8 m, just under the signboard)
  p.box(w + 0.1, 0.04, 1.5, mid, OPENING_TOP - 0.12, face + 0.72, awningColour, { rx: 0.3 });

  // signboard on the wall above the awning (its lettering is painted by world/signs.ts)
  const board = { w: w - 0.3, h: 0.72, y: 4.3 };
  p.box(board.w, board.h, 0.08, mid, board.y, face + 0.04, r.pick(BOARD_COLOURS));

  // the goods, by what the shop sells
  dressShop(c, { x0: x0 + pillar, x1: x1 - pillar, face, back, floor: PLINTH_H, top: OPENING_TOP, shutter });

  // where its keeper sits: behind the counter on a tall stool (see `counter`
  // in goods.ts), or, for shops with nothing out front, on a stool on the platform
  if (kind === "shop" && shutter !== "closed" && c.shopName !== undefined && SHOP_NAMES[c.shopName].shelf === "barber") {
    // the saloon: its barber at work on a customer (people/saloon.ts), not a keeper on a stool
    const chair = saloonChair({ x0: x0 + pillar, face, back });
    c.people.push({ kind: "saloon", x: chair.x, y: PLINTH_H, z: chair.z, turn: chair.turn });
  } else if (kind === "shop" && shutter === "open" && c.shopName !== undefined && SHOP_NAMES[c.shopName].work === "tailor") {
    // the tailor on his stool, facing the street, his machine just inside the opening (people/tailor.ts)
    c.people.push({ kind: "tailor", x: mid, y: PLINTH_H, z: face - 1.0, turn: 0 });
  } else if (kind === "shop" && shutter === "open" && c.shopName !== undefined) {
    const trade = SHOP_NAMES[c.shopName].trade;
    const outside = trade === "cloth" || trade === "cycle" || trade === "general";
    c.people.push(outside
      ? { kind: "platform", x: x1 - pillar - 0.55, y: PLINTH_H, z: face + 0.55, turn: 0, trade }
      : { kind: "counter", x: mid, y: PLINTH_H, z: face - 1.15, turn: 0, trade });
  }
  return { kind, x: mid, y: board.y, z: face + 0.08, w: board.w, h: board.h, nameIndex: c.shopName };
}
