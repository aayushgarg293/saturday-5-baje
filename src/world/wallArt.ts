import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toon } from "../render/toon";

/**
 * What's painted on the bare side walls at the galis and side roads, at street
 * level: the painted ads of tuition classes, clinics, the PCO and the tent
 * house (each with its phone number); the municipality's warnings ("यहाँ पेशाब
 * करना मना है", "STICK NO BILLS"); and chalk graffiti ("R ♥ P", "PINKU WAS
 * HERE", a noughts-and-crosses game).
 *
 * The street (world/street.ts) finds the walls; this says what goes on each,
 * in turn, and paints every piece once onto one sheet: one mesh, one draw
 * call for all of it. Edit the list freely.
 */

type Mural =
  | { kind: "ad"; lines: [string, string, string, string]; bg: string; fg: string; accent: string }
  | { kind: "warning"; lines: string[]; colour: string }
  | { kind: "chalk"; draw: "heart" | "noughts" | "names" };

const MURALS: Mural[] = [
  { kind: "ad", lines: ["SHARMA TUTORIALS", "Maths • Science • English", "कक्षा 6 से 12", "☎ 2451190"], bg: "#f4efe2", fg: "#1f3f7a", accent: "#c62f2a" },
  { kind: "warning", lines: ["यहाँ पेशाब करना", "मना है"], colour: "#b8261d" },
  { kind: "chalk", draw: "heart" },
  { kind: "ad", lines: ["BANSIL CLASSES", "IIT-JEE • PMT", "कोटा के अनुभवी शिक्षक", "☎ 2427731"], bg: "#1f3f7a", fg: "#fff", accent: "#f2c81f" },
  { kind: "ad", lines: ["STD • ISD • PCO", "Xerox • Fax • Recharge", "सस्ती कॉल यहाँ", "→ 20 कदम आगे"], bg: "#f2c81f", fg: "#1a1a1a", accent: "#c62f2a" },
  { kind: "warning", lines: ["STICK NO BILLS"], colour: "#1a1a1a" },
  { kind: "ad", lines: ["Dr. BATLA'S", "Homoeopathy Clinic", "बाल झड़ना • एलर्जी • पथरी", "☎ 2433018"], bg: "#f4efe2", fg: "#1f6f3a", accent: "#1f6f3a" },
  { kind: "chalk", draw: "noughts" },
  { kind: "ad", lines: ["RAJ TENT HOUSE", "Shadi • Party • Jagran", "टेंट • लाइट • साउंड", "☎ 2429870"], bg: "#c62f2a", fg: "#fff", accent: "#f2c81f" },
  { kind: "warning", lines: ["यहाँ कचरा", "डालना मना है"], colour: "#1f3f7a" },
  { kind: "ad", lines: ["COMPUTER CLASSES", "MS-Office • Tally • Internet", "सर्टिफिकेट के साथ", "☎ 2460021"], bg: "#f4efe2", fg: "#8a1f4a", accent: "#1f3f7a" },
  { kind: "chalk", draw: "names" },
];

/** A painted piece's place: on a side wall, facing into the gali or road. */
export type WorldMural = { position: THREE.Vector3; rotationY: number; w: number; h: number };

const SHEET = { w: 2048, h: 1024 };
const SLOT = { w: 512, h: 300, cols: 4 };
const SANS = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const PLAIN = '"Helvetica Neue", Arial, sans-serif';
const DEVANAGARI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';
const CHALK = '"Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive';
const fontFor = (s: string, bold: string, size: number, latin = PLAIN) => `${bold} ${size}px ${/[ऀ-ॿ]/.test(s) ? DEVANAGARI : latin}`;

function paintSheet(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.w;
  canvas.height = SHEET.h;
  const ctx = canvas.getContext("2d")!;
  MURALS.forEach((m, i) => {
    ctx.save();
    ctx.translate((i % SLOT.cols) * SLOT.w, Math.floor(i / SLOT.cols) * SLOT.h);
    paint(ctx, SLOT.w, SLOT.h, m, i);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One piece. Only what's painted is drawn: the wall shows round it (the rest of the slot is see-through). */
function paint(ctx: CanvasRenderingContext2D, w: number, h: number, m: Mural, seed: number) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // a little dry-brush unevenness, the same every time for the same piece
  let s = seed * 97 + 13;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (m.kind === "ad") {
    // a painted panel, edges not quite straight, a border line, four lines of lettering
    ctx.fillStyle = m.bg;
    ctx.beginPath();
    ctx.moveTo(12 + rnd() * 6, 14 + rnd() * 6);
    ctx.lineTo(w - 12 - rnd() * 6, 12 + rnd() * 6);
    ctx.lineTo(w - 14 - rnd() * 6, h - 12 - rnd() * 6);
    ctx.lineTo(14 + rnd() * 6, h - 14 - rnd() * 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = m.accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = m.fg;
    ctx.font = fontFor(m.lines[0], "bold", h * 0.17, SANS);
    ctx.fillText(m.lines[0], w / 2, h * 0.28, w * 0.84);
    ctx.fillStyle = m.accent === m.bg ? m.fg : m.accent;
    ctx.font = fontFor(m.lines[1], "bold", h * 0.09);
    ctx.fillText(m.lines[1], w / 2, h * 0.47, w * 0.8);
    ctx.fillStyle = m.fg;
    ctx.font = fontFor(m.lines[2], "bold", h * 0.1);
    ctx.fillText(m.lines[2], w / 2, h * 0.63, w * 0.8);
    ctx.font = fontFor(m.lines[3], "bold", h * 0.11);
    ctx.fillText(m.lines[3], w / 2, h * 0.8, w * 0.7);
    // sun and rain: faded spots, streaks
    ctx.fillStyle = "rgba(240, 235, 220, 0.25)";
    for (let k = 0; k < 25; k++) ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 30, 3 + rnd() * 8);
    ctx.fillStyle = "rgba(60, 50, 40, 0.12)";
    for (let k = 0; k < 8; k++) ctx.fillRect(rnd() * w, h * 0.2, 2 + rnd() * 3, h * 0.8 * rnd());
  } else if (m.kind === "warning") {
    // the municipality's stencil, straight on the wall
    ctx.fillStyle = m.colour;
    const n = m.lines.length;
    m.lines.forEach((line, k) => {
      ctx.font = fontFor(line, "bold", h * (n === 1 ? 0.2 : 0.2), SANS);
      ctx.fillText(line, w / 2, h * (n === 1 ? 0.5 : 0.36 + k * 0.28), w * 0.9);
    });
    if (m.lines[0].startsWith("यहाँ पेशाब")) {
      // …and, underneath, what someone added in charcoal
      ctx.fillStyle = "#2a2622";
      ctx.font = `${h * 0.08}px ${CHALK}`;
      ctx.fillText("गधा", w * 0.8, h * 0.88);
    }
  } else {
    // chalk
    ctx.strokeStyle = "rgba(245, 242, 232, 0.9)";
    ctx.fillStyle = "rgba(245, 242, 232, 0.9)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.font = `${h * 0.14}px ${CHALK}`;
    if (m.draw === "heart") {
      const cx = w * 0.4, cy = h * 0.45, r = h * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.bezierCurveTo(cx - r * 2, cy - r * 0.2, cx - r * 0.6, cy - r * 1.6, cx, cy - r * 0.5);
      ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.6, cx + r * 2, cy - r * 0.2, cx, cy + r);
      ctx.stroke();
      ctx.fillText("R + P", cx, cy - r * 0.1);
      ctx.beginPath(); // the arrow through it
      ctx.moveTo(cx - r * 2.2, cy + r * 0.8);
      ctx.lineTo(cx + r * 2.2, cy - r * 0.9);
      ctx.stroke();
      ctx.font = `${h * 0.1}px ${CHALK}`;
      ctx.fillText("PINKU WAS HERE", w * 0.72, h * 0.85);
    } else if (m.draw === "noughts") {
      const x0 = w * 0.2, y0 = h * 0.2, c = h * 0.18;
      for (let k = 1; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(x0 + k * c, y0); ctx.lineTo(x0 + k * c, y0 + 3 * c); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, y0 + k * c); ctx.lineTo(x0 + 3 * c, y0 + k * c); ctx.stroke();
      }
      const marks = ["X", "O", "X", "", "X", "O", "O", "", "X"];
      marks.forEach((mk, k) => mk && ctx.fillText(mk, x0 + (k % 3 + 0.5) * c, y0 + (Math.floor(k / 3) + 0.5) * c));
      ctx.beginPath(); // the winning line
      ctx.moveTo(x0 + 0.2 * c, y0 + 0.2 * c);
      ctx.lineTo(x0 + 2.8 * c, y0 + 2.8 * c);
      ctx.stroke();
      ctx.font = `${h * 0.13}px ${CHALK}`;
      ctx.fillText("SACHIN 100*", w * 0.72, h * 0.4);
    } else {
      ctx.fillText("GOLU + MONU", w * 0.35, h * 0.3);
      ctx.fillText("INDIA WILL WIN", w * 0.6, h * 0.62);
      ctx.font = `${h * 0.08}px ${CHALK}`;
      ctx.fillText("9829•••••  call me", w * 0.3, h * 0.86);
    }
  }
}

/** Every painted piece, as one mesh (pieces handed out in turn). */
export function buildWallArt(spots: WorldMural[]): THREE.Mesh | null {
  if (!spots.length) return null;
  const parts = spots.map((sp, n) => {
    const i = n % MURALS.length;
    const x = (i % SLOT.cols) * SLOT.w, y = Math.floor(i / SLOT.cols) * SLOT.h;
    const g = new THREE.PlaneGeometry(sp.w, sp.h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (x + uv.getX(k) * SLOT.w) / SHEET.w, 1 - (y + (1 - uv.getY(k)) * SLOT.h) / SHEET.h);
    g.rotateY(sp.rotationY);
    return g.translate(sp.position.x, sp.position.y, sp.position.z);
  });
  const material = toon({ color: 0xffffff, map: paintSheet(), alphaTest: 0.4, paint: 0.4 });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
  mesh.name = "wallArt";
  mesh.receiveShadow = true;
  return mesh;
}
