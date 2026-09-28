import * as THREE from "three";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";

/**
 * Faces, painted in code, in a simple anime style.
 *
 * The face is painted onto a canvas (transparent everywhere except the
 * features) and wrapped round the front of the head on a thin shell just
 * outside it, so the head's own skin shows through between the features.
 *
 * The shell covers FACE_WIDTH radians around the head (centred on the front)
 * and from the forehead (THETA_TOP, measured down from the top of the head)
 * down past the chin. Features are placed by angle, not pixel, so they land
 * where they should on the round head: `at(side, down)` converts.
 */

const FACE_WIDTH = 1.8; // radians around the head (~100°)
const THETA_TOP = 0.55; // where the shell starts, down from the top of the head
const THETA_SPAN = 1.75; // how far down it reaches
const SIZE = 512; // canvas pixels

export type FaceRecipe = {
  /** Moustache style. */
  moustache: "none" | "thin" | "thick" | "curled";
  beard: "none" | "stubble";
  /** 0 = young, 1 = old: adds lines, greyer moustache. */
  age: number;
  tilak: boolean;
  bindi: boolean;
  /** Eyebrow thickness, pixels at 512. */
  brow: number;
  /** Hair colour, for brows and moustache. */
  hair: number;
};

/**
 * Expressions. Each is painted once, up front, as its own small picture;
 * changing expression just swaps which picture the face shows (cheap).
 *   neutral  the everyday face
 *   blink    eyes closed, for a fraction of a second every few seconds
 *   smile    a wide smile with raised brows and smiling eyes: when he greets you
 */
export type Expression = "neutral" | "blink" | "smile";

export type Face = {
  mesh: THREE.Mesh;
  set(expression: Expression): void;
};

/** The face shell for a head of this radius (the head is scaled by the body builder). */
export function faceMesh(recipe: FaceRecipe, headRadius: number): Face {
  const geo = new THREE.SphereGeometry(
    headRadius * 1.012, 24, 16,
    Math.PI / 2 - FACE_WIDTH / 2, FACE_WIDTH, // around: centred on the front (+z)
    THETA_TOP, THETA_SPAN, // down: forehead to below the chin
  );
  const pictures: Record<Expression, THREE.CanvasTexture> = {
    neutral: paintFace(recipe, "neutral"),
    blink: paintFace(recipe, "blink"),
    smile: paintFace(recipe, "smile"),
  };
  const mat = toon({
    color: 0xffffff, map: pictures.neutral, flatShading: false,
    paint: 0, alphaTest: 0.45, // no brush layer on faces; see-through between features
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "face";
  return {
    mesh,
    set(expression) {
      mat.map = pictures[expression];
    },
  };
}

/** Canvas position of a point `side` radians round from the front (+ = the face's left) and `down` radians from the top of the head. */
function at(side: number, down: number): [number, number] {
  return [(side / FACE_WIDTH + 0.5) * SIZE, ((down - THETA_TOP) / THETA_SPAN) * SIZE];
}

function css(hex: number, alpha = 1): string {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}

function paintFace(r: FaceRecipe, expression: Expression): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const ink = "#2a1c16";
  const hair = css(r.age > 0.7 ? PAL.hairGrey : r.hair);

  const smiling = expression === "smile";
  // --- eyes: a dark iris with a highlight, under a heavier upper lid -----------
  const EYE_DOWN = 1.64, EYE_SIDE = 0.33;
  for (const s of [-1, 1]) {
    const [x, y] = at(s * EYE_SIDE, EYE_DOWN);
    if (expression === "blink") {
      // closed: just the lid, curving down, and the lashes' line
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x - 26, y);
      ctx.quadraticCurveTo(x, y + 12, x + 26, y);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = "#f4efe6"; // a sliver of white either side of the iris
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 25, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - 4 * s, y - 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 28, y - 1);
    ctx.quadraticCurveTo(x, y - 21, x + 28, y - 1); // the upper lid
    ctx.stroke();
    if (smiling) {
      // smiling eyes: the lower lid pushes up into a little arc
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 16);
      ctx.quadraticCurveTo(x, y + 6, x + 22, y + 16);
      ctx.stroke();
    }
    if (r.age > 0.35) {
      // lines under the eyes, with age
      ctx.strokeStyle = "rgba(60,35,25,0.35)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 17);
      ctx.quadraticCurveTo(x, y + 23, x + 14, y + 17);
      ctx.stroke();
    }
  }

  // --- eyebrows ---------------------------------------------------------------------
  ctx.strokeStyle = hair;
  ctx.lineWidth = r.brow;
  const lift = smiling ? -8 : 0; // raised in greeting
  for (const s of [-1, 1]) {
    const [x0, y0raw] = at(s * 0.16, 1.43);
    const [x1, y1raw] = at(s * 0.5, 1.42);
    const y0 = y0raw + lift, y1 = y1raw + lift;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 3);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 9, x1, y1 + 4);
    ctx.stroke();
  }

  // --- nose: just a soft shadow down one side and under the tip ---------------------
  ctx.strokeStyle = "rgba(70,40,28,0.45)";
  ctx.lineWidth = 4;
  const [nx, ny] = at(0.05, 1.86);
  ctx.beginPath();
  ctx.moveTo(nx + 4, ny - 26);
  ctx.quadraticCurveTo(nx + 10, ny, nx, ny + 6);
  ctx.quadraticCurveTo(nx - 10, ny + 8, nx - 16, ny + 3);
  ctx.stroke();

  // --- mouth ----------------------------------------------------------------------
  const [mx, my] = at(0, 2.1);
  ctx.strokeStyle = css(PAL.lipShade);
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (smiling) {
    // a wide, open grin just below the moustache: a dark mouth with a row of
    // teeth, and the creases it pushes into the cheeks
    const top = my + 2, width = 32;
    ctx.fillStyle = "#4a2219";
    ctx.beginPath();
    ctx.moveTo(mx - width, top - 4);
    ctx.quadraticCurveTo(mx, top + 4, mx + width, top - 4); // upper lip line
    ctx.quadraticCurveTo(mx, top + 30, mx - width, top - 4); // lower lip curve
    ctx.fill();
    ctx.fillStyle = "#f3ede2";
    ctx.beginPath();
    ctx.moveTo(mx - width * 0.8, top - 1);
    ctx.quadraticCurveTo(mx, top + 6, mx + width * 0.8, top - 1);
    ctx.quadraticCurveTo(mx, top + 12, mx - width * 0.8, top - 1); // the top teeth
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx - width, top - 4);
    ctx.quadraticCurveTo(mx, top + 30, mx + width, top - 4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(70,40,28,0.35)";
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(mx + s * 40, my - 30);
      ctx.quadraticCurveTo(mx + s * 46, my - 12, mx + s * 38, my + 2);
      ctx.stroke();
    }
  } else {
    ctx.moveTo(mx - 18, my);
    ctx.quadraticCurveTo(mx, my + 4, mx + 18, my);
    ctx.stroke();
  }

  // --- moustache --------------------------------------------------------------------
  if (r.moustache !== "none") {
    const thick = r.moustache === "thin" ? 7 : 21;
    const reach = r.moustache === "thin" ? 0.22 : 0.36;
    const [cx, cy] = at(0, 2.0);
    const [ex] = at(reach, 2.0);
    const half = ex - cx;
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(cx, cy - thick * 0.6);
    // left half then right half: thick in the middle, tapering, drooping at the ends
    for (const s of [1, -1]) {
      ctx.moveTo(cx, cy - thick * 0.6);
      ctx.quadraticCurveTo(cx + s * half * 0.6, cy - thick * 0.9, cx + s * half, cy + (r.moustache === "curled" ? -thick * 0.8 : thick * 0.7));
      ctx.quadraticCurveTo(cx + s * half * 0.55, cy + thick * 0.35, cx, cy + thick * 0.35);
    }
    ctx.fill();
    if (r.moustache === "curled") {
      // the proud upturned tips
      ctx.strokeStyle = hair;
      ctx.lineWidth = 5;
      for (const s of [1, -1]) {
        ctx.beginPath();
        ctx.arc(cx + s * (half + 6), cy - thick * 1.3, 8, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 1.9 : -Math.PI * 0.9, s < 0);
        ctx.stroke();
      }
    }
  }
  if (r.beard === "stubble") {
    ctx.fillStyle = "rgba(40,28,22,0.18)";
    const [bx, by] = at(0, 2.2);
    ctx.beginPath();
    ctx.ellipse(bx, by, 120, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- forehead marks -----------------------------------------------------------------
  if (r.tilak) {
    ctx.strokeStyle = "#d9442a";
    ctx.lineWidth = 7;
    const [tx, ty0] = at(0, 1.18);
    const [, ty1] = at(0, 1.34);
    ctx.beginPath();
    ctx.moveTo(tx, ty0);
    ctx.lineTo(tx, ty1);
    ctx.stroke();
  }
  if (r.bindi) {
    ctx.fillStyle = "#b3162c";
    const [bx, by] = at(0, 1.4);
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (r.age > 0.5) {
    // forehead lines
    ctx.strokeStyle = "rgba(60,35,25,0.28)";
    ctx.lineWidth = 2.5;
    for (const d of [1.16, 1.24]) {
      const [x0, y0] = at(-0.3, d);
      const [x1, y1] = at(0.3, d);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 6, x1, y1);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
