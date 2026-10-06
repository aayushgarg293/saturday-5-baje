import * as THREE from "three";
import { makeRng } from "../core/rng";
import type { Look } from "../render/daylight";
import { flat } from "../render/toon";

/**
 * The sky: a painted gradient dome and flat cartoon clouds.
 *
 * - The DOME is a big sphere seen from inside. Its colour depends only on
 *   how high you look: dusty blue overhead, fading to a warm cream haze at the
 *   horizon, a little brighter and warmer toward the sun. It's quantised into
 *   faint bands, which reads as painted rather than photographic. The sun
 *   itself is painted on it: a flat disc with a soft halo, pale gold high up,
 *   orange-pink low down; it sets behind the hills (world/backdrop.ts draws
 *   them in front of the sky).
 * - The CLOUDS are flat cards with a cumulus shape painted on a canvas: lit
 *   cream tops over violet-grey undersides, the way cel animation shades them.
 *
 * Both follow the camera, so the sky always stays "infinitely" far away.
 * Their colours follow the time of day (`setLook`: render/daylight.ts).
 *
 * The dome is one of the two places with a hand-written shader (the other is
 * render/post.ts): a sky gradient isn't a surface that light falls on, so
 * the toon materials don't apply.
 */

const DOME_RADIUS = 1000;
/** The sun's painted size: its disc's radius and its halo's, in degrees (bigger than the real 0.27°: it has to read). */
const SUN = { disc: 1.5, halo: 4.5 };
const WHITE = new THREE.Color(0xffffff);

export type Sky = { group: THREE.Group; follow(camera: THREE.Camera): void; setLook(look: Look): void };

export function buildSky(): Sky {
  const group = new THREE.Group();
  group.name = "sky";
  const dome = buildDome();
  const clouds = buildClouds();
  group.add(dome, clouds);
  const u = (dome.material as THREE.ShaderMaterial).uniforms;
  return {
    group,
    follow(camera) {
      group.position.copy(camera.position);
    },
    setLook(look) {
      u.uTop.value.copy(look.skyTop);
      u.uMid.value.copy(look.skyMid);
      u.uHorizon.value.copy(look.skyHorizon);
      u.uSunGlow.value.copy(look.sunGlow);
      u.uSunDir.value.copy(look.toSun);
      // the disc: the sunlight's colour, lifted toward white (it's the brightest thing in the sky); it
      // fades out as it goes below the horizon (the hills hide it first)
      u.uSunColor.value.copy(look.sun).lerp(WHITE, 0.25);
      u.uSunShow.value = THREE.MathUtils.smoothstep(look.sunHeight, -2, 0.5);
      for (const card of clouds.children) ((card as THREE.Mesh).material as THREE.MeshBasicMaterial).color.copy(look.clouds);
    },
  };
}

function buildDome(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, // we're inside the sphere
    depthWrite: false,
    fog: false,
    uniforms: {
      // (set every frame from the time of day: setLook)
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunGlow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSunShow: { value: 1 },
      uSunDisc: { value: Math.cos(THREE.MathUtils.degToRad(SUN.disc)) },
      uSunHalo: { value: Math.cos(THREE.MathUtils.degToRad(SUN.halo)) },
      uBands: { value: 24 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position); // direction from the centre of the dome
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHorizon, uSunGlow, uSunDir, uSunColor;
      uniform float uBands, uSunShow, uSunDisc, uSunHalo;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0); // 0 at the horizon, 1 straight up
        // faint painted steps: mostly smooth, partly snapped to bands
        float t = mix(h, floor(h * uBands) / uBands, 0.35);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, t));
        col = mix(col, uTop, smoothstep(0.22, 0.85, t));
        // a warm glow on the sun's side of the sky, strongest low down
        float toward = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
        col = mix(col, uSunGlow, pow(toward, 3.0) * (1.0 - smoothstep(0.0, 0.5, h)) * 0.55);
        // the sun: a flat disc (a hair of softness at its edge) in a soft halo; nothing below the horizon
        float c = dot(dir, normalize(uSunDir));
        float disc = smoothstep(uSunDisc - 0.00004, uSunDisc + 0.00004, c);
        float halo = smoothstep(uSunHalo, uSunDisc, c);
        float above = smoothstep(-0.01, 0.004, dir.y);
        col = mix(col, mix(uSunGlow, uSunColor, 0.6), halo * halo * 0.45 * uSunShow * above);
        col = mix(col, uSunColor, disc * uSunShow * above);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 32, 16), material);
  dome.renderOrder = -10; // drawn first; everything else paints over it
  dome.frustumCulled = false;
  return dome;
}

/** A dozen cloud cards scattered round the sky, using a few painted shapes. */
function buildClouds(): THREE.Group {
  const clouds = new THREE.Group();
  const rng = makeRng(4242);
  const textures = [1, 2, 3, 4].map((seed) => paintCloud(seed));
  for (let i = 0; i < 13; i++) {
    const tex = textures[i % textures.length];
    const width = rng.range(140, 280);
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width * 0.45),
      flat(0xffffff, { fog: false, map: tex }),
    );
    const bearing = (i / 13) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const dist = rng.range(760, 900);
    card.position.set(Math.sin(bearing) * dist, rng.range(120, 260), -Math.cos(bearing) * dist);
    card.lookAt(0, card.position.y * 0.8, 0); // face the viewer, tilted a touch
    card.renderOrder = -9;
    card.frustumCulled = false;
    clouds.add(card);
  }
  return clouds;
}

/**
 * Paint one cumulus cloud onto a canvas: a lumpy row of circles, big in the
 * middle; the whole shape in the shade colour first, then the same circles
 * a bit smaller and shifted up in the lit colour, so a shaded rim is left
 * underneath; then a flat base.
 */
function paintCloud(seed: number): THREE.CanvasTexture {
  const rng = makeRng(seed * 97);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const base = 200; // the flat underside, in canvas pixels

  const puffs: { x: number; y: number; r: number }[] = [];
  const count = 7 + Math.floor(rng.next() * 4);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count; // 0..1 across the cloud
    const r = 34 + Math.sin(t * Math.PI) * rng.range(45, 70); // biggest in the middle
    puffs.push({ x: 40 + t * 432 + rng.range(-12, 12), y: base - r * rng.range(0.55, 0.85), r });
  }
  const drawPuffs = (colour: string, shrink: number, lift: number) => {
    ctx.fillStyle = colour;
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.r * lift, p.r * shrink, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  drawPuffs("#c9bdcd", 1, 0); // shade (violet-grey underside)
  drawPuffs("#fbf5ea", 0.9, 0.16); // lit (warm cream top)
  // cut a flat base
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(0, base, canvas.width, canvas.height - base);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
