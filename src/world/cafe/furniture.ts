import * as THREE from "three";
import { PAL } from "../../render/palette";
import type { LocalBox, SignSpot } from "../buildings/common";
import type { Parts } from "../kit";
import { COOLER, OWNER_PC_TURN, BOOTH, BOOTHS, type Booth, CLOCK, COUNTER, DESK, FANS, HALL, OWNER_SEAT, TUBES, YOUR_BOOTH, boothPoint } from "./plan";

/**
 * The cafe's furniture that never moves, built into the cafe building's own
 * mesh (so it costs nothing extra to draw): the booths (desks, plywood
 * partitions, curtains, CRT monitors, towers, keyboards, plastic chairs),
 * the owner's counter with his PC, the modem and the printer, the fans'
 * rods, the tubelights' battens, the clock's rim. (The water cooler is in cooler.ts.)
 *
 * What moves or glows (the fan blades, the lit tubes, the clock's hands, the
 * screens) is in world/cafe/room.ts. Positions come from plan.ts.
 *
 * Returns what you bump into (at the first floor's height) and where the
 * signs go (painted by world/signs.ts).
 */

const C = {
  plywood: 0xa8865c, // booth partitions and desks: light, varnished
  plywoodEdge: 0x8a6a45,
  laminate: 0xd9cdb4, // desk tops and the counter's top: cream formica
  beige: 0xd6cfbd, // CRTs, towers, keyboards: the colour of every computer then
  beigeDark: 0xb9b19c,
  screenOff: 0x2c3431,
  black: 0x2a2826,
  curtains: [0x7a2f36, 0x2f4a6d, 0x3f6b4a, 0x8a5a2b],
  chairs: [0xe9e4d8, 0xc0392b, 0x2f5f9e, 0x3f7a4a],
};

export type Furnished = { colliders: LocalBox[]; signs: SignSpot[] };

export function furnish(p: Parts, floorY: number): Furnished {
  const colliders: LocalBox[] = [];
  const signs: SignSpot[] = [];
  const UP = { y0: floorY - 0.1, y1: 99 };
  const partitions = new Set<string>(); // shared between neighbours: build each once

  BOOTHS.forEach((b, i) => booth(p, b, i, floorY, colliders, signs, partitions, UP));
  counter(p, floorY, colliders, UP);
  // the island's spine: one plywood wall down the middle, a little taller than the partitions
  const spine = BOOTHS.filter((b) => b.n <= 6);
  const z0 = Math.min(...spine.map((b) => b.z)) - BOOTH.width / 2, z1 = Math.max(...spine.map((b) => b.z)) + BOOTH.width / 2;
  p.slab(-0.5, -0.46, floorY, floorY + BOOTH.partition + 0.1, z0, z1, C.plywood);

  // ceiling fans: the rods and the canopies (the blades turn: room.ts)
  for (const f of FANS) {
    p.cylinder(0.08, 0.08, 0.05, f.x, HALL.ceiling - 0.03, f.z, 0xefeade, { segments: 10 });
    p.cylinder(0.018, 0.018, 0.55, f.x, HALL.ceiling - 0.3, f.z, 0xefeade, { segments: 6 });
  }
  // tubelight battens along the walls, just proud of them (the glowing tubes: room.ts)
  for (const t of TUBES) {
    const out = 0.03;
    p.box(1.25, 0.05, 0.06, t.x + Math.sin(t.turn) * out, floorY + t.y, t.z + Math.cos(t.turn) * out, 0xefeade, { ry: t.turn });
  }
  // the clock's case (its face and hands: room.ts)
  p.cylinder(CLOCK.radius + 0.025, CLOCK.radius + 0.025, 0.05, CLOCK.x + Math.sin(CLOCK.turn) * 0.01, floorY + CLOCK.y, CLOCK.z + Math.cos(CLOCK.turn) * 0.01, 0x7a2f2a, { rz: Math.PI / 2, ry: CLOCK.turn + Math.PI / 2, segments: 24 });

  // at the back: the water cooler (built in cooler.ts: its jug is see-through); here, only what you bump into
  colliders.push({ x0: COOLER.x - 0.22, x1: COOLER.x + 0.22, z0: COOLER.z - 0.22, z1: COOLER.z + 0.26, ...UP });
  // a dustbin by the counter
  p.cylinder(0.14, 0.12, 0.35, COUNTER.x0 - 0.2, floorY + 0.175, COUNTER.z0 - 0.3, 0x3f6b4a, { segments: 10 });

  // --- signs: the rate board as you arrive, notices taped to the walls, a game poster ---
  const on = (kind: SignSpot["kind"], x: number, y: number, z: number, w: number, h: number, ry: number, label?: string) =>
    signs.push({ kind, x, y: floorY + y, z, w, h, ry, label });
  on("rateBoard", 4.18, 1.75, -8.7, 1.2, 0.8, -Math.PI / 2);
  on("notice", HALL.x0 + 0.01, 2.0, -7.6, 0.55, 0.4, Math.PI / 2, "ADULT SITES STRICTLY PROHIBITED");
  on("notice", COUNTER.x1 + 0.01, 0.62, -8.9, 0.5, 0.36, Math.PI / 2, "पेन ड्राइव लगाने से पहले पूछें");
  on("notice", -2.6, 1.9, HALL.z0 + 0.01, 0.55, 0.4, 0, "LOGOUT KARKE JAAYEIN");
  on("notice", 4.18, 1.2, -9.8, 0.4, 0.3, -Math.PI / 2, "Mobile charging ₹5");
  on("gamePoster", -0.4, 1.8, HALL.z0 + 0.01, 0.6, 0.85, 0);
  on("calendar", HALL.x0 + 0.01, 1.95, -10.9, 0.42, 0.6, Math.PI / 2);
  return { colliders, signs };
}

function booth(p: Parts, b: Booth, i: number, floorY: number, colliders: LocalBox[], signs: SignSpot[], partitions: Set<string>, UP: { y0: number; y1: number }) {
  // a box in the booth's frame: w across, h tall, d deep; `tilt` leans it
  // back (about the booth's own sideways axis: tilted first, then turned to
  // face the way the booth faces)
  const at = (u: number, y: number, v: number, w: number, h: number, d: number, colour: number, tilt = 0) => {
    const q = boothPoint(b, u, v);
    const g = new THREE.BoxGeometry(w, h, d);
    if (tilt) g.rotateX(tilt);
    g.rotateY(b.turn);
    p.add(g, q.x, floorY + y, q.z, colour);
  };
  const deskFront = BOOTH.chairBack, deskBack = deskFront + BOOTH.desk; // v from the chair to the desk's front and back edges
  const half = BOOTH.width / 2;

  // the desk: a laminated top on two plywood sides
  at(0, BOOTH.deskTop, (deskFront + deskBack) / 2, BOOTH.width - 0.06, 0.03, BOOTH.desk, C.laminate);
  for (const u of [-half + 0.06, half - 0.06]) at(u, BOOTH.deskTop / 2, (deskFront + deskBack) / 2, 0.02, BOOTH.deskTop, BOOTH.desk - 0.04, C.plywood);
  pushBox(colliders, boothPoint(b, -half, deskFront), boothPoint(b, half, deskBack), UP);

  // the partitions either side (each shared with the neighbour, so built once)
  for (const u of [-half, half]) {
    const mid = boothPoint(b, u, (deskBack - BOOTH.opening) / 2);
    const key = `${mid.x.toFixed(2)},${mid.z.toFixed(2)}`;
    if (partitions.has(key)) continue;
    partitions.add(key);
    const from = -BOOTH.opening, to = deskBack;
    at(u, BOOTH.partition / 2, (from + to) / 2, 0.025, BOOTH.partition, to - from, C.plywood);
    at(u, BOOTH.partition + 0.01, (from + to) / 2, 0.035, 0.02, to - from, C.plywoodEdge); // its capping strip
    pushBox(colliders, boothPoint(b, u - 0.04, from), boothPoint(b, u + 0.04, to), UP);
  }

  // the curtain rod across the opening, and the curtain bunched at one end
  // (yours is pushed right back; a couple of others are half drawn)
  const rodV = -BOOTH.opening;
  at(0, 1.95, rodV, BOOTH.width, 0.015, 0.015, PAL.metal);
  const drawn = b.n === 5 || b.n === 9 ? 0.55 : b.n === YOUR_BOOTH ? 0.18 : 0.28; // how much of the opening it covers
  const colour = C.curtains[i % C.curtains.length];
  const folds = Math.max(2, Math.round(drawn / 0.07));
  for (let k = 0; k < folds; k++) {
    const u = half - 0.03 - (k + 0.5) * (drawn / folds);
    at(u, 1.15, rodV + (k % 2 ? 0.02 : -0.02), drawn / folds + 0.01, 1.58, 0.02, k % 2 ? colour : shade(colour, 0.85));
  }

  // the computer: a beige CRT (a box, and its tapering back), keyboard, mouse, speakers, the tower underneath
  const crtV = DESK.crt;
  at(0, BOOTH.deskTop + 0.03, crtV, 0.2, 0.03, 0.18, C.beigeDark); // the stand
  at(0, BOOTH.deskTop + 0.23, crtV, 0.4, 0.36, 0.3, C.beige);
  at(0, BOOTH.deskTop + 0.22, crtV + 0.14, 0.28, 0.26, 0.12, C.beigeDark); // the back
  at(0, DESK.screen.y, crtV - 0.152, 0.32, 0.25, 0.01, C.screenOff); // the screen, off (lit ones: world/cafe/screens.ts)
  at(0, DESK.keyboard.y, DESK.keyboard.v, 0.44, 0.025, 0.15, C.beige, -0.08); // keyboard
  mouse(p, b, floorY);
  for (const u of [-0.32, 0.32]) at(u, BOOTH.deskTop + 0.1, crtV + 0.05, 0.1, 0.17, 0.1, C.black); // speakers
  at(-0.38, 0.22, deskBack - 0.25, 0.19, 0.42, 0.42, C.beige); // the tower on the floor

  // a moulded plastic chair
  const chair = C.chairs[(i * 3) % C.chairs.length];
  at(0, 0.45, 0, 0.44, 0.04, 0.42, chair);
  at(0, 0.72, -0.22, 0.42, 0.42, 0.04, chair, -0.12);
  for (const [u, v] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) at(u, 0.22, v, 0.035, 0.45, 0.035, chair);

  // its number, painted on a small plate at the partition's end, facing the aisle
  const plate = boothPoint(b, half - 0.02, -BOOTH.opening + 0.01);
  signs.push({ kind: "boothNumber", x: plate.x, y: floorY + 1.62, z: plate.z, w: 0.16, h: 0.16, ry: b.turn + Math.PI, label: String(b.n) });
}

/** The owner's counter, facing the top of the stairs: his PC, the modem, a printer, the register. */
function counter(p: Parts, floorY: number, colliders: LocalBox[], UP: { y0: number; y1: number }) {
  const { x0, x1, z0, z1, top } = COUNTER;
  const midZ = (z0 + z1) / 2;
  p.slab(x0, x1, floorY, floorY + top - 0.04, z0, z1, 0x6b4a33); // the counter's body
  p.slab(x0 - 0.05, x1 + 0.05, floorY + top - 0.04, floorY + top, z0 - 0.05, z1 + 0.05, C.laminate); // its top
  colliders.push({ x0: x0 - 0.05, x1: x1 + 0.05, z0: z0 - 0.05, z1: z1 + 0.05, ...UP });
  const y = floorY + top;
  // His CRT at the far end, turned toward him: not between him and the
  // stairs, so he sees who comes up (and you see him). Its keyboard in front.
  const crtTurn = OWNER_PC_TURN; // turned from facing −x round toward his seat (his screen faces him; hardware.ts paints its faces)
  p.box(0.3, 0.36, 0.4, x0 + 0.33, y + 0.2, z0 + 0.35, C.beige, { ry: crtTurn });
  p.box(0.01, 0.25, 0.32, x0 + 0.33 - 0.155 * Math.cos(crtTurn), y + 0.21, z0 + 0.35 + 0.155 * Math.sin(crtTurn), C.screenOff, { ry: crtTurn });
  p.box(0.15, 0.02, 0.42, x0 + 0.08, y + 0.02, z0 + 0.62, C.beige, { ry: crtTurn, rz: 0.06 });
  // the register (a long red book) open in the middle, where he writes
  p.box(0.22, 0.03, 0.32, x0 + 0.13, y + 0.015, midZ + 0.2, 0x9e2b2b);
  // the dial-up modem, a small grey box with its lights (they blink: room.ts)
  p.box(0.16, 0.04, 0.12, x0 + 0.45, y + 0.02, z1 - 0.12, 0x8d9296);
  // the printer at the near end, a printout coming out of it, and a steel glass of chai
  p.box(0.3, 0.18, 0.35, x0 + 0.4, y + 0.09, z1 - 0.45, 0x9a9d9e);
  p.box(0.2, 0.02, 0.28, x0 + 0.4, y + 0.19, z1 - 0.47, 0xefeade);
  p.cylinder(0.035, 0.028, 0.09, x0 + 0.1, y + 0.045, z1 - 0.2, PAL.steel, { segments: 8 });
  // his tall revolving chair, and its footrest ring
  const s = OWNER_SEAT;
  p.cylinder(0.24, 0.24, 0.07, s.x, floorY + s.seat - 0.04, s.z, C.black, { segments: 12 });
  p.box(0.42, 0.5, 0.06, s.x - 0.25, floorY + s.seat + 0.28, s.z, C.black, { ry: Math.PI / 2 });
  p.cylinder(0.03, 0.03, s.seat - 0.1, s.x, floorY + (s.seat - 0.1) / 2 + 0.03, s.z, PAL.metal, { segments: 6 });
  p.add(new THREE.TorusGeometry(0.2, 0.012, 5, 16).rotateX(Math.PI / 2), s.x, floorY + 0.3, s.z, PAL.metal);
  p.cylinder(0.3, 0.3, 0.03, s.x, floorY + 0.05, s.z, C.black, { segments: 5 });
}

/**
 * The mouse, on the right of the keyboard, on its pad (the pad's print is in
 * hardware.ts): a rounded body, the seam between its two buttons, the scroll
 * wheel, and its cable running back behind the monitor.
 */
function mouse(p: Parts, b: Booth, floorY: number) {
  const { u, v } = DESK.mouse;
  const surface = floorY + BOOTH.deskTop + 0.017; // (the pad on the desk's top)
  const q = boothPoint(b, u, v);
  // the body: the top half of a ball, squashed long and low
  const body = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.031, 0.026, 0.055); // (many small facets: the cafe is flat-shaded, and a few big ones made it look like a cut gem)
  body.rotateY(b.turn);
  p.add(body, q.x, surface, q.z, C.beige);
  // the seam between the buttons, and the wheel, toward its front (the screen's way)
  const front = boothPoint(b, u, v + 0.03);
  const seam = new THREE.BoxGeometry(0.0025, 0.004, 0.03).rotateX(-0.35).rotateY(b.turn);
  p.add(seam, front.x, surface + 0.022, front.z, 0x8f8672);
  const wheel = new THREE.CylinderGeometry(0.007, 0.007, 0.005, 10).rotateZ(Math.PI / 2).rotateY(b.turn);
  p.add(wheel, front.x, surface + 0.023, front.z, 0x55504a);
  // the cable: out of its nose, across the desk, and away behind the monitor
  const at = (du: number, y: number, dv: number) => {
    const c = boothPoint(b, du, dv);
    return new THREE.Vector3(c.x, floorY + y, c.z);
  };
  const top = BOOTH.deskTop + 0.016;
  const cable = new THREE.CatmullRomCurve3([
    at(u, top + 0.006, v + 0.056), at(u + 0.01, top + 0.003, v + 0.13),
    at(u + 0.06, top + 0.003, DESK.crt - 0.12), at(-0.2, top + 0.003, DESK.crt + 0.02), at(-0.16, top + 0.02, DESK.crt + 0.2),
  ]);
  p.add(new THREE.TubeGeometry(cable, 24, 0.0022, 4), 0, 0, 0, 0x6f6a5e);
}

function pushBox(colliders: LocalBox[], a: { x: number; z: number }, b: { x: number; z: number }, band: { y0: number; y1: number }) {
  colliders.push({ x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), ...band });
}

/** A colour a little darker (`k` < 1). */
function shade(colour: number, k: number): number {
  const c = new THREE.Color(colour);
  return c.multiplyScalar(k).getHex();
}
