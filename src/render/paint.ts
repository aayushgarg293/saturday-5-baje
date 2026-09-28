/**
 * The painted-surface layer: shader code added to every toon material.
 *
 * It changes a surface's base colour, before lighting, in ways that depend
 * on where the pixel is in the world, so the pattern sticks to the surface
 * as you walk instead of sliding across the screen:
 *
 * - BRUSH STROKES: faint streaky variation in a direction that wanders
 *   across the surface, like gouache brushwork
 * - BLOTCHES: large soft patches, the uneven look of old lime-wash
 * - DUST at the foot of every wall: darker and browner in the bottom metre,
 *   kicked up from the unpaved street
 * - STREAKS: faint vertical rain marks down the walls
 * - PATCHES on the ground and tops: worn and repaired areas
 *
 * Fine detail fades out with distance ("band-limiting"). A pattern finer
 * than a pixel would flicker as you move, so it's blended to its average
 * before it gets that small (technique from ../summer-cycle's `brush()`).
 *
 * `uPaint` sets the strength per material: 1 for walls and ground, lower for
 * signboards so their lettering stays clean.
 */

/** Declarations added to the vertex shader. */
export const PAINT_VERTEX_DECL = /* glsl */ `
  varying vec3 vPaintPos;
`;

/** Added after the vertex position is worked out: remember the world position. */
export const PAINT_VERTEX_MAIN = /* glsl */ `
  vPaintPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

/** Declarations and helper functions added to the fragment shader. */
export const PAINT_FRAGMENT_DECL = /* glsl */ `
  varying vec3 vPaintPos;
  uniform float uPaint;

  // Smooth random values ("value noise"): random numbers on a grid, blended
  // smoothly in between. Returns 0..1.
  float pn_hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float pn_noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pn_hash(i), pn_hash(i + vec2(1.0, 0.0)), u.x),
               mix(pn_hash(i + vec2(0.0, 1.0)), pn_hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // Flatten a world position onto the surface's own plane: the ground uses
  // x/z, a wall facing along x uses z/y, a wall facing along z uses x/y.
  vec2 pn_planar(vec3 p, vec3 n) {
    vec3 a = abs(n);
    if (a.y > max(a.x, a.z)) return p.xz;
    return a.x > a.z ? p.zy : p.xy;
  }

  // Brush strokes: noise stretched along the surface's first axis (so,
  // horizontal strokes on walls), with a gentle wobble so they don't look
  // ruled. (Rotating the pattern by an angle that varies across the surface,
  // as ../summer-cycle does, turned into wood-grain rings at large world
  // coordinates: a small change of angle times a large position is a large
  // shift.)
  float pn_brush(vec2 p, float dist) {
    vec2 q = p + vec2(0.0, (pn_noise(p * 0.25) - 0.5) * 1.4);
    float coarse = 1.0 - smoothstep(25.0, 70.0, dist);
    float fine = 1.0 - smoothstep(8.0, 28.0, dist);
    return 0.5 + (pn_noise(q * vec2(0.9, 6.0)) - 0.5) * 0.6 * coarse
               + (pn_noise(q * vec2(2.1, 13.0)) - 0.5) * 0.4 * fine;
  }
`;

/** Added after the base colour is known (`diffuseColor`), before lighting. */
export const PAINT_FRAGMENT_MAIN = /* glsl */ `
  if (uPaint > 0.0) {
    vec3 wp = vPaintPos;
    // the surface's facing direction, from how the position changes across the pixel
    vec3 n = normalize(cross(dFdx(wp), dFdy(wp)));
    float dist = length(wp - cameraPosition);
    vec2 p = pn_planar(wp, n);
    vec3 c = diffuseColor.rgb;

    c *= mix(1.0, 0.9 + 0.2 * pn_brush(p, dist), uPaint);          // brush strokes
    c *= mix(1.0, 0.92 + 0.16 * pn_noise(p * 0.3), uPaint);        // uneven lime-wash

    if (abs(n.y) < 0.5) {
      // a wall: dust at its foot, up to about a metre, with a ragged top edge
      float along = abs(n.x) > abs(n.z) ? wp.z : wp.x;
      float dustTop = 0.7 + 0.6 * pn_noise(vec2(along * 0.7, 3.1));
      float dust = 1.0 - smoothstep(0.0, dustTop, wp.y);
      c = mix(c, c * vec3(0.84, 0.77, 0.68), dust * 0.75 * uPaint);
      // faint rain streaks running down from the top
      float streak = smoothstep(0.6, 0.9, pn_noise(vec2(along * 2.4, wp.y * 0.15)));
      c *= 1.0 - 0.1 * streak * uPaint * (1.0 - smoothstep(30.0, 80.0, dist));
    } else if (n.y > 0.5) {
      // the ground and flat tops: worn and repaired patches
      float worn = smoothstep(0.35, 0.75, pn_noise(wp.xz * 0.22));
      c *= mix(1.0, 0.9 + 0.2 * worn, uPaint);
    }
    diffuseColor.rgb = c;
  }
`;
