import * as THREE from "three";

/**
 * What's on the other customers' CRT screens, painted in code (look-alike
 * names only): a Counter-Strike-like game, a Yahoo-Messenger-like chat, a
 * Rediffmail-like inbox. Small (a CRT seen across the room), a little blurry
 * and blue-tinged, as those screens were.
 */

export type ScreenKind = "game" | "game2" | "chat" | "mail";

const W = 320, H = 240;

export function screenTexture(kind: ScreenKind): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  if (kind === "game" || kind === "game2") game(ctx, kind === "game2");
  else if (kind === "chat") chat(ctx);
  else mail(ctx);
  scanlines(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SANS = '"Tahoma", "Verdana", sans-serif';

/** A dusty desert map seen down a gun: sandy walls, a crate, the sky, the HUD. */
function game(ctx: CanvasRenderingContext2D, other: boolean) {
  ctx.fillStyle = "#b9c9d6";
  ctx.fillRect(0, 0, W, H * 0.4); // sky
  ctx.fillStyle = "#b08a58";
  ctx.fillRect(0, H * 0.4, W, H * 0.6); // ground
  // walls either side, in perspective
  ctx.fillStyle = "#c9a36b";
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W * 0.3, H * 0.28); ctx.lineTo(W * 0.3, H * 0.52); ctx.lineTo(0, H * 0.8); ctx.fill();
  ctx.fillStyle = "#a88456";
  ctx.beginPath();
  ctx.moveTo(W, H * 0.05); ctx.lineTo(W * (other ? 0.62 : 0.7), H * 0.3); ctx.lineTo(W * (other ? 0.62 : 0.7), H * 0.52); ctx.lineTo(W, H * 0.75); ctx.fill();
  // a crate in the distance
  ctx.fillStyle = "#7a5a34";
  ctx.fillRect(W * 0.46, H * 0.4, W * 0.08, H * 0.1);
  // the gun, bottom right
  ctx.fillStyle = "#2a2826";
  ctx.beginPath();
  ctx.moveTo(W * 0.62, H); ctx.lineTo(W * 0.72, H * 0.72); ctx.lineTo(W * 0.8, H * 0.7); ctx.lineTo(W * 0.92, H); ctx.fill();
  // the crosshair, and the HUD: health and money in yellow digits
  ctx.strokeStyle = "#7fe07a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 10, H / 2); ctx.lineTo(W / 2 - 3, H / 2);
  ctx.moveTo(W / 2 + 3, H / 2); ctx.lineTo(W / 2 + 10, H / 2);
  ctx.moveTo(W / 2, H / 2 - 10); ctx.lineTo(W / 2, H / 2 - 3);
  ctx.moveTo(W / 2, H / 2 + 3); ctx.lineTo(W / 2, H / 2 + 10);
  ctx.stroke();
  ctx.fillStyle = "#f2c542";
  ctx.font = `bold 20px ${SANS}`;
  ctx.fillText(other ? "+ 64" : "+ 100", 12, H - 12);
  ctx.fillText(other ? "$ 2350" : "$ 800", W - 110, H - 40);
}

/** A messenger: a friends list on the left, a chat window on the right with a few lines. */
function chat(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#3a6ea5"; // the desktop behind
  ctx.fillRect(0, 0, W, H);
  // the friends list
  ctx.fillStyle = "#f4f0ff";
  ctx.fillRect(8, 8, 96, H - 16);
  ctx.fillStyle = "#6a2c91";
  ctx.fillRect(8, 8, 96, 18);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 11px ${SANS}`;
  ctx.fillText("Yaaho! Msgr", 14, 21);
  ctx.font = `10px ${SANS}`;
  ["rahul_rox", "pinky_4u", "cool.dude", "sonu007", "angel_priya"].forEach((n, k) => {
    ctx.fillStyle = k < 3 ? "#f2c542" : "#aaa";
    ctx.beginPath(); ctx.arc(18, 40 + k * 16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillText(n, 27, 44 + k * 16);
  });
  // the chat window
  ctx.fillStyle = "#fffef4";
  ctx.fillRect(112, 30, 200, 180);
  ctx.fillStyle = "#6a2c91";
  ctx.fillRect(112, 30, 200, 18);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 11px ${SANS}`;
  ctx.fillText("pinky_4u", 118, 43);
  const lines: [string, string][] = [["pinky_4u:", "hiii"], ["me:", "hey :)"], ["pinky_4u:", "kal tuition aaoge?"], ["me:", "haan pakka"], ["pinky_4u:", "BUZZ!!!"]];
  ctx.font = `11px ${SANS}`;
  lines.forEach(([who, what], k) => {
    ctx.fillStyle = who === "me:" ? "#1a5fb4" : "#c0392b";
    ctx.fillText(who, 118, 66 + k * 18);
    ctx.fillStyle = "#222";
    ctx.fillText(what, 118 + (who === "me:" ? 26 : 56), 66 + k * 18);
  });
  ctx.fillStyle = "#e8e4d8";
  ctx.fillRect(118, 180, 188, 24); // the typing box
}

/** A mail inbox: a red header, a list of mails, one of them open. */
function mail(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 16px ${SANS}`;
  ctx.fillText("redifmail", 10, 21);
  ctx.fillStyle = "#f0ece0";
  ctx.fillRect(0, 30, 70, H - 30); // the folders
  ctx.fillStyle = "#333";
  ctx.font = `10px ${SANS}`;
  ["Inbox (3)", "Sent", "Drafts", "Trash"].forEach((f, k) => ctx.fillText(f, 8, 52 + k * 18));
  const mails = ["Your son's result: see attached", "LIC premium due date", "Fwd: Fwd: Good morning!!", "Shaadi invitation - Sharma ji", "Fwd: Joke of the day"];
  mails.forEach((m, k) => {
    ctx.fillStyle = k === 0 ? "#fff6d9" : k % 2 ? "#fafafa" : "#fff";
    ctx.fillRect(74, 40 + k * 26, W - 80, 24);
    ctx.fillStyle = k < 2 ? "#000" : "#555";
    ctx.font = `${k < 2 ? "bold " : ""}10px ${SANS}`;
    ctx.fillText(m, 80, 56 + k * 26);
  });
}

/** Faint horizontal lines and a blue-grey tinge, the look of a CRT. */
function scanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = "rgba(90,120,160,0.08)";
  ctx.fillRect(0, 0, W, H);
}
