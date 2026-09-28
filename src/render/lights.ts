import * as THREE from "three";
import { PAL } from "./palette";

/**
 * Lighting for the 4:30 pm street.
 *
 * Two lights, the classic setup for a painted look:
 * - the SUN, a warm directional light from the west-north-west, fairly low,
 *   so the buildings on the west side throw long shadows across the street
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
const SHADOW_MAP_SIZE = 2048;

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
  scene.add(sun, sun.target);

  scene.add(new THREE.HemisphereLight(PAL.skyLight, PAL.groundLight, 1.25));

  // Unit vector pointing from the ground toward the sun.
  const elev = THREE.MathUtils.degToRad(SUN_ELEVATION);
  const azim = THREE.MathUtils.degToRad(SUN_AZIMUTH);
  const toSun = new THREE.Vector3(
    Math.sin(azim) * Math.cos(elev), // east (+) / west (-)
    Math.sin(elev), // up
    -Math.cos(azim) * Math.cos(elev), // south (+) / north (-)
  );

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
