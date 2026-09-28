import * as THREE from "three";
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

function applyShadowTint(mat: THREE.MeshToonMaterial, tint: number) {
  if (!patchedChunk) return;
  const uniform = { value: new THREE.Color(tint) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadowTint = uniform;
    shader.fragmentShader = shader.fragmentShader.replace(`#include <${CHUNK}>`, patchedChunk);
  };
  // Tells Three.js that materials with different tints need different shaders.
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
};

const toonCache = new Map<string, THREE.MeshToonMaterial>();

/**
 * A cel-shaded material. Identical requests return the *same* material, so
 * fifty buildings painted the same colour share one material, which is
 * cheaper to draw.
 */
export function toon(opts: ToonOptions): THREE.MeshToonMaterial {
  const { color, bands = 3, tint = PAL.shadowTint, flatShading = true } = opts;
  const key = [color, bands, tint, flatShading].join("|");
  const cached = toonCache.get(key);
  if (cached) return cached;

  const mat = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(bands) });
  // The renderer honours `flatShading` on any material, but Three.js's type
  // definitions don't list it for toon materials, so it's set this way.
  Object.assign(mat, { flatShading });
  applyShadowTint(mat, tint);
  toonCache.set(key, mat);
  return mat;
}

const flatCache = new Map<number, THREE.MeshBasicMaterial>();

/**
 * An unlit, single-colour material: ignores lights completely. For things
 * that should never be shaded, like the sky, far silhouettes and glowing signs.
 */
export function flat(color: number): THREE.MeshBasicMaterial {
  const cached = flatCache.get(color);
  if (cached) return cached;
  const mat = new THREE.MeshBasicMaterial({ color });
  flatCache.set(color, mat);
  return mat;
}
