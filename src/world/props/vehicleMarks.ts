import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeRng } from "../../core/rng";
import { toon } from "../../render/toon";
import type { VehicleKind } from "./vehicles";

/**
 * What's painted on the street's vehicles: number plates (white for private
 * two-wheelers, yellow for the auto, a tin plate for the cycle-rickshaw),
 * the makers' names (look-alikes: BAJAAJ, Chetak, HERO HONDO, HEERO), and
 * what every auto had painted on its back: "HORN OK PLEASE", "बुरी नज़र वाले
 * तेरा मुँह काला". The rickshaw's side panels say "जय माता दी" among flowers.
 *
 * All of it is painted once on ONE canvas, and each vehicle's marks are thin
 * panels a hair off its surfaces (vehicles.ts says where: `Mark`). Parked
 * vehicles' marks are merged into one mesh (world/life.ts); each moving one
 * carries its own (world/traffic.ts).
 */

/** A mark on a vehicle, in its frame (+x forward, +z its right): what, where, how big, which way it faces. */
export type Mark = {
  what: "plate" | Painted;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  facing: "front" | "back" | "left" | "right";
  /** Tilted about the vehicle's sideways axis, with the surface it's on (a sloping cowl). */
  rz?: number;
};

type Painted = keyof typeof PAINTED;

const SIZE = 1024;
/** Number plates: 20 of them, 256 × 96 each, in 5 rows at the top of the sheet. */
const PLATE = { w: 256, h: 96, cols: 4 };
/** Which plates are which: private (white), commercial (yellow), the rickshaws' tin plates. */
const POOLS = { private: [0, 12], commercial: [12, 16], rickshaw: [16, 20] } as const;
/** Everything else on the sheet: x, y, width, height (pixels). */
const PAINTED = {
  chetak: [0, 480, 256, 64],
  bajaaj: [256, 480, 256, 64],
  heero: [512, 480, 256, 64],
  heroHondo: [768, 480, 256, 64],
  jaiMataDi: [0, 548, 512, 160],
  autoBack: [512, 548, 512, 200],
  maaKa: [0, 752, 512, 90],
} as const;

const SANS = 'Tahoma, Verdana, "Helvetica Neue", Arial, sans-serif';
const DEVANAGARI = '"Kohinoor Devanagari", "Noto Sans Devanagari", "Devanagari Sangam MN", "Mangal", sans-serif';

// --- the sheet ---------------------------------------------------------------------------

let sheet: THREE.CanvasTexture | null = null;
function paintSheet(): THREE.CanvasTexture {
  if (sheet) return sheet;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  // (everything outside a painting is left see-through: the lettering sits straight on the paintwork)
  const rng = makeRng(4747); // its own numbers: the plates don't change the street
  for (let i = 0; i < 20; i++) {
    const x = (i % PLATE.cols) * PLATE.w, y = Math.floor(i / PLATE.cols) * PLATE.h;
    ctx.save();
    ctx.translate(x, y);
    if (i >= POOLS.rickshaw[0]) tinPlate(ctx, 1000 + Math.floor(rng.next() * 900));
    else plate(ctx, i >= POOLS.commercial[0], rng);
    ctx.restore();
  }
  const at = (name: Painted, paint: (w: number, h: number) => void) => {
    const [x, y, w, h] = PAINTED[name];
    ctx.save();
    ctx.translate(x, y);
    paint(w, h);
    ctx.restore();
  };
  // (chrome script, as on the real thing: silver with a dark edge shows on any body colour, cream included)
  at("chetak", (w, h) => lettering(ctx, w, h, "Chetak", `italic bold ${h * 0.7}px Georgia, serif`, "#b9bec4"));
  at("bajaaj", (w, h) => badge(ctx, w, h));
  at("heero", (w, h) => lettering(ctx, w, h, "HEERO Jet", `bold italic ${h * 0.6}px ${SANS}`, "#e3c04a"));
  at("heroHondo", (w, h) => lettering(ctx, w, h, "HERO HONDO", `bold ${h * 0.5}px ${SANS}`, "#f2f2f2"));
  at("jaiMataDi", (w, h) => rickshawPanel(ctx, w, h));
  at("autoBack", (w, h) => autoBack(ctx, w, h));
  at("maaKa", (w, h) => lettering(ctx, w, h, "माँ का आशीर्वाद", `bold ${h * 0.55}px ${DEVANAGARI}`, "#f2d24a"));
  sheet = new THREE.CanvasTexture(canvas);
  sheet.colorSpace = THREE.SRGBColorSpace;
  sheet.anisotropy = 4;
  return sheet;
}

/** A number plate on two lines, as two-wheelers and autos had them: "RJ 01 SC" over "2107". */
function plate(ctx: CanvasRenderingContext2D, commercial: boolean, rng: { next(): number }) {
  const { w, h } = PLATE;
  ctx.fillStyle = commercial ? "#f2c81f" : "#f4f2ea";
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  const letter = () => "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.floor(rng.next() * 23)];
  const series = commercial ? "P" + letter() : letter() + letter();
  const number = String(1000 + Math.floor(rng.next() * 9000));
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${h * 0.34}px ${SANS}`;
  ctx.fillText(`RJ 01 ${series}`, w / 2, h * 0.32);
  ctx.font = `bold ${h * 0.4}px ${SANS}`;
  ctx.fillText(number, w / 2, h * 0.7);
}

/** A cycle-rickshaw's municipal tin plate: painted, a little rusty. */
function tinPlate(ctx: CanvasRenderingContext2D, n: number) {
  const { w, h } = PLATE;
  ctx.fillStyle = "#c9c3b0";
  ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = "rgba(140, 80, 40, 0.35)";
  for (let k = 0; k < 6; k++) ctx.fillRect(10 + k * 41, 8 + (k % 3) * 20, 18, 12);
  ctx.fillStyle = "#8b1d1d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${h * 0.22}px ${DEVANAGARI}`;
  ctx.fillText("नगर निगम · रिक्शा", w / 2, h * 0.27);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `bold ${h * 0.42}px ${SANS}`;
  ctx.fillText(String(n), w / 2, h * 0.67);
}

/** Painted letters with a dark edge, on nothing (the vehicle's own paint shows around them). */
function lettering(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, font: string, colour: string) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(20, 20, 20, 0.7)";
  ctx.strokeText(text, w / 2, h / 2, w * 0.95);
  ctx.fillStyle = colour;
  ctx.fillText(text, w / 2, h / 2, w * 0.95);
}

/** The maker's chrome badge: BAJAAJ in blue on silver. */
function badge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#f2f2f2");
  g.addColorStop(1, "#a9adb2");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(4, 6, w - 8, h - 12, h * 0.3);
  ctx.fill();
  ctx.fillStyle = "#1f3f8f";
  ctx.font = `bold ${h * 0.5}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BAJAAJ", w / 2, h / 2 + 1);
}

/** A rickshaw's side panel: blue, painted flowers round the edge, "जय माता दी" in the middle. */
function rickshawPanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#2f5fa0";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#f2d24a";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  for (const [x, colour] of [[36, "#e8453c"], [w - 36, "#e8453c"], [80, "#f28a2e"], [w - 80, "#f28a2e"]] as const) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 11, h / 2 + Math.sin(a) * 11, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f2d24a";
    ctx.beginPath();
    ctx.arc(x, h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${h * 0.34}px ${DEVANAGARI}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("जय माता दी", w / 2, h / 2);
}

/** The back of the auto: what every one of them said. (The plate goes on below, separately.) */
function autoBack(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(20, 20, 20, 0.8)";
  ctx.font = `bold ${h * 0.2}px ${SANS}`;
  ctx.fillStyle = "#f2d24a";
  ctx.strokeText("HORN OK PLEASE", w / 2, h * 0.16);
  ctx.fillText("HORN OK PLEASE", w / 2, h * 0.16);
  ctx.font = `bold ${h * 0.14}px ${DEVANAGARI}`;
  ctx.fillStyle = "#f4efe2";
  ctx.fillText("बुरी नज़र वाले तेरा मुँह काला", w / 2, h * 0.4, w * 0.95);
  // the little painted lemon-and-chillies at either end
  for (const x of [w * 0.08, w * 0.92]) {
    ctx.fillStyle = "#e3d23a";
    ctx.beginPath();
    ctx.ellipse(x, h * 0.4, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f8f3a";
    for (let k = 0; k < 3; k++) ctx.fillRect(x - 6 + k * 5, h * 0.4 + 12, 3, 16);
  }
}

// --- the panels --------------------------------------------------------------------------

/** Which way a mark's picture points (its right, its up, its face), in the vehicle's frame. */
const BASIS: Record<Mark["facing"], THREE.Matrix4> = {
  back: new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)),
  front: new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)),
  right: new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)),
  left: new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)),
};

/** The next number plate of the right kind (each vehicle its own, in the order they're built). */
const nextPlate = { private: 0, commercial: 0, rickshaw: 0 };
function plateFor(kind: VehicleKind): number {
  const pool = kind === "auto" ? "commercial" : kind === "rickshaw" ? "rickshaw" : "private";
  const [from, to] = POOLS[pool];
  return from + (nextPlate[pool]++ % (to - from));
}

/** One mark's panel, UVs pointing at its picture on the sheet. */
function panel(m: Mark, plateIndex: number): THREE.BufferGeometry {
  const [x, y, w, h] = m.what === "plate"
    ? [(plateIndex % PLATE.cols) * PLATE.w, Math.floor(plateIndex / PLATE.cols) * PLATE.h, PLATE.w, PLATE.h]
    : PAINTED[m.what];
  const g = new THREE.PlaneGeometry(m.w, m.h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / SIZE, 1 - (y + (1 - uv.getY(i)) * h) / SIZE);
  g.applyMatrix4(BASIS[m.facing]);
  if (m.rz) g.rotateZ(m.rz);
  return g.translate(m.x, m.y, m.z);
}

/**
 * A vehicle's marks as one geometry, in its own frame (then moved by
 * `matrix`, if given: a parked one's place on the street). Its plate is
 * picked here, so both its plates (front and back) show the same number.
 */
export function marksGeometry(kind: VehicleKind, marks: Mark[], matrix?: THREE.Matrix4): THREE.BufferGeometry | null {
  if (!marks.length) return null;
  const plateIndex = plateFor(kind);
  const g = mergeGeometries(marks.map((m) => panel(m, plateIndex)))!;
  if (matrix) g.applyMatrix4(matrix);
  return g;
}

/** The marks' material: the sheet, the see-through parts cut away, drawn a hair nearer than the paint under it. */
let material: THREE.Material | null = null;
export function marksMaterial(): THREE.Material {
  if (material) return material;
  const m = toon({ color: 0xffffff, map: paintSheet(), alphaTest: 0.5, paint: 0.15 });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -1;
  m.polygonOffsetUnits = -2;
  material = m;
  return m;
}
