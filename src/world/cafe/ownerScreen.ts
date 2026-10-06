import * as THREE from "three";
import { charge } from "../../desktop/cafeTimer";
import { flat } from "../../render/toon";
import { COUNTER, HALL, OWNER_PC_TURN, YOUR_BOOTH } from "./plan";

/**
 * What's on the owner's own screen at the counter: the cafe's management
 * software, "CyberTime Server". A table of the 13 booths: which are in use,
 * for how long, and what each owes; your booth highlighted, with your real
 * time and bill (the same numbers as the strip on your own screen); the
 * day's takings at the bottom. It's redrawn as the minutes pass.
 */

/** The other customers (people/cafePeople.ts), and how long before 4:30 pm each sat down (minutes). */
const OTHERS: Record<number, { name: string; since: number }> = {
  1: { name: "Guest", since: 40 },
  3: { name: "Guest", since: 15 },
  5: { name: "Guest", since: 25 },
  7: { name: "Guest", since: 70 },
  10: { name: "LAN game", since: 95 },
  11: { name: "LAN game", since: 95 },
  12: { name: "Guest", since: 130 },
};
/** The day's takings before any of this afternoon's customers pay (₹). */
const TAKINGS_SO_FAR = 685;

const W = 512, H = 384;
const SANS = '"Tahoma", "Verdana", sans-serif';

export type YourVisit = { connected: boolean; used: number; loggedOff: boolean; paid: boolean };
export type OwnerScreen = { mesh: THREE.Mesh; update(minutes: number, you: YourVisit): void };

export function buildOwnerScreen(frame: THREE.Matrix4): OwnerScreen {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), flat(0xffffff, { map: texture, opaque: true }));
  mesh.name = "ownerScreen";

  // on his CRT's face, just in front of the dark screen (furniture.ts builds the CRT, hardware.ts its badge):
  // its front faces −x before it's turned toward his stool; seen from there, its right is +z
  const { x0, z0, top } = COUNTER;
  const t = OWNER_PC_TURN;
  const toHim = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));
  mesh.geometry.applyMatrix4(toHim).rotateY(t);
  const front = new THREE.Vector3(-0.1625, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), t);
  mesh.position.set(x0 + 0.33 + front.x, HALL.floor + top + 0.21, z0 + 0.35 + front.z);
  mesh.applyMatrix4(frame);

  let shown = "";
  return {
    mesh,
    update(minutes, you) {
      const key = `${Math.floor(minutes)}|${you.connected}|${Math.floor(you.used)}|${you.loggedOff}|${you.paid}`;
      if (key === shown) return; // (only when a minute ticks over, or something changes)
      shown = key;
      draw(ctx, minutes, you);
      texture.needsUpdate = true;
    },
  };
}

function draw(ctx: CanvasRenderingContext2D, minutes: number, you: YourVisit) {
  // the desktop behind, and the window
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ece9d8";
  ctx.fillRect(10, 10, W - 20, H - 40);
  const g = ctx.createLinearGradient(0, 10, 0, 34);
  g.addColorStop(0, "#0997ff");
  g.addColorStop(1, "#0053ee");
  ctx.fillStyle = g;
  ctx.fillRect(10, 10, W - 20, 24);
  ctx.fillStyle = "#fff";
  ctx.font = `bold 13px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.fillText("CyberTime Server  -  Admin", 20, 22);
  ctx.fillStyle = "#c13d18";
  ctx.fillRect(W - 32, 14, 16, 16);

  // the table's head
  const cols = [22, 82, 172, 292, 372];
  const heads = ["PC", "Status", "User", "Time", "Amount"];
  ctx.fillStyle = "#d4d0c8";
  ctx.fillRect(16, 42, W - 32, 20);
  ctx.fillStyle = "#000";
  ctx.font = `bold 11px ${SANS}`;
  heads.forEach((h, k) => ctx.fillText(h, cols[k], 52));

  // the booths
  let owed = 0;
  ctx.font = `11px ${SANS}`;
  for (let n = 1; n <= 13; n++) {
    const y = 64 + (n - 1) * 20;
    let status = "Free", user = "", time = "", amount = "";
    const other = OTHERS[n];
    if (n === YOUR_BOOTH && you.connected && !you.loggedOff) {
      status = "In use";
      user = "Guest";
      time = hm(you.used);
      amount = `₹ ${charge(you.used)}`;
      owed += charge(you.used);
    } else if (n === YOUR_BOOTH && you.loggedOff && !you.paid) {
      status = "Logged off";
      time = hm(you.used);
      amount = `₹ ${charge(you.used)}  due`;
    } else if (other) {
      const used = minutes - (16 * 60 + 30) + other.since;
      status = "In use";
      user = other.name;
      time = hm(used);
      amount = `₹ ${charge(used)}`;
      owed += charge(used);
    }
    // your row, highlighted as if he'd just clicked it
    if (n === YOUR_BOOTH && status !== "Free") {
      ctx.fillStyle = "#316ac5";
      ctx.fillRect(16, y, W - 32, 20);
    } else if (n % 2 === 0) {
      ctx.fillStyle = "#f4f2ea";
      ctx.fillRect(16, y, W - 32, 20);
    }
    const lit = n === YOUR_BOOTH && status !== "Free";
    ctx.fillStyle = lit ? "#fff" : "#000";
    ctx.fillText(`Booth ${String(n).padStart(2, "0")}`, cols[0], y + 10);
    ctx.fillStyle = lit ? "#fff" : status === "Free" ? "#6a8a5a" : status === "In use" ? "#b8261d" : "#b86e10";
    ctx.fillText(status, cols[1], y + 10);
    ctx.fillStyle = lit ? "#fff" : "#000";
    ctx.fillText(user, cols[2], y + 10);
    ctx.fillText(time, cols[3], y + 10);
    ctx.fillText(amount, cols[4], y + 10);
  }

  // the status bar: the running total, the time
  const takings = TAKINGS_SO_FAR + (you.paid ? charge(you.used) : 0);
  ctx.fillStyle = "#000";
  ctx.font = `bold 11px ${SANS}`;
  ctx.fillText(`Running: ₹ ${owed}      Collected today: ₹ ${takings}`, 22, H - 44);
  // the taskbar, with the clock
  ctx.fillStyle = "#245edb";
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = "#3c9a3c";
  ctx.fillRect(0, H - 26, 70, 26);
  ctx.fillStyle = "#fff";
  ctx.font = `italic bold 13px ${SANS}`;
  ctx.fillText("start", 14, H - 13);
  ctx.font = `11px ${SANS}`;
  const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  ctx.fillText(`${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`, W - 70, H - 13);
  // the old CRT: faint scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

/** 1:05 */
function hm(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
