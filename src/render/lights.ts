import * as THREE from "three";
import type { Look } from "./daylight";

/**
 * Lighting for the street, at whatever time it is (render/daylight.ts says
 * how each moment looks; `setLook` applies it every frame).
 *
 * Three lights, the classic setup for a painted anime background:
 * - the SUN, a warm directional light from the west, fairly low, so the
 *   buildings on the west side throw long shadows across the street. It
 *   sinks and reddens toward sunset, and switches off once it's down.
 * - a cool FILL from the opposite side of the sky: it's what lights the
 *   shadow sides, so shadows come out coloured (bluish-violet), not grey
 * - a HEMISPHERE light: blue-ish light from the sky above and warm light
 *   bounced up from the dusty ground, so nothing in shadow ever goes black
 *
 * Directions: +x is east, -z is north (the way the player faces at the start).
 */

/**
 * Shadows are drawn into a square "shadow map" that covers only the area
 * around the player (±SHADOW_HALF metres), and moves with them. Covering the
 * whole 120 m street at once would spread the same pixels over a far bigger
 * area and make every shadow blurry.
 */
const SHADOW_HALF = 30;
/** 4096 pixels across 60 m is ~1.5 cm per pixel: sharp enough that edges don't staircase. */
const SHADOW_MAP_SIZE = 4096;

export type Lights = {
  sun: THREE.DirectionalLight;
  /** Call every frame so the sharp shadow area stays centred on the player. */
  followPlayer(pos: THREE.Vector3): void;
  /** The time of day's light (render/daylight.ts). */
  setLook(look: Look): void;
  /**
   * Is the sun strong enough to cast shadows? Once it's set, main.ts stops
   * redrawing the shadow map (it's invisible then), saving that whole pass.
   * (Switching `castShadow` off instead would rebuild every material's
   * shader at that moment: a visible stutter.)
   */
  shadowsVisible: boolean;
};

/** Below this strength the sun's shadows can't be seen (it has set). */
const SHADOWS_OFF = 0.05;

export function addLights(scene: THREE.Scene): Lights {
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  const cam = sun.shadow.camera;
  cam.left = cam.bottom = -SHADOW_HALF;
  cam.right = cam.top = SHADOW_HALF;
  cam.near = 1;
  cam.far = 200;
  // Small offsets that stop surfaces from shadowing themselves in fine stripes
  // ("shadow acne"). 0.03 left stripes on big walls turned away from the sun.
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 2; // a slightly soft edge, like a painted shadow
  scene.add(sun, sun.target);

  // the fill shines from the opposite side of the sky, lower, and casts no shadows
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  scene.add(fill);
  const sky = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.05);
  scene.add(sky);
  const toSun = new THREE.Vector3(0, 1, 0);

  // How big one shadow-map pixel is on the ground, in metres.
  const texel = (SHADOW_HALF * 2) / SHADOW_MAP_SIZE;
  // The light's own point of view (it looks along -toSun), and its inverse (they follow the sun: setLook).
  const lightRotation = new THREE.Matrix4();
  const toLightSpace = new THREE.Matrix4();
  const centre = new THREE.Vector3();
  const origin = new THREE.Vector3();

  return {
    sun,
    shadowsVisible: true,
    setLook(look) {
      toSun.copy(look.toSun);
      // (below the horizon the sun still "shines" from just above it, but with no strength)
      if (toSun.y < 0.02) toSun.setY(0.02).normalize();
      lightRotation.lookAt(toSun, origin, THREE.Object3D.DEFAULT_UP);
      toLightSpace.copy(lightRotation).invert();
      sun.color.copy(look.sun);
      sun.intensity = look.sunStrength;
      this.shadowsVisible = look.sunStrength > SHADOWS_OFF;
      fill.color.copy(look.fill);
      fill.intensity = look.fillStrength;
      fill.position.set(-toSun.x, 0.45, -toSun.z).multiplyScalar(100);
      sky.color.copy(look.skyLight);
      sky.groundColor.copy(look.groundLight);
      sky.intensity = look.skyStrength;
    },
    followPlayer(pos) {
      /* Move the shadow area with the player, but only in whole shadow-map
       * pixels. Moving it smoothly makes shadow edges crawl and shimmer as
       * you walk, because each frame they get re-drawn onto a slightly
       * shifted pixel grid. So: convert the player's position into the
       * light's own view, round it to the pixel grid, and convert it back. */
      centre.set(pos.x, 0, pos.z).applyMatrix4(toLightSpace);
      centre.x = Math.round(centre.x / texel) * texel;
      centre.y = Math.round(centre.y / texel) * texel;
      centre.applyMatrix4(lightRotation);

      sun.target.position.copy(centre);
      sun.position.copy(centre).addScaledVector(toSun, 100);
    },
  };
}
