import type * as THREE from "three";

/**
 * The speed notes, for the owner's speed check: the built game, opened with
 * `?stats` (main.ts), keeps notes of how fast it runs as you play, so nobody
 * has to read numbers off the screen. Every 20 seconds (and when the page
 * closes) it sends them to the preview server, which saves them in
 * `.shots/speed-<when started>.json` (vite.config.ts) for Claude to read.
 *
 *   by place     for each part of the town (world/areas.ts), how long you
 *                were there, the average and the lowest frame rate, the
 *                worst single frame, the most draw calls
 *   slow moments each half second that was slow (under 45 fps, or a frame
 *                over 40 ms): when on the game clock, where, what it cost
 *   the machine  the screen, the pixel ratio, the graphics chip
 */

type Place = { seconds: number; frames: number; lowestFps: number; worstMs: number; mostDraws: number };
type SlowMoment = { clock: string; place: string; fps: number; worstMs: number; draws: number; at: [number, number] };

const SLOW_FPS = 45, SLOW_FRAME = 0.04, SEND_EVERY = 20, MAX_MOMENTS = 80;

export function createSpeedLog(renderer: THREE.WebGLRenderer, where: () => { place: string; x: number; z: number }, clockMinutes: () => number) {
  const started = new Date();
  const id = started.toISOString().replace(/[:.]/g, "-");
  const places: Record<string, Place> = {};
  const moments: SlowMoment[] = [];
  let frames = 0, elapsed = 0, worst = 0, sinceSent = 0;

  const gl = renderer.getContext();
  const chip = (() => {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
  })();
  const machine = {
    screen: `${screen.width}×${screen.height}`, window: `${innerWidth}×${innerHeight}`,
    devicePixelRatio, rendererPixelRatio: renderer.getPixelRatio(), chip, browser: navigator.userAgent,
  };
  const clockText = () => {
    const m = clockMinutes();
    return `${Math.floor(m / 60) % 12 || 12}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
  };

  function send(beacon = false) {
    const body = JSON.stringify({ started: started.toISOString(), playedSeconds: Math.round((Date.now() - started.getTime()) / 1000), machine, places, slowMoments: moments });
    const url = `__speed?id=${id}`;
    if (beacon) navigator.sendBeacon(url, body);
    else void fetch(url, { method: "POST", body }).catch(() => {});
  }
  addEventListener("pagehide", () => send(true));

  return {
    /** Every frame, after drawing. */
    update(dt: number) {
      frames++;
      elapsed += dt;
      sinceSent += dt;
      worst = Math.max(worst, dt);
      if (elapsed < 0.5) return;
      const fps = frames / elapsed, draws = renderer.info.render.calls;
      const { place, x, z } = where();
      const p = (places[place] ??= { seconds: 0, frames: 0, lowestFps: Infinity, worstMs: 0, mostDraws: 0 });
      p.seconds += elapsed;
      p.frames += frames;
      p.lowestFps = Math.min(p.lowestFps, Math.round(fps));
      p.worstMs = Math.max(p.worstMs, Math.round(worst * 1000));
      p.mostDraws = Math.max(p.mostDraws, draws);
      if ((fps < SLOW_FPS || worst > SLOW_FRAME) && moments.length < MAX_MOMENTS) {
        moments.push({ clock: clockText(), place, fps: Math.round(fps), worstMs: Math.round(worst * 1000), draws, at: [Math.round(x), Math.round(z)] });
      }
      frames = 0;
      elapsed = 0;
      worst = 0;
      if (sinceSent > SEND_EVERY) {
        sinceSent = 0;
        send();
      }
    },
  };
}
