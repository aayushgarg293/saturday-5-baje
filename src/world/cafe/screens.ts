import * as THREE from "three";

/**
 * What's on the other customers' CRT screens, painted in code (look-alike
 * names only, from BRIEF.md): a Counter-Strike-like game, a Yaaho! Messenger
 * chat, a Rediffit mail inbox, a Yorkut scrapbook, SongzPK's download list,
 * and the pipes screensaver of someone who's fallen asleep. Small (a CRT seen across the room), a little blurry
 * and blue-tinged, as those screens were.
 */

export type ScreenKind = "game" | "game2" | "chat" | "mail" | "yorkut" | "songs" | "pipes";

const W = 320, H = 240;

export function screenTexture(kind: ScreenKind): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  if (kind === "game" || kind === "game2") game(ctx, kind === "game2");
  else if (kind === "chat") chat(ctx);
  else if (kind === "yorkut") yorkut(ctx);
  else if (kind === "songs") songs(ctx);
  else if (kind === "pipes") pipes(ctx);
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
  ctx.fillText("rediffit mail", 10, 21);
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

/** A Yorkut scrapbook: the pale blue page, the pink logo, a photo, scraps down the page. */
function yorkut(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#dbe7f7";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, 28);
  ctx.fillStyle = "#e3428c";
  ctx.font = `bold 18px ${SANS}`;
  ctx.fillText("yorkut", 10, 20);
  ctx.fillStyle = "#3d5f9c";
  ctx.font = `10px ${SANS}`;
  ctx.fillText("Home   Scrapbook   Friends   Communities", 80, 18);
  // the profile photo, and the name
  ctx.fillStyle = "#f4f7fc";
  ctx.fillRect(8, 36, 70, H - 44);
  ctx.fillStyle = "#9aa9c4";
  ctx.fillRect(14, 42, 58, 66);
  ctx.fillStyle = "#c98f6a";
  ctx.beginPath(); ctx.arc(43, 68, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3d5f9c";
  ctx.font = `bold 9px ${SANS}`;
  ctx.fillText("Vicky ;)", 18, 122);
  // the scraps
  const scraps = ["happy bday yaar!! party kab??", "kya haal hai bhai", "scrap me back plzzz", "Fwd: send this to 10 frnds..."];
  scraps.forEach((sc, k) => {
    const y = 38 + k * 48;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(86, y, W - 94, 42);
    ctx.fillStyle = "#b9c6dc";
    ctx.fillRect(92, y + 6, 26, 30);
    ctx.fillStyle = "#3d5f9c";
    ctx.font = `bold 9px ${SANS}`;
    ctx.fillText(["Pinky", "Sonu", "Neha :)", "Rahul"][k], 124, y + 15);
    ctx.fillStyle = "#333";
    ctx.font = `10px ${SANS}`;
    ctx.fillText(sc, 124, y + 31);
  });
}

/** SongzPK: the yellow-and-black page, a list of film songs, one downloading. */
function songs(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#f2c542";
  ctx.font = `bold 18px ${SANS}`;
  ctx.fillText("SongzPK", 10, 23);
  ctx.fillStyle = "#fff";
  ctx.font = `9px ${SANS}`;
  ctx.fillText("Latest Hindi MP3", 110, 22);
  const list = ["01 - Chand Wali Gali.mp3", "02 - Sapno Ki Railgaadi.mp3", "03 - Barsaat Ka Pehla Din.mp3", "04 - Dil Ne Kaha Hello.mp3", "05 - Dhinka Dhinka Dhoom.mp3"];
  ctx.font = `10px ${SANS}`;
  list.forEach((song, k) => {
    ctx.fillStyle = k % 2 ? "#f6f2e2" : "#fff";
    ctx.fillRect(8, 42 + k * 22, W - 16, 20);
    ctx.fillStyle = "#1f4f8f";
    ctx.fillText(song, 14, 56 + k * 22);
    ctx.fillStyle = "#c0392b";
    ctx.fillText("Download", W - 70, 56 + k * 22);
  });
  // the download box, half done
  ctx.fillStyle = "#ece9d8";
  ctx.fillRect(60, 160, 200, 64);
  ctx.fillStyle = "#0843a8";
  ctx.fillRect(60, 160, 200, 16);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 9px ${SANS}`;
  ctx.fillText("37% of 02 - Sapno Ki Railgaadi.mp3", 64, 171);
  ctx.fillStyle = "#fff";
  ctx.fillRect(70, 188, 180, 12);
  ctx.fillStyle = "#3c9a3c";
  for (let x = 72; x < 72 + 176 * 0.37; x += 9) ctx.fillRect(x, 190, 7, 8);
  ctx.fillStyle = "#333";
  ctx.font = `9px ${SANS}`;
  ctx.fillText("3.1 KB/sec   About 14 min left", 70, 214);
}

/** The pipes screensaver: thick coloured pipes winding over black, with ball joints. */
function pipes(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  const runs: [string, [number, number][]][] = [
    ["#3fa0e8", [[20, 40], [140, 40], [140, 160], [260, 160], [260, 220]]],
    ["#e8c23f", [[300, 20], [300, 110], [60, 110], [60, 200], [180, 200]]],
    ["#d9453a", [[100, 230], [100, 70], [220, 70], [220, 20]]],
    ["#4fc06a", [[10, 150], [190, 150], [190, 230]]],
  ];
  ctx.lineCap = "round";
  for (const [colour, points] of runs) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 11;
    ctx.beginPath();
    points.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; // the shine along each pipe
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = colour;
    for (const [x, y] of points.slice(1, -1)) { ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); }
  }
}

/** Faint horizontal lines and a blue-grey tinge, the look of a CRT. */
function scanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = "rgba(90,120,160,0.08)";
  ctx.fillRect(0, 0, W, H);
}
