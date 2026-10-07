import * as THREE from "three";
import { PAL } from "../../render/palette";
import type { WorldLamp } from "../evening";
import { Parts } from "../kit";
import { buildSigns } from "../signs";
import type { HouseFront, WorldSign } from "../street";

/**
 * Aditi Dance Academy, on school road a few doors up from Sharma Tutorials:
 * not a shop (no shutter), but a house that's let its upstairs. An ordinary
 * house of the row (ACADEMY_HOUSE), left exactly as it was built, with these
 * added to its front:
 *
 *   the gate       a green iron grille where the door was, a dim staircase
 *                  going up behind it; a painted board over it
 *   the shoe rack  on the step beside the gate, chappals on it (shoes off
 *                  before the studio)
 *   upstairs       a new first floor on the old roof: the studio, its window
 *                  with a pink curtain half drawn and the tube light on
 *   the banner     the big flex banner across the first floor's front, tied
 *                  at its corners, a bulb over it (world/danceBanner.ts)
 *
 * Its words are painted here, apart from the town's other signs (theirs take
 * random turns in order: these mustn't shift them). No random numbers.
 *
 * FRAME: the house's (x along its front, +z out to the street, y = 0 the
 * ground; its wall's face is 10 cm behind its door).
 */

/** Which house of the row it is (its name in world/street.ts: school road, west side, 22 m down it). */
export const ACADEMY_HOUSE = "house@school:right22";

export type DanceAcademy = { group: THREE.Group; lamps: WorldLamp[] };

/** Where its gate is, in the world, once it's built: on the step, and which way is out (people/danceAcademy.ts). */
export const ACADEMY_GATE = { built: false, at: new THREE.Vector3(), out: new THREE.Vector3() };

const GRILLE = 0x2f6a45, UPSTAIRS = 0xefe2c6, STUDIO_FLOOR = 3.1;

export function buildDanceAcademy(house: HouseFront): DanceAcademy {
  const group = new THREE.Group();
  group.name = "danceAcademy";
  house.frame.decompose(group.position, group.quaternion, group.scale);
  group.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld);
  // (which way the house faces, as a turn about the vertical: for its signs and lamps)
  const m = house.frame.elements, faces = Math.atan2(m[8], m[10]);
  const p = new Parts();
  const { door, w, height: roofTop } = house;
  const face = door.z - 0.1; // (the wall's face)
  const half = w / 2;

  // --- the gate, where the door was: the stairwell dark behind it, its first steps catching the light ----
  p.box(1.0, 2.15, 0.012, door.x, door.y + 1.075, door.z + 0.008, 0x241c18);
  // (the stair going up and away into the dark: each step's face a band, dimmer the higher it is)
  const STEPS = [0x8a7862, 0x7a6a56, 0x66584a, 0x54483e, 0x443a33, 0x362e29];
  STEPS.forEach((colour, k) => p.box(0.9, 0.13, 0.01, door.x, door.y + 0.08 + k * 0.2, door.z + 0.016, colour));
  const gz = door.z + 0.06;
  for (const x of [door.x - 0.5, door.x + 0.5]) p.box(0.05, 2.15, 0.05, x, door.y + 1.075, gz, GRILLE);
  for (const y of [door.y + 0.03, door.y + 0.75, door.y + 1.45, door.y + 2.12]) p.box(1.0, 0.045, 0.045, door.x, y, gz, GRILLE);
  for (let x = -0.4; x <= 0.401; x += 0.1) p.box(0.018, 2.1, 0.018, door.x + x, door.y + 1.075, gz, GRILLE);
  // (a row of little diamonds across its middle, as these gates have)
  for (let x = -0.4; x <= 0.401; x += 0.2) p.box(0.09, 0.09, 0.02, door.x + x, door.y + 1.1, gz + 0.01, GRILLE, { rz: Math.PI / 4 });
  p.box(0.07, 0.11, 0.05, door.x + 0.42, door.y + 1.05, gz + 0.04, 0xb8a04a); // its lock, brass

  // --- the board over the gate (painted below) ---------------------------------------------------------
  const board = { w: 1.6, h: 0.46, y: door.y + 2.6 };
  p.box(board.w + 0.06, board.h + 0.06, 0.03, door.x, board.y, face + 0.02, 0x3a2a1e);

  // --- the shoe rack on the step, on the side away from the window ---------------------------------------
  const side = door.x < 0 ? -1 : 1; // (the house's window is on the other side of its door)
  const rack = { x: THREE.MathUtils.clamp(door.x + side * 1.15, -half + 0.45, half - 0.45), z: face + 0.2 };
  for (const y of [0.34, 0.56, 0.78]) p.box(0.7, 0.02, 0.26, rack.x, y, rack.z, 0x8a6a44);
  for (const dx of [-0.34, 0.34]) p.box(0.025, 0.5, 0.26, rack.x + dx, 0.55, rack.z, 0x8a6a44);
  const CHAPPALS = [0x2a4a8a, 0xc0392b, 0x2a2622, 0xd8a24a, 0x7a3a8a];
  CHAPPALS.forEach((colour, k) => {
    const y = 0.36 + (k % 2) * 0.22, x = rack.x - 0.22 + Math.floor(k / 2) * 0.2;
    for (const d of [-0.035, 0.035]) p.box(0.06, 0.02, 0.2, x + d, y, rack.z, colour, { ry: d * 2 });
  });
  // (and two pairs kicked off on the step itself, as there always are)
  for (const [x, colour] of [[rack.x + side * 0.5, 0x1f6a5a], [door.x - side * 0.75, 0xd05a8a]] as const) {
    for (const d of [-0.045, 0.05]) p.box(0.065, 0.02, 0.21, x + d, door.y + 0.012, face + 0.33 + d, colour, { ry: 0.3 + d * 4 });
  }

  // --- upstairs: a new floor on the old roof ----------------------------------------------------------------
  const y0 = roofTop, y1 = roofTop + STUDIO_FLOOR;
  p.slab(-half, half, y0, y1, face - 6.4, face, UPSTAIRS);
  p.box(w + 0.1, 0.1, 0.35, 0, y0 + 0.02, face + 0.12, PAL.stoneTrim); // the ledge it sits on
  p.slab(-half - 0.05, half + 0.05, y1, y1 + 0.14, face - 6.45, face + 0.08, PAL.stoneTrim); // its cornice
  p.slab(-half, half, y1 + 0.14, y1 + 0.7, face - 0.15, face, UPSTAIRS); // and a low parapet at the front
  // the studio's window: a pink curtain half across, the tube light on inside
  const win = { x: -half + 1.05, y: y0 + 1.75, w: 1.25, h: 1.45 };
  p.box(win.w + 0.16, win.h + 0.16, 0.05, win.x, win.y, face + 0.025, PAL.wood);
  p.box(win.w, win.h, 0.05, win.x, win.y, face + 0.06, 0x39424a);
  p.box(win.w * 0.42, win.h, 0.02, win.x - win.w * 0.29, win.y, face + 0.09, 0xc8507a);
  p.box(win.w * 0.5, 0.05, 0.02, win.x + win.w * 0.2, win.y + win.h * 0.36, face + 0.09, 0xf2ead6);
  p.box(win.w + 0.3, 0.08, 0.2, win.x, win.y - win.h / 2 - 0.1, face + 0.1, PAL.stoneTrim);

  // --- the banner across the rest of that front: tied at its corners, a bulb on a bracket over it ----------
  const banner = { x0: win.x + win.w / 2 + 0.3, x1: half - 0.15 };
  const bw = banner.x1 - banner.x0, bh = bw / 1.65, bx = (banner.x0 + banner.x1) / 2, by = y0 + 0.28 + bh / 2;
  p.box(bw, bh, 0.012, bx, by, face + 0.035, 0x2a1030); // (its back, so its edge shows a thickness)
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const corner = { x: bx + sx * (bw / 2 - 0.05), y: by + sy * (bh / 2 - 0.05), z: face + 0.04 };
    p.strut(corner, { x: corner.x + sx * 0.22, y: corner.y + sy * 0.16, z: face + 0.01 }, 0.008, 0xd8d0b8, 4);
    p.box(0.03, 0.03, 0.03, corner.x + sx * 0.22, corner.y + sy * 0.16, face + 0.015, 0x3a3634); // the nail
  }
  p.box(0.04, 0.04, 0.5, bx, by + bh / 2 + 0.3, face + 0.25, 0x3a3634);
  p.cylinder(0.05, 0.05, 0.1, bx, by + bh / 2 + 0.22, face + 0.48, 0xf2ead6, { segments: 8 });

  group.add(p.build("danceAcademy"));

  // --- its words: the board over the gate, the banner ---------------------------------------------------
  const signs: WorldSign[] = [
    { kind: "schoolBoard", position: toWorld(door.x, board.y, face + 0.036), rotationY: faces, w: board.w, h: board.h, label: "अदिति डांस एकेडमी\nपहली मंज़िल ↑  •  ADITI DANCE ACADEMY" },
    { kind: "danceBanner", position: toWorld(bx, by, face + 0.042), rotationY: faces, w: bw - 0.02, h: bh - 0.02 },
  ];
  const painted = buildSigns(signs);
  // (painted in world terms; this group is at the house: put them back where they are)
  painted.applyMatrix4(group.matrixWorld.clone().invert());
  group.add(painted);

  // --- lit in the evening: the bulb over the banner, the studio's window (there's a batch till eight) --------
  const lamps: WorldLamp[] = [
    { kind: "bulb", position: toWorld(bx, by + bh / 2 + 0.16, face + 0.48), rotationY: faces, w: 1, h: 1, back: 0, ground: 0, always: true },
    { kind: "window", position: toWorld(win.x, win.y, face + 0.09), rotationY: faces, w: win.w, h: win.h, back: 0, ground: 0, always: true },
  ];

  ACADEMY_GATE.built = true;
  ACADEMY_GATE.at.copy(toWorld(door.x, door.y, door.z + 0.3));
  ACADEMY_GATE.out.set(0, 0, 1).transformDirection(group.matrixWorld);
  return { group, lamps };
}
