import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

/**
 * Post-processing: how a rendered 3D frame becomes a painted-looking one.
 *
 * Instead of drawing the scene straight to the screen, it's drawn into an
 * off-screen image (colour + depth), then finished by three passes. Each
 * pass is a small program (a "shader") run once for every pixel:
 *
 *   scene ─► colour + depth
 *         ─► INK    darkens pixels where the depth jumps: silhouettes, creases
 *         ─► GRADE  the colour grade: warm lights, violet darks, gentle
 *                   saturation, vignette, paper grain
 *         ─► FXAA   smooths jagged edges
 *         ─► screen
 *
 * Technique from ../sakura-crossing/src/core/post.js.
 */

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * INK. Lines come from the *second difference* of depth: compare each pixel's
 * distance with its neighbours on both sides. On any flat surface, however
 * slanted, the three change evenly and the difference is zero; only a real
 * silhouette (depth jumps) or a crease (slope changes) makes it non-zero.
 * Outer silhouettes ink strongly; inside corners only faintly, like the
 * lighter contact lines an animator draws.
 */
const INK_FRAG = /* glsl */ `
  #include <packing>
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;          // size of one pixel, in 0–1 image units
  uniform float uNear, uFar;
  uniform float uThickness;     // line width, in pixels
  uniform float uSensitivity;   // how small a depth jump still draws a line
  uniform float uConcave;       // same, for inside corners
  uniform float uConcaveAmount; // how dark inside-corner lines are
  uniform float uFadeStart, uFadeEnd; // lines fade out between these distances (m)
  uniform vec3 uInk;
  uniform float uStrength;
  varying vec2 vUv;

  float distanceAt(vec2 uv) {
    return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar);
  }

  void main() {
    vec3 col = texture2D(tColor, vUv).rgb;
    float dc = distanceAt(vUv);
    if (dc > uFadeEnd) { gl_FragColor = vec4(col, 1.0); return; } // sky and far hills: no lines

    vec2 t = uTexel * uThickness;
    float dl = distanceAt(vUv - vec2(t.x, 0.0));
    float dr = distanceAt(vUv + vec2(t.x, 0.0));
    float du = distanceAt(vUv + vec2(0.0, t.y));
    float dd = distanceAt(vUv - vec2(0.0, t.y));

    // second difference in each direction, relative to distance
    float sx = (dl + dr - 2.0 * dc) / dc;
    float sy = (du + dd - 2.0 * dc) / dc;
    float convex = max(0.0, sx) + max(0.0, sy);
    float concave = max(0.0, -sx) + max(0.0, -sy);

    float edge = smoothstep(uSensitivity * 0.35, uSensitivity, convex);
    edge = max(edge, smoothstep(uConcave, uConcave * 3.0, concave) * uConcaveAmount);
    edge *= 1.0 - smoothstep(uFadeStart, uFadeEnd, dc);
    edge *= uStrength;

    // the line keeps a little of the colour under it, so it never looks pasted on
    vec3 line = mix(uInk, col * 0.4, 0.25);
    gl_FragColor = vec4(mix(col, line, clamp(edge, 0.0, 1.0)), 1.0);
  }
`;

/**
 * GRADE. Works on the "linear" light values the renderer produces, then
 * converts to screen colours (sRGB) at the end.
 */
const GRADE_FRAG = /* glsl */ `
  uniform sampler2D tColor;
  uniform vec3 uShadowTint, uLightTint;
  uniform float uSaturation, uLift, uWarmth, uVignette, uGrain;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 linearToSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0031308)), vec3(1.0 / 2.4)) - 0.055,
               step(0.0031308, c));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec3 c = texture2D(tColor, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));

    // split-tone: darks lean cool violet, lights lean warm cream
    float k = smoothstep(0.02, 0.6, l);
    c *= mix(uShadowTint, uLightTint, k);
    // late-afternoon warmth, strongest in the brighter tones
    c += vec3(uWarmth, uWarmth * 0.5, 0.0) * l * 0.4;
    // lift the darks a little: shadows stay readable, never crushed to black
    c += uLift * (1.0 - k);
    // slightly muted, dusty colour
    c = mix(vec3(l), c, uSaturation);
    // soft vignette: the corners darken a touch
    float r = length(vUv - 0.5) * 1.42;
    c *= 1.0 - uVignette * pow(clamp(r, 0.0, 1.0), 2.6);

    vec3 outCol = linearToSRGB(max(c, vec3(0.0)));
    // a faint, still paper grain (fixed to the screen, so it doesn't crawl)
    outCol += (hash(floor(vUv * uResolution)) - 0.5) * uGrain;
    gl_FragColor = vec4(outCol, 1.0);
  }
`;

/** FXAA: a standard quick edge-smoothing filter (runs on the final screen colours). */
const FXAA_FRAG = /* glsl */ `
  uniform sampler2D tColor;
  uniform vec2 uTexel;
  varying vec2 vUv;
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec3 cM = texture2D(tColor, vUv).rgb;
    vec3 cNW = texture2D(tColor, vUv + vec2(-uTexel.x, -uTexel.y)).rgb;
    vec3 cNE = texture2D(tColor, vUv + vec2( uTexel.x, -uTexel.y)).rgb;
    vec3 cSW = texture2D(tColor, vUv + vec2(-uTexel.x,  uTexel.y)).rgb;
    vec3 cSE = texture2D(tColor, vUv + vec2( uTexel.x,  uTexel.y)).rgb;
    float lM = luma(cM), lNW = luma(cNW), lNE = luma(cNE), lSW = luma(cSW), lSE = luma(cSE);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.25 * 0.18, 1.0 / 128.0);
    float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
    vec3 a = 0.5 * (texture2D(tColor, vUv + dir * (1.0 / 3.0 - 0.5)).rgb +
                    texture2D(tColor, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 b = a * 0.5 + 0.25 * (texture2D(tColor, vUv - dir * 0.5).rgb +
                               texture2D(tColor, vUv + dir * 0.5).rgb);
    float lB = luma(b);
    gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
  }
`;

/**
 * The colour grade: the warm, dusty 4:30 pm look. The tints multiply the
 * image, so they stay close to white: they *lean* colours, they don't darken.
 */
const GRADE = {
  shadowTint: 0xddd6f2, // the darks lean cool violet
  lightTint: 0xfff5e4, // the lights lean warm cream
  saturation: 0.95, // a touch muted: dusty, not neon
  lift: 0.03, // shadows never crushed to black
  warmth: 0.06, // extra warmth in the bright tones
  vignette: 0.18, // corners darken slightly
  grain: 0.022, // faint paper grain
};
/** The grade's tints and warmth follow the time of day (render/daylight.ts; Pipeline.setGrade). */
export type GradeLook = { gradeLight: THREE.Color; gradeShadow: THREE.Color; warmth: number };

/** The same pass doing nothing but the conversion to screen colours (grade toggled off). */
const NEUTRAL: typeof GRADE = {
  shadowTint: 0xffffff, lightTint: 0xffffff, saturation: 1, lift: 0, warmth: 0, vignette: 0, grain: 0,
};

function pass(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  return { quad: new FullScreenQuad(material), material };
}

export class Pipeline {
  /** Switch passes off to compare (dev keys O and G). */
  readonly enabled = { ink: true, grade: true };
  /** The time of day's tints (set every frame; until then, GRADE's afternoon ones). */
  private gradeLook: GradeLook | null = null;

  /** Lean the grade toward the time of day's colours (render/daylight.ts). */
  setGrade(look: GradeLook) {
    this.gradeLook = look;
  }

  private readonly sceneTarget: THREE.WebGLRenderTarget;
  private readonly inkTarget: THREE.WebGLRenderTarget;
  private readonly gradeTarget: THREE.WebGLRenderTarget;
  private readonly ink;
  private readonly grade;
  private readonly fxaa;
  private readonly size = new THREE.Vector2();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    // "Half float" keeps light values precise between passes (no banding).
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    };
    this.sceneTarget = new THREE.WebGLRenderTarget(2, 2, { ...opts, depthBuffer: true });
    // Keep the depth as a readable picture, for the ink pass.
    const depth = new THREE.DepthTexture(2, 2);
    depth.type = THREE.UnsignedIntType;
    this.sceneTarget.depthTexture = depth;
    this.inkTarget = new THREE.WebGLRenderTarget(2, 2, opts);
    this.gradeTarget = new THREE.WebGLRenderTarget(2, 2, { ...opts, type: THREE.UnsignedByteType });

    this.ink = pass(INK_FRAG, {
      tColor: { value: null },
      tDepth: { value: depth },
      uTexel: { value: new THREE.Vector2() },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uThickness: { value: 1.2 },
      uSensitivity: { value: 0.005 },
      uConcave: { value: 0.03 },
      uConcaveAmount: { value: 0.35 },
      uFadeStart: { value: 40 },
      uFadeEnd: { value: 115 },
      uInk: { value: new THREE.Color(0x2e1f18) }, // warm dark brown, not black
      uStrength: { value: 0.85 }, // "medium": clear, never solid black
    });
    this.grade = pass(GRADE_FRAG, {
      tColor: { value: null },
      uShadowTint: { value: new THREE.Color() },
      uLightTint: { value: new THREE.Color() },
      uSaturation: { value: 1 },
      uLift: { value: 0 },
      uWarmth: { value: 0 },
      uVignette: { value: 0 },
      uGrain: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
    });
    this.fxaa = pass(FXAA_FRAG, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } });
  }

  /** Match the off-screen images to the canvas's real pixel size (checked every frame, so resizes and __shot just work). */
  private fit() {
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    if (buffer.equals(this.size)) return;
    this.size.copy(buffer);
    for (const t of [this.sceneTarget, this.inkTarget, this.gradeTarget]) t.setSize(buffer.x, buffer.y);
    const texel = new THREE.Vector2(1 / buffer.x, 1 / buffer.y);
    this.ink.material.uniforms.uTexel.value.copy(texel);
    this.fxaa.material.uniforms.uTexel.value.copy(texel);
    this.grade.material.uniforms.uResolution.value.copy(buffer);
    // keep lines about the same width on screen at any resolution
    this.ink.material.uniforms.uThickness.value = Math.max(1, buffer.y / 1100) * 1.2;
  }

  render() {
    this.fit();
    const r = this.renderer;
    this.ink.material.uniforms.uNear.value = this.camera.near;
    this.ink.material.uniforms.uFar.value = this.camera.far;

    r.setRenderTarget(this.sceneTarget);
    r.render(this.scene, this.camera);
    let src = this.sceneTarget.texture;

    if (this.enabled.ink) {
      this.ink.material.uniforms.tColor.value = src;
      r.setRenderTarget(this.inkTarget);
      this.ink.quad.render(r);
      src = this.inkTarget.texture;
    }

    // With the grade off, the pass still runs with neutral settings, because it
    // also does the final conversion to screen colours.
    const g = this.enabled.grade ? GRADE : NEUTRAL;
    const u = this.grade.material.uniforms;
    u.tColor.value = src;
    u.uShadowTint.value.set(g.shadowTint);
    u.uLightTint.value.set(g.lightTint);
    u.uSaturation.value = g.saturation;
    u.uLift.value = g.lift;
    u.uWarmth.value = g.warmth;
    if (this.enabled.grade && this.gradeLook) {
      u.uShadowTint.value.copy(this.gradeLook.gradeShadow);
      u.uLightTint.value.copy(this.gradeLook.gradeLight);
      u.uWarmth.value = this.gradeLook.warmth;
    }
    u.uVignette.value = g.vignette;
    u.uGrain.value = g.grain;
    r.setRenderTarget(this.gradeTarget);
    this.grade.quad.render(r);

    this.fxaa.material.uniforms.tColor.value = this.gradeTarget.texture;
    r.setRenderTarget(null);
    this.fxaa.quad.render(r);
  }
}
