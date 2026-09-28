import * as THREE from "three";
import { PAL } from "./palette";

/**
 * Lighting for the 4:30 pm street.
 *
 * Three lights, the classic setup for a painted anime background:
 * - the SUN, a warm directional light from the west-north-west, fairly low,
 *   so the buildings on the west side throw long shadows across the street
 * - a cool FILL from the opposite side of the sky: it's what lights the
 *   shadow sides, so shadows come out coloured (bluish-violet), not grey
 * - a HEMISPHERE light: blue-ish light from the sky above and warm light
 *   bounced up from the dusty ground, so nothing in shadow ever goes black
 *
 * Directions: +x is east, -z is north (the way the player faces at the start).
 */

/** Sun angle above the horizon, in degrees. About right for 4:30 pm in an Ajmer summer. */
const SUN_ELEVATION = 38;
/** Compass direction the sun shines from, in degrees (270 = due west). */
const SUN_AZIMUTH = 285;

/**
 * Shadows are drawn into a square "shadow map" that covers only the area
 * around the player (±SHADOW_HALF metres), and moves with them. Covering the
 * whole 120 m street at once would spread the same pixels over a far bigger
 * area and make every shadow blurry.
 */
const SHADOW_HALF = 30;
/** 4096 pixels across 60 m is ~1.5 cm per pixel: sharp enough that edges don't staircase. */
const SHADOW_MAP_SIZE = 4096;

/** Unit vector pointing from the ground toward the sun (also used by the sky's glow). */
export function sunDirection(): THREE.Vector3 {
  const elev = THREE.MathUtils.degToRad(SUN_ELEVATION);
  const azim = THREE.MathUtils.degToRad(SUN_AZIMUTH);
  return new THREE.Vector3(
    Math.sin(azim) * Math.cos(elev), // east (+) / west (-)
    Math.sin(elev), // up
    -Math.cos(azim) * Math.cos(elev), // south (+) / north (-)
  );
}

export type Lights = {
  sun: THREE.DirectionalLight;
  /** Call every frame so the sharp shadow area stays centred on the player. */
  followPlayer(pos: THREE.Vector3): void;
};

export function addLights(scene: THREE.Scene): Lights {
  const sun = new THREE.DirectionalLight(PAL.sun, 2.2);
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

  const toSun = sunDirection();

  // The fill shines from the opposite side, lower, and casts no shadows.
  const fill = new THREE.DirectionalLight(PAL.fillLight, 0.55);
  fill.position.set(-toSun.x, 0.45, -toSun.z).multiplyScalar(100);
  scene.add(fill);

  scene.add(new THREE.HemisphereLight(PAL.skyLight, PAL.groundLight, 1.05));

  // How big one shadow-map pixel is on the ground, in metres.
  const texel = (SHADOW_HALF * 2) / SHADOW_MAP_SIZE;
  // The light's own point of view (it looks along -toSun), and its inverse.
  const lightRotation = new THREE.Matrix4().lookAt(toSun, new THREE.Vector3(), THREE.Object3D.DEFAULT_UP);
  const toLightSpace = lightRotation.clone().invert();
  const centre = new THREE.Vector3();

  return {
    sun,
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
