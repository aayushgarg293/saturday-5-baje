import * as THREE from "three";
import { makeRng } from "../core/rng";
import { flat, glow } from "../render/toon";
import type { LampSpot } from "./buildings/common";

/**
 * The street's lights coming on in the evening: tubelights at the top of the
 * shop openings (lighting the room behind), bulbs over the stalls and on some
 * poles, the stoves' fires, and windows lighting up in the houses. Each comes
 * on at its own moment (between about 6 and 6:45), the tubes with the
 * stuttering flicker tubelights had; one of them never quite settles.
 *
 * Real lights are too costly for this many, so each lamp is drawn, not lit:
 *   BODIES  the tube or bulb itself: grey when off, bright when on
 *   GLOWS   a soft glow around it (added on top of whatever is behind)
 *   POOLS   a pool of light on the ground or platform below
 *   PANES   a lit window, or the lit back wall of a shop's room
 * Each of the four is one instanced mesh: four draw calls for every lamp in
 * the street.
 */

/** A lamp spot in the world (from a builder's LampSpot). */
export type WorldLamp = {
  kind: LampSpot["kind"];
  position: THREE.Vector3;
  /** Which way it faces (radians about the vertical). */
  rotationY: number;
  w: number;
  h: number;
  back: number;
  ground: number;
  /** Poles: higher, a wider pool. */
  pole?: boolean;
  /** Home's: lit for sure, from 6. */
  always?: boolean;
};

/** A builder's lamp spot, placed in the world by its building's (or stall's) matrix. */
export function lampToWorld(sp: LampSpot, matrix: THREE.Matrix4, rot: number, groundY = 0): WorldLamp {
  return {
    kind: sp.kind,
    position: new THREE.Vector3(sp.x, sp.y, sp.z).applyMatrix4(matrix),
    rotationY: rot + (sp.ry ?? 0),
    w: sp.w ?? 1,
    h: sp.h ?? 1,
    back: sp.back ?? 0,
    ground: (sp.ground ?? 0) + groundY,
    always: sp.always,
  };
}

/** Colours: tubes a cool white (a few greenish, as old tubes went), bulbs and windows warm, fire orange. */
const COLOUR = {
  tube: [0xf2f8ff, 0xf2f8ff, 0xf2f8ff, 0xdff5e4],
  bulb: [0xffd98a],
  fire: [0xff7a2a],
  window: [0xffcf7a, 0xffe0a8, 0xffc070, 0xd8e4f0],
};
/** When each kind comes on (clock minutes): from, and a spread after it. Windows: some stay dark. */
const ON = {
  tube: [18 * 60 + 2, 28],
  bulb: [17 * 60 + 55, 18],
  pole: [18 * 60 + 20, 3],
  window: [18 * 60 + 5, 40],
} as const;
const WINDOWS_LIT = 0.45;
/** A tube flickers for this long (clock minutes: ~2 real seconds) as it starts. */
const STARTING = 0.35;
/** A body's colour when off. */
const OFF = new THREE.Color(0x8a8a86);

type Lamp = WorldLamp & { on: number; colour: THREE.Color; bad: boolean; flicker: number; lit: boolean };

export type Evening = {
  group: THREE.Group;
  /** Every frame: `minutes` (the clock), `evening` (0–1, render/daylight.ts), `t` (seconds, for flicker). */
  update(minutes: number, evening: number, t: number): void;
};

/** `include`: which lamps to build here (one batch per part of the town: main.ts); every lamp's random choices (and which tube flickers) are still made over them all, in order. */
export function buildEvening(spots: WorldLamp[], include: (lamp: WorldLamp) => boolean = () => true): Evening {
  const rng = makeRng(1810);
  const every: Lamp[] = spots.map((sp) => {
    const kind = sp.pole ? "pole" : sp.kind;
    const colours = COLOUR[sp.kind];
    const [from, spread] = sp.kind === "fire" ? [0, 0] : ON[kind as keyof typeof ON];
    const on = from + rng.next() * spread;
    const colour = new THREE.Color(colours[Math.floor(rng.next() * colours.length)]);
    const flicker = rng.next() * 100;
    const lit = sp.kind !== "window" || rng.next() < WINDOWS_LIT;
    return { ...sp, on: sp.always ? 18 * 60 : on, colour, bad: false, flicker, lit: lit || !!sp.always };
  });
  // one tube that never quite settles
  const tubes = every.filter((l) => l.kind === "tube");
  if (tubes.length) tubes[Math.floor(rng.next() * tubes.length)].bad = true;
  const lamps = every.filter((_, i) => include(spots[i]));

  // --- the four instanced meshes -------------------------------------------------------
  const soft = softTexture();
  const plane = new THREE.PlaneGeometry(1, 1);
  const flatPlane = plane.clone().rotateX(-Math.PI / 2);
  const bodyCount = lamps.filter((l) => l.kind === "tube" || l.kind === "bulb").length;
  const glowCount = lamps.filter((l) => l.kind !== "window").length * 2; // (points get two crossed cards)
  const poolCount = lamps.filter((l) => l.kind !== "window").length;
  const paneCount = lamps.filter((l) => l.kind === "window" || l.kind === "tube").length;
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), flat(0xffffff), Math.max(1, bodyCount));
  const glows = new THREE.InstancedMesh(plane, glow(soft), Math.max(1, glowCount));
  const pools = new THREE.InstancedMesh(flatPlane, glow(soft), Math.max(1, poolCount));
  const panes = new THREE.InstancedMesh(plane, glow(null), Math.max(1, paneCount));
  const group = new THREE.Group();
  group.name = "evening";
  for (const m of [bodies, glows, pools, panes]) {
    m.frustumCulled = false; // (spread down the whole street: one big box would never be culled anyway)
    group.add(m);
  }
  glows.renderOrder = pools.renderOrder = panes.renderOrder = 5; // after the solid things they glow over

  // each lamp's instances, placed once
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  type Slots = { body?: number; glows: number[]; pool?: number; pane?: number };
  const slots: Slots[] = [];
  let nb = 0, ng = 0, np = 0, nw = 0;
  const put = (mesh: THREE.InstancedMesh, i: number, p: THREE.Vector3, ry: number, sx: number, sy: number, sz = 1) => {
    q.setFromAxisAngle(up, ry);
    mesh.setMatrixAt(i, m.compose(p, q, sc.set(sx, sy, sz)));
  };
  for (const l of lamps) {
    const s: Slots = { glows: [] };
    const fwd = new THREE.Vector3(Math.sin(l.rotationY), 0, Math.cos(l.rotationY));
    if (l.kind === "tube") {
      put(bodies, (s.body = nb++), l.position, l.rotationY, l.w, 0.035, 0.035);
      pos.copy(l.position).addScaledVector(fwd, 0.04);
      put(glows, (s.glows[0] = ng++), pos, l.rotationY, l.w + 1.1, 0.75);
      put(glows, (s.glows[1] = ng++), pos, l.rotationY, 0.001, 0.001); // (unused: a tube's glow is one card)
      pos.copy(l.position).addScaledVector(fwd, 1.1).setY(l.ground + 0.02);
      put(pools, (s.pool = np++), pos, l.rotationY, l.w + 2.2, 1, 2.6);
      // the room's back wall, lit
      pos.copy(l.position).addScaledVector(fwd, -l.back).setY(l.ground + l.h / 2);
      put(panes, (s.pane = nw++), pos, l.rotationY, l.w + 0.8, l.h * 0.9);
    } else if (l.kind === "window") {
      put(panes, (s.pane = nw++), l.position, l.rotationY, l.w, l.h);
    } else {
      // a point of light: bulb, pole lamp or fire (fires have no body)
      if (l.kind === "bulb") put(bodies, (s.body = nb++), l.position, 0, 0.07, 0.09, 0.07);
      const size = l.kind === "fire" ? 0.55 : l.pole ? 1.4 : 0.9;
      put(glows, (s.glows[0] = ng++), l.position, l.rotationY, size, size);
      put(glows, (s.glows[1] = ng++), l.position, l.rotationY + Math.PI / 2, size, size);
      pos.copy(l.position).setY(l.ground + 0.02);
      const r = l.kind === "fire" ? 1.4 : l.pole ? 7 : 3.4;
      put(pools, (s.pool = np++), pos, 0, r, 1, r);
    }
    slots.push(s);
  }
  for (const mesh of [bodies, glows, pools, panes]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.setColorAt(0, OFF); // (makes the colour buffer)
    // Everything starts off (a new colour buffer is all white: before the first
    // frame's update, every window and glow would flash bright).
    const colours = mesh.instanceColor!.array as Float32Array;
    for (let i = 0; i < colours.length; i += 3) {
      if (mesh === bodies) colours.set([OFF.r, OFF.g, OFF.b], i);
      else colours.fill(0, i, i + 3);
    }
  }

  const c = new THREE.Color();
  const setColour = (mesh: THREE.InstancedMesh, i: number | undefined, colour: THREE.Color) => {
    if (i !== undefined) mesh.setColorAt(i, colour);
  };
  let lastKey = "";

  return {
    group,
    update(minutes, evening, t) {
      // nothing to do while every lamp is off and stays off (the afternoon)
      const key = minutes < 17 * 60 + 50 ? "day" : "";
      if (key && key === lastKey) return;
      lastKey = key;
      // how strongly glows show: faint in daylight, full at dusk
      const show = 0.2 + 0.8 * evening;
      lamps.forEach((l, i) => {
        const b = brightness(l, minutes, t) * (l.lit ? 1 : 0);
        const s = slots[i];
        if (s.body !== undefined) setColour(bodies, s.body, c.copy(OFF).lerp(l.colour, b));
        const g = b * show;
        const strength = l.kind === "fire" ? 0.9 : l.kind === "tube" ? 0.55 : 0.7;
        for (const k of s.glows) setColour(glows, k, c.copy(l.colour).multiplyScalar(g * strength));
        setColour(pools, s.pool, c.copy(l.colour).multiplyScalar(g * (l.pole ? 0.3 : 0.4)));
        // (a lit room's back wall only a little: it's lit from the front, dimly; windows more, they're the light itself)
        if (s.pane !== undefined) setColour(panes, s.pane, c.copy(l.colour).multiplyScalar(g * (l.kind === "window" ? 0.38 : 0.09)));
      });
      for (const mesh of [bodies, glows, pools, panes]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // the vehicles' headlights
      const h = headlightMaterials(), on = minutes >= HEADLIGHTS_ON ? show : 0;
      h.glow.color.copy(HEADLIGHT).multiplyScalar(on * 0.9);
      h.pool.color.copy(HEADLIGHT).multiplyScalar(on * 0.35);
    },
  };
}

// --- headlights ---------------------------------------------------------------------------
/** When the vehicles switch their headlights on (clock minutes), and their colour. */
const HEADLIGHTS_ON = 18 * 60 + 45; // (as the light goes: June sunsets are late)
const HEADLIGHT = new THREE.Color(0xfff0c8);
let headlights: { glow: THREE.MeshBasicMaterial; pool: THREE.MeshBasicMaterial } | null = null;
function headlightMaterials() {
  if (!headlights) {
    const soft = softTexture();
    headlights = { glow: glow(soft), pool: glow(soft) };
    headlights.glow.color.setRGB(0, 0, 0);
    headlights.pool.color.setRGB(0, 0, 0);
  }
  return headlights;
}

/**
 * Give a moving vehicle a headlight: a glow on its lamp and a pool of light
 * on the road ahead (both ride along as its children). Its frame: +x forward.
 * `front`: how far ahead of its middle the lamp is; `y`: how high; `size`:
 * the glow's size (a bicycle's dynamo lamp is small).
 */
export function addHeadlight(vehicle: THREE.Object3D, front: number, y: number, size: number) {
  const { glow: g, pool: p } = headlightMaterials();
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateY(Math.PI / 2), g);
  lamp.position.set(front + 0.05, y, 0);
  const ahead = new THREE.Mesh(new THREE.PlaneGeometry(4.5 * size, 2.6 * size).rotateX(-Math.PI / 2), p);
  ahead.position.set(front + 2.6 * size, 0.03, 0);
  lamp.renderOrder = ahead.renderOrder = 5;
  vehicle.add(lamp, ahead);
}

/** How lit a lamp is now: 0 (off) to 1, with a tube's flicker as it starts (and the bad tube's now and then). */
function brightness(l: Lamp, minutes: number, t: number): number {
  if (l.kind === "fire") return 1; // (always burning; it shows as the light goes)
  if (minutes < l.on) return 0;
  if (l.kind === "tube" || l.pole) {
    const flick = (rate: number) => (Math.sin((t + l.flicker) * rate) * Math.sin((t + l.flicker) * rate * 2.7) > 0.1 ? 1 : 0.08);
    if (minutes < l.on + STARTING) return flick(23);
    // the bad tube: every few seconds, a stutter
    if (l.bad && (t + l.flicker) % 7 < 0.5) return flick(31);
  }
  return 1;
}

/** A soft round spot, bright in the middle and fading to nothing: for glows and pools (also the aarti's flame). */
let soft: THREE.CanvasTexture | null = null;
export function softTexture(): THREE.CanvasTexture {
  if (soft) return soft;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  soft = new THREE.CanvasTexture(canvas);
  soft.colorSpace = THREE.SRGBColorSpace;
  return soft;
}
