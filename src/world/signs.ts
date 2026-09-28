import * as THREE from "three";
import { toon } from "../render/toon";
import type { WorldSign } from "./street";

/**
 * Painted signboards.
 *
 * Each board's lettering is drawn in code onto a hidden canvas (the
 * browser's 2D drawing surface), and that picture is put on a flat panel
 * just in front of the board. No image files.
 *
 * For now only the cyber cafe's boards are painted, so you can find the
 * cafe; every other shop's board gets its lettering in phase 3.
 */

const LATIN = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const DEVANAGARI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';

const COLOURS = {
  cafeBlue: "#2f63b0",
  white: "#fbf6ea",
  yellow: "#f4c542",
  red: "#c0392b",
  ink: "#1f1a17",
  stdYellow: "#f2cb3a",
};

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** How each kind of board is painted. Kinds without a painter stay blank. */
const PAINTERS: Partial<Record<WorldSign["kind"], Painter>> = {
  /** The main board across the cafe's front. */
  cafe(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER CAFE", w * 0.3, h * 0.54, w * 0.52, h * 0.62, COLOURS.white, LATIN);
    text(ctx, "INTERNET • CHAT • GAMES", w * 0.78, h * 0.36, w * 0.38, h * 0.24, COLOURS.yellow, LATIN);
    text(ctx, "PRINTOUT • SCAN • ₹15/hr", w * 0.78, h * 0.7, w * 0.38, h * 0.24, COLOURS.yellow, LATIN);
  },
  /** The tall board sticking out into the street, read from far away. */
  cafeBlade(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER", w / 2, h * 0.2, w * 0.82, h * 0.2, COLOURS.white, LATIN);
    text(ctx, "CAFE", w / 2, h * 0.43, w * 0.82, h * 0.22, COLOURS.white, LATIN);
    ctx.fillStyle = COLOURS.yellow;
    ctx.fillRect(w * 0.06, h * 0.6, w * 0.88, h * 0.34);
    text(ctx, "इंटरनेट", w / 2, h * 0.71, w * 0.78, h * 0.16, COLOURS.ink, DEVANAGARI);
    text(ctx, "1st FLOOR ↑", w / 2, h * 0.86, w * 0.78, h * 0.1, COLOURS.red, LATIN);
  },
  /** The small board over the stair door. */
  cafeDoor(ctx, w, h) {
    background(ctx, w, h, COLOURS.cafeBlue, COLOURS.white);
    text(ctx, "CYBER CAFE ↑", w / 2, h * 0.36, w * 0.86, h * 0.36, COLOURS.white, LATIN);
    text(ctx, "पहली मंज़िल", w / 2, h * 0.74, w * 0.7, h * 0.3, COLOURS.yellow, DEVANAGARI);
  },
  /** The phone booth shop under the cafe. */
  stdShop(ctx, w, h) {
    background(ctx, w, h, COLOURS.stdYellow, COLOURS.red);
    text(ctx, "STD • ISD • PCO", w * 0.36, h * 0.52, w * 0.6, h * 0.62, COLOURS.red, LATIN);
    text(ctx, "Mobile Recharge", w * 0.83, h * 0.36, w * 0.28, h * 0.28, COLOURS.ink, LATIN);
    text(ctx, "Xerox", w * 0.83, h * 0.7, w * 0.28, h * 0.28, COLOURS.ink, LATIN);
  },
};

/** Build panels for every sign that has a painter. */
export function buildSigns(signs: readonly WorldSign[]): THREE.Group {
  const group = new THREE.Group();
  group.name = "signs";
  for (const sign of signs) {
    const paint = PAINTERS[sign.kind];
    if (!paint) continue;
    const material = toon({ color: 0xffffff, map: paintTexture(sign, paint), flatShading: false });
    const normal = new THREE.Vector3(Math.sin(sign.rotationY), 0, Math.cos(sign.rotationY));

    // 1 cm in front of the board's face: at exactly the same depth the two
    // would flicker against each other (z-fighting).
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

/** Draw a sign onto a canvas sized to the board's shape, and wrap it as a texture. */
function paintTexture(sign: WorldSign, paint: Painter): THREE.CanvasTexture {
  // About 200 pixels per metre, capped at 2048 wide: sharp enough to read
  // from across the street without wasting memory.
  const ppm = Math.min(220, 2048 / sign.w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sign.w * ppm);
  canvas.height = Math.round(sign.h * ppm);
  const ctx = canvas.getContext("2d")!;
  paint(ctx, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; // the canvas colours are ordinary screen colours
  tex.anisotropy = 8; // keeps lettering crisp when seen at a steep angle down the street
  return tex;
}

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
 * Draw one line of text centred at (x, y), as large as fits in a box
 * `maxW` wide and `maxH` tall.
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
