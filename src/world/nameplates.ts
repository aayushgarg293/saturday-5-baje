import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toon } from "../render/toon";

/**
 * The houses' nameplates and blessings: every house says who lives there, in
 * its own way. A white marble plaque ("चौधरी सदन"), a brass plate in
 * flowing script ("The Agrawals"), a doctor's black glass plate with gold
 * letters, a blue-and-white tile with the house number, a red tin "कुत्ते से
 * सावधान"; carved sandstone by the havelis' doors; and over some doors a
 * blessing painted straight on the wall ("॥ श्री गणेशाय नमः ॥", "शुभ लाभ").
 *
 * The houses say where (their builders' `plates`); this says what, in order
 * down the street, and paints each one once onto one shared sheet. All of
 * them together are one mesh: one draw call.
 *
 * Edit the lists freely.
 */

type Style = "marble" | "brass" | "glass" | "tile" | "tin" | "stone" | "painted";
type Plate = { style: Style; lines: string[] };

/** Beside the houses' doors, in turn down the street. */
const NAMES: Plate[] = [
  { style: "marble", lines: ["चौधरी सदन"] },
  { style: "brass", lines: ["The Agrawals"] },
  { style: "glass", lines: ["Dr. R. K. Sharma", "M.B.B.S. (Raj.)"] },
  { style: "marble", lines: ["Gupta Bhawan"] },
  { style: "tile", lines: ["42", "Mathur Villa"] },
  { style: "brass", lines: ["Khandelwal Kunj"] },
  { style: "marble", lines: ["राठौड़ निवास"] },
  { style: "glass", lines: ["S. K. Jain", "Advocate"] },
  { style: "tin", lines: ["कुत्ते से सावधान"] },
  { style: "brass", lines: ["The Maheshwaris"] },
  { style: "marble", lines: ["जैन भवन"] },
  { style: "tile", lines: ["17", "Sai Kripa"] },
  { style: "marble", lines: ["Mehta Niwas"] },
  { style: "glass", lines: ["Prof. V. N. Saxena", "(Retd.)"] },
  { style: "brass", lines: ["The Singhals"] },
  { style: "marble", lines: ["माँ दुर्गा निवास"] },
  { style: "tile", lines: ["8", "Sethi House"] },
  { style: "marble", lines: ["शर्मा कुटीर"] },
];

/** Beside the havelis' arched doors: carved stone. */
const HAVELIS: Plate[] = [
  { style: "stone", lines: ["सेठ रामलाल", "की हवेली"] },
  { style: "stone", lines: ["चौधरी हवेली"] },
  { style: "stone", lines: ["पोद्दार भवन", "सन् 1921"] },
  { style: "stone", lines: ["हवेली", "मोहनलाल जी"] },
];

/** Painted over the doors of every other house. */
const BLESSINGS: Plate[] = [
  { style: "painted", lines: ["॥ श्री गणेशाय नमः ॥"] },
  { style: "painted", lines: ["शुभ   लाभ"] },
  { style: "painted", lines: ["॥ जय श्री कृष्ण ॥"] },
  { style: "painted", lines: ["स्वागतम्"] },
  { style: "painted", lines: ["॥ श्री राम ॥"] },
  { style: "painted", lines: ["ॐ"] },
];

/** A nameplate or blessing's place in the world (from a builder's PlateSpot). */
export type WorldPlate = { kind: "name" | "haveli" | "blessing"; position: THREE.Vector3; rotationY: number; w: number; h: number };

// --- the sheet: every plate painted once ------------------------------------------------------

const SHEET = { w: 2048, h: 1024 };
/** Painted once and shared: the town's extras are built in batches, one per part of the town (main.ts). */
let painted: THREE.CanvasTexture | null = null;
const sheet = () => (painted ??= paintSheet());

/** Nameplates: 256 × 160 each, 8 across; blessings (long and low): 512 × 96, 4 across, below them. */
const SLOT = { w: 256, h: 160, cols: 8 };
const LONG = { w: 512, h: 96, cols: 4, top: 4 * 160 };

const DEVANAGARI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", "Mangal", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const SCRIPT = '"Snell Roundhand", "Apple Chancery", "Brush Script MT", "Segoe Script", cursive';
const isDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

function paintSheet(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.w;
  canvas.height = SHEET.h;
  const ctx = canvas.getContext("2d")!;
  [...NAMES, ...HAVELIS].forEach((plate, i) => {
    ctx.save();
    ctx.translate((i % SLOT.cols) * SLOT.w, Math.floor(i / SLOT.cols) * SLOT.h);
    paint(ctx, SLOT.w, SLOT.h, plate);
    ctx.restore();
  });
  BLESSINGS.forEach((plate, i) => {
    ctx.save();
    ctx.translate((i % LONG.cols) * LONG.w, LONG.top + Math.floor(i / LONG.cols) * LONG.h);
    paint(ctx, LONG.w, LONG.h, plate);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One plate, in its style. The canvas is left see-through wherever the plate isn't (a painted blessing is only letters). */
function paint(ctx: CanvasRenderingContext2D, w: number, h: number, plate: Plate) {
  const m = 10; // (a margin: plates are a little smaller than their slot, so neighbours never bleed in)
  const x0 = m, y0 = m, pw = w - m * 2, ph = h - m * 2;
  const text = (colour: string, font: (size: number, line: string) => string, sizes: number[], stroke?: string) => {
    ctx.fillStyle = colour;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const n = plate.lines.length;
    plate.lines.forEach((line, k) => {
      const size = sizes[Math.min(k, sizes.length - 1)] * ph;
      ctx.font = font(size, line);
      const y = y0 + ph * (n === 1 ? 0.52 : 0.36 + k * 0.34);
      if (stroke) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = stroke;
        ctx.strokeText(line, w / 2, y, pw * 0.9);
      }
      ctx.fillText(line, w / 2, y, pw * 0.9);
    });
  };
  const byScript = (bold: string) => (size: number, line: string) => `${bold} ${size}px ${isDevanagari(line) ? DEVANAGARI : SERIF}`;
  const screws = (colour: string) => {
    ctx.fillStyle = colour;
    for (const [sx, sy] of [[x0 + 12, y0 + 12], [x0 + pw - 12, y0 + 12], [x0 + 12, y0 + ph - 12], [x0 + pw - 12, y0 + ph - 12]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  switch (plate.style) {
    case "marble": {
      // white marble, faintly veined, the letters cut in and filled black
      ctx.fillStyle = "#f1eee6";
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = "rgba(150, 145, 140, 0.35)";
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(x0, y0 + ph * (0.2 + k * 0.22));
        ctx.bezierCurveTo(x0 + pw * 0.3, y0 + ph * (0.1 + k * 0.25), x0 + pw * 0.6, y0 + ph * (0.4 + k * 0.15), x0 + pw, y0 + ph * (0.25 + k * 0.2));
        ctx.stroke();
      }
      ctx.strokeStyle = "#8a857c";
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 8, y0 + 8, pw - 16, ph - 16);
      text("#2a2622", byScript("bold"), [0.34, 0.24]);
      break;
    }
    case "brass": {
      // a polished brass plate, the name in flowing script
      const g = ctx.createLinearGradient(0, y0, 0, y0 + ph);
      g.addColorStop(0, "#f2d27a");
      g.addColorStop(0.5, "#c9a042");
      g.addColorStop(1, "#8f6d24");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x0, y0, pw, ph, 14);
      ctx.fill();
      ctx.strokeStyle = "#6f521a";
      ctx.lineWidth = 3;
      ctx.stroke();
      screws("#6f521a");
      text("#3a2a0e", (size) => `${size}px ${SCRIPT}`, [0.42, 0.26]);
      break;
    }
    case "glass": {
      // a doctor's or lawyer's black glass plate, gold letters
      ctx.fillStyle = "#15161a";
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = "#c9a042";
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 6, y0 + 6, pw - 12, ph - 12);
      screws("#8a8a86");
      text("#e3c76a", (size, line) => `${line === plate.lines[0] ? "bold" : "italic"} ${size}px ${SERIF}`, [0.26, 0.2]);
      break;
    }
    case "tile": {
      // a glazed tile: the house number big in blue, the name under it, a painted border
      ctx.fillStyle = "#f6f4ee";
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = "#1f4f9f";
      ctx.lineWidth = 6;
      ctx.strokeRect(x0 + 8, y0 + 8, pw - 16, ph - 16);
      ctx.fillStyle = "#1f4f9f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${ph * 0.42}px ${SERIF}`;
      ctx.fillText(plate.lines[0], w / 2, y0 + ph * 0.4);
      ctx.font = `italic ${ph * 0.2}px ${SERIF}`;
      ctx.fillText(plate.lines[1] ?? "", w / 2, y0 + ph * 0.76, pw * 0.85);
      break;
    }
    case "tin": {
      // a red tin warning, white letters
      ctx.fillStyle = "#c62f2a";
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = "#f4efe2";
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 6, y0 + 6, pw - 12, ph - 12);
      screws("#7a1a17");
      text("#f8f4ea", byScript("bold"), [0.26]);
      break;
    }
    case "stone": {
      // carved sandstone, rough edged, the letters cut darker
      ctx.fillStyle = "#c99a6b";
      ctx.fillRect(x0, y0, pw, ph);
      ctx.fillStyle = "rgba(90, 60, 30, 0.15)";
      for (let k = 0; k < 40; k++) ctx.fillRect(x0 + ((k * 53) % pw), y0 + ((k * 29) % ph), 6, 3);
      ctx.strokeStyle = "#8a6440";
      ctx.lineWidth = 5;
      ctx.strokeRect(x0 + 7, y0 + 7, pw - 14, ph - 14);
      text("#5a3a1e", byScript("bold"), [0.3, 0.24]);
      break;
    }
    case "painted": {
      // straight on the wall: vermilion letters, dots either side
      text("#b8261d", (size) => `bold ${size}px ${DEVANAGARI}`, [0.62], "rgba(255, 230, 180, 0.6)");
      ctx.fillStyle = "#e0a21f";
      for (const x of [w * 0.06, w * 0.94]) for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(x, h * (0.3 + k * 0.2), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

// --- the mesh ------------------------------------------------------------------------------

/** Every plate in the street, as one mesh. Names and blessings are handed out in turn, down the street. */
/** `include`: which to build here (one batch per part of the town: main.ts); the names are still handed out over them all, in turn, so each house keeps its own. */
export function buildNameplates(spots: WorldPlate[], include: (plate: WorldPlate) => boolean = () => true): THREE.Mesh | null {
  const turn = { name: 0, haveli: 0, blessing: 0 };
  const parts = spots.map((sp) => {
    // which picture on the sheet
    let x: number, y: number, w: number, h: number;
    if (sp.kind === "blessing") {
      const i = turn.blessing++ % BLESSINGS.length;
      [x, y, w, h] = [(i % LONG.cols) * LONG.w, LONG.top + Math.floor(i / LONG.cols) * LONG.h, LONG.w, LONG.h];
    } else {
      const i = sp.kind === "name" ? turn.name++ % NAMES.length : NAMES.length + (turn.haveli++ % HAVELIS.length);
      [x, y, w, h] = [(i % SLOT.cols) * SLOT.w, Math.floor(i / SLOT.cols) * SLOT.h, SLOT.w, SLOT.h];
    }
    const g = new THREE.PlaneGeometry(sp.w, sp.h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) {
      uv.setXY(k, (x + uv.getX(k) * w) / SHEET.w, 1 - (y + (1 - uv.getY(k)) * h) / SHEET.h);
    }
    g.rotateY(sp.rotationY);
    return include(sp) ? g.translate(sp.position.x, sp.position.y, sp.position.z) : null;
  }).filter((g) => g !== null);
  if (!parts.length) return null;
  const material = toon({ color: 0xffffff, map: sheet(), alphaTest: 0.4, paint: 0.25 });
  material.polygonOffset = true; // (a hair in front of the wall it's on, always)
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
  mesh.name = "nameplates";
  mesh.receiveShadow = true;
  return mesh;
}
