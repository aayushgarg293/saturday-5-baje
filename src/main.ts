import * as THREE from "three";
import { Input } from "./core/input";
import { Player } from "./core/player";
import { addLights } from "./render/lights";
import { PAL } from "./render/palette";
import { createRenderer, fitToWindow } from "./render/renderer";
import { buildBackdrop } from "./world/backdrop";
import { buildSigns } from "./world/signs";
import { buildStreet } from "./world/street";
import { buildWires } from "./world/wires";

/**
 * Entry point: builds the scene, then runs the frame loop.
 *
 * Every frame: read input → move the player → move the shadow area with
 * them → draw. Everything else lives in its own file; this one only connects
 * the pieces.
 */

const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
const startScreen = document.querySelector<HTMLDivElement>("#start")!;

// --- the 3D world ------------------------------------------------------------
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
// Distance haze: things fade into the warm dusty air from 40 m to 160 m away.
scene.fog = new THREE.Fog(PAL.haze, 40, 160);

// 65° field of view: wide enough to feel present, without fish-eye stretching.
// Draws up to 1200 m away, so the far hills (700 m) aren't cut off.
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1200);
fitToWindow(renderer, camera);

const lights = addLights(scene);
const street = buildStreet();
const wires = buildWires();
scene.add(street.group, buildSigns(street.signs), wires.group, buildBackdrop());

// --- the player ----------------------------------------------------------------
const input = new Input(canvas);
const player = new Player(camera, input, [...street.colliders, ...wires.colliders]);
player.place(street.spawn.x, street.spawn.z, street.spawn.yaw);

// Click to capture the mouse; the start screen shows whenever it's released.
startScreen.addEventListener("click", () => input.lock());
input.onLockChange = (locked) => {
  startScreen.hidden = locked;
};

// --- game loop ---------------------------------------------------------------------
/** Advance the game by `dt` seconds. */
function update(dt: number) {
  player.update(dt);
  lights.followPlayer(player.pos);
}

function render() {
  renderer.render(scene, camera);
}

// Dev-only tools. `import.meta.env.DEV` is true under `npm run dev` and false in
// the production build, where this whole block (and the dev files) is left out.
let afterFrame: (dt: number) => void = () => {};
if (import.meta.env.DEV) {
  const { createStats } = await import("./dev/stats");
  const { installDevTools } = await import("./dev/shot");
  const stats = createStats(renderer, player);
  input.onKeyPress = (code) => {
    if (code === "KeyC") stats.togglePosition();
  };
  afterFrame = (dt) => stats.update(dt);
  installDevTools({
    scene,
    camera,
    renderer,
    player,
    street,
    render,
    step(seconds) {
      // fixed 1/60 s steps, like real frames, so results match normal play
      for (let t = 0; t < seconds; t += 1 / 60) update(1 / 60);
      lights.followPlayer(player.pos);
    },
  });
}

const clock = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  clock.update(time);
  // Cap the step: after a pause (switching tabs) the first frame can report a
  // huge gap, and one giant step could carry the player through a wall.
  const dt = Math.min(clock.getDelta(), 0.1);
  update(dt);
  render();
  afterFrame(dt);
});
