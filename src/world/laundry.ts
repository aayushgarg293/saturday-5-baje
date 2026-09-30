import * as THREE from "three";
import { makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { Parts } from "./kit";
import type { WorldLine } from "./street";

/**
 * Washing hung out to dry: shirts, kurtas, banians, pyjamas, sarees, towels,
 * a bedsheet, a little girl's frock, draped over balcony railings and pegged
 * on lines strung across the roofs, swinging a little in the breeze.
 *
 * The buildings offer the places (world/buildings/common.ts: every balcony's
 * railing, every roof); this decides which get washing and what hangs there,
 * from its own random numbers (so the street's don't change).
 *
 * How it's drawn: every piece is one flat, see-through-edged picture, all
 * painted once onto one sheet (white and greys, so each piece can be tinted
 * its own colour). They're drawn together as one "instanced" mesh: one
 * shape (a square), a list of where each copy hangs, its size and colour,
 * and (a small addition to the material, below) which picture on the sheet
 * it shows. One draw call for all the washing; the swinging is just updating
 * the list. The roof lines' poles and ropes are one more.
 */

type Kind = "shirt" | "kurta" | "banian" | "pyjama" | "saree" | "towel" | "sheet" | "frock";

/**
 * Each kind: its size (width, drop, metres), colours, and how often it turns
 * up (`weight`). Edit freely.
 */
const KINDS: Record<Kind, { w: number; h: number; colours: number[]; weight: number }> = {
  shirt: { w: 0.62, h: 0.72, colours: [0xf4f4f0, 0xa8c8e8, 0xe8dcc0, 0x9aa8b8, 0xd9e7d0, 0xc8a8a0], weight: 3 },
  kurta: { w: 0.66, h: 0.98, colours: [0xf4f4f0, 0xf2e6c8, 0xd8b8d8, 0xb8d8d0], weight: 2 },
  banian: { w: 0.42, h: 0.56, colours: [0xf6f6f2], weight: 2 },
  pyjama: { w: 0.5, h: 0.95, colours: [0xf4f4f0, 0x44506e, 0x7a7a7a, 0xd8c8a8], weight: 2 },
  saree: { w: 1.8, h: 1.05, colours: [0xc2186b, 0xe65100, 0xf9a825, 0x2e7d32, 0x1565c0, 0x6a1b9a, 0xd32f2f, 0x00838f], weight: 2 },
  towel: { w: 0.56, h: 0.82, colours: [0xe8a0a0, 0xa0c0e0, 0xf0d890, 0xf4f4f0, 0xa8d8a8], weight: 2 },
  sheet: { w: 1.5, h: 1.1, colours: [0xf0c8d8, 0xc8d8f0, 0xf4f0d8], weight: 1 },
  frock: { w: 0.46, h: 0.62, colours: [0xf4a8c8, 0xa8d8f0, 0xf0e090], weight: 1 },
};
const ORDER = Object.keys(KINDS) as Kind[];

/** How many in every hundred balconies and roofs have washing out. */
const USED = { rail: 70, roof: 55 };
/** Over a railing the washing can't hang lower than this (the balcony floor is under it). */
const RAIL_DROP = 0.8;

/** The sheet: 4 × 2 pictures, one per kind (in ORDER). */
const SHEET = { w: 1024, h: 512, cols: 4, rows: 2 };

export type Laundry = { group: THREE.Group; update(t: number): void };

export function buildLaundry(lines: WorldLine[]): Laundry {
  const rng = makeRng(5151);
  const group = new THREE.Group();
  group.name = "laundry";

  // --- what hangs where ------------------------------------------------------------------
  type Piece = { kind: Kind; at: THREE.Vector3; turn: number; w: number; h: number; colour: number; swing: number; speed: number; phase: number; rail: boolean };
  const pieces: Piece[] = [];
  const poles = new Parts();
  let roofLines = 0;
  const totalWeight = ORDER.reduce((n, k) => n + KINDS[k].weight, 0);
  const pickKind = (): Kind => {
    let n = rng.next() * totalWeight;
    for (const k of ORDER) if ((n -= KINDS[k].weight) < 0) return k;
    return "shirt";
  };

  for (const line of lines) {
    const rail = line.kind === "rail";
    if (rng.next() * 100 >= (rail ? USED.rail : USED.roof)) continue;
    const length = line.a.distanceTo(line.b);
    const along = line.b.clone().sub(line.a).normalize();
    // fill it from one end, piece by piece with small gaps, leaving some of it empty
    let d = rng.range(0.05, 0.5);
    const stop = length * rng.range(0.6, 1);
    while (true) {
      const kind = pickKind();
      const size = KINDS[kind];
      const w = size.w * rng.range(0.9, 1.08);
      if (d + w > stop) break;
      pieces.push({
        kind, w, h: rail ? Math.min(size.h, RAIL_DROP) : size.h,
        at: line.a.clone().addScaledVector(along, d + w / 2),
        turn: line.rotationY, colour: rng.pick(size.colours),
        // up on the roofs the breeze is stronger; a big saree or sheet swings less
        swing: (rail ? 0.03 : 0.1) * (w > 1 ? 0.5 : 1) * rng.range(0.7, 1.3),
        speed: rng.range(1.4, 2.2), phase: rng.range(0, Math.PI * 2), rail,
      });
      d += w + rng.range(0.06, 0.3);
    }
    if (!rail) {
      // the line: a bamboo pole at each end, the rope between (only for lines with washing on)
      roofLines++;
      for (const end of [line.a, line.b]) poles.strut({ x: end.x, y: end.y - 2.0, z: end.z }, { x: end.x, y: end.y + 0.12, z: end.z }, 0.025, 0x9a7a4a);
      poles.strut(line.a, line.b, 0.006, 0x6a6a62, 4);
    }
  }
  if (roofLines) group.add(poles.build("washingLines", { castShadow: false }));

  // --- the washing: one square, many copies ------------------------------------------------
  const square = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0); // (hangs from the middle of its top edge)
  // which picture each copy shows: where it is on the sheet (left, bottom, width, height)
  const cell = new Float32Array(pieces.length * 4);
  pieces.forEach((pc, i) => {
    const k = ORDER.indexOf(pc.kind);
    const col = k % SHEET.cols, row = Math.floor(k / SHEET.cols);
    cell.set([col / SHEET.cols, 1 - (row + 1) / SHEET.rows, 1 / SHEET.cols, 1 / SHEET.rows], i * 4);
  });
  square.setAttribute("aCell", new THREE.InstancedBufferAttribute(cell, 4));

  const material = toon({ color: 0xffffff, map: paintSheet(), alphaTest: 0.5, paint: 0.5 });
  material.side = THREE.DoubleSide;
  showOwnPicture(material);
  const mesh = new THREE.InstancedMesh(square, material, pieces.length);
  mesh.name = "washing";
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // (its copies are spread along the whole street)
  pieces.forEach((pc, i) => mesh.setColorAt(i, new THREE.Color(pc.colour)));
  group.add(mesh);

  const facing = new THREE.Quaternion(), swing = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(1, 0, 0);
  const scale = new THREE.Vector3(), matrix = new THREE.Matrix4();
  function hang(t: number) {
    pieces.forEach((pc, i) => {
      // a gust that runs along the street now and then, on top of each piece's own sway
      const gust = 0.6 + 0.4 * Math.sin(t * 0.35 + pc.at.x * 0.08 + pc.at.z * 0.05);
      const a = pc.swing * gust * Math.sin(t * pc.speed + pc.phase);
      // (over a railing, it can only swing outward, away from the bars: −a turns its bottom toward the street)
      swing.setFromAxisAngle(side, pc.rail ? -0.05 - Math.abs(a) : a);
      facing.setFromAxisAngle(up, pc.turn);
      turn.multiplyQuaternions(facing, swing);
      mesh.setMatrixAt(i, matrix.compose(pc.at, turn, scale.set(pc.w, pc.h, 1)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  hang(0);

  return { group, update: hang };
}

/**
 * The small addition to the material: each copy moves its picture
 * coordinates into its own cell of the sheet (`aCell`), after the usual ones
 * are worked out. Its own shader "program", so no other material gets it.
 */
function showOwnPicture(material: THREE.MeshToonMaterial) {
  const usual = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    usual.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aCell;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv = vMapUv * aCell.zw + aCell.xy;");
  };
  const usualKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => usualKey() + "_laundry";
}

// --- the pictures ------------------------------------------------------------------------------

/** White cloth, grey folds and seams: the tint gives each piece its colour. */
const CLOTH = "#ffffff", FOLD = "rgba(0, 0, 0, 0.13)", SEAM = "rgba(0, 0, 0, 0.3)", PEG = "#8a6a45";

function paintSheet(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.w;
  canvas.height = SHEET.h;
  const ctx = canvas.getContext("2d")!;
  const cw = SHEET.w / SHEET.cols, ch = SHEET.h / SHEET.rows;
  ORDER.forEach((kind, k) => {
    ctx.save();
    ctx.translate((k % SHEET.cols) * cw, Math.floor(k / SHEET.cols) * ch);
    // each picture fills its cell edge to edge (its top edge is the line or the railing)
    PAINTERS[kind](ctx, cw, ch);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function shape(ctx: CanvasRenderingContext2D, points: [number, number][], w: number, h: number) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
  ctx.closePath();
  ctx.fillStyle = CLOTH;
  ctx.fill();
}
function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour = SEAM, width = 3) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
/** Soft vertical folds, where the cloth hangs in creases. */
function folds(ctx: CanvasRenderingContext2D, xs: number[], w: number, y0: number, y1: number) {
  ctx.fillStyle = FOLD;
  for (const x of xs) ctx.fillRect(x * w - 5, y0, 10, y1 - y0);
}
/** Clothes pegs on the top edge. */
function pegs(ctx: CanvasRenderingContext2D, xs: number[], w: number) {
  ctx.fillStyle = PEG;
  for (const x of xs) ctx.fillRect(x * w - 5, 0, 10, 22);
}

const PAINTERS: Record<Kind, Painter> = {
  shirt(ctx, w, h) {
    // hung by the shoulders: short sleeves out to the sides, the collar at the top
    shape(ctx, [[0.2, 0], [0.8, 0], [1, 0.08], [0.98, 0.34], [0.78, 0.3], [0.8, 1], [0.2, 1], [0.22, 0.3], [0.02, 0.34], [0, 0.08]], w, h);
    folds(ctx, [0.35, 0.66], w, h * 0.3, h);
    line(ctx, w * 0.5, 0, w * 0.5, h); // the placket
    ctx.fillStyle = SEAM;
    for (let y = 0.12; y < 1; y += 0.16) ctx.fillRect(w * 0.53, y * h, 6, 6); // buttons
    ctx.strokeStyle = SEAM;
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.6, h * 0.14, w * 0.13, h * 0.12); // the pocket
    line(ctx, w * 0.3, 0, w * 0.5, h * 0.1); // the collar
    line(ctx, w * 0.7, 0, w * 0.5, h * 0.1);
    pegs(ctx, [0.24, 0.76], w);
  },
  kurta(ctx, w, h) {
    // long, full sleeves, slits at the sides of the hem
    shape(ctx, [[0.22, 0], [0.78, 0], [1, 0.05], [1, 0.52], [0.88, 0.52], [0.8, 0.2], [0.8, 1], [0.54, 1], [0.54, 0.99], [0.46, 0.99], [0.46, 1], [0.2, 1], [0.2, 0.2], [0.12, 0.52], [0, 0.52], [0, 0.05]], w, h);
    folds(ctx, [0.32, 0.68], w, h * 0.2, h);
    line(ctx, w * 0.5, 0, w * 0.5, h * 0.3);
    line(ctx, w * 0.2, h * 0.78, w * 0.26, h * 0.78);
    line(ctx, w * 0.8, h * 0.78, w * 0.74, h * 0.78);
    pegs(ctx, [0.25, 0.75], w);
  },
  banian(ctx, w, h) {
    // the vest: thin straps, deep armholes, a ribbed look
    shape(ctx, [[0.2, 0], [0.34, 0], [0.4, 0.14], [0.6, 0.14], [0.66, 0], [0.8, 0], [0.8, 0.26], [0.92, 0.36], [0.94, 1], [0.06, 1], [0.08, 0.36], [0.2, 0.26]], w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    for (let x = 0.1; x < 0.9; x += 0.05) ctx.fillRect(x * w, h * 0.3, 3, h * 0.7);
    pegs(ctx, [0.27, 0.73], w);
  },
  pyjama(ctx, w, h) {
    // hung by the waist: the drawstring, two legs
    shape(ctx, [[0, 0], [1, 0], [0.98, 1], [0.56, 1], [0.5, 0.42], [0.44, 1], [0.02, 1]], w, h);
    ctx.fillStyle = FOLD;
    ctx.fillRect(0, 0, w, h * 0.07); // the waistband
    line(ctx, w * 0.5, h * 0.07, w * 0.46, h * 0.2, SEAM, 3); // the drawstring
    line(ctx, w * 0.5, h * 0.07, w * 0.54, h * 0.22, SEAM, 3);
    folds(ctx, [0.2, 0.8], w, h * 0.1, h);
    pegs(ctx, [0.08, 0.92], w);
  },
  saree(ctx, w, h) {
    // six yards folded over the line: a wide field of small buttis, a patterned border along
    // the bottom, and the pallu (its decorated end) at one side
    shape(ctx, [[0, 0], [1, 0], [1, 1], [0, 1]], w, h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    for (let y = 0.12; y < 0.78; y += 0.12) for (let x = 0.04 + (y * 10 % 2) * 0.02; x < 0.72; x += 0.05) ctx.fillRect(x * w, y * h, 4, 4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, h * 0.84, w, h * 0.16); // the border
    ctx.fillStyle = "rgba(255, 240, 180, 0.8)"; // the zari in it
    ctx.fillRect(0, h * 0.86, w, 4);
    ctx.fillRect(0, h * 0.97, w, 4);
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, h * 0.9, 8, 8);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)"; // the pallu
    ctx.fillRect(w * 0.76, 0, w * 0.24, h * 0.84);
    ctx.fillStyle = "rgba(255, 240, 180, 0.7)";
    for (let x = 0.78; x < 1; x += 0.05) ctx.fillRect(x * w, 0, 4, h * 0.84);
    folds(ctx, [0.2, 0.45, 0.66], w, 0, h * 0.84);
  },
  towel(ctx, w, h) {
    shape(ctx, [[0, 0], [1, 0], [1, 0.96], [0, 0.96]], w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    for (const y of [0.1, 0.16, 0.8, 0.86]) ctx.fillRect(0, y * h, w, h * 0.03); // the stripes
    ctx.fillStyle = CLOTH; // the fringe
    for (let x = 0; x < w; x += 8) ctx.fillRect(x, h * 0.96, 4, h * 0.04);
    folds(ctx, [0.5], w, 0, h * 0.96);
    pegs(ctx, [0.1, 0.9], w);
  },
  sheet(ctx, w, h) {
    // a printed bedsheet: rows of flowers, a border
    shape(ctx, [[0, 0], [1, 0], [1, 1], [0, 1]], w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    for (let y = 0.1; y < 0.86; y += 0.14) {
      for (let x = 0.06 + ((y * 7) % 2 > 1 ? 0.05 : 0); x < 0.96; x += 0.1) {
        for (let petal = 0; petal < 5; petal++) {
          const a = (petal / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x * w + Math.cos(a) * 7, y * h + Math.sin(a) * 7, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, h * 0.9, w, h * 0.06);
    folds(ctx, [0.3, 0.7], w, 0, h);
    pegs(ctx, [0.05, 0.5, 0.95], w);
  },
  frock(ctx, w, h) {
    // a little girl's frock: puffed sleeves, a gathered skirt, a sash
    shape(ctx, [[0.3, 0], [0.7, 0], [0.9, 0.06], [0.86, 0.22], [0.72, 0.2], [0.74, 0.4], [1, 1], [0, 1], [0.26, 0.4], [0.28, 0.2], [0.14, 0.22], [0.1, 0.06]], w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(w * 0.26, h * 0.38, w * 0.48, h * 0.06); // the sash
    folds(ctx, [0.3, 0.5, 0.7], w, h * 0.46, h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, h * 0.94, w, h * 0.06); // the lace hem
    pegs(ctx, [0.32, 0.68], w);
  },
};
