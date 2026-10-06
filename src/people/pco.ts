import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { makeRng } from "../core/rng";
import { flat, toon } from "../render/toon";
import { CABIN_FRONT, COUNTER, DISPLAY, METER, OWNER, PCO, PHONE, PRINTER, SHELF, cabinX } from "../world/cafe/pco";
import type { WorldPeopleSpot } from "../world/street";
import { makeActor, seenFrom, v } from "./actor";
import { buildPerson } from "./body";
import { recipeFor } from "./recipes";

/**
 * Life in the STD booth under the cafe (its furniture: world/cafe/pco.ts):
 *
 *   the caller   in cabin 1, door open, the handset at his ear on a long
 *                call home: waving his free hand, shouting when the line
 *                goes bad, turning round to check the meter behind him
 *   the waiting  outside the cabin (the other one's out of order), hands
 *   man          behind his back, looking at his watch, sighing
 *   the owner    behind the counter: writing in the register, tearing off
 *                a receipt, looking over at cabin 1, out at the street
 *   the meters   red numbers counting the call's cost, in the cabin and on
 *                the big display on the counter (the second cabin's is dark)
 *
 * FRAME: the cafe building's (the spot is its origin), with `room` raised to
 * the booth's floor: heights here are above the booth's floor.
 */

export type Pco = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** The call: STD, charged by the started minute; how far into it he is when you arrive (seconds). */
const CALL = { perMinute: 2.4, startsAt: 200, lasts: 900 };

export function buildPco(spot: WorldPeopleSpot): Pco {
  const rng = makeRng(5050); // (their own random numbers: the rest of the street's people don't change)
  const group = new THREE.Group();
  group.name = "pco";
  group.position.copy(spot.position);
  group.rotation.y = spot.rotationY;
  const room = new THREE.Group();
  room.position.y = PCO.floor;
  group.add(room);

  // --- the caller, in cabin 1 ---------------------------------------------------------------------
  const callerAt = { x: cabinX(0) - 0.05, z: CABIN_FRONT - 0.5, turn: 0.3 };
  const cr = recipeFor("man", rng);
  cr.build.scale = 1;
  const callerPerson = buildPerson(cr);
  room.add(callerPerson.root);
  const meterSpot = v(cabinX(0) + METER.dx, METER.y, SHELF.z);
  const ear = v(-0.13, 1.5, 0.07); // (his right ear, in his own frame)
  const hip = v(0.2, 0.95, 0.03);
  const out = seenFrom(callerAt, 0.5, 1.5, 3);
  const caller = makeActor({
    person: callerPerson, at: callerAt, notice: "none", phase: 1,
    actions: [
      { name: "talk", duration: 5, pose: (u) => ({ right: ear, left: v(0.22 + Math.sin(u * 3) * 0.05, 1.1 + Math.sin(u * 2) * 0.08, 0.3), look: out, nod: Math.sin(u * 4) * 0.05 }) },
      // turning round to see what it's come to
      { name: "meter", duration: 2.2, pose: () => ({ right: ear, left: hip, look: seenFrom(callerAt, meterSpot.x, meterSpot.y, meterSpot.z), twist: 0.6 }) },
      // the line's gone bad: "HAAN? HELLO? AWAAZ AA RAHI HAI?"
      { name: "loud", duration: 3.5, pose: (u) => ({ right: ear, left: v(0.3, 1.35 + Math.sin(u * 5) * 0.1, 0.25), look: out, lean: 0.1, nod: Math.sin(u * 6) * 0.1, smile: true }) },
      { name: "listen", duration: 4, pose: () => ({ right: ear, left: hip, look: seenFrom(callerAt, callerAt.x + 0.3, 1.3, callerAt.z + 1.6), nod: 0.1 }) },
      { name: "talk", duration: 4, pose: (u) => ({ right: ear, left: v(0.2, 1.15 + Math.sin(u * 3) * 0.06, 0.28), look: out, nod: Math.sin(u * 5) * 0.06, smile: true }) },
    ],
  });

  // his handset, and its curly cord back to the phone on the shelf
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), toon({ color: 0xe8dcc0 }));
  const cordMaterial = toon({ color: 0xd8ccb0 });
  const cord = new THREE.Mesh(new THREE.BufferGeometry(), cordMaterial);
  const cordFrom = v(cabinX(0) + PHONE.dx - 0.1, PHONE.y, SHELF.z + 0.02);
  room.add(handset, cord);

  // --- the man waiting his turn ---------------------------------------------------------------------
  const waitAt = { x: cabinX(1) + 0.4, z: CABIN_FRONT + 0.8, turn: -1.25 }; // (clear of cabin 2's door, so its notice shows)
  const wr = recipeFor("uncle", rng);
  wr.build.scale = 1;
  const waitPerson = buildPerson(wr);
  room.add(waitPerson.root);
  const callerHead = seenFrom(waitAt, callerAt.x, 1.55, callerAt.z);
  const wrist = v(0.06, 1.18, 0.3);
  const waiter = makeActor({
    person: waitPerson, at: waitAt, notice: "glance", phase: 4,
    actions: [
      { name: "wait", duration: 5, pose: () => ({ right: v(-0.08, 0.95, -0.12), left: v(0.08, 0.95, -0.12), look: callerHead }) },
      { name: "watch", duration: 2, pose: () => ({ right: v(-0.02, 1.14, 0.28), left: wrist, look: wrist, nod: 0.2 }) },
      { name: "sigh", duration: 3, pose: () => ({ right: v(-0.22, 0.98, 0.0), left: v(0.22, 0.98, 0.0), look: callerHead, lean: -0.06 }) },
      { name: "street", duration: 3, pose: () => ({ right: v(-0.08, 0.95, -0.12), left: v(0.08, 0.95, -0.12), look: seenFrom(waitAt, 0.5, 1.5, 3) }) },
      { name: "wait", duration: 4, pose: () => ({ right: v(-0.08, 0.95, -0.12), left: v(0.08, 0.95, -0.12), look: callerHead, nod: 0.05 }) },
    ],
  });

  // --- the owner, behind the counter --------------------------------------------------------------
  const or = recipeFor("shopkeeper", rng);
  or.build.scale = 1;
  or.outfit.top = "halfShirt"; // (seated: a kurta's tails would hang through the stool)
  or.outfit.jacket = undefined;
  const ownerPerson = buildPerson(or);
  room.add(ownerPerson.root);
  const o = OWNER;
  const book = seenFrom(o, 1.15, COUNTER.top + 0.03, COUNTER.z0 + 0.13);
  const pen = (u: number) => seenFrom(o, 1.1 + Math.sin(u * 2.5) * 0.06, COUNTER.top + 0.04, COUNTER.z0 + 0.1);
  const owner = makeActor({
    person: ownerPerson, at: o, seat: o.seat, notice: "glance", phase: 2,
    actions: [
      { name: "write", duration: 6, pose: (u) => ({ right: pen(u), left: seenFrom(o, 1.3, COUNTER.top + 0.03, COUNTER.z0 + 0.1), look: book, lean: 0.25, nod: 0.3 }) },
      { name: "receipt", duration: 2.5, pose: (u) => ({ right: seenFrom(o, PRINTER.x, COUNTER.top + 0.14 + Math.min(u, 1) * 0.08, PRINTER.z + 0.06), left: seenFrom(o, 1.3, COUNTER.top + 0.03, COUNTER.z0 + 0.1), look: seenFrom(o, PRINTER.x, COUNTER.top + 0.1, PRINTER.z), lean: 0.15 }) },
      { name: "cabin", duration: 3, pose: () => ({ right: seenFrom(o, 1.1, COUNTER.top + 0.03, COUNTER.z0 + 0.1), left: seenFrom(o, 1.3, COUNTER.top + 0.03, COUNTER.z0 + 0.1), look: seenFrom(o, callerAt.x, 1.5, callerAt.z) }) },
      { name: "street", duration: 3, pose: () => ({ right: seenFrom(o, 1.1, COUNTER.top + 0.03, COUNTER.z0 + 0.1), left: seenFrom(o, 1.3, COUNTER.top + 0.03, COUNTER.z0 + 0.1), look: seenFrom(o, 1.5, 1.5, 3) }) },
    ],
  });

  // --- the meters: one sheet of glowing red numbers, three displays -------------------------------------
  const meters = buildMeters();
  room.add(meters.mesh);

  const gripR = new THREE.Vector3();
  const across = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), callerAt.turn);
  let shown = -1;
  return {
    group,
    update(t, dt, player) {
      caller.update(t, dt, player);
      waiter.update(t, dt, player);
      owner.update(t, dt, player);

      // the handset at his ear, turned the way he faces; the cord sags from it back to the phone
      caller.grip("R", gripR);
      handset.position.copy(gripR).add(v(0, -0.03, 0.03));
      handset.rotation.set(0.25, callerAt.turn, 0);
      const end = handset.position.clone().add(v(0, -0.1, 0.04));
      const low = Math.min(cordFrom.y, end.y) - 0.35;
      const curve = new THREE.CatmullRomCurve3([
        cordFrom,
        cordFrom.clone().lerp(end, 0.33).setY(low).addScaledVector(across, 0.04),
        cordFrom.clone().lerp(end, 0.66).setY(low + 0.05),
        end,
      ]);
      cord.geometry.dispose();
      cord.geometry = new THREE.TubeGeometry(curve, 16, 0.006, 4);

      // the call's cost, by the started minute; it's shown again only when a second ticks over
      const seconds = Math.floor((t + CALL.startsAt) % CALL.lasts);
      if (seconds !== shown) {
        shown = seconds;
        meters.show(seconds, Math.ceil(Math.max(1, seconds) / 60) * CALL.perMinute);
      }
    },
  };
}

/**
 * The three displays (cabin 1's meter, cabin 2's, the big one on the
 * counter), painted on one small canvas, one row each; three little panels
 * over the black boxes, one mesh. They glow: drawn unlit, like the tubes.
 */
function buildMeters() {
  const W = 256, ROW = 64;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = ROW * 3;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const panels = [
    { x: cabinX(0) + METER.dx, y: METER.y, z: METER.face, w: METER.w, h: METER.h },
    { x: cabinX(1) + METER.dx, y: METER.y, z: METER.face, w: METER.w, h: METER.h },
    { x: DISPLAY.x, y: DISPLAY.y, z: DISPLAY.face, w: DISPLAY.w, h: DISPLAY.h },
  ].map((pn, row) => {
    const g = new THREE.PlaneGeometry(pn.w, pn.h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (row + (1 - uv.getY(k))) / 3);
    return g.translate(pn.x, pn.y, pn.z);
  });
  const mesh = new THREE.Mesh(mergeGeometries(panels)!, flat(0xffffff, { map: texture, opaque: true }));
  mesh.name = "pcoMeters";

  const digits = (text: string, x: number, y: number, size: number) => {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillStyle = "#3a0e08"; // the unlit segments, faintly
    ctx.fillText(text.replace(/[0-9]/g, "8"), x, y);
    ctx.fillStyle = "#ff3b24";
    ctx.fillText(text, x, y);
  };
  const two = (n: number) => String(n).padStart(2, "0");

  return {
    mesh,
    /** Show the call: its length (seconds) and cost (₹). */
    show(seconds: number, cost: number) {
      ctx.fillStyle = "#120a08";
      ctx.fillRect(0, 0, W, ROW * 3);
      const time = `${two(Math.floor(seconds / 60))}:${two(seconds % 60)}`;
      const money = cost.toFixed(2).padStart(6, " ");
      // cabin 1: the cost big, the time small
      digits(money, W - 12, ROW * 0.42, 40);
      digits(time, W - 12, ROW * 0.82, 16);
      // cabin 2: out of order, dark but for its dashes
      ctx.fillStyle = "#5a1a10";
      ctx.font = `bold 40px "Courier New", monospace`;
      ctx.textAlign = "right";
      ctx.fillText("--.--", W - 12, ROW * 1.42);
      // the counter: the cabin's number, then its running cost
      digits("1", 40, ROW * 2.5, 44);
      digits(money, W - 12, ROW * 2.5, 44);
      texture.needsUpdate = true;
    },
  };
}
