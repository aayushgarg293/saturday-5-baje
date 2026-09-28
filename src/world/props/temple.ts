import * as THREE from "three";
import { PAL } from "../../render/palette";
import type { BuildContext, BuildResult } from "../buildings/common";
import { PLOT_DEPTH } from "../layout";

/**
 * The small roadside temple, built on its plot (same local frame as the
 * buildings: x along the frontage, +z toward the street, z = 0 the plot front).
 *
 *            ▲ kalash
 *           ╱█╲         saffron flag on a pole
 *          ╱███╲        ◄ shikhara: the tapering tower
 *         ┌─────┐       ◄ garland of marigolds over the door, a bell
 *         │ ▓▓▓ │       ◄ the shrine, the idol inside
 *     ▄▄▄▄┴─────┴▄▄▄▄   ◄ platform with steps up from the street
 *
 * Beside it, a peepal tree, the kind every such shrine seems to grow under.
 */
export function buildTemple(c: BuildContext): BuildResult {
  const p = c.parts;
  const w = c.w;
  const PLATFORM = 0.6;

  // platform, with three steps down to the street; low walls round the back and sides
  p.slab(-w / 2, w / 2, 0, PLATFORM, -PLOT_DEPTH, -0.9, PAL.plinth);
  for (let k = 0; k < 3; k++) {
    const y = PLATFORM - (k + 1) * 0.2;
    p.slab(-w / 2 + 0.6, w / 2 - 0.6, 0, y + 0.2, -0.9 + k * 0.3, -0.6 + k * 0.3, PAL.stoneTrim);
  }
  p.slab(-w / 2, w / 2, PLATFORM, 2.0, -PLOT_DEPTH, -PLOT_DEPTH + 0.35, PAL.sandstone);
  p.slab(-w / 2, -w / 2 + 0.3, PLATFORM, 1.2, -PLOT_DEPTH, -1.2, PAL.sandstone);
  p.slab(w / 2 - 0.3, w / 2, PLATFORM, 1.2, -PLOT_DEPTH, -1.2, PAL.sandstone);

  // the shrine: a white cube with an open front, a saffron band, and the idol inside
  const sx = -0.4, sz = -3.2, half = 0.85;
  const top = PLATFORM + 1.9;
  p.slab(sx - half, sx + half, PLATFORM, top, sz - half, sz - half + 0.15, PAL.templeWhite); // back
  p.slab(sx - half, sx - half + 0.15, PLATFORM, top, sz - half, sz + half, PAL.templeWhite); // sides
  p.slab(sx + half - 0.15, sx + half, PLATFORM, top, sz - half, sz + half, PAL.templeWhite);
  p.slab(sx - half, sx + half, PLATFORM + 1.55, top, sz + half - 0.15, sz + half, PAL.templeWhite); // over the door
  p.slab(sx - half - 0.05, sx + half + 0.05, top - 0.25, top - 0.1, sz - half - 0.05, sz + half + 0.05, PAL.saffron);
  p.slab(sx - half + 0.15, sx + half - 0.15, PLATFORM, PLATFORM + 0.3, sz - half + 0.15, sz + half - 0.3, PAL.templeWhite); // pedestal
  const idol = new THREE.SphereGeometry(0.28, 10, 8);
  idol.scale(0.8, 1.2, 0.7);
  p.add(idol, sx, PLATFORM + 0.62, sz - 0.2, PAL.saffron); // painted saffron, like a roadside Hanuman
  p.slab(sx - half, sx + half, top, top + 0.15, sz - half, sz + half, PAL.templeWhite); // roof slab

  // the shikhara: stacked tapering tiers, then a gold kalash on top
  for (let k = 0; k < 4; k++) {
    const r = 0.8 - k * 0.17;
    p.cylinder(r - 0.12, r, 0.45, sx, top + 0.38 + k * 0.42, sz, k % 2 ? PAL.templeWhite : 0xf6e7c8, { segments: 4, ry: Math.PI / 4 });
  }
  p.add(new THREE.SphereGeometry(0.14, 8, 6), sx, top + 2.2, sz, PAL.oilGold);
  p.cylinder(0.02, 0.05, 0.25, sx, top + 2.4, sz, PAL.oilGold, { segments: 5 });

  // marigold garland across the door, and a brass bell hanging in front
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = sx - half + 0.15 + t * (half * 2 - 0.3);
    const sag = Math.sin(t * Math.PI) * 0.18;
    p.add(new THREE.SphereGeometry(0.05, 6, 5), x, PLATFORM + 1.5 - sag, sz + half + 0.04, PAL.marigold);
  }
  p.box(0.02, 0.35, 0.02, sx + 0.55, PLATFORM + 1.35, sz + half + 0.25, PAL.metal);
  p.cylinder(0.04, 0.1, 0.14, sx + 0.55, PLATFORM + 1.12, sz + half + 0.25, PAL.oilGold, { segments: 8 });
  p.box(0.3, 0.03, 0.03, sx + 0.55, PLATFORM + 1.52, sz + half + 0.15, PAL.metal); // its bracket

  // saffron flag on a bamboo pole at the back corner
  p.cylinder(0.03, 0.03, 5, sx - 1.1, PLATFORM + 2.5, sz - 0.6, PAL.bamboo, { segments: 5 });
  const flag = new THREE.BufferGeometry();
  flag.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.9, -0.25, 0, 0, -0.5, 0, 0, -0.5, 0, 0.9, -0.25, 0, 0, 0, 0], 3));
  flag.computeVertexNormals(); // a triangle, both sides (two copies wound opposite ways)
  p.add(flag, sx - 1.08, PLATFORM + 5, sz - 0.6, PAL.saffron);

  // the peepal tree beside the shrine: a trunk, a few branches, a cloud of leafy clumps
  peepal(c, 1.1, -5.2);
  // someone praying stands before the shrine's door, facing it; the bell hangs ahead and to her right
  c.people.push({ kind: "temple", x: sx + 0.15, y: PLATFORM, z: sz + half + 0.6, turn: Math.PI, bell: [-0.4, 1.12, 0.35] });
  return { height: 2.0, signs: [] };
}

function peepal(c: BuildContext, x: number, z: number) {
  const p = c.parts;
  const r = c.rng;
  p.cylinder(0.22, 0.32, 4.2, x, 2.1, z, PAL.bark, { segments: 8 });
  p.strut({ x, y: 3.4, z }, { x: x - 1.2, y: 5.0, z: z + 1.2 }, 0.12, PAL.bark);
  p.strut({ x, y: 3.8, z }, { x: x + 1.0, y: 5.4, z: z + 0.5 }, 0.11, PAL.bark);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const rr = r.range(0.6, 2.2);
    const clump = new THREE.IcosahedronGeometry(r.range(1.1, 1.7), 1);
    clump.scale(1, 0.75, 1);
    p.add(clump, x + Math.cos(a) * rr, r.range(5.2, 7.2), z + Math.sin(a) * rr + 0.8, i % 3 ? PAL.leafDark : PAL.leafLight);
  }
}
