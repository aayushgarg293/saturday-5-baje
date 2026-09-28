import * as THREE from "three";
import { PAL } from "../../render/palette";
import type { BuildContext } from "../buildings/common";
import { SHOP_NAMES, type Trade } from "../names";

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

export function dressShop(c: BuildContext, room: ShopRoom) {
  if (c.shopName === undefined || room.shutter === "closed") return;
  const trade: Trade = SHOP_NAMES[c.shopName].trade;
  shelves(c, room, trade === "cloth" ? "bolts" : "boxes");
  if (trade !== "cloth") counter(c, room);
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

/** Three shelves on the back wall, loaded with boxes (or rolled bolts of cloth). */
function shelves(c: BuildContext, room: ShopRoom, load: "boxes" | "bolts") {
  const p = c.parts;
  const r = c.rng;
  const x0 = room.x0 + 0.4, x1 = room.x1 - 0.4;
  for (const y of [1.25, 1.85, 2.45]) {
    p.slab(x0, x1, y - 0.04, y, room.back + 0.05, room.back + 0.42, PAL.wood);
    let x = x0 + 0.05;
    while (x < x1 - 0.15) {
      if (load === "boxes") {
        const w = r.range(0.12, 0.28), h = r.range(0.12, 0.34);
        if (x + w > x1) break;
        p.box(w, h, 0.26, x + w / 2, y + h / 2, room.back + 0.24, r.pick(GOODS));
        x += w + r.range(0.01, 0.06);
      } else {
        // a bolt of cloth lying along the shelf, seen end-on
        p.cylinder(0.08, 0.08, 0.34, x + 0.08, y + 0.08, room.back + 0.24, r.pick(FABRIC), { rx: Math.PI / 2, segments: 8 });
        x += 0.17;
      }
    }
  }
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
