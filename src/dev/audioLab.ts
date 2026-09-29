import * as THREE from "three";
import { AudioEngine } from "../audio/engine";
import { pointAt, yawAlong } from "../world/layout";

/**
 * Measuring the sound, for Claude, who can't hear it.
 *
 * Renders some seconds of sound OFFLINE (into memory, faster than real
 * time, nothing comes out of the speakers), standing still at a spot on the
 * street, and reports how loud each second is and whether anything clipped
 * (went over full scale, which sounds like crackly distortion).
 *
 *   await __audioLab({ seconds: 20, s: 56, layers: (engine, ctx) => new Bed(engine, ctx) })
 *
 * `during(ctx, player)` runs just before rendering: schedule things there,
 * e.g. fire cues (core/cues.ts) near the player to measure one sound.
 *
 * Loudness is in dBFS: 0 is the loudest possible, −20 is loud music, −40
 * quiet, below −60 near silence.
 */

type Layer = { update(dt: number, player: THREE.Vector3): void; dispose?: () => void };

export type AudioReport = {
  /** Loudness of each second, dBFS. */
  perSecond: number[];
  /** The loudest single sample (1 = full scale). */
  peak: number;
  /** How many samples were at or over full scale. */
  clipped: number;
};

export async function audioLab(opts: {
  seconds?: number;
  /** Where to stand: metres along the street, and to the side. */
  s?: number;
  offset?: number;
  /** Or exactly here (world position of the ears; the cafe is upstairs). */
  at?: THREE.Vector3;
  layers: (engine: AudioEngine, ctx: OfflineAudioContext) => Layer[] | Layer;
  during?: (ctx: OfflineAudioContext, player: THREE.Vector3) => void;
}): Promise<AudioReport> {
  const seconds = opts.seconds ?? 20;
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, rate * seconds, rate);
  const engine = new AudioEngine();
  engine.start(ctx);

  // stand at the spot, looking up the street
  const at = pointAt(opts.s ?? 56, opts.offset ?? 0);
  const player = opts.at ? opts.at.clone() : new THREE.Vector3(at.x, 1.6, at.z);
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(player);
  camera.rotation.set(0, yawAlong(opts.s ?? 56), 0, "YXZ");
  camera.updateMatrixWorld();
  engine.listen(camera);

  const made = opts.layers(engine, ctx);
  const layers = Array.isArray(made) ? made : [made];
  // Offline rendering runs ahead on its own; pause it every quarter second
  // to let the layers schedule what comes next, as the game's frames would.
  const STEP = 0.25;
  for (const l of layers) l.update(STEP, player);
  opts.during?.(ctx, player);
  for (let t = STEP; t < seconds; t += STEP) {
    void ctx.suspend(t).then(() => {
      for (const l of layers) l.update(STEP, player);
      void ctx.resume();
    });
  }
  const buffer = await ctx.startRendering();
  for (const l of layers) l.dispose?.();

  const perSecond: number[] = [];
  let peak = 0, clipped = 0;
  for (let sec = 0; sec < seconds; sec++) {
    let sum = 0, n = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = sec * rate; i < (sec + 1) * rate; i++) {
        const x = data[i];
        sum += x * x;
        n++;
        const a = Math.abs(x);
        if (a > peak) peak = a;
        if (a >= 0.999) clipped++;
      }
    }
    perSecond.push(+(10 * Math.log10(sum / n + 1e-12)).toFixed(1));
  }
  return { perSecond, peak: +peak.toFixed(3), clipped };
}
