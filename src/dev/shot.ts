import type { Seat } from "../core/seat";
import { CafeSounds } from "../audio/cafe";
import type { Room } from "../world/cafe/room";
import { cue, onCue } from "../core/cues";
import { StreetSounds } from "../audio/street";
import { Radio } from "../audio/radio";
import { Bed } from "../audio/bed";
import { audioLab } from "./audioLab";
import type { AudioEngine } from "../audio/engine";
import type * as THREE from "three";
import type { GameClock } from "../core/clock";
import type { Player } from "../core/player";
import type { Life } from "../world/life";
import type { Street } from "../world/street";
import { CAMERAS, type CameraSpot } from "./cameras";
import { type WalkReport, walkCheck } from "./walk";

/**
 * Dev-only tools, reachable from the browser console (and by Claude through
 * the Chrome integration):
 *
 *   await __shot('start')                                   a saved spot
 *   await __shot('x', { pos: [0, -30], yaw: 0.5, pitch: 0 }) any spot
 *   await __shot('big', 'start', { width: 1920, height: 1080 })
 *   await __shotAll()                                       every saved spot
 *   __game.step(2)                                          advance 2 seconds
 *
 * `__shot` moves the player to the spot, renders one frame at a fixed size,
 * and sends it to the dev server, which saves it as `.shots/<name>.jpg` (see
 * vite.config.ts). Claude then opens that file to look at it.
 *
 * Idea from ../sakura-crossing (its `__shot`).
 */

type ShotSize = { width?: number; height?: number };

export type GameHandle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: Player;
  /** The street's colliders and signboard positions, for scripted checks. */
  street: Street;
  /** Stalls, animals and traffic, for scripted checks. */
  life: Life;
  cafeRoom: Room;
  seat: Seat;
  /** The sound (for measuring levels: Claude can't listen). */
  audio: AudioEngine;
  /** The game's clock: set `minutes` to see another time of day (18 * 60 + 20 = 6:20 pm). */
  clock: GameClock;
  /** A point on the street: `s` metres along it, `offset` to the side (left negative): world x/z. */
  at(s: number, offset: number): { x: number; z: number };
  /** Advance the game by `seconds` without rendering. */
  step(seconds: number): void;
  /** Render one frame now. */
  render(): void;
};

declare global {
  interface Window {
    __game: GameHandle;
    __shot: (name: string, spot?: string | CameraSpot, size?: ShotSize) => Promise<unknown>;
    __shotAll: () => Promise<unknown[]>;
    __walkCheck: () => WalkReport;
    /** Render sound offline and measure it (dev/audioLab.ts). */
    __audioLab: typeof audioLab;
    /** The sound layers, for building them in `__audioLab`. */
    __audioLayers: { Bed: typeof Bed; Radio: typeof Radio; StreetSounds: typeof StreetSounds; CafeSounds: typeof CafeSounds };
    /** The game's own cue functions (importing core/cues.ts from the console can give a second copy). */
    __cues: { cue: typeof cue; onCue: typeof onCue };
  }
}

export function installDevTools(game: GameHandle) {
  window.__game = game;
  window.__walkCheck = () => walkCheck(game.player.colliders);
  window.__audioLab = audioLab;
  window.__audioLayers = { Bed, Radio, StreetSounds, CafeSounds };
  window.__cues = { cue, onCue };

  window.__shot = async (name, spot = name, size = {}) => {
    const { width = 1600, height = 900 } = size;
    const { renderer, camera, player } = game;
    // "current": shoot exactly what the camera sees now (seated at your computer, say)
    if (spot !== "current") {
      const target = typeof spot === "string" ? CAMERAS[spot] : spot;
      if (!target) throw new Error(`__shot: no saved camera called "${spot}"`);
      player.place(target.pos[0], target.pos[1], target.yaw, target.pitch ?? 0, target.floor);
      game.step(0); // lets anything that follows the player (the shadow area) catch up
    }

    // Render at the requested size, at 1:1 pixels, so every shot is comparable
    // regardless of the window or screen.
    const oldRatio = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    game.render();

    // Copy the frame straight away, before the browser clears the canvas.
    const copy = document.createElement("canvas");
    copy.width = width;
    copy.height = height;
    copy.getContext("2d")!.drawImage(renderer.domElement, 0, 0);
    const data = copy.toDataURL("image/jpeg", 0.88);

    // Put the window size back.
    renderer.setPixelRatio(oldRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    const res = await fetch("/__shot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    return res.json();
  };

  window.__shotAll = async () => {
    const results = [];
    for (const name of Object.keys(CAMERAS)) results.push(await window.__shot(name));
    return results;
  };
}
