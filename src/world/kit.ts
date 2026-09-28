import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { flat, toon } from "../render/toon";

/**
 * Parts: a builder for things made of many simple shapes.
 *
 * A shop is dozens of parts (plinth, pillars, shutter, awning, windows...).
 * Drawing each as its own object would be dozens of "draw calls", and draw
 * calls are what slow a scene down. So you add the parts one by one, each
 * with its own colour, and `build()` merges them into ONE mesh whose colours
 * are stored per vertex. One building = one draw call.
 *
 * Positions are in the thing's own local frame (for a building: x along the
 * frontage, y up, +z pointing out toward the street, z = 0 at the front edge).
 */

type Placement = {
  /** Rotation about each axis, radians. */
  rx?: number;
  ry?: number;
  rz?: number;
};

export class Parts {
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly matrix = new THREE.Matrix4();
  private readonly euler = new THREE.Euler();
  private readonly quat = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3(1, 1, 1);

  /** A box `w` wide (x), `h` tall (y), `d` deep (z), centred at (x, y, z). */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, at: Placement = {}) {
    this.add(new THREE.BoxGeometry(w, h, d), x, y, z, color, at);
  }

  /**
   * A box given by its edges instead of its centre, which is often easier to
   * read: x from x0 to x1, y from y0 to y1, z from z0 to z1.
   */
  slab(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: number) {
    this.box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, color);
  }

  /** An upright cylinder (or cone, if the radii differ), centred at (x, y, z). */
  cylinder(
    rTop: number, rBottom: number, h: number,
    x: number, y: number, z: number,
    color: number, at: Placement & { segments?: number } = {},
  ) {
    this.add(new THREE.CylinderGeometry(rTop, rBottom, h, at.segments ?? 10), x, y, z, color, at);
  }

  /** Any other shape: it is moved into place and coloured like the rest. */
  add(geo: THREE.BufferGeometry, x: number, y: number, z: number, color: number, at: Placement = {}) {
    this.euler.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0);
    this.quat.setFromEuler(this.euler);
    this.matrix.compose(this.pos.set(x, y, z), this.quat, this.scale);
    geo.applyMatrix4(this.matrix);
    paint(geo, color);
    this.geos.push(geo);
  }

  /**
   * A thin rod from point a to point b (a bicycle frame tube, a pole, a
   * rail). Worked out from its two ends, so connected rods always meet.
   */
  strut(a: THREE.Vector3Like, b: THREE.Vector3Like, radius: number, color: number, segments = 6) {
    const start = new THREE.Vector3(a.x, a.y, a.z);
    const dir = new THREE.Vector3(b.x, b.y, b.z).sub(start);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, length, segments);
    // a cylinder is made standing along y: turn y onto the rod's direction
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    const mid = start.clone().addScaledVector(dir, length / 2);
    geo.translate(mid.x, mid.y, mid.z);
    paint(geo, color);
    this.geos.push(geo);
  }

  /**
   * Move/turn the most recently added part by `matrix`. Handy when a part is
   * easiest to describe around the origin and then place (e.g. along a curve).
   */
  transformLast(matrix: THREE.Matrix4) {
    this.geos[this.geos.length - 1]?.applyMatrix4(matrix);
  }

  /** Add all of another `Parts`' pieces, moved by `matrix` (for building a thing out of smaller things). */
  addParts(other: Parts, matrix: THREE.Matrix4) {
    for (const g of other.geos) this.geos.push(g.clone().applyMatrix4(matrix));
  }

  /** How many parts have been added so far. */
  get count() {
    return this.geos.length;
  }

  /** All the parts merged into one shape, without making a mesh from it. */
  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.geos.map(normalise));
    if (!merged) throw new Error("Parts: parts could not be merged");
    return merged;
  }

  /**
   * Merge every part into one mesh: cel-shaded by default, or `unlit` for far
   * silhouettes that shouldn't react to light or fade into the haze. `smooth`
   * shades rounded things (animals, people) smoothly instead of facet by
   * facet, which suits buildings but makes a body look boxy.
   */
  build(name: string, { castShadow = true, receiveShadow = true, unlit = false, smooth = false } = {}): THREE.Mesh {
    const merged = this.geometry();
    this.geos.forEach((g) => g.dispose());
    const material = unlit
      ? flat(0xffffff, { fog: false, vertexColors: true })
      : toon({ color: 0xffffff, vertexColors: true, flatShading: !smooth });
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}

/** Give every vertex of a shape the same colour. */
function paint(geo: THREE.BufferGeometry, hex: number) {
  // THREE.Color converts the hex (as picked on screen) to the "linear" colour
  // values the renderer expects in vertex colours.
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * Merging needs every shape to have exactly the same set of data (position,
 * normal, colour) and the same index style, so strip anything extra (like
 * texture coordinates) and make all of them "non-indexed".
 */
function normalise(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(geo.attributes)) {
    if (name !== "position" && name !== "normal" && name !== "color") geo.deleteAttribute(name);
  }
  return geo.index ? geo.toNonIndexed() : geo;
}

/**
 * A flat ribbon lying on the ground along a path, like the road or a drain.
 * `left(t)` and `right(t)` give its two edges for t from 0 to 1, sampled
 * `steps` times. Returned as a shape ready for `Parts.add`.
 */
export function ribbon(
  left: (t: number) => { x: number; z: number },
  right: (t: number) => { x: number; z: number },
  steps: number,
  y: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a0 = left(i / steps), a1 = left((i + 1) / steps);
    const b0 = right(i / steps), b1 = right((i + 1) / steps);
    // two triangles per segment, wound so they face up
    positions.push(a0.x, y, a0.z, b0.x, y, b0.z, a1.x, y, a1.z);
    positions.push(a1.x, y, a1.z, b0.x, y, b0.z, b1.x, y, b1.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}
