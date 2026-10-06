import * as THREE from "three";
import { makeRng } from "../core/rng";
import { Parts } from "./kit";
import type { WorldFan } from "./street";

/**
 * The shops' ceiling fans, turning: a motor and three blades under each
 * shop's ceiling (the canopy and rod they hang from are part of the shop:
 * world/buildings/shop.ts).
 *
 * Every fan is the same shape, so they're drawn together as one "instanced"
 * mesh: the shape is sent to the graphics card once, with a list of where
 * each copy goes (its position, turn and size) and its colour. One draw call
 * for all of them; turning them is just updating that list.
 *
 * Each has its own speed (from its own random numbers, so the street's don't
 * change): most on the slow setting, a couple faster, one or two switched off.
 */

/** Blade colours: cream, white, the old brown ones. */
const COLOURS = [0xefeade, 0xf6f4ee, 0x8a6a45, 0xefeade];
/** Turns per second: slower than a real fan, so it reads as turning, not a blur (like the cafe's). */
const SPEED = { min: 1.1, max: 2.0 };
/** How many in every hundred are switched off. */
const OFF = 12;

export type Fans = { mesh: THREE.InstancedMesh; update(dt: number): void };

/** `include`: which fans to build here (one batch per part of the town: main.ts); every fan's random choices are still made, in order. */
export function buildFans(all: WorldFan[], include: (fan: WorldFan) => boolean = () => true): Fans {
  const rng = makeRng(8181);
  // the shape, built for blades that reach 1 m (each fan is scaled to its own size)
  const p = new Parts();
  p.cylinder(0.16, 0.13, 0.12, 0, 0, 0, 0xffffff, { segments: 12 }); // the motor
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.BoxGeometry(0.78, 0.016, 0.15);
    blade.translate(0.61, -0.03, 0);
    blade.rotateY((k / 3) * Math.PI * 2);
    p.add(blade, 0, 0, 0, 0xffffff);
  }
  const shape = p.build("fan", { smooth: true, castShadow: false });

  const every = all.map((sp) => {
    const colour = new THREE.Color(rng.pick(COLOURS));
    return {
      spot: sp,
      colour,
      position: sp.position,
      scale: new THREE.Vector3(sp.r, sp.r, sp.r),
      speed: rng.next() * 100 < OFF ? 0 : rng.range(SPEED.min, SPEED.max),
      angle: rng.range(0, Math.PI * 2),
    };
  });
  const fans = every.filter((f) => include(f.spot));
  const mesh = new THREE.InstancedMesh(shape.geometry, shape.material, Math.max(1, fans.length));
  mesh.name = "shopFans";
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // (its copies are spread along the whole street)
  mesh.count = fans.length;
  fans.forEach((f, i) => mesh.setColorAt(i, f.colour));

  const turn = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const matrix = new THREE.Matrix4();
  function place() {
    fans.forEach((f, i) => {
      turn.setFromAxisAngle(up, f.angle);
      mesh.setMatrixAt(i, matrix.compose(f.position, turn, f.scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  place();

  return {
    mesh,
    update(dt) {
      for (const f of fans) f.angle -= f.speed * Math.PI * 2 * dt;
      place();
    },
  };
}
