import * as THREE from "three";
import { cue } from "../core/cues";
import type { Errand } from "../core/errands";
import { type Action, type Actor, v } from "../people/actor";
import { Parts } from "../world/kit";

/**
 * The moment something's handed over on an errand: the one giving it reaches
 * out toward you with it in hand, holds it there a moment, and it comes to
 * you with a small rustle and is gone (you aren't shown carrying anything).
 * The chit's line is ticked as it reaches you.
 */

/** Seconds: it shows in the hand; it leaves the hand; it's yours. */
const SHOWS = 0.3, LEAVES = 1.3, ARRIVES = 1.7;
/** How long the reach takes in all (the arm's still out as it goes, and comes back after). */
const REACH_SECONDS = 2.4;
/** How far out from the body the hand comes, metres. */
const ARM_OUT = 0.5;

const WHITE = 0xf3efe4, BROWN = 0xa8794a, SUTLI = 0xd8c9a0, RED = 0xc8392b, GREEN = 0x4f8a35;

/** Each thing (about its true size, its middle at the hand), and how high that one's hand comes (sitting low, lower). */
function theThing(errand: Errand): { thing: THREE.Object3D; height: number } {
  const p = new Parts();
  let height = 1;
  if (errand === "kapde") {
    // the ironed clothes: folded, in a pile, tied with string
    p.box(0.3, 0.035, 0.22, 0, -0.035, 0, WHITE);
    p.box(0.3, 0.035, 0.22, 0, 0, 0, 0x8fa8c8);
    p.box(0.3, 0.035, 0.22, 0, 0.035, 0, 0xe2d6bc);
    p.box(0.012, 0.115, 0.226, 0, 0, 0, SUTLI);
    height = 0.95;
  } else if (errand === "dawai") {
    // the chemist's white paper packet, its top folded over
    p.box(0.13, 0.045, 0.09, 0, 0, 0, WHITE);
    p.box(0.13, 0.006, 0.03, 0, 0.025, 0.03, 0xdcd6c8);
    height = 0.95;
  } else if (errand === "stampPaper") {
    // one sheet: the green stamp band across its top, and his typing
    p.box(0.21, 0.003, 0.3, 0, 0, 0, 0xf0ead8);
    p.box(0.21, 0.004, 0.06, 0, 0.001, -0.115, 0x8fb08a);
    for (let k = 0; k < 6; k++) p.box(0.16, 0.004, 0.006, 0, 0.001, -0.05 + k * 0.03, 0x55524c);
    height = 1.15;
  } else if (errand === "parcel") {
    // Mama's: shoebox-sized at most, brown paper, tied with sutli, the address on a white slip
    p.box(0.24, 0.1, 0.16, 0, 0, 0, BROWN);
    p.box(0.012, 0.106, 0.166, 0, 0, 0, SUTLI);
    p.box(0.246, 0.106, 0.012, 0, 0, 0, SUTLI);
    p.box(0.08, 0.004, 0.05, 0.06, 0.052, 0.04, WHITE);
    height = 1.3;
  } else {
    // the sabzi: a thin polythene bag, open at the top, tomatoes and the dhaniya showing
    p.add(new THREE.CylinderGeometry(0.095, 0.075, 0.13, 10), 0, 0, 0, 0xe8e6dc);
    for (const [x, z] of [[-0.04, 0.02], [0.045, 0.01], [0, -0.04]]) p.add(new THREE.SphereGeometry(0.042, 8, 6), x, 0.065, z, RED);
    p.add(new THREE.IcosahedronGeometry(0.035, 0), -0.02, 0.1, 0.045, GREEN);
    height = 0.85;
  }
  return { thing: p.build(`handed-${errand}`, { castShadow: false }), height };
}

export type HandOver = {
  group: THREE.Group;
  /** Start it: `landed` is called as it reaches you. */
  give(errand: Errand, actor: Actor, you: THREE.Vector3, landed: () => void): void;
  /** You walked off: it's put away again. */
  cancel(): void;
  update(dt: number, you: THREE.Vector3): void;
};

export function buildHandOver(): HandOver {
  const group = new THREE.Group();
  group.name = "handOver";
  let now: { thing: THREE.Object3D; actor: Actor; side: "L" | "R"; t: number; rustled: boolean; landed: () => void; from: THREE.Vector3 } | null = null;
  const _to = new THREE.Vector3();

  const finish = () => {
    if (now) group.remove(now.thing);
    now = null;
  };

  return {
    group,
    give(errand, actor, you, landed) {
      finish();
      const { thing, height } = theThing(errand);
      const root = actor.person.root;
      root.updateWorldMatrix(true, false);
      // toward you, in their own frame; the hand on your side of them
      const eyes = root.worldToLocal(you.clone().setY(1.45));
      const toward = v(eyes.x, 0, eyes.z).normalize();
      const side = eyes.x > 0 ? "L" : "R";
      const out = toward.clone().multiplyScalar(ARM_OUT).setY(height);
      const rest = v(side === "L" ? -0.15 : 0.15, height - 0.25, 0.28);
      const reach: Action = {
        name: "give", duration: REACH_SECONDS,
        pose: () => ({ right: side === "R" ? out : rest, left: side === "L" ? out : rest, look: eyes, lean: 0.2, smile: true }),
      };
      actor.perform(reach);
      if (errand === "stampPaper") thing.rotation.x = 1.1; // (held up so you see the sheet, not its edge)
      thing.visible = false;
      group.add(thing);
      now = { thing, actor, side, t: 0, rustled: false, landed, from: new THREE.Vector3() };
    },
    cancel: finish,
    update(dt, you) {
      if (!now) return;
      now.t += dt;
      const { thing, actor, side, t } = now;
      if (t < LEAVES) {
        thing.visible = t > SHOWS;
        actor.person.root.parent!.localToWorld(actor.grip(side, now.from));
        thing.position.copy(now.from);
        thing.rotation.y = Math.atan2(you.x - now.from.x, you.z - now.from.z);
        return;
      }
      if (!now.rustled) {
        now.rustled = true;
        cue("rustle", thing.position);
      }
      const k = THREE.MathUtils.smoothstep(t, LEAVES, ARRIVES);
      thing.position.lerpVectors(now.from, _to.copy(you).setY(1.05), k);
      thing.scale.setScalar(1 - k * 0.3);
      if (t >= ARRIVES) {
        const landed = now.landed;
        finish();
        landed();
      }
    },
  };
}
