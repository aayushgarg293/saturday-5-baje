import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toon } from "../../render/toon";
import type { LabelSpot } from "../buildings/common";
import type { Shelf } from "../names";

/**
 * The goods in the shops, with their packaging printed on: biscuit packets,
 * noodles, soap, washing powder at the kirana; creams and antiseptic at the
 * general store; bulbs and fans at the electrical shop; namkeen at the
 * sweet shop; tubes and tyres at the cycle shop; and strips of snack
 * packets and shampoo sachets hanging in the kirana's doorway. The brands are
 * look-alikes of the era's (BRIEF.md).
 *
 * The shelves (goods.ts) say where each box's front is; this picks a product
 * for it (by the shop's trade, in runs, so products stand two by two, as
 * shops stack them), paints every product once onto one sheet, in a tall and
 * a wide version (to suit the box), and makes one mesh of all of them: one
 * draw call for every label in the street.
 *
 * Edit the lists freely.
 */

/** A product's pack: its name, a line under it, its colours, and the one bit of design that makes it recognisable. */
type Product = {
  name: string;
  line: string;
  bg: string;
  fg: string;
  accent: string;
  /** band: a diagonal band; disc: a round emblem; stripes: bands top and bottom; burst: a starburst "NEW!"; photo: a framed photograph */
  design: "band" | "disc" | "stripes" | "burst" | "photo";
};

const p = (name: string, line: string, bg: string, fg: string, accent: string, design: Product["design"]): Product => ({ name, line, bg, fg, accent, design });

/** What each kind of shop has on its shelves (names.ts gives every shop its `shelf`). Shapes: goods.ts. */
const SHELVES: Record<Shelf, Product[]> = {
  grocery: [
    p("Parlay-G", "Glucose Biscuits", "#f2e6c8", "#c62f2a", "#f2c81f", "band"),
    p("Maggie", "2-Minute Noodles", "#f7d117", "#c62f2a", "#c62f2a", "stripes"),
    p("TOTA", "नमक · Iodised Salt", "#f4f4f4", "#1f4f9f", "#c62f2a", "disc"),
    p("Surf Excell", "Detergent Powder", "#1f5fb8", "#fff", "#f2c81f", "burst"),
    p("NIRMAA", "Washing Powder", "#fff", "#1f4f9f", "#1f4f9f", "disc"),
    p("Lifeboy", "Health Soap", "#c62f2a", "#fff", "#fff", "band"),
    p("Lucks", "Beauty Soap", "#f0a8c0", "#8a1f4a", "#fff", "disc"),
    p("Colgatte", "Dental Cream", "#d32f2f", "#fff", "#fff", "stripes"),
    p("Bornvita", "Health Drink", "#5a2f1a", "#f2c81f", "#c62f2a", "band"),
    p("Horlix", "The Great Nourisher", "#f2e6c8", "#1f5f3a", "#c62f2a", "disc"),
    p("Rasana", "Soft Drink Concentrate", "#f28a1e", "#fff", "#c62f2a", "burst"),
    p("Tigar", "Glucose Biscuits", "#f2c81f", "#3a2a0e", "#e8453c", "stripes"),
  ],
  paan: [
    p("Thumbs Upp", "Taste the Thunder", "#1f1f1f", "#e8453c", "#fff", "band"),
    p("Gold Spott", "Orange", "#f28a1e", "#fff", "#f2c81f", "disc"),
    p("Limka", "Lime 'n' Lemoni", "#5fae3a", "#fff", "#f2c81f", "stripes"),
    p("Kampa Cola", "The Great Indian Taste", "#8a1f1f", "#fff", "#f2c81f", "band"),
  ],
  masala: [
    p("MDX", "Kitchen King Masala", "#c62f2a", "#f2c81f", "#f2c81f", "disc"),
    p("Evrest", "Garam Masala", "#f2c81f", "#c62f2a", "#1f5f3a", "band"),
    p("MDX", "Chana Masala", "#1f5f3a", "#f2c81f", "#c62f2a", "disc"),
    p("Evrest", "Kasuri Methi", "#3f8f3a", "#fff", "#f2c81f", "stripes"),
    p("हल्दी", "Pisi Haldi · 100 g", "#f2c81f", "#8a1f1f", "#c62f2a", "band"),
  ],
  namkeen: [
    p("Haldiraam", "Bhujia Sev", "#f2c81f", "#b8261d", "#b8261d", "band"),
    p("Bikanji", "Moong Dal", "#1f7f3a", "#fff", "#f2c81f", "stripes"),
    p("Haldiraam", "Navrattan Mix", "#e8453c", "#fff", "#f2c81f", "stripes"),
    p("पापड़", "Bikaneri · Udad", "#f4efe2", "#b8261d", "#b8261d", "disc"),
  ],
  dairy: [
    p("Amool", "Taaza Toned Milk", "#1f5fb8", "#fff", "#fff", "stripes"),
    p("Amool", "Pasteurised Butter", "#f2c81f", "#c62f2a", "#1f5fb8", "band"),
    p("Sarass", "Pure Ghee · 1 L", "#f2c81f", "#1f5f3a", "#c62f2a", "disc"),
    p("Amool", "Masti Dahi", "#fff", "#1f5fb8", "#c62f2a", "disc"),
  ],
  sweets: [
    p("मिठाई", "Gift Box · Shudh Ghee", "#f28a1e", "#fff", "#c62f2a", "disc"),
    p("Soan Papdi", "Special · 250 g", "#c62f2a", "#f2c81f", "#f2c81f", "burst"),
    p("सोहन हलवा", "Ajmer Special", "#8a1f4a", "#f2c81f", "#f2c81f", "band"),
    p("Haldiraam", "Bhujia Sev", "#f2c81f", "#b8261d", "#b8261d", "band"),
  ],
  juice: [
    p("Rooh Afzah", "Sharbat", "#c62f2a", "#fff", "#f2c81f", "disc"),
    p("Rasana", "Mango", "#f28a1e", "#fff", "#c62f2a", "burst"),
    p("Kissan", "Mixed Fruit Jam", "#c62f2a", "#fff", "#5fae3a", "band"),
  ],
  chemist: [
    p("Krocin", "Paracetamol 500", "#f4f4f4", "#c62f2a", "#1f5fb8", "stripes"),
    p("Vix", "VapoRub", "#1f5f3a", "#fff", "#fff", "disc"),
    p("Benadryll", "Cough Syrup", "#8a1f1f", "#fff", "#f2c81f", "band"),
    p("Eeno", "Fruit Salt", "#1f5fb8", "#fff", "#fff", "stripes"),
    p("Hazmola", "Digestive Tablets", "#1f7f3a", "#f2c81f", "#c62f2a", "disc"),
    p("Dettal", "Antiseptic Liquid", "#f4f4f4", "#1f6f3a", "#1f6f3a", "band"),
    p("Band-Aide", "Plasters", "#f2e6c8", "#c62f2a", "#1f5fb8", "stripes"),
  ],
  optical: [
    p("Titaan Eye+", "Spectacle Case", "#1f1f1f", "#d4a017", "#d4a017", "stripes"),
    p("Rey-Bann", "Sunglasses", "#1f1f1f", "#c62f2a", "#fff", "band"),
    p("Vision Care", "Lens Cleaner", "#1f5fb8", "#fff", "#fff", "disc"),
  ],
  photo: [
    p("", "", "#e9dcc3", "#3a2a1e", "#7a4e2a", "photo"),
    p("", "", "#f2d7b0", "#3a2a1e", "#c9a042", "photo"),
    p("", "", "#d8e4ee", "#3a2a1e", "#7a4e2a", "photo"),
  ],
  books: [
    p("Classmates", "Notebook · 172 pages", "#1f5fb8", "#fff", "#f2c81f", "band"),
  ],
  stationery: [
    p("Classmates", "Notebook · 172 pages", "#1f5fb8", "#fff", "#f2c81f", "band"),
    p("Reinolds", "045 Fine Carbure · 10 pens", "#1f3f8f", "#fff", "#fff", "stripes"),
    p("Camlinn", "Geometry Box", "#c62f2a", "#fff", "#f2c81f", "band"),
    p("Fevikwik", "Instant Adhesive", "#f2c81f", "#c62f2a", "#1f3f8f", "disc"),
    p("Navnit", "21 Most Likely Questions", "#f28a1e", "#1f1f1f", "#fff", "burst"),
  ],
  gifts: [
    p("Funskul", "Toy Car Set", "#c62f2a", "#fff", "#f2c81f", "burst"),
    p("Archiees", "Greeting Cards", "#e91e63", "#fff", "#fff", "disc"),
    p("Barbee", "Fashion Doll", "#f06292", "#fff", "#fff", "band"),
    p("Classmates", "Notebook · 172 pages", "#1f5fb8", "#fff", "#f2c81f", "band"),
  ],
  mobile: [
    p("NOKIYA", "1100 · Torch Phone", "#1f3f8f", "#fff", "#fff", "stripes"),
    p("Samsang", "Colour Phone", "#1f1f1f", "#fff", "#1f5fb8", "band"),
    p("Airtol", "Recharge ₹ 50", "#c62f2a", "#fff", "#fff", "disc"),
    p("Hatch", "Prepaid Card", "#f4efe2", "#c2186b", "#c2186b", "disc"),
  ],
  barber: [
    p("Parashoot", "Coconut Oil", "#1f5f3a", "#fff", "#f2c81f", "band"),
    p("Old Spyce", "After Shave", "#f4efe2", "#b8261d", "#1f3f7a", "band"),
    p("Brylkreem", "Hair Cream", "#c62f2a", "#fff", "#fff", "stripes"),
    p("Navratna", "Thanda Tel", "#c62f2a", "#f2c81f", "#1f5f3a", "disc"),
  ],
  beauty: [
    p("Lakmay", "Cold Cream", "#e91e63", "#fff", "#fff", "disc"),
    p("Pondz", "Dreamflower Talc", "#f0c8dc", "#6a1b4a", "#fff", "disc"),
    p("Fair & Lucky", "Fairness Cream", "#f7d9e3", "#c2186b", "#c2186b", "band"),
    p("मेहंदी", "Heena Cone", "#3f8f3a", "#fff", "#f2c81f", "stripes"),
  ],
  bangles: [],
  utensils: [],
  tent: [],
  jewellery: [
    p("", "Hallmark 916", "#8a1f2a", "#f2c81f", "#f2c81f", "disc"),
  ],
  video: [],
  hardware: [
    p("Asien Paints", "Tractor Emulsion", "#c62f2a", "#fff", "#f2c81f", "band"),
    p("Burger", "Silk Enamel", "#1f5fb8", "#fff", "#fff", "stripes"),
    p("Fevicole", "SH Adhesive", "#f2c81f", "#1f3f8f", "#c62f2a", "disc"),
  ],
  footwear: [
    p("Batta", "Leather Shoes · 8", "#c62f2a", "#fff", "#fff", "stripes"),
    p("Paragan", "Hawai Chappal", "#1f5fb8", "#fff", "#fff", "band"),
    p("Aktion", "School Shoes", "#1f1f1f", "#f2c81f", "#c62f2a", "burst"),
  ],
  watch: [
    p("HMP", "Janata · Hand-wound", "#1f1f1f", "#d4a017", "#d4a017", "stripes"),
    p("Titaan", "Quartz", "#1f3f8f", "#fff", "#d4a017", "band"),
    p("Ajantaa", "Wall Clock", "#f4efe2", "#8a1f1f", "#8a1f1f", "disc"),
  ],
  electrical: [
    p("Philipps", "Bulb · 100 W", "#1f4f9f", "#fff", "#f2c81f", "disc"),
    p("Evereddy", "Batteries · 1.5 V", "#c62f2a", "#fff", "#f2c81f", "stripes"),
    p("Anchorr", "Switches & Sockets", "#f4f4f4", "#b8261d", "#b8261d", "band"),
    p("Havels", "Copper Wire", "#c62f2a", "#fff", "#fff", "band"),
    p("Ushaa", "Ceiling Fan", "#f4f4f4", "#1f3f8f", "#c62f2a", "disc"),
  ],
  electronics: [
    p("Onidaa", "Colour TV · 21\"", "#1f1f1f", "#c62f2a", "#fff", "band"),
    p("Videokon", "VCD Player", "#1f3f8f", "#fff", "#f2c81f", "stripes"),
    p("Phillips", "Transistor Radio", "#f4f4f4", "#1f4f9f", "#1f4f9f", "disc"),
    p("Bajaaj", "Mixer Grinder", "#1f3f8f", "#fff", "#f2c81f", "burst"),
  ],
  cycle: [
    p("Dunlap", "Cycle Tube 28\"", "#f2c81f", "#1f1f1f", "#1f1f1f", "band"),
    p("Atlus", "Cycle Tyre", "#1f1f1f", "#f2c81f", "#c62f2a", "stripes"),
    p("HEERO", "Genuine Parts", "#c62f2a", "#fff", "#fff", "disc"),
    p("Ralson", "Tyre · Tube", "#1f4f9f", "#fff", "#f2c81f", "band"),
  ],
  autoParts: [
    p("Kastrol", "2T Engine Oil", "#1f7f3a", "#fff", "#c62f2a", "band"),
    p("Servvo", "4T Plus", "#c62f2a", "#fff", "#f2c81f", "stripes"),
    p("Bajaaj", "Genuine Parts", "#1f3f8f", "#fff", "#fff", "disc"),
  ],
  cloth: [],
};

/** The hanging strips, by shop: snacks at the kirana, candies at the paan shop, masala sachets, namkeen, buttermilk. */
const PACKETS: Partial<Record<Shelf, Product[]>> = {
  grocery: [
    p("Kurkuray", "Masala Munch", "#f28a1e", "#1f7f3a", "#c62f2a", "burst"),
    p("Lehs", "Magic Masala", "#1f5fb8", "#f2c81f", "#f2c81f", "disc"),
    p("Aunty Chipps", "Salted", "#f2c81f", "#c62f2a", "#c62f2a", "band"),
    p("Bango!", "Mad Angles", "#c62f2a", "#f2c81f", "#f2c81f", "burst"),
    p("Clinik Plus", "Shampoo ₹1", "#f7a8c8", "#1f3f8f", "#fff", "stripes"),
  ],
  paan: [
    p("Pan Pasandd", "Candy", "#1f8f5f", "#fff", "#f2c81f", "disc"),
    p("Pulse", "Kachcha Aam", "#5fae3a", "#fff", "#f2c81f", "burst"),
    p("Kismi", "Toffee", "#f2c81f", "#8a1f1f", "#c62f2a", "stripes"),
    p("Clinik Plus", "Shampoo ₹1", "#f7a8c8", "#1f3f8f", "#fff", "stripes"),
  ],
  masala: [
    p("MDX", "Kitchen King ₹5", "#c62f2a", "#f2c81f", "#f2c81f", "disc"),
    p("Evrest", "Chaat Masala ₹5", "#f2c81f", "#c62f2a", "#1f5f3a", "band"),
  ],
  namkeen: [
    p("Haldiraam", "Aloo Bhujia ₹5", "#f2c81f", "#b8261d", "#b8261d", "band"),
    p("Bikanji", "Moong Dal ₹5", "#1f7f3a", "#fff", "#f2c81f", "stripes"),
  ],
  dairy: [
    p("Amool", "Masti Buttermilk", "#fff", "#1f5fb8", "#1f5fb8", "stripes"),
    p("Amool", "Kool Kesar", "#f28a1e", "#fff", "#1f5fb8", "disc"),
  ],
};

/** A label spot in the world (from goods.ts). */
export type WorldLabel = LabelSpot & { position: THREE.Vector3; rotationY: number };

// --- the sheet --------------------------------------------------------------------------------

const SHEET = 2048;
/** Every product gets a cell: a tall version (96 × 144) and a wide one (144 × 96) side by side; 8 cells across, 14 down. */
const CELL = { w: 240, h: 144, cols: 8 };
const TALL = { w: 96, h: 144 }, WIDE = { w: 144, h: 96 };
const ALL: Product[] = [...Object.values(SHELVES).flat(), ...Object.values(PACKETS).flat()];
const SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const PLAIN = '"Helvetica Neue", Arial, sans-serif';
const DEVANAGARI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';

function paintSheet(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SHEET;
  const ctx = canvas.getContext("2d")!;
  ALL.forEach((prod, i) => {
    const cx = (i % CELL.cols) * CELL.w, cy = Math.floor(i / CELL.cols) * CELL.h;
    for (const [x, w, h] of [[cx, TALL.w, TALL.h], [cx + TALL.w, WIDE.w, WIDE.h]] as const) {
      ctx.save();
      ctx.translate(x, cy);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      pack(ctx, w, h, prod);
      ctx.restore();
    }
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One pack's printed face. */
function pack(ctx: CanvasRenderingContext2D, w: number, h: number, prod: Product) {
  if (prod.design === "photo") return photo(ctx, w, h, prod);
  ctx.fillStyle = prod.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = prod.accent;
  switch (prod.design) {
    case "band":
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62); ctx.lineTo(w, h * 0.42); ctx.lineTo(w, h * 0.58); ctx.lineTo(0, h * 0.78);
      ctx.fill();
      break;
    case "disc":
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.64, Math.min(w, h) * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "stripes":
      ctx.fillRect(0, 0, w, h * 0.1);
      ctx.fillRect(0, h * 0.9, w, h * 0.1);
      break;
    case "burst": {
      const r = Math.min(w, h) * 0.2, x = w * 0.78, y = h * 0.72;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, rr = k % 2 ? r * 0.6 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.fill();
      ctx.fillStyle = prod.bg;
      ctx.font = `bold ${r * 0.5}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NEW!", x, y);
      break;
    }
  }
  // the name, big, fitted to the width; the line under it
  ctx.fillStyle = prod.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const hindi = /[ऀ-ॿ]/.test(prod.name);
  ctx.font = `${hindi ? "bold" : ""} ${Math.min(h * 0.22, w * 0.28)}px ${hindi ? DEVANAGARI : SANS}`;
  if (prod.name) ctx.fillText(prod.name, w / 2, h * 0.3, w * 0.9);
  ctx.font = `${Math.min(h * 0.09, w * 0.1)}px ${/[ऀ-ॿ]/.test(prod.line) ? DEVANAGARI : PLAIN}`;
  ctx.fillText(prod.line, w / 2, h * 0.47, w * 0.88);
  // the small print: weight and price, as every pack had
  ctx.font = `${Math.min(h * 0.07, w * 0.08)}px ${PLAIN}`;
  ctx.textAlign = "left";
  ctx.fillText("M.R.P. ₹ " + (5 + (prod.name.length * 7) % 60), w * 0.06, h * 0.93);
}

/** A framed photograph, as the studio displays them: the mount, and a couple posing (seen small, so simply). */
function photo(ctx: CanvasRenderingContext2D, w: number, h: number, prod: Product) {
  ctx.fillStyle = prod.accent; // the frame
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f4efe2"; // the mount
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  ctx.fillStyle = prod.bg; // the studio backdrop
  ctx.fillRect(w * 0.16, h * 0.16, w * 0.68, h * 0.68);
  const person = (x: number, cloth: string, s: number) => {
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.ellipse(x, h * 0.74, w * 0.12 * s, h * 0.2 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#7a4e32";
    ctx.beginPath();
    ctx.arc(x, h * 0.45, Math.min(w, h) * 0.08 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c1410";
    ctx.fillRect(x - Math.min(w, h) * 0.08 * s, h * 0.45 - Math.min(w, h) * 0.09 * s, Math.min(w, h) * 0.16 * s, Math.min(w, h) * 0.05 * s);
  };
  person(w * 0.4, "#2f4f8a", 1);
  person(w * 0.6, "#c2185b", 0.9);
}

// --- the mesh -----------------------------------------------------------------------------------

/** Every label in the street, as one mesh. */
export function buildLabels(spots: WorldLabel[]): THREE.Mesh | null {
  if (!spots.length) return null;
  const parts = spots.flatMap((sp) => {
    const list = sp.packet ? PACKETS[sp.shelf] ?? PACKETS.grocery! : SHELVES[sp.shelf];
    if (!list.length) return [];
    // each shop starts its lists at a different product, so neighbours don't look alike
    const prod = list[(sp.run + sp.shop * 3) % list.length];
    const i = ALL.indexOf(prod);
    const tall = sp.h > sp.w;
    const x = (i % CELL.cols) * CELL.w + (tall ? 0 : TALL.w), y = Math.floor(i / CELL.cols) * CELL.h;
    const w = tall ? TALL.w : WIDE.w, h = tall ? TALL.h : WIDE.h;
    const g = new THREE.PlaneGeometry(sp.w * 0.96, sp.h * 0.96);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (x + uv.getX(k) * w) / SHEET, 1 - (y + (1 - uv.getY(k)) * h) / SHEET);
    if (sp.tilt) g.rotateX(sp.tilt);
    g.rotateY(sp.rotationY);
    return [g.translate(sp.position.x, sp.position.y, sp.position.z)];
  });
  if (!parts.length) return null;
  const material = toon({ color: 0xffffff, map: paintSheet(), paint: 0.2 });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
  mesh.name = "labels";
  mesh.receiveShadow = true;
  return mesh;
}
