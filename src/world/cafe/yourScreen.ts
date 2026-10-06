import * as THREE from "three";
import { paintWallpaper } from "../../desktop/wallpaper";
import { flat } from "../../render/toon";
import { BOOTHS, DESK, HALL, YOUR_BOOTH, boothPoint } from "./plan";

/**
 * Your computer's screen, in booth 2 (look-alike everything):
 *
 *   welcome      the blue XP-like welcome screen it sits at until you come,
 *                "Booth 02 • Free" along the bottom
 *   connecting   the dial-up box: "Dialing 172233…", then "Verifying user
 *                name and password…", then "Registering your computer on
 *                the network…" (the modem screeches meanwhile: audio/cafe.ts)
 *   desktop      the rolling green hill, the blue taskbar with its green
 *                start button, the time in the corner, "Connected at 48.0
 *                Kbps" in a balloon. A placeholder: phase 8 makes it usable.
 *
 * Painted on a canvas, repainted only when something on it changes.
 */

export type ScreenStage = "welcome" | "dialing" | "verifying" | "registering" | "desktop";

const W = 512, H = 384;
const SANS = '"Tahoma", "Verdana", sans-serif';

export type YourScreen = {
  mesh: THREE.Mesh;
  show(stage: ScreenStage, time?: string): void;
  /** Start connecting (the first time you sit down): the dial-up box's stages, then the desktop. */
  connect(): void;
  /** Every frame: move through the connecting stages; keep the desktop's clock right. */
  update(dt: number, time: string): void;
  /** Connected, the desktop up: you can lean in and use it. */
  ready(): boolean;
  /** Logged off: back to the welcome screen, for good (the next customer's). */
  logOff(): void;
};

/** When each connecting stage begins, seconds after sitting down (the modem's sound is timed to match: audio/cafe.ts). */
const STAGES: [number, ScreenStage][] = [[0, "dialing"], [4, "verifying"], [8, "registering"], [12, "desktop"]];

export function buildYourScreen(frame: THREE.Matrix4): YourScreen {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.23), flat(0xffffff, { map: texture, opaque: true }));
  mesh.name = "yourScreen";
  const b = BOOTHS.find((x) => x.n === YOUR_BOOTH)!;
  const at = boothPoint(b, 0, DESK.screen.v - 0.004);
  mesh.position.set(at.x, HALL.floor + DESK.screen.y, at.z);
  mesh.rotation.y = b.turn + Math.PI;
  mesh.applyMatrix4(frame);

  let shown = "";
  let connecting = -1; // seconds since connecting began (−1: not yet)
  const screen: YourScreen = {
    mesh,
    connect() {
      if (connecting < 0) connecting = 0;
    },
    ready: () => connecting >= STAGES[STAGES.length - 1][0],
    logOff() {
      connecting = -1;
      screen.show("welcome");
    },
    update(dt, time) {
      if (connecting < 0) return;
      connecting += dt;
      let stage: ScreenStage = "dialing";
      for (const [at, s] of STAGES) if (connecting >= at) stage = s;
      screen.show(stage, stage === "desktop" ? time : "");
    },
    show(stage, time = "") {
      const key = `${stage}|${time}`;
      if (key === shown) return;
      shown = key;
      if (stage === "welcome") welcome(ctx);
      else if (stage === "desktop") desktop(ctx, time);
      else dialUp(ctx, stage);
      crt(ctx);
      texture.needsUpdate = true;
    },
  };
  screen.show("welcome");
  return screen;
}

/** The blue welcome screen: a lighter band across the middle, "welcome" in white italics. */
function welcome(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#5a7edc";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#00309c";
  ctx.fillRect(0, 0, W, 50);
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = "#f09c34"; // the thin orange line under the top band
  ctx.fillRect(0, 50, W, 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic bold 46px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("welcome", W / 2, H / 2);
  // the cafe software's note along the bottom: this booth is free (so it's clear which one is yours)
  ctx.font = `bold 20px ${SANS}`;
  ctx.fillText("CyberTime  •  Booth 02  •  Free", W / 2, H - 25);
}

/** The desktop, with the dial-up box open in the middle. */
function dialUp(ctx: CanvasRenderingContext2D, stage: ScreenStage) {
  paintWallpaper(ctx, W, H);
  taskbar(ctx, "");
  // the box: a blue title bar, grey inside
  const x = 96, y = 110, w = 320, h = 150;
  ctx.fillStyle = "#ece9d8";
  ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + 24);
  g.addColorStop(0, "#0a5fd8");
  g.addColorStop(1, "#0843a8");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, 24);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 12px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Connecting DialNet…", x + 8, y + 12);
  const line = stage === "dialing" ? "Dialing 172233…" : stage === "verifying" ? "Verifying user name and password…" : "Registering your computer on the network…";
  ctx.fillStyle = "#000";
  ctx.font = `12px ${SANS}`;
  ctx.fillText(line, x + 60, y + 62);
  // the two little computers and the phone line between them
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(x + 16, y + 48, 26, 20);
  ctx.fillStyle = "#888";
  ctx.fillRect(x + 22, y + 70, 14, 4);
  // a Cancel button
  ctx.fillStyle = "#f4f3ee";
  ctx.fillRect(x + w / 2 - 36, y + h - 38, 72, 24);
  ctx.strokeStyle = "#003c74";
  ctx.strokeRect(x + w / 2 - 36, y + h - 38, 72, 24);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText("Cancel", x + w / 2, y + h - 26);
}

/** The desktop: the hill, a few icons, the taskbar, the time, the connected balloon. */
function desktop(ctx: CanvasRenderingContext2D, time: string) {
  paintWallpaper(ctx, W, H);
  ctx.font = `11px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ["My Computer", "My Documents", "Internet Xplorer", "Recycle Bin"].forEach((name, k) => {
    const y = 16 + k * 70;
    ctx.fillStyle = ["#e8e0b0", "#f2d36b", "#3a8ee6", "#cfd8dc"][k];
    ctx.fillRect(28, y, 32, 30);
    ctx.fillStyle = "#fff";
    ctx.fillText(name, 44, y + 36);
  });
  taskbar(ctx, time);
  // the balloon over the tray
  const bx = W - 230, by = H - 110;
  ctx.fillStyle = "#ffffe1";
  ctx.fillRect(bx, by, 220, 64);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(bx, by, 220, 64);
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = `bold 12px ${SANS}`;
  ctx.fillText("DialNet is now connected", bx + 10, by + 10);
  ctx.font = `11px ${SANS}`;
  ctx.fillText("Speed: 48.0 Kbps", bx + 10, by + 30);
}

/** The blue taskbar, its green start button, and the time. */
function taskbar(ctx: CanvasRenderingContext2D, time: string) {
  const g = ctx.createLinearGradient(0, H - 30, 0, H);
  g.addColorStop(0, "#3168d5");
  g.addColorStop(1, "#1941a5");
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = "#3c9a3c";
  ctx.beginPath();
  ctx.moveTo(0, H - 30);
  ctx.lineTo(88, H - 30);
  ctx.quadraticCurveTo(100, H - 15, 88, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `italic bold 16px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("start", 26, H - 15);
  ctx.fillStyle = "#0f8ae8";
  ctx.fillRect(W - 90, H - 30, 90, 30);
  if (time) {
    ctx.fillStyle = "#fff";
    ctx.font = `12px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(time, W - 45, H - 15);
  }
}

/** Faint scanlines and a slight curve of darkness at the edges: a CRT. */
function crt(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.3)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}
