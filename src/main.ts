import * as THREE from "three";
import { Bed } from "./audio/bed";
import { CafeSounds } from "./audio/cafe";
import { AudioEngine } from "./audio/engine";
import { Radio } from "./audio/radio";
import { StreetSounds } from "./audio/street";
import { GameClock } from "./core/clock";
import { cue } from "./core/cues";
import { Input } from "./core/input";
import { Player } from "./core/player";
import { makeRng } from "./core/rng";
import { Seat } from "./core/seat";
import { Desktop } from "./desktop/desktop";
import { buildCafePeople } from "./people/cafePeople";
import { addLights } from "./render/lights";
import { PAL } from "./render/palette";
import { Pipeline } from "./render/post";
import { createRenderer, fitToWindow } from "./render/renderer";
import { showPrompt } from "./ui/prompt";
import { buildBackdrop } from "./world/backdrop";
import { yourSeat } from "./world/cafe/plan";
import { buildRoom } from "./world/cafe/room";
import { buildYourScreen } from "./world/cafe/yourScreen";
import { buildLife } from "./world/life";
import { buildSigns } from "./world/signs";
import { buildSky } from "./world/sky";
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
// Distance haze: things fade into the warm dusty air from 45 m to 240 m away.
// Its colour matches the sky's horizon, so the far end of the street melts into it.
scene.fog = new THREE.Fog(PAL.haze, 45, 240);

// 65° field of view: wide enough to feel present, without fish-eye stretching.
// Draws up to 1200 m away, so the far hills (700 m) aren't cut off.
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1200);
fitToWindow(renderer, camera);

const lights = addLights(scene);
const street = buildStreet();
const wires = buildWires();
const sky = buildSky();
const life = buildLife(street.people, [...street.colliders, ...wires.colliders]);
const cafeRoom = buildRoom(street.cafeFrame);
const cafePeople = buildCafePeople(street.cafeFrame, makeRng(2007));
const yourScreen = buildYourScreen(street.cafeFrame);
scene.add(cafeRoom.group, cafePeople.group, yourScreen.mesh);
scene.add(sky.group, street.group, life.group, buildSigns([...street.signs, ...life.signs, ...wires.signs]), wires.group, buildBackdrop());

// --- the player ----------------------------------------------------------------
const input = new Input(canvas);
const player = new Player(camera, input, [...street.colliders, ...wires.colliders, ...life.colliders], street.floors);
player.place(street.spawn.x, street.spawn.z, street.spawn.yaw);

// --- your seat, your computer, the time ------------------------------------------------
const gameClock = new GameClock();
const seat = new Seat(camera, player, input, yourSeat(street.cafeFrame));
seat.onSit = () => {
  // the first time you sit down, the computer dials up (and every time, it's connected after)
  yourScreen.connect();
  if (!connected) cue("modem", seat.spots.screen);
  connected = true;
};
let connected = false;
/** Up in the cafe (the only place above the street): where T can look at the clock. */
const inCafe = () => player.pos.y > 4;

// --- sound ----------------------------------------------------------------------
// Browsers only allow sound after a click, so it starts with the first click.
const audio = new AudioEngine();
let bed: Bed | null = null;
let radio: Radio | null = null;
let streetSounds: StreetSounds | null = null;
let cafeSounds: CafeSounds | null = null;
audio.onStart((ctx) => {
  bed = new Bed(audio, ctx);
  radio = new Radio(audio, ctx, life.radioAt);
  streetSounds = new StreetSounds(audio, ctx);
  cafeSounds = new CafeSounds(audio, ctx, street.cafeFrame);
});
// --- the computer's desktop ---------------------------------------------------------
// Seated and connected, a click leans you in; once close, the desktop takes
// over the view and the mouse is set free to use it. Esc leans you back.
const desktop = new Desktop(audio);
seat.onLeanIn = () => {
  desktop.show();
  document.exitPointerLock();
};
desktop.onLeave = (byClick) => {
  desktop.hide();
  seat.leanBack();
  // The mouse goes back to turning your head. Browsers only allow capturing
  // it on a click, not a key: after Esc, your next click does it (below).
  if (byClick) input.lock();
};
// Log Off, for now, just leans you back (the full log off comes later in phase 8)
desktop.onLogOff = () => {
  desktop.reset();
  desktop.onLeave(true);
};
document.addEventListener("mousedown", () => {
  if (input.locked && seat.seated && yourScreen.ready()) seat.leanIn();
});
// Back in the booth with the mouse free (after Esc on the desktop): a click on the view captures it again
canvas.addEventListener("click", () => {
  if (!input.locked && !desktop.isOpen) input.lock();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && !desktop.isOpen) audio.toggleMute();
  if (!input.locked || e.repeat) return;
  // E: sit down at your computer, or get up; T: look up at the clock
  if (e.code === "KeyE") (seat.seated ? seat.standUp() : seat.sitDown());
  if (e.code === "KeyT" && (seat.seated || inCafe())) seat.lookAtClock();
});

// Click to capture the mouse (and start the sound); the start screen shows whenever it's released.
startScreen.addEventListener("click", () => {
  audio.start();
  input.lock();
});
input.onLockChange = (locked) => {
  // (on the desktop the mouse is free on purpose: no start screen then)
  startScreen.hidden = locked || desktop.isOpen;
};

// --- game loop ---------------------------------------------------------------------
/** Advance the game by `dt` seconds. */
let time = 0;
function update(dt: number) {
  time += dt;
  gameClock.update(dt);
  player.update(dt);
  seat.update(dt); // (after the player: when seated, the seat has the camera)
  life.update(time, dt, player.pos);
  cafeRoom.update(dt);
  cafeRoom.setClock(gameClock.hours, gameClock.minute);
  yourScreen.update(dt, gameClock.label());
  desktop.setTime(gameClock.label());
  showPrompt(prompt());
  cafePeople.update(time, dt, player.pos);
  lights.followPlayer(player.pos);
  bed?.update(dt, player.pos);
  radio?.update(dt, player.pos);
  streetSounds?.update(dt, player.pos);
  cafeSounds?.update(dt, player.pos);
}

/** The hint at the bottom of the screen: what you can do right now. */
function prompt(): string | null {
  if (desktop.isOpen || seat.leaned) return null;
  if (!input.locked && seat.seated) return "[Click] to look around again";
  if (seat.seated) return `${yourScreen.ready() ? "[Click] use the computer    " : ""}[E] get up    [T] look at the clock`;
  return seat.canSit() ? "[E] sit down" : null;
}

// Frames are drawn through the post-processing pipeline (ink, colour grade, smoothing).
const pipeline = new Pipeline(renderer, scene, camera);
// A frame is now several renders; count draw calls for the whole frame, not the last one.
renderer.info.autoReset = false;

function render() {
  renderer.info.reset();
  sky.follow(camera); // the sky stays centred on the viewer
  pipeline.render();
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
    // compare the look with and without each pass
    if (code === "KeyO") pipeline.enabled.ink = !pipeline.enabled.ink;
    if (code === "KeyG") pipeline.enabled.grade = !pipeline.enabled.grade;
  };
  afterFrame = (dt) => stats.update(dt);
  Object.assign(window, { __desktop: desktop }); // (to drive the desktop from the console)
  if (new URLSearchParams(location.search).has("lineup")) {
    const { addLineup } = await import("./dev/lineup");
    addLineup(scene);
  }
  installDevTools({
    scene,
    camera,
    renderer,
    player,
    street,
    life,
    cafeRoom,
    seat,
    audio,
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
  // (while the desktop covers the view, the 3D room isn't drawn: it can't be seen)
  if (!desktop.isOpen) render();
  audio.listen(camera); // after drawing: the camera's matrix is up to date
  // Climbing the cafe's stairs, the street's sounds fade away: from the
  // doorstep (0.45 m up) to the first floor (4.8 m), the only place above it.
  audio.setIndoors(THREE.MathUtils.clamp((player.pos.y - 0.45) / (4.8 - 0.45), 0, 1));
  afterFrame(dt);
});
