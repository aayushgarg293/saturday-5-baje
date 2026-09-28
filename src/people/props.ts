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
