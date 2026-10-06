import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { toon } from "../../render/toon";
import { BOOTH, BOOTHS, COUNTER, DESK, HALL, OWNER_CRT_LIFT, OWNER_PC_TURN, boothPoint } from "./plan";

/**
 * The computers' faces: what makes a beige box read as a monitor, a keyboard,
 * a tower. Keys with their letters, the brand and power button under each
 * screen, the CD drive and floppy slot and the "intol inside" sticker on the
 * tower, the speaker grilles, a printed mouse pad.
 *
 * All of it is painted once onto ONE canvas (an "atlas": several pictures on
 * one sheet), and laid over the boxes of every booth (world/cafe/furniture.ts)
 * as thin panels a hair in front of them. All those panels are merged into one
 * mesh, so every booth's detail costs a single draw call.
 *
 * The brands are look-alikes of the era's (BRIEF.md): SAMSANG and GL Flatron
 * monitors, Logitek and Zebranix keyboards, Intax speakers, an HLC Busybee
 * tower with its "intol inside · Pentagon 4" sticker. At the counter, the
 * owner's own SAMSANG and Logitek, his D-LYNK modem and HB DeskJot printer.
 */

const SIZE = 1024;
/** Where each picture is on the sheet, in pixels: x, y, width, height. */
const R = {
  keysLogitek: [0, 0, 1024, 350],
  keysZebranix: [0, 352, 1024, 350],
  bezelSamsang: [0, 704, 512, 78],
  bezelGL: [512, 704, 512, 78],
  speaker: [0, 784, 128, 218],
  tower: [130, 784, 108, 238],
  mousePad: [240, 784, 256, 218],
  modemTop: [500, 784, 176, 238],
  printerFront: [680, 784, 300, 58],
} as const;
type Region = keyof typeof R;

const SANS = 'Tahoma, Verdana, "Helvetica Neue", Arial, sans-serif';
const BEIGE = "#d8d1bf", BEIGE_DARK = "#bdb49d", EDGE = "#8f8672";

// --- painting the sheet ------------------------------------------------------------------------

function paintAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const inRegion = (r: Region, paint: (w: number, h: number) => void) => {
    const [x, y, w, h] = R[r];
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    paint(w, h);
    ctx.restore();
  };
  inRegion("keysLogitek", (w, h) => keyboard(ctx, w, h, "Logitek"));
  inRegion("keysZebranix", (w, h) => keyboard(ctx, w, h, "ZEBRANIX"));
  inRegion("bezelSamsang", (w, h) => bezel(ctx, w, h, "samsang"));
  inRegion("bezelGL", (w, h) => bezel(ctx, w, h, "gl"));
  inRegion("speaker", (w, h) => speaker(ctx, w, h));
  inRegion("tower", (w, h) => tower(ctx, w, h));
  inRegion("mousePad", (w, h) => mousePad(ctx, w, h));
  inRegion("modemTop", (w, h) => modemTop(ctx, w, h));
  inRegion("printerFront", (w, h) => printerFront(ctx, w, h));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4; // (the keyboard is seen at a slant: keeps its letters crisp)
  return tex;
}

/** A 104-key keyboard, seen from above: keycaps with their letters, the LEDs, the brand. */
function keyboard(ctx: CanvasRenderingContext2D, w: number, h: number, brand: string) {
  ctx.fillStyle = BEIGE_DARK;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BEIGE;
  ctx.fillRect(4, 4, w - 8, h - 8);
  const u = w / 23.6; // one key's width
  const top = h - u * 6.15 - 8; // the rows sit at the near edge; the brand strip above them
  // [label, width in keys] per row; "" is a gap
  const rows: [string, number][][] = [
    [["Esc", 1], ["", 1], ...["F1", "F2", "F3", "F4"].map((k) => [k, 1] as [string, number]), ["", 0.5],
      ...["F5", "F6", "F7", "F8"].map((k) => [k, 1] as [string, number]), ["", 0.5], ...["F9", "F10", "F11", "F12"].map((k) => [k, 1] as [string, number])],
    [...["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="].map((k) => [k, 1] as [string, number]), ["Backspace", 2]],
    [["Tab", 1.5], ...[..."QWERTYUIOP[]"].map((k) => [k, 1] as [string, number]), ["\\", 1.5]],
    [["Caps Lock", 1.75], ...[..."ASDFGHJKL;'"].map((k) => [k, 1] as [string, number]), ["Enter", 2.25]],
    [["Shift", 2.25], ...[..."ZXCVBNM,./"].map((k) => [k, 1] as [string, number]), ["Shift", 2.75]],
    [["Ctrl", 1.5], ["⊞", 1.25], ["Alt", 1.25], ["", 0], [" ", 6], ["Alt", 1.25], ["⊞", 1.25], ["Ctrl", 1.5]],
  ];
  const key = (x: number, y: number, kw: number, label: string) => {
    const pad = u * 0.07;
    ctx.fillStyle = EDGE;
    ctx.fillRect(x + pad, y + pad, kw - pad * 2, u - pad * 2);
    ctx.fillStyle = "#e7e1d1";
    ctx.fillRect(x + pad * 1.6, y + pad * 1.3, kw - pad * 3.2, u - pad * 3.4);
    if (!label.trim()) return;
    ctx.fillStyle = "#4a4640";
    ctx.font = `${label.length > 2 ? u * 0.24 : u * 0.38}px ${SANS}`;
    ctx.textAlign = label.length > 2 ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, label.length > 2 ? x + pad * 3 : x + kw / 2, y + u * 0.42);
  };
  rows.forEach((row, r) => {
    let x = u * 0.4;
    const y = top + r * u + (r > 0 ? u * 0.15 : 0);
    for (const [label, kw] of row) {
      if (label) key(x, y, kw * u, label);
      x += kw * u;
    }
  });
  // the arrows and the six above them; the numpad
  const nav = u * 15.9;
  for (const [k, c, r] of [["Ins", 0, 1], ["Hm", 1, 1], ["PgU", 2, 1], ["Del", 0, 2], ["End", 1, 2], ["PgD", 2, 2], ["↑", 1, 4], ["←", 0, 5], ["↓", 1, 5], ["→", 2, 5]] as const) {
    key(nav + c * u, top + r * u + u * 0.15, u, k);
  }
  const pad = u * 19.3;
  const numpad: [string, number, number, number, number][] = [
    ["Num", 0, 1, 1, 1], ["/", 1, 1, 1, 1], ["*", 2, 1, 1, 1], ["-", 3, 1, 1, 1],
    ["7", 0, 2, 1, 1], ["8", 1, 2, 1, 1], ["9", 2, 2, 1, 1], ["+", 3, 2, 1, 2],
    ["4", 0, 3, 1, 1], ["5", 1, 3, 1, 1], ["6", 2, 3, 1, 1],
    ["1", 0, 4, 1, 1], ["2", 1, 4, 1, 1], ["3", 2, 4, 1, 1], ["↵", 3, 4, 1, 2],
    ["0", 0, 5, 2, 1], [".", 2, 5, 1, 1],
  ];
  for (const [k, c, r, kw, kh] of numpad) {
    const y = top + r * u + u * 0.15;
    if (kh === 1) key(pad + c * u, y, kw * u, k);
    else {
      // a tall key (+, Enter): drawn as one
      const p = u * 0.07;
      ctx.fillStyle = EDGE;
      ctx.fillRect(pad + c * u + p, y + p, u - p * 2, u * 2 - p * 2);
      ctx.fillStyle = "#e7e1d1";
      ctx.fillRect(pad + c * u + p * 1.6, y + p * 1.3, u - p * 3.2, u * 2 - p * 3.4);
      ctx.fillStyle = "#4a4640";
      ctx.font = `${u * 0.38}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillText(k, pad + c * u + u / 2, y + u * 0.9);
    }
  }
  // the three lights over the numpad, and the brand at the top left
  ctx.font = `${u * 0.22}px ${SANS}`;
  ctx.textAlign = "center";
  ["Num", "Caps", "Scroll"].forEach((t, k) => {
    const x = pad + u * 0.6 + k * u * 1.2;
    ctx.fillStyle = k === 0 ? "#3fbf4f" : "#6d7a66";
    ctx.beginPath();
    ctx.arc(x, top - u * 0.55, u * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a655b";
    ctx.fillText(t, x, top - u * 0.22);
  });
  ctx.textAlign = "left";
  ctx.fillStyle = brand === "Logitek" ? "#3d3a36" : "#2f4f8f";
  ctx.font = `${brand === "Logitek" ? "italic bold" : "bold"} ${u * 0.5}px ${SANS}`;
  ctx.fillText(brand, u * 0.6, top - u * 0.45);
}

/** The strip under a CRT's screen: the brand, the model, the power button and its green light. */
function bezel(ctx: CanvasRenderingContext2D, w: number, h: number, kind: "samsang" | "gl") {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#d9d3c2");
  g.addColorStop(1, "#c9c1ab");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "middle";
  if (kind === "samsang") {
    ctx.fillStyle = "#1f3f8f";
    ctx.font = `bold ${h * 0.34}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("S A M S A N G", w * 0.42, h * 0.42);
    ctx.fillStyle = "#6f6a5e";
    ctx.font = `${h * 0.2}px ${SANS}`;
    ctx.fillText("SyncMaker 551s", w * 0.42, h * 0.78);
  } else {
    // a red circle with the letters in it, then "Flatron" in grey
    ctx.fillStyle = "#b8163c";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.48, h * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${h * 0.24}px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText("GL", w * 0.3, h * 0.5);
    ctx.fillStyle = "#5f5a50";
    ctx.font = `italic bold ${h * 0.34}px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillText("Flatron", w * 0.37, h * 0.5);
  }
  // the controls on the right: a row of small buttons, the power button, its light
  ctx.fillStyle = "#b3aa94";
  for (let k = 0; k < 4; k++) ctx.fillRect(w * 0.72 + k * w * 0.035, h * 0.4, w * 0.024, h * 0.2);
  ctx.fillStyle = "#a79e88";
  ctx.beginPath();
  ctx.arc(w * 0.9, h * 0.5, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8f8672";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#46d14f";
  ctx.beginPath();
  ctx.arc(w * 0.95, h * 0.5, h * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

/** A small black speaker's front: the cone, the tweeter, the brand, the volume knob. */
function speaker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#1e1e20";
  ctx.fillRect(0, 0, w, h);
  const ring = (y: number, r: number) => {
    for (const [k, c] of [[1, "#39393d"], [0.8, "#141416"], [0.55, "#2c2c30"], [0.2, "#4a4a50"]] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(w / 2, y, r * k, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  ring(h * 0.26, w * 0.2);
  ring(h * 0.58, w * 0.38);
  ctx.fillStyle = "#b9b9c0";
  ctx.font = `bold ${w * 0.16}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("INTAX", w / 2, h * 0.88);
}

/** The tower's front: two drive bays (the CD-ROM, a blank), the floppy, the badge, power and reset, the sticker, the vents. */
function tower(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = BEIGE;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.5;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  // the CD-ROM: its tray's seam, the eject button, the light, "52X"
  ctx.fillStyle = "#e3ddcd";
  ctx.fillRect(w * 0.08, h * 0.05, w * 0.84, h * 0.09);
  ctx.strokeRect(w * 0.08, h * 0.05, w * 0.84, h * 0.09);
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.095);
  ctx.lineTo(w * 0.7, h * 0.095);
  ctx.stroke();
  ctx.fillStyle = "#a89f88";
  ctx.fillRect(w * 0.76, h * 0.105, w * 0.1, h * 0.02);
  ctx.fillStyle = "#4b8f3f";
  ctx.fillRect(w * 0.12, h * 0.115, w * 0.05, h * 0.012);
  ctx.fillStyle = "#6f6a5e";
  ctx.font = `bold ${h * 0.022}px ${SANS}`;
  ctx.fillText("52X CD-ROM", w * 0.42, h * 0.12);
  // a blank bay cover
  ctx.strokeRect(w * 0.08, h * 0.16, w * 0.84, h * 0.09);
  // the floppy: its slot and its button
  ctx.strokeRect(w * 0.25, h * 0.29, w * 0.5, h * 0.06);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(w * 0.3, h * 0.31, w * 0.34, h * 0.012);
  ctx.fillStyle = "#a89f88";
  ctx.fillRect(w * 0.62, h * 0.33, w * 0.08, h * 0.012);
  // the badge
  ctx.fillStyle = "#2f4f8f";
  ctx.font = `bold italic ${h * 0.04}px ${SANS}`;
  ctx.fillText("HLC", w / 2, h * 0.42);
  ctx.fillStyle = "#6f6a5e";
  ctx.font = `${h * 0.026}px ${SANS}`;
  ctx.fillText("Busybee", w / 2, h * 0.455);
  // power (big), reset (small), and their lights
  ctx.fillStyle = "#c2b9a3";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.53, w * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(w * 0.44, h * 0.6, w * 0.12, h * 0.02);
  ctx.fillStyle = "#46d14f";
  ctx.fillRect(w * 0.3, h * 0.645, w * 0.08, h * 0.01);
  ctx.fillStyle = "#d9453a";
  ctx.fillRect(w * 0.62, h * 0.645, w * 0.08, h * 0.01);
  // the sticker: a blue swirl, "intol inside", "Pentagon 4"
  ctx.fillStyle = "#e9eef8";
  ctx.fillRect(w * 0.14, h * 0.69, w * 0.34, h * 0.1);
  ctx.strokeStyle = "#2a64b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(w * 0.31, h * 0.735, w * 0.14, h * 0.035, -0.3, 0.3, Math.PI * 1.8);
  ctx.stroke();
  ctx.fillStyle = "#2a64b8";
  ctx.font = `italic ${h * 0.017}px ${SANS}`;
  ctx.fillText("intol inside", w * 0.31, h * 0.73);
  ctx.font = `bold ${h * 0.016}px ${SANS}`;
  ctx.fillText("Pentagon 4", w * 0.31, h * 0.765);
  // the vents at the bottom
  ctx.fillStyle = "#b3aa94";
  for (let k = 0; k < 7; k++) ctx.fillRect(w * 0.2, h * (0.83 + k * 0.018), w * 0.6, h * 0.007);
}

/** A mouse pad with an advert printed on it (they always had one). */
function mousePad(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1f4f9f");
  g.addColorStop(1, "#0f2f6a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 1.1, w * 0.6, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.fillStyle = "#ffd23f";
  ctx.font = `bold italic ${h * 0.14}px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ZEBRANIX", w * 0.08, h * 0.2);
  ctx.fillStyle = "#fff";
  ctx.font = `${h * 0.07}px ${SANS}`;
  ctx.fillText("Speakers · Keyboards · Mouse", w * 0.08, h * 0.33);
}

/** The dial-up modem's top (read from the landing, long way up): the brand, what it is, its lights' names. */
function modemTop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#8d9296";
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1f3f7a";
  ctx.font = `bold ${w * 0.2}px ${SANS}`;
  ctx.fillText("D-LYNK", w / 2, h * 0.22);
  ctx.fillStyle = "#2e3236";
  ctx.font = `${w * 0.1}px ${SANS}`;
  ctx.fillText("56K External", w / 2, h * 0.4);
  ctx.fillText("Modem", w / 2, h * 0.47);
  ctx.font = `${w * 0.085}px ${SANS}`;
  ["PWR", "TR", "RD", "SD", "CD", "OH"].forEach((t, k) => ctx.fillText(t, w * (0.2 + (k % 3) * 0.3), h * (0.7 + Math.floor(k / 3) * 0.1)));
}

/** The printer's badge strip: the maker's round logo, the model, its power button. */
function printerFront(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#9a9d9e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1f5fa8";
  ctx.beginPath();
  ctx.arc(h * 0.6, h / 2, h * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold italic ${h * 0.3}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("hb", h * 0.6, h * 0.52);
  ctx.fillStyle = "#2e3236";
  ctx.font = `${h * 0.34}px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("DeskJot 3325", h * 1.1, h / 2);
  ctx.fillStyle = "#6f7478";
  ctx.beginPath();
  ctx.arc(w - h * 0.6, h / 2, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#46d14f";
  ctx.fillRect(w - h * 1.2, h * 0.45, h * 0.18, h * 0.1);
}

// --- the panels ---------------------------------------------------------------------------

/**
 * A panel `w` by `h` metres showing region `r`, oriented by `basis` (which
 * way the picture's right, up and face point, in the booth's frame).
 */
function panel(r: Region, w: number, h: number, basis: THREE.Matrix4): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const [x, y, rw, rh] = R[r];
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    // (a canvas's y runs down; a texture's v runs up)
    uv.setXY(i, (x + uv.getX(i) * rw) / SIZE, 1 - (y + (1 - uv.getY(i)) * rh) / SIZE);
  }
  g.applyMatrix4(basis);
  return g;
}

/**
 * In a booth's frame (+x: to the left of whoever sits there, +y up, +z toward
 * the screen): a panel facing up, readable from the chair; and one facing the
 * chair (a monitor's front), readable from it.
 */
const FACE_UP = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
const FACE_CHAIR = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));

/** Just proud of the surface they cover (a panel flush with it would flicker: z-fighting). */
const PROUD = 0.0015;

export function buildHardware(): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  BOOTHS.forEach((b, i) => {
    // the booth's frame → the building's: turned to face the way the booth does, moved to its spot
    const place = (g: THREE.BufferGeometry, u: number, y: number, v: number, tilt = 0) => {
      if (tilt) g.rotateX(tilt);
      g.rotateY(b.turn);
      const q = boothPoint(b, u, v);
      g.translate(q.x, HALL.floor + y, q.z);
      parts.push(g);
    };
    const top = BOOTH.deskTop;
    const crtV = DESK.crt;
    // the keyboard's keys (on its top, leaning with it: furniture.ts tilts it by −0.08)
    place(panel(i % 2 ? "keysZebranix" : "keysLogitek", 0.44, 0.15, FACE_UP).translate(0, 0.0125 + PROUD, 0), DESK.keyboard.u, DESK.keyboard.y, DESK.keyboard.v, -0.08);
    // under the screen: the brand strip
    place(panel(i % 3 === 1 ? "bezelGL" : "bezelSamsang", 0.4, 0.061, FACE_CHAIR), 0, top + 0.083, crtV - 0.15 - PROUD);
    // the speakers' fronts
    for (const u of [-0.32, 0.32]) place(panel("speaker", 0.1, 0.17, FACE_CHAIR), u, top + 0.1, crtV - PROUD);
    // the tower's front, down on the floor
    place(panel("tower", 0.19, 0.42, FACE_CHAIR), -0.38, 0.22, BOOTH.chairBack + BOOTH.desk - 0.46 - PROUD);
    // the mouse pad, under the mouse (the desk's surface is 1.5 cm above deskTop: it's a 3 cm slab)
    place(panel("mousePad", 0.2, 0.17, FACE_UP), DESK.mouse.u, top + 0.0165, DESK.mouse.v);
  });
  parts.push(...counterPanels());
  const mesh = new THREE.Mesh(mergeGeometries(parts)!, hardwareMaterial());
  mesh.name = "hardware";
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * The owner's things at the counter (furniture.ts, `counter`): his monitor and
 * keyboard, turned toward his seat, and the modem and printer. His CRT's
 * front faces −x before it's turned: seen from his stool, its right is +z.
 * (The same turn and tilt as the boxes: tilt about z first, then the turn.)
 */
function counterPanels(): THREE.BufferGeometry[] {
  const { x0, z0, z1, top } = COUNTER;
  const y = HALL.floor + top;
  const t = OWNER_PC_TURN;
  const out: THREE.BufferGeometry[] = [];
  const put = (g: THREE.BufferGeometry, x: number, py: number, z: number, turn = 0, tilt = 0) => {
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, turn, tilt)));
    out.push(g.translate(x, py, z));
  };
  // his screen's brand strip: on the CRT's front face, below the screen
  const toHim = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));
  const front = new THREE.Vector3(-0.15 - PROUD, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), t);
  put(panel("bezelSamsang", 0.38, 0.06, toHim), x0 + 0.33 + front.x, y + 0.053 + OWNER_CRT_LIFT, z0 + 0.35 + front.z, t);
  // his keyboard: keys toward him (+x is away from him, before the turn)
  const keysUp = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  put(panel("keysLogitek", 0.42, 0.15, keysUp).translate(0, 0.01 + PROUD, 0), x0 + 0.08, y + 0.02, z0 + 0.62, t, 0.06);
  // the modem's top and the printer's front, readable from the landing (you stand on the +x side, facing −x)
  const upFromLanding = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));
  put(panel("modemTop", 0.11, 0.15, upFromLanding), x0 + 0.45, y + 0.04 + PROUD, z1 - 0.12);
  const toLanding = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  put(panel("printerFront", 0.26, 0.05, toLanding), x0 + 0.55 + PROUD, y + 0.05, z1 - 0.45);
  return out;
}

function hardwareMaterial(): THREE.Material {
  const m = toon({ color: 0xffffff, map: paintAtlas(), paint: 0.15 });
  // (drawn as if a hair nearer than it is, so it always wins over the box face just behind it)
  m.polygonOffset = true;
  m.polygonOffsetFactor = -1;
  m.polygonOffsetUnits = -2;
  return m;
}

