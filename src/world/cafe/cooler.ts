import * as THREE from "three";
import { PAL } from "../../render/palette";
import { toon } from "../../render/toon";
import { Parts } from "../kit";
import { COOLER, HALL } from "./plan";

/**
 * The water cooler at the back of the hall: the white dispenser cabinet with
 * its two taps (red hot, blue cold) over a slotted drip tray, a 20-litre jug
 * upside down on top (see-through blue plastic, ribbed, a bit under half
 * full: you can see the water line), a steel glass on the tray tied on with a
 * chain, and another upside down on the top.
 *
 * Built in its own frame (the floor under its middle; it faces +z, down the
 * hall toward the front), then moved to COOLER. Four draw calls: the solid
 * parts, the badge, the water, the jug's plastic.
 */

/** How full the jug is, 0–1 (of its body; the neck and shoulder below are always full). */
const WATER_LEFT = 0.4;

const CABINET = { w: 0.34, h: 0.95, d: 0.34 };
const JUG = { r: 0.135, neckY: CABINET.h + 0.02, shoulder: 0.08, body: 0.38 };

export function buildCooler(): THREE.Group {
  const group = new THREE.Group();
  group.name = "cooler";
  group.position.set(COOLER.x, HALL.floor, COOLER.z);

  const p = new Parts();
  const { w, h, d } = CABINET;
  const front = d / 2;
  const white = 0xe9e4d8, grey = 0x6f7478, dark = 0x3a3d40;
  // the cabinet, and the dark rim its top ends in
  p.box(w, h, d, 0, h / 2, 0, white);
  p.box(w + 0.01, 0.025, d + 0.01, 0, h + 0.012, 0, grey);
  // the recess you hold your glass in: dark, with the drip tray at its bottom
  p.box(0.24, 0.38, 0.004, 0, 0.56, front + 0.002, grey);
  p.box(0.22, 0.02, 0.09, 0, 0.38, front + 0.04, 0x9aa0a4);
  for (let k = -3; k <= 3; k++) p.box(0.004, 0.003, 0.08, k * 0.028, 0.392, front + 0.04, dark); // its slots
  // the two taps: a stubby body out of the wall, the push lever on top, the spout down
  for (const [x, colour] of [[-0.055, 0xc0392b], [0.055, 0x2f6fb0]] as const) {
    p.cylinder(0.014, 0.014, 0.05, x, 0.69, front + 0.025, colour, { rx: Math.PI / 2, segments: 10 });
    p.box(0.02, 0.012, 0.035, x, 0.708, front + 0.03, colour, { rx: 0.35 });
    p.cylinder(0.006, 0.006, 0.025, x, 0.67, front + 0.045, 0xd8d8d8, { segments: 8 });
  }
  // the vents low down on the front
  for (let k = 0; k < 5; k++) p.box(0.2, 0.008, 0.004, 0, 0.1 + k * 0.03, front + 0.002, 0xc9c3b3);
  // the jug's collar, where its neck goes in
  p.cylinder(0.05, 0.06, 0.03, 0, h + 0.03, 0, grey, { segments: 14 });

  // the glasses: one on the tray under the cold tap, one upside down on the top
  const glass = () => new THREE.CylinderGeometry(0.035, 0.028, 0.09, 12);
  p.add(glass(), 0.055, 0.435, front + 0.04, PAL.steel);
  p.add(glass().rotateX(Math.PI), -0.12, h + 0.07, front - 0.06, PAL.steel);
  // …and the chain the tray's glass hangs on, looping down from the cabinet's side
  const chain = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.085, 0.45, front + 0.04), new THREE.Vector3(0.14, 0.4, front + 0.03),
    new THREE.Vector3(w / 2 + 0.005, 0.46, front - 0.03), new THREE.Vector3(w / 2 + 0.003, 0.62, front - 0.05),
  ]);
  p.add(new THREE.TubeGeometry(chain, 16, 0.0025, 4), 0, 0, 0, 0x8a8a86);
  const solid = p.build("cooler");
  group.add(solid);

  // the badge above the recess
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), toon({ color: 0xffffff, map: badgeTexture(), paint: 0.2 }));
  badge.position.set(0, 0.84, front + 0.002);
  group.add(badge);

  // the jug, upside down: its neck in the collar, the shoulder, the ribbed body, the rounded end at the top
  const { r, neckY, shoulder, body } = JUG;
  const outline: THREE.Vector2[] = [
    new THREE.Vector2(0.001, neckY - 0.01), new THREE.Vector2(0.03, neckY - 0.01), new THREE.Vector2(0.03, neckY + 0.03),
    new THREE.Vector2(r, neckY + 0.03 + shoulder),
  ];
  const base = neckY + 0.03 + shoulder;
  for (let k = 1; k <= 3; k++) {
    // the ribs: the body pinched in a little three times
    const y = base + (body * k) / 4;
    outline.push(new THREE.Vector2(r, y - 0.012), new THREE.Vector2(r - 0.008, y), new THREE.Vector2(r, y + 0.012));
  }
  outline.push(new THREE.Vector2(r, base + body), new THREE.Vector2(r * 0.75, base + body + 0.035), new THREE.Vector2(0.001, base + body + 0.045));
  const plastic = new THREE.Mesh(new THREE.LatheGeometry(outline, 24), toon({ color: 0xb9dcf5, opacity: 0.32, flatShading: false }));
  plastic.material.side = THREE.DoubleSide;
  plastic.renderOrder = 6; // (after the water inside it)

  // the water: from the neck up to its level, a little inside the plastic
  const level = base + body * WATER_LEFT;
  const water = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.001, neckY), new THREE.Vector2(0.026, neckY), new THREE.Vector2(0.026, neckY + 0.03),
    new THREE.Vector2(r - 0.006, base), new THREE.Vector2(r - 0.006, level), new THREE.Vector2(0.001, level),
  ], 24), toon({ color: 0x3f8fd0, opacity: 0.7, flatShading: false }));
  water.renderOrder = 5;
  group.add(water, plastic);
  return group;
}

/** The cabinet's badge: the maker (a look-alike), and what it is. */
function badgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e9e4d8";
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = "#1f4f9f";
  ctx.font = "bold 30px Tahoma, Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BLUE STAAR", 128, 30);
  ctx.font = "15px Tahoma, Verdana, sans-serif";
  ctx.fillStyle = "#c0392b";
  ctx.fillText("HOT", 96, 62);
  ctx.fillStyle = "#555";
  ctx.fillText("&", 128, 62);
  ctx.fillStyle = "#2f6fb0";
  ctx.fillText("COLD", 164, 62);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
