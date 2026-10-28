import * as THREE from "three";
import { viewport } from "../core/device";
import { quality } from "../core/quality";
import { PAL } from "./palette";

/**
 * The WebGL renderer: the object that turns the 3D scene into pixels on the
 * canvas.
 */

/**
 * Highest pixel ratio we render at. The MacBook Air's Retina screen is 2x, so
 * rendering at full sharpness means 4x the pixels of a normal screen. 1.5 is a
 * common balance between sharpness and speed; the stats overlay tells us if
 * we can afford more.
 */
const MAX_PIXEL_RATIO = quality.pixelRatio;

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // no built-in smoothing: frames go through our own passes (render/post.ts),
    // which end with their own edge smoothing (FXAA)
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(PAL.skyHorizon); // behind the sky dome; only seen if something goes wrong

  // Shadows: PCF gives slightly soft edges, which suits a painted look better
  // than the pixel-stepped edges of the basic mode.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/** Keep the renderer and camera matched to the window size. */
export function fitToWindow(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const resize = () => {
    // (on a phone held upright, the page is turned and the game drawn sideways: core/device.ts)
    const { width, height } = viewport();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
}
