import * as THREE from "three";
import { type Box, boxAt } from "../../core/colliders";
import { Parts } from "../kit";
import { centreAt, pointAt } from "../layout";

/**
 * Placing props on the street, and drawing lots of them cheaply.
 *
 * PLACEMENT. A prop is built in its own frame (x along the street, +z facing
 * the walker in the middle of the street, y up, origin on the ground at its
 * centre). `placeOnStreet` gives the matrix that puts it at a spot `s` metres
 * along the street, `offset` to the side, turned to face the centre line.
 *
 * BATCHING. Every stall, crate and parked scooter is made of dozens of
 * parts; as separate objects that would be hundreds of draw calls. A
 * `StaticBatch` collects props that never move and merges them into one mesh.
 */

export type Placement = {
  matrix: THREE.Matrix4;
  /** The prop's rotation about the vertical axis (for colliders). */
  rot: number;
};

/**
 * Where a prop at (s, offset) goes. It faces the centre line (a prop on the
 * left side faces right, and vice versa); `turn` adds an extra rotation,
 * radians. A prop right on the centre line faces along the street.
 */
export function placeOnStreet(s: number, offset: number, turn = 0): Placement {
  const at = pointAt(s, offset);
  const h = centreAt(s).heading;
  // directions across and along the street
  const right = { x: Math.cos(h), z: Math.sin(h) };
  const forward = { x: Math.sin(h), z: -Math.cos(h) };
  const face = offset < -0.01 ? right : offset > 0.01 ? { x: -right.x, z: -right.z } : forward;
  const rot = Math.atan2(face.x, face.z) + turn;
  const matrix = new THREE.Matrix4().makeRotationY(rot).setPosition(at.x, 0, at.z);
  return { matrix, rot };
}

export class StaticBatch {
  private readonly parts = new Parts();
  readonly colliders: Box[] = [];

  /** Add a prop built around its own origin, put in place by `where`. */
  add(prop: Parts, where: Placement) {
    this.parts.addParts(prop, where.matrix);
  }

  /**
   * Add a collider: a box `sizeX` × `sizeZ` in the prop's own frame, centred
   * at its local (cx, cz), turned with the prop (plus `turn`, for a part of
   * the prop that's turned within it, like a slanted parked scooter).
   */
  collide(where: Placement, sizeX: number, sizeZ: number, cx = 0, cz = 0, turn = 0) {
    const c = new THREE.Vector3(cx, 0, cz).applyMatrix4(where.matrix);
    this.colliders.push(boxAt(c.x, c.z, sizeX, sizeZ, where.rot + turn));
  }

  build(name: string): THREE.Mesh {
    return this.parts.build(name);
  }
}
