import * as THREE from "three";
import { CricketGame } from "./activities/cricket";
import { Haircut } from "./activities/haircut";
import { PaniPuri } from "./activities/paniPuri";
import { Bed } from "./audio/bed";
import { CafeSounds } from "./audio/cafe";
import { AudioEngine } from "./audio/engine";
import { Radio } from "./audio/radio";
import { StreetSounds } from "./audio/street";
import { GameClock } from "./core/clock";
import { storySoFar } from "./core/storySoFar";
import { cue } from "./core/cues";
import { Input } from "./core/input";
import { Player } from "./core/player";
import { makeRng } from "./core/rng";
import { Seat } from "./core/seat";
import { timeOfDay } from "./core/timeOfDay";
import { charge } from "./desktop/cafeTimer";
import { Desktop } from "./desktop/desktop";
import { buildCafePeople } from "./people/cafePeople";
import { lookAt } from "./render/daylight";
import { addLights } from "./render/lights";
import { PAL } from "./render/palette";
import { Pipeline } from "./render/post";
import { createRenderer, fitToWindow } from "./render/renderer";
import { playEnding } from "./ui/ending";
import { showPrompt } from "./ui/prompt";
import { buildAreas } from "./world/areas";
import { buildBackdrop } from "./world/backdrop";
import { buildEvening } from "./world/evening";
import { buildFans } from "./world/fans";
import { buildLaundry } from "./world/laundry";
import { buildNameplates } from "./world/nameplates";
import { buildWallArt } from "./world/wallArt";
import { buildLabels } from "./world/props/labels";
import { HALL, PAY_SPOT, STAIR, STAIR_TOP, yourSeat } from "./world/cafe/plan";
import { buildOwnerScreen } from "./world/cafe/ownerScreen";
import { pcoSigns } from "./world/cafe/pco";
import { buildRoom } from "./world/cafe/room";
import { buildYourScreen } from "./world/cafe/yourScreen";
import { buildLife } from "./world/life";
import { buildSigns } from "./world/signs";
import { buildSky } from "./world/sky";
import { pointAt } from "./world/layout";
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
const backdrop = buildBackdrop();
const life = buildLife(street.people, [...street.colliders, ...wires.colliders]);
const cafeRoom = buildRoom(street.cafeFrame);
const cafePeople = buildCafePeople(street.cafeFrame, makeRng(2007));
const yourScreen = buildYourScreen(street.cafeFrame);
scene.add(cafeRoom.group, cafePeople.group, yourScreen.mesh);
const ownerScreen = buildOwnerScreen(street.cafeFrame); // (the cafe software on the owner's CRT)
scene.add(ownerScreen.mesh);
const signs = buildSigns([...street.signs, ...life.signs, ...wires.signs, ...pcoSigns(street.cafeFrame), ...street.townSigns]);
scene.add(sky.group, street.group, life.group, signs, wires.group, backdrop.group);

// only drawing what's near (world/areas.ts): each part of the town shown only within reach of it. Sorted
// once, by where things are: the buildings, their signs, the people (the crowd's groups), the animals
const areas = buildAreas();
areas.assign([...street.group.children, ...signs.children]);
for (const child of life.group.children) {
  if (child.name === "crowd") areas.assign(child.children);
  // (the stalls and parked vehicles, their plates, the moving traffic and the walkers are each one thing
  // spread along the bazaar: they go with it)
  else if (child.position.lengthSq() === 0) areas.add("bazaar", child);
  else areas.assign([child]);
}
areas.add("bazaar", wires.group); // (the bazaar's poles and wires, one mesh)

// What's along the buildings but drawn apart from them: built one batch per part of the town, so each is
// shown and hidden with its buildings (one batch for the whole town, the washing hung in the air while
// its building was hidden).
// (the washing, the fans and the lights make random choices as they go, and the nameplates and wall
// paintings are dealt out in turn: each batch is built from the whole list, keeping only its own, so
// every one comes out as it always did)
const allLamps = [...street.lamps, ...life.lamps, ...wires.lamps];
const evenings = areas.split(allLamps, (l) => l.position).map(([area, lamps]) => {
  const mine = new Set(lamps);
  const e = buildEvening(allLamps, (l) => mine.has(l)); // (the lights that come on at dusk)
  scene.add(e.group);
  areas.add(area, e.group);
  return e;
});
for (const [area, murals] of areas.split(street.murals, (m) => m.position)) {
  const mine = new Set(murals);
  const mesh = buildWallArt(street.murals, (m) => mine.has(m)); // (painted ads, warnings and chalk by the galis)
  if (mesh) { scene.add(mesh); areas.add(area, mesh); }
}
for (const [area, spots] of areas.split(street.labels, (l) => l.position)) {
  const mesh = buildLabels(spots); // (the shops' goods, printed)
  if (mesh) { scene.add(mesh); areas.add(area, mesh); }
}
for (const [area, plates] of areas.split(street.plates, (pl) => pl.position)) {
  const mine = new Set(plates);
  const mesh = buildNameplates(street.plates, (pl) => mine.has(pl)); // (the houses' nameplates and blessings)
  if (mesh) { scene.add(mesh); areas.add(area, mesh); }
}
const shopFans = areas.split(street.fans, (f) => f.position).map(([area, fans]) => {
  const mine = new Set(fans);
  const f = buildFans(street.fans, (fan) => mine.has(fan)); // (the shops' ceiling fans, turning)
  scene.add(f.mesh);
  areas.add(area, f.mesh);
  return f;
});
const laundry = areas.split(street.lines, (line) => line.a).map(([area, lines]) => {
  const mine = new Set(lines);
  const l = buildLaundry(street.lines, (line) => mine.has(line)); // (washing on the balconies and roofs, swaying, and the roof lines)
  scene.add(l.group);
  areas.add(area, l.group);
  return l;
});

// --- the player ----------------------------------------------------------------
const input = new Input(canvas);
const player = new Player(camera, input, [...street.colliders, ...wires.colliders, ...life.colliders], street.floors);
player.place(street.spawn.x, street.spawn.z, street.spawn.yaw);

// --- your seat, your computer, the time ------------------------------------------------
const gameClock = new GameClock();
const seat = new Seat(camera, player, input, yourSeat(street.cafeFrame));
// eating pani puri at the golgappa cart (activities/paniPuri.ts)
const paniPuri = new PaniPuri(camera, player, input, life.golgappa, scene);
// a haircut at the saloon (activities/haircut.ts)
const haircut = new Haircut(camera, player, input, life.saloon.you);
// batting with the kids in the gali (activities/cricket.ts)
const cricket = new CricketGame(camera, player, input, life.cricket, scene);
seat.onSit = () => {
  // the first time you sit down, the computer dials up (and every time, it's connected after; not after logging off)
  if (loggedOff) return;
  yourScreen.connect();
  if (!connected) {
    cue("modem", seat.spots.screen);
    sessionStart = gameClock.minutes; // (the cafe's timer starts)
  }
  connected = true;
};
let connected = false;
/** When your time at the computer began (game minutes), for the cafe's timer. */
let sessionStart = 0;
/** Logged off: the computer's done with (it won't connect again), and how long you used it. */
let loggedOff = false;
let visitMinutes = 0;
/** Up in the cafe (the only place above the street): where T can look at the clock. */
const inCafe = () => player.pos.y > 4;

// --- paying the owner ---------------------------------------------------------------------
// After Log Off, walk to the counter: [E] pays. Until you've paid, he won't let
// you go down the stairs (once you've used a computer, that is).
let paid = false;
const toCafe = street.cafeFrame.clone().invert();
/** Where the player is in the cafe's own frame (plan.ts's numbers). */
const cafeLocal = new THREE.Vector3();
const whereInCafe = () => cafeLocal.copy(player.pos).applyMatrix4(toCafe);
const atCounter = () => {
  const p = whereInCafe();
  return inCafe() && !seat.seated && Math.hypot(p.x - PAY_SPOT.x, p.z - PAY_SPOT.z) < 1.1;
};
const canPay = () => loggedOff && !paid && atCounter();
function pay() {
  paid = true;
  cafePeople.pay(charge(visitMinutes));
}
/** Leaving without paying: back to the top of the stairs, and he calls out (not too often). */
let lastCallOut = -99;
function stopAtTheStairs() {
  if (!connected || paid) return;
  const p = whereInCafe();
  const onStair = p.x > STAIR.x0 - 0.1 && p.x < STAIR.x1 + 0.1 && p.z > STAIR.top + 0.25 && player.pos.y < HALL.floor - 0.1;
  if (!onStair) return;
  const top = new THREE.Vector3(STAIR_TOP.x, HALL.floor, STAIR_TOP.z).applyMatrix4(street.cafeFrame);
  const counter = new THREE.Vector3(PAY_SPOT.x, HALL.floor, PAY_SPOT.z).applyMatrix4(street.cafeFrame);
  player.place(top.x, top.z, Math.atan2(-(counter.x - top.x), -(counter.z - top.z)), 0, top.y);
  if (time - lastCallOut > 4) {
    lastCallOut = time;
    cafePeople.callOut(loggedOff ? "Oye! Paise?" : "Oye! Log off karke, paise de ke jao!");
  }
}

// --- home: the end ------------------------------------------------------------------------
// Once you've paid, home's door (the house behind where you started) is the
// end: [E] there fades the screen and the sound, and the title card comes up.
let ended = false;
const HOME_REACH = 2.2;
const canGoHome = () => paid && !ended && player.pos.distanceTo(street.homeDoor) < HOME_REACH;
function goHome() {
  ended = true;
  player.frozen = true;
  audio.fadeOut(4);
  playEnding();
  document.exitPointerLock();
}

// --- sound ----------------------------------------------------------------------
// Browsers only allow sound after a click, so it starts with the first click.
const audio = new AudioEngine();
let bed: Bed | null = null;
let radio: Radio | null = null;
let saloonRadio: Radio | null = null; // (the same station, on the saloon's mirror ledge)
let streetSounds: StreetSounds | null = null;
let cafeSounds: CafeSounds | null = null;
audio.onStart((ctx) => {
  bed = new Bed(audio, ctx);
  radio = new Radio(audio, ctx, life.radioAt);
  saloonRadio = new Radio(audio, ctx, life.saloon.you.radio);
  streetSounds = new StreetSounds(audio, ctx);
  cafeSounds = new CafeSounds(audio, ctx, street.cafeFrame);
});
// --- the computer's desktop ---------------------------------------------------------
// Seated and connected, a click leans you in; once close, the desktop takes
// over the view and the mouse is set free to use it. Esc leans you back.
const desktop = new Desktop(audio);
desktop.yaaho.onTime = (minutes) => gameClock.advanceTo(minutes);
storySoFar.isDone = (task) => desktop.kit.tasks.isDone(task); // (Priya remembers, when you meet her: people/tuition.ts)
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
// Log Off: your time here is over. The computer goes back to its welcome screen
// (for the next customer), you lean back, and the cafe's timer stops: that's
// your bill (paying at the counter: phase 9).
desktop.onLogOff = () => {
  loggedOff = true;
  visitMinutes = gameClock.minutes - sessionStart;
  desktop.reset();
  desktop.hide();
  seat.leanBack();
  yourScreen.logOff();
  input.lock(); // (may be refused, after the wait: then a click on the view does it)
};
document.addEventListener("mousedown", () => {
  if (input.locked && paniPuri.active) paniPuri.click();
  if (input.locked && cricket.active) cricket.click();
  if (input.locked && seat.seated && yourScreen.ready()) seat.leanIn();
});
// Back in the booth with the mouse free (after Esc on the desktop): a click on the view captures it again
canvas.addEventListener("click", () => {
  if (!input.locked && !desktop.isOpen) input.lock();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && !desktop.isOpen) audio.toggleMute();
  if (!input.locked || e.repeat) return;
  if (paniPuri.key(e.code)) return; // (at the golgappa cart, the keys are for eating)
  if (haircut.key(e.code)) return; // (in the barber's chair, the keys are for the barber)
  if (cricket.key(e.code)) return; // (at the crease, Space swings)
  // E: sit down at your computer, or get up; T: look up at the clock
  if (e.code === "KeyE") {
    if (paniPuri.canStart()) paniPuri.start();
    else if (haircut.canStart()) haircut.start();
    else if (cricket.canStart()) cricket.start();
    else if (canGoHome()) goHome();
    else if (canPay()) pay();
    else if (seat.seated) seat.standUp();
    else if (seat.canSit()) seat.sitDown();
    else {
      // someone else's booth (or an empty one that isn't yours): they, or the owner, tell you
      const other = cafePeople.boothNear(player.pos);
      if (other !== null) cafePeople.tryBooth(other);
    }
  }
  if (e.code === "KeyT" && (seat.seated || inCafe())) seat.lookAtClock();
});

// Click to capture the mouse (and start the sound); the start screen shows whenever it's released.
startScreen.addEventListener("click", () => {
  audio.start();
  input.lock();
});
input.onLockChange = (locked) => {
  // (on the desktop the mouse is free on purpose: no start screen then; nor at the end)
  startScreen.hidden = locked || desktop.isOpen || ended;
};

// --- game loop ---------------------------------------------------------------------
/** Advance the game by `dt` seconds. */
let time = 0;
function update(dt: number) {
  time += dt;
  gameClock.storyDriven = seat.seated; // (at the desk, the story moves the clock)
  gameClock.update(dt);
  player.update(dt);
  stopAtTheStairs();
  seat.update(dt); // (after the player: when seated, the seat has the camera)
  paniPuri.update(dt); // (at the cart, it has the camera)
  haircut.update(dt); // (in the barber's chair, it has the camera)
  cricket.update(dt); // (at the crease, it has the camera)
  areas.update(player.pos); // (show the parts of the town you're near)
  life.update(time, dt, player.pos);
  cafeRoom.update(dt);
  for (const f of shopFans) f.update(dt);
  for (const l of laundry) l.update(time);
  cafeRoom.setClock(gameClock.hours, gameClock.minute);
  street.chowk.setClock(gameClock.hours, gameClock.minute); // (the clock tower keeps the same time)
  yourScreen.update(dt, gameClock.label());
  desktop.update(dt);
  desktop.setTime(gameClock.label());
  if (connected && !loggedOff) desktop.setUsed(gameClock.minutes - sessionStart);
  ownerScreen.update(gameClock.minutes, { connected, loggedOff, paid, used: loggedOff ? visitMinutes : connected ? gameClock.minutes - sessionStart : 0 });
  showPrompt(prompt());
  cafePeople.update(time, dt, player.pos);
  lights.followPlayer(player.pos);
  bed?.update(dt, player.pos);
  radio?.update(dt, player.pos);
  saloonRadio?.update(dt, player.pos);
  streetSounds?.update(dt, player.pos);
  cafeSounds?.update(dt, player.pos);
  applyTimeOfDay();
}

/** The light, the sky, the haze and the grade follow the clock (render/daylight.ts). */
function applyTimeOfDay() {
  const look = lookAt(gameClock.minutes);
  timeOfDay.minutes = gameClock.minutes;
  timeOfDay.evening = look.evening;
  lights.setLook(look);
  sky.setLook(look);
  backdrop.setLook(look);
  (scene.fog as THREE.Fog).color.copy(look.haze);
  pipeline.setGrade(look);
  for (const e of evenings) e.update(gameClock.minutes, look.evening, time);
  // once the sun is down its shadows can't be seen: stop redrawing them
  renderer.shadowMap.autoUpdate = lights.shadowsVisible;
}

/** The hint at the bottom of the screen: what you can do right now. */
function prompt(): string | null {
  if (ended) return null;
  if (desktop.isOpen || seat.leaned) return null;
  if (paniPuri.active) return paniPuri.prompt();
  if (haircut.active || haircut.canStart()) return haircut.prompt();
  if (cricket.active || cricket.canStart()) return cricket.prompt();
  if (paniPuri.canStart()) return "[E] pani puri khao (₹10 mein 6)";
  if (!input.locked && seat.seated) return "[Click] to look around again";
  if (seat.seated && loggedOff) return paid ? "[E] get up" : `[E] get up    (₹${charge(visitMinutes)} to pay at the counter)`;
  if (canPay()) return `[E] pay ₹${charge(visitMinutes)}`;
  if (canGoHome()) return "[E] go home";
  if (seat.seated) return `${yourScreen.ready() ? "[Click] use the computer    " : ""}[E] get up    [T] look at the clock`;
  if (seat.canSit()) return "[E] sit down";
  const other = cafePeople.boothNear(player.pos);
  return other !== null ? `Booth ${other}    [E] sit down` : null;
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
    if (desktop.isOpen) return; // (keys on the desktop are for typing)
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
    clock: gameClock,
    at: pointAt,
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
