import { BOARD_COLOURS, PAL } from "../../render/palette";
import { PLOT_DEPTH } from "../layout";
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
  if (state > 0.72) {
    const bottom = state > 0.9 ? PLINTH_H : r.range(1.6, 2.4); // closed, or half down
    p.slab(x0 + pillar, x1 - pillar, bottom, OPENING_TOP - 0.45, face - 0.24, face - 0.2, PAL.shutter);
  }

  // awning: high against the wall, sloping down toward the street
  const awningColour = r.next() < 0.6 ? PAL.tin : PAL.tarp;
  // (its top edge meets the wall at ~3.8 m, just under the signboard)
  p.box(w + 0.1, 0.04, 1.5, mid, OPENING_TOP - 0.12, face + 0.72, awningColour, { rx: 0.3 });

  // signboard on the wall above the awning (blank until phase 3 paints it)
  const board = { w: w - 0.3, h: 0.72, y: 4.3 };
  p.box(board.w, board.h, 0.08, mid, board.y, face + 0.04, r.pick(BOARD_COLOURS));
  return { kind, x: mid, y: board.y, z: face + 0.08, w: board.w, h: board.h };
}
