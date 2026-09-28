import * as THREE from "three";
import { PAL, SKIN_TONES } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import type { Placement } from "../world/props/batch";
import { type Person, buildPerson } from "./body";
import { lookAt, reach } from "./pose";

/**
 * The chaiwala, behind his counter at the tapri (world/props/stalls.ts,
 * `chaiTapri`), making chai in a loop:
 *
 *   stir the pan (6 s) → lift it and pour into the glasses (3.4 s)
 *   → wipe his hands on the gamchha, glancing up the street (2.4 s) → …
 *
 * Each action says where his hands should be and what he looks at; the arms
 * reach there by IK (people/pose.ts), and actions blend into each other.
 * When you come within a few metres, he looks at you instead.
 *
 * All positions here are in the stall's own frame (x along the counter, +z
 * toward the street, y up), the same frame the tapri was built in.
 */

/** Where things are on the tapri's counter (see chaiTapri in stalls.ts). */
const STOVE_TOP = 1.08;
const PAN_REST = new THREE.Vector3(-0.45, STOVE_TOP + 0.07, 0);
const GLASSES = { x0: 0.2, x1: 0.7, y: 1.01, z: 0.15 };
/** Where he stands: behind the counter, facing the street. */
const STANDS_AT = new THREE.Vector3(-0.15, 0, -0.5); // right up against the counter: he has to reach the pan
/** The pan's handle sticks out toward him, this long. */
const HANDLE = 0.26;

type Pose = {
  right: THREE.Vector3;
  left: THREE.Vector3;
  look: THREE.Vector3;
  /** Forward lean of the upper body, radians. */
  lean: number;
  /** Upper body turned toward the work, radians (+ = toward his left). */
  twist: number;
  /** Shoulders rocking side to side with the work, radians. */
  rock: number;
  /** The pan: resting on the stove, or in his right hand (with a pouring tilt). */
  pan: { inHand: boolean; tilt: number };
  /** While stirring: the ladle runs from his hand down to this point in the pan. */
  ladle: THREE.Vector3 | null;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
const smooth = (k: number) => k * k * (3 - 2 * k);

/** The actions, each a pose over its own time `u` (seconds since it began). */
const ACTIONS: { name: string; duration: number; pose: (u: number) => Pose }[] = [
  {
    name: "stir",
    duration: 6,
    pose: (u) => ({
      // the hand circles slowly above and behind the pan; the ladle reaches down into it
      right: PAN_REST.clone().add(v(0.05 * Math.cos(u * 2.4), 0.24 + 0.015 * Math.sin(u * 4.8), -0.16 + 0.04 * Math.sin(u * 2.4))),
      left: v(0.15, 0.97, -0.3), // resting on the counter
      look: PAN_REST.clone(),
      lean: 0.2,
      twist: -0.2, // turned toward the stove on his right
      rock: Math.sin(u * 2.4) * 0.04, // the shoulders go round with the ladle
      pan: { inHand: false, tilt: 0 },
      ladle: PAN_REST.clone().add(v(0.07 * Math.cos(u * 2.4), 0.0, 0.07 * Math.sin(u * 2.4))),
    }),
  },
  {
    name: "pour",
    duration: 3.4,
    pose: (u) => {
      // grip → lift → pour along the row of glasses → back down
      const grip = PAN_REST.clone().add(v(0, 0.04, -HANDLE));
      const keys = [grip, v(-0.15, 1.44, -0.22), v(GLASSES.x0, 1.4, -0.16), v(GLASSES.x1 - 0.1, 1.4, -0.16), grip];
      const times = [0, 0.7, 1.2, 2.5, 3.4];
      let i = 0;
      while (i < times.length - 2 && u > times[i + 1]) i++;
      const k = smooth(THREE.MathUtils.clamp((u - times[i]) / (times[i + 1] - times[i]), 0, 1));
      const pouring = u > 1.2 && u < 2.5 ? Math.min(1, (u - 1.2) / 0.3, (2.5 - u) / 0.3) : 0;
      const right = lerpV(keys[i], keys[i + 1], k);
      return {
        right,
        left: v(0.4, 0.98, -0.05), // steadying the tray
        look: v(0.45, GLASSES.y, GLASSES.z),
        // leaning in as he lifts, and turning to follow the pan from stove to glasses
        lean: 0.15 + (right.y - 1.2) * 0.4,
        twist: THREE.MathUtils.clamp((right.x + 0.1) * 0.5, -0.25, 0.2),
        rock: 0,
        pan: { inHand: true, tilt: pouring * 0.7 },
        ladle: null,
      };
    },
  },
  {
    name: "wipe",
    duration: 2.4,
    pose: (u) => {
      // hands together at the gamchha on his left shoulder, rubbing
      const rub = Math.sin(u * 9) * 0.03;
      return {
        right: STANDS_AT.clone().add(v(0.12 + rub, 1.18, 0.2)),
        left: STANDS_AT.clone().add(v(0.2 - rub, 1.14, 0.19)),
        look: v(6, 1.5, 3), // glancing up the street
        lean: 0,
        twist: 0.12,
        rock: rub * 0.4,
        pan: { inHand: false, tilt: 0 },
        ladle: null,
      };
    },
  },
];
const LOOP = ACTIONS.reduce((sum, a) => sum + a.duration, 0);
/** How long one action takes to blend into the next, seconds. */
const BLEND = 0.6;

export type Chaiwala = {
  group: THREE.Group;
  update(t: number, dt: number, player: THREE.Vector3): void;
};

export function buildChaiwala(where: Placement): Chaiwala {
  const group = new THREE.Group();
  group.name = "chaiwala";
  group.applyMatrix4(where.matrix);

  const person = buildPerson({
    build: { scale: 1, girth: 1.05 },
    skin: SKIN_TONES[3],
    hair: "receding",
    hairColour: PAL.hairBlack,
    face: { moustache: "thick", beard: "stubble", age: 0.5, tilak: true, bindi: false, brow: 13, hair: PAL.hairBlack },
    outfit: { top: "vest", topColour: PAL.vestCream, bottom: "dhoti", bottomColour: PAL.dhotiWhite, gamchha: true, feet: "chappals" },
  });
  person.root.position.copy(STANDS_AT);
  group.add(person.root);

  const pan = buildPan();
  group.add(pan);
  const ladle = buildLadle();
  group.add(ladle);

  const toWorld = (p: THREE.Vector3) => group.localToWorld(p.clone());
  const poleR = v(-0.7, -0.5, -0.4), poleL = v(0.7, -0.5, -0.4);
  const worldDir = (d: THREE.Vector3) => d.clone().applyQuaternion(group.quaternion).normalize();
  let attention = 0;
  let greeting = 0; // seconds left of the smile-and-nod when he first notices you
  let greeted = false;
  let blinkIn = 2; // seconds until the next blink
  const playerHead = new THREE.Vector3();
  const local = new THREE.Vector3();

  return {
    group,
    update(t, dt, player) {
      // which action, and how far into it; blend into the next near its end
      let u = t % LOOP;
      let i = 0;
      while (u > ACTIONS[i].duration) { u -= ACTIONS[i].duration; i++; }
      const now = ACTIONS[i].pose(u);
      const next = ACTIONS[(i + 1) % ACTIONS.length].pose(0);
      const k = smooth(THREE.MathUtils.clamp((u - (ACTIONS[i].duration - BLEND)) / BLEND, 0, 1));
      const right = lerpV(now.right, next.right, k), left = lerpV(now.left, next.left, k);
      const lean = THREE.MathUtils.lerp(now.lean, next.lean, k);
      const twist = THREE.MathUtils.lerp(now.twist, next.twist, k);
      const rock = THREE.MathUtils.lerp(now.rock, next.rock, k);

      group.updateMatrixWorld(true);
      // The body is never still: breathing; weight shifting slowly from hip to
      // hip (the pelvis tilts, the spine leans back the other way to stay
      // upright); leaning over the counter; turning toward the work; the
      // shoulders rocking with it.
      const shift = Math.sin(t * 0.35);
      person.bone("hips").position.x = shift * 0.025;
      person.bone("hips").rotation.set(0, 0, -shift * 0.035);
      person.bone("spine").rotation.set(lean * 0.4 + Math.sin(t * 1.7) * 0.012, twist * 0.4, shift * 0.05);
      person.bone("chest").rotation.set(lean * 0.6, twist * 0.6, rock);
      person.root.updateMatrixWorld(true);

      reach(person, "R", toWorld(right), worldDir(poleR));
      reach(person, "L", toWorld(left), worldDir(poleL));

      // the head: at his work, or at you if you're close and in front of him
      local.copy(player).sub(group.position).applyQuaternion(group.quaternion.clone().invert());
      const near = local.distanceTo(STANDS_AT) < 4.5 && local.z > STANDS_AT.z;
      attention += ((near ? 1 : 0) - attention) * (1 - Math.exp(-2.5 * dt));
      playerHead.copy(player).setY(1.5);
      const workLook = toWorld(lerpV(now.look, next.look, k));
      lookAt(person, workLook.lerp(playerHead, attention), 1);

      // Noticing you: the first time he looks up at you, a smile and a nod.
      if (attention > 0.6 && !greeted) { greeted = true; greeting = 2.2; }
      if (attention < 0.1) greeted = false; // you've gone: next time, greet again
      greeting = Math.max(0, greeting - dt);
      const head = person.bone("head");
      const nodT = 2.2 - greeting; // seconds into the greeting
      if (greeting > 0 && nodT < 0.7) head.rotation.x += Math.sin((nodT / 0.7) * Math.PI) * 0.22;
      // a slight tilt of the head, more when he's looking at you
      head.rotation.z = Math.sin(t * 0.5) * 0.04 + attention * 0.07;

      // blinking every few seconds; smiling while greeting
      blinkIn -= dt;
      if (blinkIn < -0.13) blinkIn = 2 + Math.random() * 3;
      person.face.set(blinkIn < 0 ? "blink" : greeting > 0 ? "smile" : "neutral");

      // the pan: on the stove, or following his hand (tilting as he pours)
      const inHand = (k < 0.5 ? now : next).pan.inHand;
      const tilt = THREE.MathUtils.lerp(now.pan.tilt, next.pan.tilt, k);
      if (inHand) {
        const hand = group.worldToLocal(person.bone("handR").getWorldPosition(new THREE.Vector3()));
        pan.position.copy(hand).add(v(0, -0.04, HANDLE));
      } else {
        pan.position.copy(PAN_REST);
      }
      pan.rotation.x = tilt;
      // the ladle: from his hand, pointing down to the spot it's stirring
      const tip = (k < 0.5 ? now : next).ladle;
      ladle.visible = tip !== null;
      if (tip) {
        const hand = group.worldToLocal(person.bone("handR").getWorldPosition(new THREE.Vector3()));
        ladle.position.copy(hand);
        ladle.quaternion.setFromUnitVectors(v(0, -1, 0), tip.clone().sub(hand).normalize());
      }
    },
  };
}

/** The steel pan of chai with its long handle, built around its own centre. */
function buildPan(): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.15, 0.14, 0.13, 0, 0, 0, PAL.steel, { segments: 16 });
  p.cylinder(0.135, 0.135, 0.02, 0, 0.055, 0, 0xc88f5a, { segments: 16 }); // the chai
  p.strut({ x: 0, y: 0.04, z: -0.14 }, { x: 0, y: 0.06, z: -HANDLE }, 0.012, PAL.steel);
  const mesh = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  mesh.castShadow = true;
  mesh.name = "chaiPan";
  return mesh;
}

/** A long ladle, built pointing down (-y) from where the hand holds it; aimed each frame. */
function buildLadle(): THREE.Mesh {
  const p = new Parts();
  p.strut({ x: 0, y: 0.02, z: 0 }, { x: 0, y: -0.28, z: 0 }, 0.008, PAL.steel);
  p.cylinder(0.035, 0.03, 0.025, 0, -0.29, 0, PAL.steel, { segments: 10 });
  const mesh = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  mesh.name = "ladle";
  return mesh;
}

export type { Person };
