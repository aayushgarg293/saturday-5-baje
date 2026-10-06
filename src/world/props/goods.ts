import * as THREE from "three";
import { PAL } from "../../render/palette";
import type { BuildContext } from "../buildings/common";
import { SHOP_NAMES, type Shelf, type Trade } from "../names";

/**
 * Goods in and in front of a shop, decided by its trade (world/names.ts), so
 * what's laid out matches the board: sacks and snack strips at the kirana,
 * a glass case of sweets at the mithai shop, sarees at the cloth house.
 *
 * Built into the shop's own mesh (same local frame as world/buildings/shop.ts:
 * x along the frontage, +z toward the street, the shop room between `face`
 * and `back`, its floor on the platform at `floor`). No extra draw calls.
 */

export type ShopRoom = {
  x0: number;
  x1: number;
  /** z of the shopfront, and of the room's back wall. */
  face: number;
  back: number;
  /** Height of the platform the shop floor sits on. */
  floor: number;
  /** Top of the shop opening. */
  top: number;
  /** "open", "half" (shutter half down) or "closed". */
  shutter: "open" | "half" | "closed";
};

/** Muted, sun-faded package colours for boxes on shelves. */
const GOODS = [0xc94c3c, 0xe2b33c, 0x3f7fb8, 0x4f8f5a, 0xe9e2d0, 0xd8783a, 0x8a5aa6, 0x2f6d6a, 0xf0d58c];
/** Bright fabric colours for sarees and bolts of cloth. */
const FABRIC = [0xc2186b, 0xe65100, 0xf9a825, 0x2e7d32, 0x1565c0, 0x6a1b9a, 0xd32f2f, 0x00838f];
/** Snack packet colours: loud, the way they were. */
const PACKETS = [0xe53935, 0xfdd835, 0x43a047, 0x1e88e5, 0xfb8c00, 0x8e24aa, 0xffffff];

/** How many shops have been dressed so far (each's labels start at a different product: world/props/labels.ts). */
let shopsDressed = 0;

export function dressShop(c: BuildContext, room: ShopRoom) {
  if (c.shopName === undefined || room.shutter === "closed") return;
  const trade: Trade = SHOP_NAMES[c.shopName].trade;
  shop = { shelf: SHOP_NAMES[c.shopName].shelf, n: shopsDressed++ };
  shelves(c, room, trade === "cloth" ? "bolts" : "boxes");
  if (shop.shelf === "barber") saloon(c, room); // (a saloon has no counter: a chair and a mirror)
  else if (trade !== "cloth") counter(c, room);
  switch (trade) {
    case "kirana":
      sacks(c, room);
      snackStrips(c, room);
      break;
    case "sweets":
      sweetCase(c, room);
      break;
    case "cloth":
      sarees(c, room);
      break;
    case "electrical":
      coolers(c, room);
      break;
    case "cycle":
      tyres(c, room);
      break;
    case "general":
      break;
  }
}

/** The shop being dressed: what's on its shelves, and its number (for its goods' labels). */
let shop = { shelf: "grocery" as Shelf, n: 0 };

/**
 * How each kind of shop's goods look on the shelf:
 *   box       boxes (the kirana, the electrical shop, shoes)
 *   small     small boxes, a little apart (medicines, phones, watches, jewellery)
 *   stack     boxes three high (mithai, notebooks)
 *   bottle    bottles in a row (the paan shop's cold drinks, the barber's oils, the juice centre)
 *   jar       squat jars with lids (the beauty parlour)
 *   tin       tins and cans (paint, engine oil)
 *   spines    books and VCD cases standing, spines out
 *   frames    photo frames standing, leaning back
 *   specs     spectacle frames on a velvet board, cases beside them
 *   bangles   bangles stacked on rods
 *   steel     steel pots and tumblers
 *   rolls     rolled durries and shamianas (the tent house)
 */
type Look = "box" | "small" | "stack" | "bottle" | "jar" | "tin" | "spines" | "frames" | "specs" | "bangles" | "steel" | "rolls";
const LOOK: Record<Shelf, Look> = {
  grocery: "box", paan: "bottle", masala: "small", namkeen: "stack", dairy: "box", sweets: "stack", juice: "bottle",
  chemist: "small", optical: "specs", photo: "frames", books: "spines", stationery: "stack", gifts: "box", mobile: "small",
  barber: "bottle", beauty: "jar", bangles: "bangles", utensils: "steel", tent: "rolls", jewellery: "small", video: "spines",
  hardware: "tin", footwear: "box", watch: "small", electrical: "box", electronics: "box", cycle: "box", autoParts: "tin", cloth: "box",
};

/**
 * Three shelves on the back wall, loaded with the shop's goods (or rolled
 * bolts of cloth). Each item takes the same random numbers whatever it looks
 * like (a width, a height, a colour, the gap after it), so the rest of the
 * street is built exactly the same.
 */
function shelves(c: BuildContext, room: ShopRoom, load: "boxes" | "bolts") {
  const p = c.parts;
  const r = c.rng;
  const x0 = room.x0 + 0.4, x1 = room.x1 - 0.4;
  const look = LOOK[shop.shelf];
  let items = 0;
  for (const y of [1.25, 1.85, 2.45]) {
    p.slab(x0, x1, y - 0.04, y, room.back + 0.05, room.back + 0.42, PAL.wood);
    let x = x0 + 0.05;
    while (x < x1 - 0.15) {
      if (load === "boxes") {
        const w = r.range(0.12, 0.28), h = r.range(0.12, 0.34);
        if (x + w > x1) break;
        const colour = r.pick(GOODS);
        item(c, look, x + w / 2, y, room.back + 0.24, w, h, colour, items++);
        x += w + r.range(0.01, 0.06);
      } else {
        // a bolt of cloth lying along the shelf, seen end-on
        p.cylinder(0.08, 0.08, 0.34, x + 0.08, y + 0.08, room.back + 0.24, r.pick(FABRIC), { rx: Math.PI / 2, segments: 8 });
        x += 0.17;
      }
    }
  }
}

/**
 * One item on a shelf, in the space a box `w` wide and `h` tall would take,
 * standing on `y`, centred on `x`, its middle `z` deep. `k`: its number in
 * the shop (products come in pairs; things alternate). Adds its label spot
 * where it has one (labels.ts prints it).
 */
function item(c: BuildContext, look: Look, x: number, y: number, z: number, w: number, h: number, colour: number, k: number) {
  const p = c.parts;
  const label = (lx: number, ly: number, lz: number, lw: number, lh: number) =>
    c.labels.push({ x: lx, y: ly, z: lz, w: lw, h: lh, shelf: shop.shelf, shop: shop.n, run: Math.floor(k / 2) });
  const front = z + 0.13 + 0.002;
  switch (look) {
    case "box":
      p.box(w, h, 0.26, x, y + h / 2, z, colour);
      label(x, y + h / 2, front, w, h);
      break;
    case "small": {
      // small boxes: the space holds one or two, a little apart
      const n = w > 0.2 ? 2 : 1, bw = (w / n) * 0.8, bh = Math.min(h, 0.16) * 0.8;
      for (let j = 0; j < n; j++) {
        const bx = x - w / 2 + (w / n) * (j + 0.5);
        p.box(bw, bh, 0.16, bx, y + bh / 2, z + 0.05, colour);
        label(bx, y + bh / 2, z + 0.13 + 0.002, bw, bh);
      }
      break;
    }
    case "stack":
      // three flat boxes, one on another, each a little off square
      for (let j = 0; j < 3; j++) {
        const bh = h / 3, bx = x + (j % 2 ? 0.008 : -0.006);
        p.box(w, bh * 0.96, 0.26, bx, y + bh * (j + 0.5), z, colour);
        label(bx, y + bh * (j + 0.5), front, w, bh * 0.96);
      }
      break;
    case "bottle": {
      // a row of bottles: body, shoulder, neck, cap; the label round the body
      const n = Math.max(1, Math.floor(w / 0.085)), r = 0.032, bh = Math.max(0.14, h * 0.9);
      for (let j = 0; j < n; j++) {
        const bx = x - w / 2 + (w / n) * (j + 0.5);
        p.cylinder(r, r, bh * 0.62, bx, y + bh * 0.31, z, colour, { segments: 10 });
        p.cylinder(r * 0.45, r, bh * 0.14, bx, y + bh * 0.69, z, colour, { segments: 10 });
        p.cylinder(r * 0.42, r * 0.42, bh * 0.14, bx, y + bh * 0.83, z, colour, { segments: 8 });
        p.cylinder(r * 0.5, r * 0.5, bh * 0.05, bx, y + bh * 0.92, z, 0x3a3a3a, { segments: 8 });
        label(bx, y + bh * 0.3, z + r + 0.002, r * 1.8, bh * 0.34);
      }
      break;
    }
    case "jar": {
      const r = Math.min(w / 2, 0.08) * 0.9, jh = Math.min(h, 0.18);
      p.cylinder(r, r, jh * 0.8, x, y + jh * 0.4, z, 0xf2efe6, { segments: 12 });
      p.cylinder(r * 1.02, r * 1.02, jh * 0.2, x, y + jh * 0.9, z, colour, { segments: 12 }); // the lid
      label(x, y + jh * 0.4, z + r + 0.002, r * 1.7, jh * 0.55);
      break;
    }
    case "tin": {
      const r = Math.min(w / 2, 0.12) * 0.92, th = Math.max(0.14, h * 0.85);
      p.cylinder(r, r, th, x, y + th / 2, z, 0xb9bcc0, { segments: 14 });
      p.cylinder(r * 1.03, r * 1.03, 0.012, x, y + th, z, 0x8a8d90, { segments: 14 }); // the rim
      label(x, y + th * 0.5, z + r + 0.002, r * 1.8, th * 0.7);
      break;
    }
    case "spines": {
      // books or VCD cases standing side by side, spines out, a little uneven
      const n = Math.max(2, Math.floor(w / 0.035)), t = w / n;
      for (let j = 0; j < n; j++) {
        const sh = h * (0.8 + ((j * 37 + k * 11) % 20) / 100);
        p.box(t * 0.9, sh, 0.2, x - w / 2 + t * (j + 0.5), y + sh / 2, z, j % 3 === 0 ? colour : SPINES[(j + k) % SPINES.length]);
      }
      break;
    }
    case "frames": {
      // a photo frame standing on its stand, leaning back; the picture in it (labels.ts)
      const fh = Math.min(h, 0.26), fw = Math.min(w * 0.85, fh * 0.8);
      p.box(fw, fh, 0.02, x, y + fh / 2 + 0.01, z + 0.08, k % 2 ? 0x7a4e2a : 0xc9a042, { rx: -0.18 });
      c.labels.push({ x, y: y + fh / 2 + 0.01, z: z + 0.08 + 0.012, w: fw * 0.78, h: fh * 0.78, shelf: shop.shelf, shop: shop.n, run: k, tilt: -0.18 });
      break;
    }
    case "specs": {
      if (k % 3 === 2) {
        // a spectacle case, lying down
        p.box(Math.min(w, 0.16), 0.045, 0.07, x, y + 0.023, z + 0.08, colour);
        label(x, y + 0.023, z + 0.08 + 0.035 + 0.002, Math.min(w, 0.16), 0.045);
      } else {
        // a velvet board, frames on it, two rows
        const bw = Math.min(w, 0.26), bh = Math.min(h, 0.22);
        p.box(bw, bh, 0.02, x, y + bh / 2, z + 0.06, 0x3a1f4a, { rx: -0.2 });
        for (let row = 0; row < 2; row++) for (let j = 0; j < Math.max(1, Math.floor(bw / 0.12)); j++) {
          const fx = x - bw / 2 + 0.06 + j * 0.12, fy = y + bh * (0.3 + row * 0.42);
          for (const side of [-1, 1]) {
            p.add(new THREE.TorusGeometry(0.02, 0.004, 4, 10), fx + side * 0.024, fy, z + 0.075, j % 2 ? 0x1a1a1a : 0x8a6a3a);
          }
          p.box(0.008, 0.004, 0.004, fx, fy + 0.006, z + 0.075, 0x1a1a1a); // the bridge
        }
      }
      break;
    }
    case "bangles": {
      // bangles on rods: thin rings stacked up each rod, in runs of one colour
      const rods = Math.max(1, Math.floor(w / 0.1));
      for (let j = 0; j < rods; j++) {
        const bx = x - w / 2 + (w / rods) * (j + 0.5), bh = Math.max(0.12, h * 0.9);
        p.box(0.008, bh + 0.04, 0.008, bx, y + (bh + 0.04) / 2, z, 0x6a5a4a);
        for (let q = 0; q * 0.014 < bh; q++) {
          p.cylinder(0.042, 0.042, 0.01, bx, y + 0.01 + q * 0.014, z, BANGLES[(j + Math.floor(q / 4) + k) % BANGLES.length], { segments: 10 });
        }
      }
      break;
    }
    case "steel": {
      // a steel pot with its lid, or a row of tumblers
      if (k % 2) {
        const r = Math.min(w / 2, 0.13) * 0.9, ph = Math.min(h, 0.2);
        p.cylinder(r, r * 0.92, ph, x, y + ph / 2, z, PAL.steel, { segments: 14 });
        p.cylinder(r * 1.04, r * 1.04, 0.012, x, y + ph, z, 0xd9dcde, { segments: 14 });
        p.cylinder(r * 0.2, r * 0.2, 0.02, x, y + ph + 0.016, z, 0x8a8d90, { segments: 8 });
      } else {
        const n = Math.max(1, Math.floor(w / 0.08));
        for (let j = 0; j < n; j++) p.cylinder(0.034, 0.028, 0.1, x - w / 2 + (w / n) * (j + 0.5), y + 0.05, z, PAL.steel, { segments: 10 });
      }
      break;
    }
    case "rolls":
      // a rolled durrie lying along the shelf, seen end-on
      p.cylinder(Math.min(h, 0.2) / 2, Math.min(h, 0.2) / 2, 0.34, x, y + Math.min(h, 0.2) / 2, z, colour, { rx: Math.PI / 2, segments: 10 });
      break;
  }
}

/** Book and VCD spine colours; bangle colours: glass, bright. */
const SPINES = [0x8a1f1f, 0x1f3f7a, 0x2f6d3a, 0xe2b33c, 0x3a3a3a, 0xc94c3c, 0xe9e2d0];
const BANGLES = [0xc62f2a, 0x2e7d32, 0xf2c81f, 0x1565c0, 0x8e24aa, 0xd4a017, 0xe91e63];

/**
 * Where a saloon's customer sits: in its barber chair, facing the mirror on
 * the left-hand side wall (x0), halfway back. `turn` faces −x (the mirror).
 * (world/buildings/shop.ts puts the barber and customer here: people/saloon.ts.)
 */
/** The saloon's radio: on its mirror ledge, in the middle; the height of its middle above the ledge. */
export const SALOON_RADIO = { y: 0.055 };

/** The height of the middle of the saloon's mirror, above the shop floor. */
export const SALOON_MIRROR_Y = 1.4;

export function saloonChair(room: { x0: number; face: number; back: number }) {
  return { x: room.x0 + 0.95, z: (room.face + room.back) / 2 + 0.1, turn: -Math.PI / 2 };
}

/** The saloon: a big mirror on the side wall, a ledge of bottles under it, and the red barber chair facing it. */
function saloon(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const chair = saloonChair(room);
  const f = room.floor;
  // the mirror: a wooden frame, the glass (a pale, cool grey: it "reflects" the light)
  const mz = chair.z;
  // (hung low enough that someone in the chair sees himself in it: people/saloon.ts reflects in it)
  p.box(0.03, 1.2, 1.1, room.x0 + 0.015, f + SALOON_MIRROR_Y, mz, PAL.wood);
  p.box(0.01, 1.08, 0.98, room.x0 + 0.035, f + SALOON_MIRROR_Y, mz, 0xc9d6de);
  // the ledge under it, with the barber's things: bottles, a tin of powder, a steel bowl
  p.box(0.16, 0.03, 1.1, room.x0 + 0.08, f + 0.78, mz, PAL.wood);
  const things: [number, number, number, number][] = [[-0.4, 0.2, 0.03, 0x1f5f3a], [-0.3, 0.16, 0.028, 0xc62f2a], [-0.2, 0.22, 0.025, 0xf4efe2], [0.25, 0.08, 0.05, 0xb9bcc0], [0.38, 0.14, 0.03, 0xe8c24a]];
  for (const [dz, h, r, colour] of things) p.cylinder(r, r, h, room.x0 + 0.08, f + 0.795 + h / 2, mz + dz, colour, { segments: 8 });
  // the transistor radio, in the middle of the ledge (it plays the station: audio/radio.ts, people/saloon.ts)
  p.box(0.07, 0.11, 0.2, room.x0 + 0.08, f + 0.795 + SALOON_RADIO.y, mz, 0x2a2622);
  p.box(0.005, 0.07, 0.09, room.x0 + 0.118, f + 0.795 + SALOON_RADIO.y, mz - 0.04, 0x8f8a80); // the speaker grille
  p.cylinder(0.018, 0.018, 0.01, room.x0 + 0.118, f + 0.795 + SALOON_RADIO.y + 0.02, mz + 0.06, 0xd8b04a, { rz: Math.PI / 2, segments: 10 }); // the tuning dial
  p.box(0.004, 0.004, 0.25, room.x0 + 0.06, f + 0.795 + 0.11 + 0.12, mz + 0.05, 0xb9bcc0, { rx: -0.5 }); // the aerial
  // the chair: a chrome pedestal and footrest, a red seat, back and armrests, a headrest
  const cx = chair.x, cz = chair.z;
  p.cylinder(0.24, 0.26, 0.05, cx, f + 0.025, cz, 0xb9bcc0, { segments: 14 });
  p.cylinder(0.05, 0.05, 0.4, cx, f + 0.25, cz, 0xb9bcc0, { segments: 8 });
  p.box(0.5, 0.12, 0.5, cx, f + 0.49, cz, 0xa3242a); // the seat (facing −x: its front is the −x side)
  p.box(0.1, 0.55, 0.5, cx + 0.25, f + 0.82, cz, 0xa3242a, { rz: -0.12 }); // the back
  p.box(0.12, 0.14, 0.22, cx + 0.33, f + 1.18, cz, 0x7a1a1f); // the headrest
  for (const side of [-1, 1]) p.box(0.42, 0.05, 0.07, cx - 0.02, f + 0.7, cz + side * 0.27, 0xa3242a); // armrests
  p.box(0.14, 0.03, 0.4, cx - 0.42, f + 0.18, cz, 0xb9bcc0); // the footrest
}

/** The low counter across the front of the room, where the shopkeeper sits. */
function counter(c: BuildContext, room: ShopRoom) {
  const mid = (room.x0 + room.x1) / 2;
  const w = (room.x1 - room.x0) * 0.55;
  c.parts.slab(mid - w / 2, mid + w / 2, room.floor, room.floor + 0.85, room.face - 0.75, room.face - 0.3, PAL.wood);
  c.parts.slab(mid - w / 2 - 0.03, mid + w / 2 + 0.03, room.floor + 0.85, room.floor + 0.9, room.face - 0.78, room.face - 0.27, PAL.woodLight);
}

/** Open sacks of grain and spices on the platform, rims rolled down; a crate of cold drinks. */
function sacks(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const r = c.rng;
  const grains = [0xf2d16b, 0xefe8d8, 0xb5402f, 0xc98b3c, 0x7a9a3f]; // dal, rice, chilli, masala, moong
  const z = room.face + 0.4;
  const xs = [room.x0 + 0.45, room.x0 + 0.95, room.x1 - 0.5];
  for (const x of xs) {
    p.cylinder(0.2, 0.22, 0.48, x, room.floor + 0.24, z, PAL.burlap, { segments: 10 });
    p.cylinder(0.23, 0.23, 0.07, x, room.floor + 0.46, z, 0xd8c49e, { segments: 10 }); // rolled rim
    p.cylinder(0.18, 0.18, 0.02, x, room.floor + 0.47, z, r.pick(grains), { segments: 10 }); // the grain
  }
  // a red crate of cold-drink bottles
  const cx = room.x1 - 1.15;
  p.slab(cx - 0.24, cx + 0.24, room.floor, room.floor + 0.3, z - 0.18, z + 0.18, PAL.crateRed);
  for (let i = 0; i < 6; i++) {
    p.cylinder(0.03, 0.03, 0.1, cx - 0.15 + (i % 3) * 0.15, room.floor + 0.35, z - 0.08 + Math.floor(i / 3) * 0.16, 0x3b2a1f, { segments: 6 });
  }
}

/** Strips of snack packets hanging from the top of the opening: the kirana's banner. */
function snackStrips(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const r = c.rng;
  const strips = Math.max(3, Math.floor((room.x1 - room.x0) / 0.55));
  for (let i = 0; i < strips; i++) {
    const x = room.x0 + 0.4 + (i / (strips - 1)) * (room.x1 - room.x0 - 0.8);
    const colour = r.pick(PACKETS);
    p.box(0.01, 1.3, 0.01, x, room.top - 0.75, room.face + 0.12, PAL.metal); // the string
    for (let k = 0; k < 6; k++) {
      p.box(0.14, 0.17, 0.015, x, room.top - 0.3 - k * 0.2, room.face + 0.13, k % 2 ? colour : r.pick(PACKETS));
      // each strip is one snack, printed on every packet (labels.ts)
      c.labels.push({ x, y: room.top - 0.3 - k * 0.2, z: room.face + 0.1385, w: 0.14, h: 0.17, shelf: shop.shelf, shop: shop.n, run: i, packet: true });
    }
  }
}

/** The mithai shop's glass case at the front, with steel trays of sweets on top. */
function sweetCase(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const r = c.rng;
  const mid = (room.x0 + room.x1) / 2;
  p.slab(mid - 0.85, mid + 0.85, room.floor, room.floor + 0.8, room.face + 0.05, room.face + 0.6, PAL.glassPale);
  p.slab(mid - 0.88, mid + 0.88, room.floor + 0.8, room.floor + 0.84, room.face + 0.02, room.face + 0.63, PAL.wood);
  const sweets = [0xf5f0e1, 0xe8903a, 0x8b5a2b, 0xf2c14e, 0xd9a5b3]; // barfi, jalebi, gulab jamun, laddoo, peda
  for (let k = 0; k < 3; k++) {
    const tx = mid - 0.55 + k * 0.55;
    p.cylinder(0.24, 0.22, 0.03, tx, room.floor + 0.86, room.face + 0.32, PAL.steel, { segments: 14 });
    const colour = r.pick(sweets);
    for (let i = 0; i < 7; i++) {
      p.add(new THREE.SphereGeometry(0.045, 7, 5), tx - 0.12 + (i % 4) * 0.08, room.floor + 0.91, room.face + 0.25 + Math.floor(i / 4) * 0.12, colour);
    }
  }
}

/** Sarees hanging down both sides of the cloth shop's opening. */
function sarees(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const r = c.rng;
  for (const side of [0, 1]) {
    for (let k = 0; k < 2; k++) {
      const x = side === 0 ? room.x0 + 0.45 + k * 0.28 : room.x1 - 0.45 - k * 0.28;
      const colour = r.pick(FABRIC);
      p.slab(x - 0.12, x + 0.12, room.top - 2.1, room.top - 0.3, room.face + 0.05 + k * 0.04, room.face + 0.07 + k * 0.04, colour);
      p.slab(x - 0.12, x + 0.12, room.top - 2.1, room.top - 1.95, room.face + 0.075 + k * 0.04, room.face + 0.08 + k * 0.04, PAL.boardYellow); // border
    }
  }
}

/** Desert coolers out on the platform, with a table fan on top of one. */
function coolers(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  const z = room.face + 0.4;
  for (const x of [room.x0 + 0.6, room.x1 - 0.6]) {
    p.slab(x - 0.3, x + 0.3, room.floor, room.floor + 1.0, z - 0.25, z + 0.25, PAL.coolerCream);
    for (let k = 0; k < 4; k++) {
      p.slab(x - 0.22, x + 0.22, room.floor + 0.3 + k * 0.15, room.floor + 0.34 + k * 0.15, z + 0.25, z + 0.27, 0x7d7468); // grille
    }
  }
  const fx = room.x0 + 0.6;
  p.cylinder(0.02, 0.06, 0.3, fx, room.floor + 1.15, z, PAL.metal, { segments: 6 });
  p.cylinder(0.2, 0.2, 0.06, fx, room.floor + 1.42, z, 0x4c6f8f, { rx: Math.PI / 2, segments: 14 }); // the fan's guard, facing the street
}

/** Tyres and tubes hung on the front of the pillars. */
function tyres(c: BuildContext, room: ShopRoom) {
  const p = c.parts;
  for (const x of [room.x0 + 0.15, room.x1 - 0.15]) {
    for (let k = 0; k < 3; k++) {
      p.add(new THREE.TorusGeometry(0.3, 0.05, 6, 16), x, 2.1 + k * 0.45, room.face + 0.08, PAL.tyre);
    }
    p.add(new THREE.TorusGeometry(0.26, 0.035, 6, 14), x, 3.25, room.face + 0.14, PAL.crateRed); // a red tube
  }
}
