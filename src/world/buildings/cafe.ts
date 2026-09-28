import { PAL } from "../../render/palette";
import { type BuildContext, type BuildResult, FACADE, body, ledge, roof } from "./common";
import { GROUND_TOP, PLINTH_H, shopfront } from "./shop";

/**
 * The cyber cafe building: the destination of the walk.
 *
 *   front view (the cafe is on the right-hand side of the street, so from the
 *   street its local +x end is the end nearer the start)
 *
 *   ┌──────────────────────────────────┐
 *   │ [        CYBER CAFE board       ]│ ← painted in phase 3
 *   │ ▓▓▓▓▓▓▓ first-floor windows ▓▓▓▓▓│█ ← blade sign, sticking out
 *   ├══════════════════════════════════┤█   into the street (seen from
 *   │ [ STD PCO ISD board ]    │[1st ↑]│    far down the street)
 *   │  open shop below          │ stair │
 *   │                           │ door  │
 *   └───────────────────────────┴───────┘
 *
 * The stair doorway is dark and closed off for now; the stairs up to the cafe
 * are built in phase 7.
 */

const FIRST_FLOOR_TOP = 8.2;

export function buildCafe(c: BuildContext): BuildResult {
  const p = c.parts;
  const face = -FACADE.shop;
  const half = c.w / 2;
  // the stair doorway occupies this strip at the +x end
  const door = { x0: half - 2.0, x1: half - 0.8 };

  p.slab(-half, half, 0, PLINTH_H, face - 2.6, 0, PAL.plinth); // platform
  p.slab(-half, half, PLINTH_H - 0.06, PLINTH_H, -0.12, 0, PAL.stoneTrim);

  // ground floor: the STD/PCO shop, then the stair door
  const shopSign = shopfront(c, -half, door.x0 - 0.2, face, "stdShop");
  p.slab(door.x0 - 0.2, door.x0, 0, GROUND_TOP, -2, face, c.wall); // wall between shop and stairs
  p.slab(door.x1, half, 0, GROUND_TOP, -2, face, c.wall); // wall at the end
  p.slab(door.x0, door.x1, 2.7, GROUND_TOP, -2, face, c.wall); // over the door
  // closes the stairwell (for now). Its front stops 5 cm behind the dark back
  // panel below: two faces at the same depth flicker ("z-fighting").
  p.slab(door.x0, door.x1, 0, GROUND_TOP, -9, -2.1, c.wall);
  // the doorway: a frame, the first two steps going up into the dark
  p.slab(door.x0 - 0.12, door.x1 + 0.12, 2.7, 2.84, face, face + 0.06, PAL.stoneTrim);
  p.slab(door.x0, door.x1, PLINTH_H, 2.7, -2.05, -2, PAL.shopInside);
  p.slab(door.x0, door.x1, PLINTH_H, PLINTH_H + 0.18, face - 0.35, face, PAL.stoneTrim);
  p.slab(door.x0, door.x1, PLINTH_H, PLINTH_H + 0.36, face - 0.7, face - 0.35, PAL.stoneTrim);
  // a small board over the door: "Cyber Cafe, 1st floor ↑" (phase 3)
  const doorSign = { kind: "cafeDoor" as const, x: (door.x0 + door.x1) / 2, y: 3.3, z: face + 0.08, w: 1.4, h: 0.6 };
  p.box(doorSign.w, doorSign.h, 0.08, doorSign.x, doorSign.y, face + 0.04, PAL.cafeSign);

  // first floor: the cafe itself, behind a long strip of windows
  body(c, 3.7, FIRST_FLOOR_TOP, face);
  ledge(c, GROUND_TOP, face);
  p.slab(-half + 0.5, half - 0.5, 5.25, 6.75, face, face + 0.05, PAL.wood); // window frame
  p.slab(-half + 0.6, half - 0.6, 5.35, 6.65, face + 0.05, face + 0.09, PAL.windowDark);
  for (let x = -half + 0.6 + 1.6; x < half - 0.8; x += 1.6) {
    p.slab(x - 0.04, x + 0.04, 5.35, 6.65, face + 0.09, face + 0.12, PAL.wood); // mullions
  }

  // the main board across the front: "CYBER CAFE" (phase 3)
  const mainSign = { kind: "cafe" as const, x: 0, y: 7.45, z: face + 0.1, w: c.w - 0.4, h: 1.0 };
  p.box(mainSign.w, mainSign.h, 0.1, 0, mainSign.y, face + 0.05, PAL.cafeSign);

  // the blade sign: a tall board sticking out from the wall into the street,
  // edge-on to the facade, so it can be read from far down the street
  const blade = { x: half - 0.35, y0: 4.9, y1: 7.3, z0: face, z1: 0.6 };
  p.slab(blade.x - 0.07, blade.x + 0.07, blade.y0, blade.y1, blade.z0, blade.z1, PAL.cafeSign);
  for (const y of [blade.y0 + 0.2, blade.y1 - 0.2]) {
    p.box(0.05, 0.05, blade.z1 - blade.z0 + 0.1, blade.x, y, (blade.z0 + blade.z1) / 2, PAL.metal); // brackets
  }
  const bladeSign = {
    kind: "cafeBlade" as const,
    x: blade.x + 0.08, // the face toward the start of the street
    y: (blade.y0 + blade.y1) / 2,
    z: (blade.z0 + blade.z1) / 2,
    w: blade.z1 - blade.z0,
    h: blade.y1 - blade.y0,
    ry: Math.PI / 2,
    backOffset: 0.16, // the board is 0.14 thick: its other face, read by people walking the other way
  };

  const height = roof(c, FIRST_FLOOR_TOP, face);
  return { height, signs: [shopSign, doorSign, mainSign, bladeSign] };
}
