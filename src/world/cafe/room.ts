import * as THREE from "three";
import { flat, toon } from "../../render/toon";
import { Parts } from "../kit";
import { CLOCK, COUNTER, FANS, HALL, TUBES } from "./plan";

/**
 * The cafe's moving and glowing things (the still furniture is part of the
 * building: world/cafe/furniture.ts):
 *
 *   the ceiling fans       turning
 *   the tubelights         the tubes glow (drawn unlit), and two lamps
 *                          light the room: daylight barely reaches in
 *   the wall clock         its face, and hands that show the game's time
 *   the modem's lights     blinking on the owner's counter
 *
 * Built in the cafe building's frame (`frame`: its matrix, from the street),
 * with positions from plan.ts.
 */

export type Room = {
  group: THREE.Group;
  update(dt: number): void;
  /** Set the clock's hands (24-hour time, minutes can be fractional). */
  setClock(hours: number, minutes: number): void;
};

/**
 * The room lamps: how far their light reaches (metres). They don't cast
 * shadows, so their light would go through walls: kept short, it stays in
 * the hall (the street is 7 m below the tubes).
 */
const LAMP_REACH = 6;
/** Fan speed, turns per second: slower than a real fan, so it reads as turning, not a blur. */
const FAN_SPEED = 1.6;

export function buildRoom(frame: THREE.Matrix4): Room {
  const group = new THREE.Group();
  group.name = "cafeRoom";
  group.applyMatrix4(frame);
  const floorY = HALL.floor;

  // --- fans: a motor housing and three blades, one mesh each, turning ------------------------
  const fans = FANS.map((f) => {
    const p = new Parts();
    p.cylinder(0.13, 0.11, 0.1, 0, 0, 0, 0x8a6a45, { segments: 12 });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.62, 0.012, 0.11);
      g.translate(0.42, -0.02, 0);
      g.rotateY(a);
      p.add(g, 0, 0, 0, 0x7a5a3a);
    }
    const mesh = p.build("fan", { smooth: true });
    mesh.position.set(f.x, HALL.ceiling - 0.6, f.z);
    group.add(mesh);
    return mesh;
  });

  // --- tubelights: the glowing tubes (one mesh), and the lamps -------------------------------
  const tubes = new Parts();
  for (const t of TUBES) {
    const out = 0.07;
    tubes.cylinder(0.018, 0.018, 1.15, t.x + Math.sin(t.turn) * out, floorY + t.y - 0.03, t.z + Math.cos(t.turn) * out, 0xffffff, { rz: Math.PI / 2, ry: t.turn, segments: 6 });
  }
  const glow = new THREE.Mesh(tubes.geometry(), flat(0xeef6ff, { vertexColors: true }));
  glow.name = "tubeGlow";
  group.add(glow);
  // two lamps down the hall, a cool tubelight white: well below the ceiling
  // (right under it, they'd make a bright hotspot there) and soft
  for (const z of [-4.2, -9.4]) {
    const lamp = new THREE.PointLight(0xe8f0ff, 3.5, LAMP_REACH, 0.8);
    lamp.position.set(-1.0, floorY + 1.9, z);
    group.add(lamp);
  }

  // --- the clock: a painted face, and its hands -------------------------------------------------
  const clock = new THREE.Group();
  clock.position.set(CLOCK.x + Math.sin(CLOCK.turn) * 0.04, floorY + CLOCK.y, CLOCK.z + Math.cos(CLOCK.turn) * 0.04);
  clock.rotation.y = CLOCK.turn; // its face looks into the hall
  group.add(clock);
  const face = new THREE.Mesh(new THREE.CircleGeometry(CLOCK.radius, 32), toon({ color: 0xffffff, map: clockFace(), flatShading: false }));
  clock.add(face);
  const hand = (length: number, width: number, colour: number, z: number) => {
    const g = new THREE.BoxGeometry(width, length, 0.006);
    g.translate(0, length / 2 - 0.02, 0); // pivot near one end
    const m = new THREE.Mesh(g, flat(colour));
    m.position.z = z;
    clock.add(m);
    return m;
  };
  const hourHand = hand(CLOCK.radius * 0.55, 0.018, 0x1f1a17, 0.006);
  const minuteHand = hand(CLOCK.radius * 0.8, 0.012, 0x1f1a17, 0.012);
  const secondHand = hand(CLOCK.radius * 0.85, 0.004, 0xc0392b, 0.018);

  // --- the modem's lights: a row of tiny LEDs on the counter ---------------------------------------
  const leds = [0x3fe07a, 0x3fe07a, 0xff5a3a, 0x3fe07a].map((colour, k) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.008), flat(colour));
    m.position.set(COUNTER.x0 + 0.52, floorY + COUNTER.top + 0.041, COUNTER.z1 - 0.16 + k * 0.022);
    group.add(m);
    return m;
  });

  let t = 0;
  const room: Room = {
    group,
    update(dt) {
      t += dt;
      for (const f of fans) f.rotation.y -= FAN_SPEED * Math.PI * 2 * dt;
      // the data lights flicker at random; the power light stays on
      leds.forEach((l, k) => { if (k > 0 && Math.random() < dt * 8) l.visible = !l.visible; });
      secondHand.rotation.z = -Math.floor(t % 60) * (Math.PI / 30);
    },
    setClock(hours, minutes) {
      // (clockwise, seen from the front; a clock hand turns about the face's own z)
      hourHand.rotation.z = -((hours % 12) + minutes / 60) * (Math.PI / 6);
      minuteHand.rotation.z = -minutes * (Math.PI / 30);
    },
  };
  room.setClock(16, 50);
  return room;
}

/** The clock's face: cream, with its numbers and the minute ticks, and a brand name (a look-alike). */
function clockFace(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.fillStyle = "#f7f1e1";
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f1a17";
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2;
    const long = k % 5 === 0;
    const r0 = c * (long ? 0.8 : 0.86), r1 = c * 0.92;
    ctx.lineWidth = long ? 4 : 1.5;
    ctx.strokeStyle = "#1f1a17";
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
    ctx.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    ctx.stroke();
  }
  ctx.font = `bold ${size * 0.11}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    ctx.fillText(String(h), c + Math.sin(a) * c * 0.66, c - Math.cos(a) * c * 0.66);
  }
  ctx.font = `bold ${size * 0.06}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#9e2b2b";
  ctx.fillText("AJANTHA", c, c + c * 0.35); // (the wall clock everyone had, by another name)
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
