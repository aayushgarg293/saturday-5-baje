import * as THREE from "three";
import { type Rng, makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { CINEMA, FILMS, SHOP_NAMES, WALL_ADS } from "./names";
import type { WorldSign } from "./street";

/**
 * Everything painted on the street: signboards, wall ads and film posters.
 *
 * Each one is drawn in code onto a hidden canvas (the browser's 2D drawing
 * surface), and that picture is put on a flat panel just in front of the
 * wall or board. No image files. They're hand-painted, so the painters add
 * imperfections: slightly tilted lettering, faded patches, rust streaks,
 * peeling edges.
 *
 * The words come from `names.ts`. Which shop gets which name is shuffled
 * once with a fixed seed, so it's the same on every load.
 */

const LATIN = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const LATIN_PLAIN = '"Helvetica Neue", Arial, sans-serif';
const DEVANAGARI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';

const COLOURS = {
  cafeBlue: "#2f63b0",
  white: "#fbf6ea",
  yellow: "#f4c542",
  red: "#c0392b",
  ink: "#1f1a17",
  stdYellow: "#f2cb3a",
};

/** Hand-painted board colour schemes: background, main lettering, second line. */
const BOARD_STYLES = [
  ["#f2c53d", "#b8322a", "#2a1d15"],
  ["#f1ebdd", "#1f4f8f", "#b8322a"],
  ["#b8352c", "#f7d64a", "#fbf4e4"],
  ["#3e7d4c", "#fbf4e4", "#f7d64a"],
  ["#2d5d9f", "#fbf4e4", "#f7d64a"],
  ["#2b2622", "#f2c53d", "#fbf4e4"],
  ["#e07b2e", "#3a1f10", "#fbf4e4"],
  ["#f1ebdd", "#b8322a", "#1f4f8f"],
] as const;

/** Draws one sign. `i` counts signs of the same kind (0, 1, 2…), to pick its content. */
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, i: number, rng: Rng) => void;

type PainterSpec = {
  paint: Painter;
  /** Pixels per metre: small detailed things need more than big wall paintings. */
  ppm: number;
  /** Strength of the brush/weathering layer on top (see render/paint.ts). */
  weather: number;
  /** Has see-through parts (peeling paint, torn poster edges). */
  cutout?: boolean;
};

// Shuffled once, with a fixed seed: which shop gets which name, and so on.
const shopOrder = shuffled(SHOP_NAMES.length, 11);
const adOrder = shuffled(WALL_ADS.length, 12);
const filmOrder = shuffled(FILMS.length, 13);

const PAINTERS: Partial<Record<WorldSign["kind"], PainterSpec>> = {
  /** The main board across the cafe's front. */
  cafe: { ppm: 220, weather: 0.25, paint(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER CAFE", w * 0.3, h * 0.54, w * 0.52, h * 0.62, COLOURS.white, LATIN);
    text(ctx, "INTERNET • CHAT • GAMES", w * 0.78, h * 0.36, w * 0.38, h * 0.24, COLOURS.yellow, LATIN);
    text(ctx, "PRINTOUT • SCAN • ₹15/hr", w * 0.78, h * 0.7, w * 0.38, h * 0.24, COLOURS.yellow, LATIN);
  } },

  /** The tall board sticking out into the street, read from far away. */
  cafeBlade: { ppm: 220, weather: 0.25, paint(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER", w / 2, h * 0.2, w * 0.82, h * 0.2, COLOURS.white, LATIN);
    text(ctx, "CAFE", w / 2, h * 0.43, w * 0.82, h * 0.22, COLOURS.white, LATIN);
    ctx.fillStyle = COLOURS.yellow;
    ctx.fillRect(w * 0.06, h * 0.6, w * 0.88, h * 0.34);
    text(ctx, "इंटरनेट", w / 2, h * 0.71, w * 0.78, h * 0.16, COLOURS.ink, DEVANAGARI);
    text(ctx, "1st FLOOR ↑", w / 2, h * 0.86, w * 0.78, h * 0.1, COLOURS.red, LATIN);
  } },

  /** The small board over the stair door. */
  cafeDoor: { ppm: 220, weather: 0.25, paint(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER CAFE ↑", w / 2, h * 0.36, w * 0.86, h * 0.36, COLOURS.white, LATIN);
    text(ctx, "पहली मंज़िल", w / 2, h * 0.74, w * 0.7, h * 0.3, COLOURS.yellow, DEVANAGARI);
  } },

  /** The phone booth shop under the cafe. */
  stdShop: { ppm: 220, weather: 0.3, paint(ctx, w, h, _i, rng) {
    background(ctx, w, h, COLOURS.stdYellow, COLOURS.red);
    text(ctx, "STD • ISD • PCO", w * 0.36, h * 0.52, w * 0.6, h * 0.62, COLOURS.red, LATIN);
    text(ctx, "Mobile Recharge", w * 0.83, h * 0.36, w * 0.28, h * 0.28, COLOURS.ink, LATIN);
    text(ctx, "Xerox", w * 0.83, h * 0.7, w * 0.28, h * 0.28, COLOURS.ink, LATIN);
    weather(ctx, w, h, rng, 0.5);
  } },

  /** Every other shop: its name big in Hindi, then English, what it sells, and a phone number. */
  shop: { ppm: 220, weather: 0.35, paint(ctx, w, h, i, rng) {
    const name = SHOP_NAMES[shopOrder[i % shopOrder.length]];
    const [bg, main, second] = BOARD_STYLES[Math.floor(rng.next() * BOARD_STYLES.length)];
    background(ctx, w, h, bg, second);
    brushStreaks(ctx, w, h, rng);
    tilted(ctx, w / 2, h * 0.36, rng.range(-0.012, 0.012), () =>
      text(ctx, name.hi, 0, 0, w * 0.86, h * 0.5, main, DEVANAGARI));
    const phone = `☎ ${Math.floor(rng.range(2400000, 2699999))}`;
    text(ctx, `${name.en}  •  ${name.tag}  •  ${phone}`, w / 2, h * 0.77, w * 0.86, h * 0.2, second, LATIN_PLAIN);
    weather(ctx, w, h, rng, 1);
  } },

  /** A brand ad painted straight onto a side wall, peeling in places. */
  wallAd: { ppm: 110, weather: 0.9, cutout: true, paint(ctx, w, h, i, rng) {
    const ad = WALL_ADS[adOrder[i % adOrder.length]];
    // the painted panel doesn't fill the canvas edge to edge: a rough border of bare wall
    roughPanel(ctx, w * 0.04, h * 0.05, w * 0.92, h * 0.9, ad.bg, rng);
    ctx.fillStyle = ad.accent;
    ctx.fillRect(w * 0.08, h * 0.66, w * 0.84, h * 0.04); // a painted stripe
    tilted(ctx, w / 2, h * 0.36, rng.range(-0.01, 0.01), () =>
      text(ctx, ad.brand, 0, 0, w * 0.82, h * 0.38, ad.fg, LATIN));
    text(ctx, ad.line, w / 2, h * 0.58, w * 0.7, h * 0.13, ad.accent === ad.bg ? ad.fg : ad.accent, LATIN);
    text(ctx, ad.hi, w / 2, h * 0.8, w * 0.7, h * 0.13, ad.fg, DEVANAGARI);
    weather(ctx, w, h, rng, 1.4);
    peel(ctx, w, h, rng); // flaked-off paint shows the wall behind
  } },

  /** A cluster of film posters pasted on a wall, overlapping and torn. */
  posters: { ppm: 300, weather: 0.5, cutout: true, paint(ctx, w, h, i, rng) {
    // narrow spots get one poster; wider ones get two or three overlapping
    const count = w / h < 0.9 ? 1 : 2 + Math.floor(rng.next() * 2);
    const pw = count === 1 ? w * 0.94 : w / (count * 0.82);
    const ph = Math.min(h * 0.94, pw * 1.4);
    for (let k = 0; k < count; k++) {
      const film = FILMS[filmOrder[(i * 3 + k) % filmOrder.length]];
      const x = count === 1 ? w / 2 : pw / 2 + (k / (count - 1)) * (w - pw);
      const y = h / 2 + rng.range(-h * 0.03, h * 0.03);
      tilted(ctx, x, y, rng.range(-0.05, 0.05), () => poster(ctx, pw, ph, film, rng));
    }
  } },
};

/** Build a panel for every sign that has a painter. */
export function buildSigns(signs: readonly WorldSign[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "signs";
  const counts: Partial<Record<WorldSign["kind"], number>> = {};
  const rng = makeRng(77);
  for (const sign of signs) {
    const spec = PAINTERS[sign.kind];
    if (!spec) continue;
    const index = counts[sign.kind] ?? 0;
    counts[sign.kind] = index + 1;

    const material = toon({
      color: 0xffffff,
      map: paintTexture(sign, spec, index, makeRng(Math.floor(rng.next() * 1e9))),
      flatShading: false,
      paint: spec.weather,
      alphaTest: spec.cutout ? 0.5 : 0,
    });
    const normal = new THREE.Vector3(Math.sin(sign.rotationY), 0, Math.cos(sign.rotationY));

    // 1 cm in front of the surface: at exactly the same depth the two would
    // flicker against each other (z-fighting).
    const front = panel(sign, material);
    front.position.copy(sign.position).addScaledVector(normal, 0.01);
    front.rotation.y = sign.rotationY;
    group.add(front);

    if (sign.backOffset !== undefined) {
      // the other side of a two-sided board, turned round to face the other way
      const back = panel(sign, material);
      back.position.copy(sign.position).addScaledVector(normal, -sign.backOffset);
      back.rotation.y = sign.rotationY + Math.PI;
      group.add(back);
    }
  }
  return group;
}

function panel(sign: WorldSign, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sign.w, sign.h), material);
  mesh.name = `sign:${sign.kind}`;
  mesh.receiveShadow = true;
  return mesh;
}

/** Draw a sign onto a canvas sized to its shape, and wrap it as a texture. */
function paintTexture(sign: WorldSign, spec: PainterSpec, index: number, rng: Rng): THREE.CanvasTexture {
  const ppm = Math.min(spec.ppm, 2048 / sign.w, 2048 / sign.h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sign.w * ppm);
  canvas.height = Math.round(sign.h * ppm);
  const ctx = canvas.getContext("2d")!;
  spec.paint(ctx, canvas.width, canvas.height, index, rng);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; // the canvas colours are ordinary screen colours
  tex.anisotropy = 8; // keeps lettering crisp when seen at a steep angle down the street
  return tex;
}

// --- painting helpers --------------------------------------------------------------

/** Fill the board and draw a painted border inset from the edge. */
function background(ctx: CanvasRenderingContext2D, w: number, h: number, fill: string, border: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const inset = Math.min(w, h) * 0.05;
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.min(w, h) * 0.025;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

/**
 * Draw one line of text centred at (x, y), as large as fits in a box `maxW`
 * wide and `maxH` tall.
 */
function text(
  ctx: CanvasRenderingContext2D, s: string, x: number, y: number,
  maxW: number, maxH: number, colour: string, family: string,
) {
  let size = maxH;
  ctx.font = `bold ${size}px ${family}`;
  const measured = ctx.measureText(s).width;
  if (measured > maxW) {
    size *= maxW / measured;
    ctx.font = `bold ${size}px ${family}`;
  }
  ctx.fillStyle = colour;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(s, x, y);
}

/** Run `draw` with the canvas moved to (x, y) and turned by `angle` radians. */
function tilted(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, draw: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}

/** Faint horizontal brush marks across a painted board. */
function brushStreaks(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng) {
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = rng.next() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(rng.range(0, w * 0.6), rng.range(0, h), rng.range(w * 0.2, w * 0.7), rng.range(h * 0.02, h * 0.06));
  }
}

/**
 * Age a painted surface: sun-faded pale patches, and rust or rain streaks
 * running down from the top edge. `amount` scales how much.
 */
function weather(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, amount: number) {
  const size = Math.max(w, h);
  for (let k = 0; k < 5 * amount; k++) {
    const x = rng.range(0, w), y = rng.range(0, h), r = rng.range(size * 0.05, size * 0.2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(250,244,230,${0.18 * amount})`);
    g.addColorStop(1, "rgba(250,244,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let k = 0; k < 6 * amount; k++) {
    const x = rng.range(0, w);
    const len = rng.range(h * 0.2, h * 0.8);
    const g = ctx.createLinearGradient(x, 0, x, len);
    g.addColorStop(0, `rgba(110,62,30,${0.35 * Math.min(amount, 1)})`);
    g.addColorStop(1, "rgba(110,62,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, rng.range(1, Math.max(2, w * 0.006)), len);
  }
}

/** A painted rectangle with ragged, brushed edges (for paint straight on a wall). */
function roughPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, rng: Rng) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  const step = Math.max(w, h) / 40;
  ctx.moveTo(x, y);
  for (let px = x; px <= x + w; px += step) ctx.lineTo(px, y + rng.range(-step * 0.4, step * 0.4));
  for (let py = y; py <= y + h; py += step) ctx.lineTo(x + w + rng.range(-step * 0.4, step * 0.4), py);
  for (let px = x + w; px >= x; px -= step) ctx.lineTo(px, y + h + rng.range(-step * 0.4, step * 0.4));
  for (let py = y + h; py >= y; py -= step) ctx.lineTo(x + rng.range(-step * 0.4, step * 0.4), py);
  ctx.fill();
}

/** Knock irregular holes in the paint (made fully see-through), as if it has flaked off. */
function peel(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let k = 0; k < 22; k++) {
    const cx = rng.range(0, w), cy = rng.range(0, h), r = rng.range(w * 0.008, w * 0.035);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
      const rr = r * rng.range(0.5, 1.3);
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.fill();
  }
  ctx.restore();
}

/**
 * One film poster, centred on the current canvas origin: a two-colour
 * background, a bold burst shape, the title, and the cinema at the bottom.
 * Its bottom edge is torn. Stylised shapes only, no faces.
 */
function poster(ctx: CanvasRenderingContext2D, w: number, h: number, film: (typeof FILMS)[number], rng: Rng) {
  const x0 = -w / 2, y0 = -h / 2;
  ctx.save();
  // the paper, with a torn bottom edge
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + w, y0);
  const tear = h * rng.range(0.78, 1);
  ctx.lineTo(x0 + w, y0 + tear);
  for (let px = x0 + w; px > x0; px -= w / 12) ctx.lineTo(px, y0 + tear - rng.range(0, h * 0.08));
  ctx.lineTo(x0, y0 + h * rng.range(0.85, 1));
  ctx.closePath();
  ctx.clip();

  const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, film.top);
  g.addColorStop(1, film.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  // a burst of rays behind the title
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, y0 + h * 0.38);
    ctx.lineTo(Math.cos(a) * w, y0 + h * 0.38 + Math.sin(a) * w);
    ctx.lineTo(Math.cos(a + 0.2) * w, y0 + h * 0.38 + Math.sin(a + 0.2) * w);
    ctx.fill();
  }
  // title in two lines if it's long
  const words = film.title.split(" ");
  const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [film.title];
  lines.forEach((line, k) =>
    text(ctx, line, 0, y0 + h * (0.34 + k * 0.16), w * 0.86, h * 0.15, film.ink, LATIN));
  text(ctx, "आज ही देखें", 0, y0 + h * 0.66, w * 0.7, h * 0.08, film.ink, DEVANAGARI);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x0, y0 + h * 0.74, w, h * 0.1);
  text(ctx, `NOW SHOWING • ${CINEMA.en}`, 0, y0 + h * 0.79, w * 0.9, h * 0.06, "#f7e9c8", LATIN);
  // sun-faded
  ctx.fillStyle = `rgba(250,244,230,${rng.range(0.05, 0.3)})`;
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
}

/** The numbers 0..n-1 in a shuffled order that's the same on every load. */
function shuffled(n: number, seed: number): number[] {
  const rng = makeRng(seed);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
