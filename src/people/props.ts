import * as THREE from "three";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";

/**
 * Small things people hold: each is its own little mesh, moved every frame
 * to follow a hand (see `Actor.grip`). Built around the point where the hand
 * holds them, upright.
 */

function mesh(p: Parts, name: string): THREE.Mesh {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  m.name = name;
  m.castShadow = true;
  return m;
}

/** A cutting-chai glass: small, ribbed, half full. Held at its middle. */
export function chaiGlass(): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.03, 0.024, 0.08, 0, 0, 0, PAL.glassPale, { segments: 8 });
  p.cylinder(0.027, 0.027, 0.012, 0, 0.02, 0, 0xc88f5a, { segments: 8 }); // the chai
  return mesh(p, "chaiGlass");
}

/** A golgappa: a puffed puri, a little gold ball. */
export function puri(): THREE.Mesh {
  const p = new Parts();
  p.add(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.85, 1), 0, 0, 0, PAL.oilGold);
  return mesh(p, "puri");
}

/** A jhara: the halwai's long slotted spoon, built pointing down from the hand; aimed each frame. */
export function jhara(): THREE.Mesh {
  const p = new Parts();
  p.strut({ x: 0, y: 0.03, z: 0 }, { x: 0, y: -0.42, z: 0 }, 0.008, PAL.steel);
  p.cylinder(0.07, 0.07, 0.012, 0, -0.43, 0, PAL.steel, { segments: 12 });
  return mesh(p, "jhara");
}

/** The jalebi-maker's cloth of batter: a bag gathered in the fist, with a small hole at the bottom. */
export function batterCloth(): THREE.Mesh {
  const p = new Parts();
  p.add(new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1.2, 1), 0, -0.05, 0, 0xefe9dc);
  p.add(new THREE.ConeGeometry(0.03, 0.06, 8).rotateX(Math.PI), 0, -0.13, 0, 0xefe9dc);
  return mesh(p, "batterCloth");
}

/** An ice gola on its stick: shaved ice soaked in bright syrup. Held by the stick. */
export function gola(colour = 0xd6283a): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.005, 0.005, 0.12, 0, 0.02, 0, PAL.woodLight, { segments: 5 });
  p.add(new THREE.SphereGeometry(0.045, 10, 8).scale(1, 1.35, 1), 0, 0.12, 0, colour);
  return mesh(p, "gola");
}

/** A scoop of shaved ice on the seller's plane (shown while he shaves). */
export function iceScoop(): THREE.Mesh {
  const p = new Parts();
  p.add(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 0.6, 1), 0, 0, 0, PAL.ice);
  return mesh(p, "iceScoop");
}

/**
 * A folded newspaper, held open by both edges: a pale sheet with dark bars
 * for the headlines, a photo and the columns, printed on both sides (the
 * reader sees one, you see the other). Built upright, facing +z, centred.
 */
export function newspaper(): THREE.Mesh {
  const p = new Parts();
  p.box(0.52, 0.36, 0.006, 0, 0, 0, 0xe6dfcc);
  for (const z of [-0.004, 0.004]) {
    p.box(0.004, 0.36, 0.002, 0, 0, z, 0xb9b09c); // the fold
    p.box(0.2, 0.035, 0.002, -0.13, 0.13, z, 0x3a3634); // headlines
    p.box(0.2, 0.035, 0.002, 0.13, 0.13, z, 0x3a3634);
    p.box(0.09, 0.08, 0.002, -0.17, 0.03, z, 0x8a8378); // a photo
    for (let i = 0; i < 4; i++) p.box(0.2, 0.012, 0.002, 0.13, 0.07 - i * 0.04, z, 0x9a9384); // columns
  }
  return mesh(p, "newspaper");
}

/** A woven hand fan (pankha): a square of bright straw on a short handle, built up from where it's held. */
export function handFan(): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.008, 0.008, 0.12, 0, 0.02, 0, PAL.bamboo, { segments: 5 });
  p.box(0.2, 0.2, 0.008, 0, 0.18, 0, 0xd9a441);
  p.box(0.21, 0.02, 0.01, 0, 0.28, 0, PAL.crateRed); // its red border
  p.box(0.21, 0.02, 0.01, 0, 0.08, 0, PAL.crateRed);
  return mesh(p, "handFan");
}

/** A small grey mobile phone, the kind with a torch and rubbery keys. */
export function mobile(): THREE.Mesh {
  const p = new Parts();
  p.box(0.045, 0.1, 0.018, 0, 0.02, 0, 0x4a5561);
  p.box(0.032, 0.03, 0.004, 0, 0.045, 0.01, 0x9fb7a0); // the green screen
  return mesh(p, "mobile");
}

/** A stool: a round wooden seat on four legs, `height` tall. Origin on the ground under it. */
export function stool(height: number): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.17, 0.17, 0.04, 0, height - 0.02, 0, PAL.woodLight, { segments: 12 });
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    p.strut({ x: x * 0.1, y: height - 0.03, z: z * 0.1 }, { x: x * 0.14, y: 0, z: z * 0.14 }, 0.018, PAL.wood);
  }
  const m = mesh(p, "stool");
  m.receiveShadow = true;
  return m;
}

/** A cricket bat, built pointing down from the top of the handle; aimed each frame. */
export function bat(): THREE.Mesh {
  const p = new Parts();
  p.cylinder(0.016, 0.016, 0.2, 0, -0.08, 0, 0x2f2a27, { segments: 6 }); // the taped handle
  p.box(0.09, 0.42, 0.03, 0, -0.39, 0, 0xd9b77a); // the blade
  p.box(0.09, 0.42, 0.012, 0, -0.39, -0.02, 0xc9a266); // its back, a touch darker
  return mesh(p, "bat");
}

/** The ball: a tennis ball wrapped in tape, as gully cricket uses. */
export function tennisBall(): THREE.Mesh {
  const p = new Parts();
  p.add(new THREE.SphereGeometry(0.033, 10, 8), 0, 0, 0, 0xd8e05a);
  p.add(new THREE.TorusGeometry(0.033, 0.006, 4, 12), 0, 0, 0, 0xe9e4d6); // the tape
  return mesh(p, "ball");
}

/** Stumps: three sticks jammed in a stack of bricks. Origin on the ground at the middle. */
export function stumps(): THREE.Mesh {
  const p = new Parts();
  p.box(0.34, 0.14, 0.12, 0, 0.07, 0, 0xa4563a);
  p.box(0.3, 0.07, 0.12, 0, 0.175, 0, 0xb0603f);
  for (const x of [-0.1, 0, 0.1]) p.cylinder(0.012, 0.012, 0.58, x, 0.45, 0, PAL.woodLight, { segments: 5 });
  return mesh(p, "stumps");
}
