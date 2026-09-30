import { PAL } from "../../render/palette";
import {
  type BuildContext, type BuildResult, type SignSpot,
  FACADE, FLOOR_HEIGHT, balcony, body, ledge, roof, windowAt, windowRow,
} from "./common";

/**
 * A plain house: a step at the front, a door, windows, maybe a balcony.
 * The quiet buildings between the shops and havelis.
 */
export function buildHouse(c: BuildContext): BuildResult {
  const p = c.parts;
  const r = c.rng;
  const face = -FACADE.house;
  const floors = r.next() < 0.5 ? 1 : 2;
  const top = floors * FLOOR_HEIGHT + 0.4;

  p.slab(-c.w / 2, c.w / 2, 0, 0.3, face, 0, PAL.plinth); // front step
  body(c, 0, top, face);

  // a door, and a window beside it
  const doorX = r.range(-c.w / 4, c.w / 4);
  p.slab(doorX - 0.62, doorX + 0.62, 0.3, 2.55, face, face + 0.06, PAL.stoneTrim); // frame
  p.slab(doorX - 0.5, doorX + 0.5, 0.3, 2.45, face + 0.06, face + 0.1, PAL.wood);
  c.people.push({ kind: "door", x: doorX, y: 0.3, z: face + 0.1, turn: 0 }); // (home.ts needs to know where it is)
  const winX = doorX + (doorX < 0 ? 1.8 : -1.8);
  if (Math.abs(winX) < c.w / 2 - 0.6) windowAt(c, winX, 1.8, face);

  // Film posters pasted on the wall on the other side of the door, if there's room.
  const signs: SignSpot[] = [];
  const posterW = 1.5;
  const posterX = doorX + Math.sign(doorX - winX) * (0.62 + 0.2 + posterW / 2);
  if (r.next() < 0.75 && Math.abs(posterX) + posterW / 2 < c.w / 2 - 0.2) {
    signs.push({ kind: "posters", x: posterX, y: 1.55, z: face, w: posterW, h: 1.05 });
  }

  for (let i = 1; i < floors; i++) {
    const floorY = i * FLOOR_HEIGHT;
    ledge(c, floorY, face, 0.35);
    windowRow(c, floorY + 1.6, face, 3);
    if (r.next() < 0.5) balcony(c, floorY + 0.05, face);
  }
  const height = roof(c, top, face);
  return { height, signs };
}
