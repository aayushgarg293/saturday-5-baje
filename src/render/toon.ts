import * as THREE from "three";
import { PAINT_FRAGMENT_DECL, PAINT_FRAGMENT_MAIN, PAINT_VERTEX_DECL, PAINT_VERTEX_MAIN } from "./paint";
import { PAL } from "./palette";

/**
 * The toon material factory: the ONLY place in the game that makes materials.
 *
 * Normal 3D lighting fades smoothly from light to dark. A cel-shaded
 * (cartoon) look instead snaps the light into a few flat bands, like an
 * animator colouring a drawing. Three.js's `MeshToonMaterial` does that using
 * a "gradient map": a tiny strip of greys that says how bright each band is.
 *
 * On top of that we patch its shader so the darker bands are *tinted* toward
 * a cool violet instead of just going darker. That hue shift in shadow is most
 * of what makes it read as painted rather than as plain low-poly 3D.
 * (Technique from ../sakura-crossing/src/core/toon.js.)
 */

/** Brightness of each light band, 0–255, from the darkest to fully lit. */
const BANDS = {
  2: [96, 255],
  3: [92, 178, 255],
  4: [80, 142, 202, 255],
} as const;
type BandCount = keyof typeof BANDS;

const rampCache = new Map<BandCount, THREE.DataTexture>();

/** The gradient map for a number of bands: one pixel per band, no blending. */
function gradientMap(bands: BandCount): THREE.DataTexture {
  const cached = rampCache.get(bands);
  if (cached) return cached;
  const stops = BANDS[bands];
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  // Nearest filtering keeps the steps hard; smooth filtering would blur them
  // back into a gradient.
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  rampCache.set(bands, tex);
  return tex;
}

/*
 * The shadow-tint patch. Three.js builds shaders out of named snippets
 * ("chunks"). We take the toon lighting chunk and replace the one line that
 * computes how lit a pixel is, so the dark bands get multiplied by a tint.
 * If a future Three.js version changes that line, the patch is skipped and we
 * fall back to plain toon shading instead of crashing.
 */
const CHUNK = "lights_toon_pars_fragment";
const ORIGINAL_LINE =
  "vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;";
const TINTED_LINE = `
  vec3 band = getGradientIrradiance( geometryNormal, directLight.direction );
  vec3 irradiance = band * mix( uShadowTint, vec3( 1.0 ), band ) * directLight.color;`;

const originalChunk = THREE.ShaderChunk[CHUNK as keyof typeof THREE.ShaderChunk];
const patchedChunk = originalChunk.includes(ORIGINAL_LINE)
  ? "uniform vec3 uShadowTint;\n" + originalChunk.replace(ORIGINAL_LINE, TINTED_LINE)
  : null;
if (!patchedChunk) console.warn("toon.ts: shadow-tint patch not applied (Three.js changed)");

/**
 * Customise a toon material's shader just before it's compiled: add the
 * violet shadow tint (above) and the painted-surface layer (render/paint.ts).
 */
function patchToon(mat: THREE.MeshToonMaterial, tint: number, paint: number) {
  const tintUniform = { value: new THREE.Color(tint) };
  const paintUniform = { value: paint };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadowTint = tintUniform;
    shader.uniforms.uPaint = paintUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + PAINT_VERTEX_DECL)
      .replace("#include <project_vertex>", "#include <project_vertex>\n" + PAINT_VERTEX_MAIN);
    let frag = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + PAINT_FRAGMENT_DECL)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + PAINT_FRAGMENT_MAIN);
    if (patchedChunk) frag = frag.replace(`#include <${CHUNK}>`, patchedChunk);
    shader.fragmentShader = frag;
  };
  // Materials with different tints need different shaders (the paint strength
  // is just a number fed in, so it can share).
  mat.customProgramCacheKey = () => `toonTint_${tint}`;
}

export type ToonOptions = {
  color: number;
  /** How many light bands (default 3). */
  bands?: BandCount;
  /** Colour the shadow side leans toward (default: the palette's violet). */
  tint?: number;
  /** Faceted shading, one flat tone per polygon (default true). */
  flatShading?: boolean;
  /**
   * Take each part's colour from the mesh itself ("vertex colours") instead
   * of one colour for the whole material. This is what lets a whole building,
   * made of many differently-coloured parts, be drawn in one go.
   */
  vertexColors?: boolean;
  /**
   * A picture painted onto the surface, like the lettering on a signboard.
   * Materials with a picture are never shared (each sign has its own).
   */
  map?: THREE.Texture;
  /**
   * Strength of the painted-surface layer (brush strokes, weathering), 0–1.
   * Default 1; signboards use less so their lettering stays clean.
   */
  paint?: number;
  /**
   * Cut out see-through parts of the picture: pixels less opaque than this
   * aren't drawn at all (for torn posters and wall paintings). 0 = off.
   */
  alphaTest?: number;
};

const toonCache = new Map<string, THREE.MeshToonMaterial>();

/**
 * A cel-shaded material. Identical requests return the *same* material, so
 * fifty buildings painted the same colour share one material, which is
 * cheaper to draw.
 */
export function toon(opts: ToonOptions): THREE.MeshToonMaterial {
  const {
    color, bands = 3, tint = PAL.shadowTint, flatShading = true,
    vertexColors = false, map, paint = 1, alphaTest = 0,
  } = opts;
  const key = [color, bands, tint, flatShading, vertexColors, paint].join("|");
  const cached = map ? undefined : toonCache.get(key);
  if (cached) return cached;

  const mat = new THREE.MeshToonMaterial({
    color, gradientMap: gradientMap(bands), vertexColors, map: map ?? null, alphaTest,
  });
  // The renderer honours `flatShading` on any material, but Three.js's type
  // definitions don't list it for toon materials, so it's set this way.
  Object.assign(mat, { flatShading });
  patchToon(mat, tint, paint);
  if (!map) toonCache.set(key, mat);
  return mat;
}

const flatCache = new Map<string, THREE.MeshBasicMaterial>();

export type FlatOptions = {
  /**
   * Fade into the distance haze (default true). Turn off for things that are
   * already painted at their faded colour, like the far hills; otherwise the
   * haze would swallow them completely.
   */
  fog?: boolean;
  /** Take colours from the mesh's parts (see ToonOptions.vertexColors). */
  vertexColors?: boolean;
  /**
   * A picture with see-through parts (like a cloud). Drawn blended over what's
   * behind it, and it doesn't hide things behind it from the depth test.
   * Materials with a picture are never shared.
   */
  map?: THREE.Texture;
  /**
   * With a `map`: a solid picture (a computer's screen), not a see-through
   * one (by default a picture may have clear parts, like the sky's clouds).
   */
  opaque?: boolean;
};

/**
 * An unlit, single-colour material: ignores lights completely. For things
 * that should never be shaded, like far silhouettes, wires, clouds and
 * glowing signs.
 */
export function flat(color: number, opts: FlatOptions = {}): THREE.MeshBasicMaterial {
  const { fog = true, vertexColors = false, map, opaque = false } = opts;
  const key = [color, fog, vertexColors].join("|");
  const cached = map ? undefined : flatCache.get(key);
  if (cached) return cached;
  const mat = new THREE.MeshBasicMaterial({
    color, fog, vertexColors,
    ...(map ? (opaque ? { map } : { map, transparent: true, depthWrite: false }) : {}),
  });
  if (!map) flatCache.set(key, mat);
  return mat;
}

/**
 * Light that ADDS to what's behind it: a lamp's glow, a pool of light on the
 * ground, a lit window (world/evening.ts). Black adds nothing, so a lamp
 * that's off is simply coloured black. No haze (the haze would tint a glow
 * toward the sky's colour instead of fading it), and it doesn't hide what's
 * behind it (no depth written).
 */
export function glow(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff, map, fog: false, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
