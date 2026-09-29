import type * as THREE from "three";
import { type Ctx, gain } from "./synth";

/**
 * The sound system's core.
 *
 * - The AudioContext (the browser's sound clock and mixer). Browsers only let
 *   a page make sound after the player clicks, so it starts on the start
 *   screen's click (`start`).
 * - The mix: three groups ("buses") with their own volume, so they can be
 *   balanced against each other: the everywhere layer (`bed`), the sounds
 *   placed in the street (`street`), and the radio. All go through a
 *   gentle compressor and a limiter, so layers piling up never distort.
 * - The street's echo: a short reverb, made in code, of a narrow street
 *   between walls. Sounds send a little to it; far-off ones more.
 * - The listener: your ears, moved with the camera every frame, so placed
 *   sounds come from the right side and get quieter with distance.
 * - Mute: the M key.
 */

export type Bus = "bed" | "street" | "radio";
const LEVELS: Record<Bus, number> = { bed: 0.75, street: 0.9, radio: 0.8 };

export class AudioEngine {
  ctx: Ctx | null = null;
  private buses = {} as Record<Bus, GainNode>;
  /** Send sounds here (a little) for the street's echo. */
  echo!: GainNode;
  private master!: GainNode;
  private muted = false;
  private startListeners: ((ctx: Ctx) => void)[] = [];

  /**
   * Start (or resume) the sound. Call from a click. (`offline`: render into
   * an OfflineAudioContext instead of the speakers, for measuring.)
   */
  start(offline?: OfflineAudioContext) {
    if (this.ctx) {
      if (this.ctx instanceof AudioContext) void this.ctx.resume();
      return;
    }
    const ctx = (this.ctx = offline ?? new AudioContext());
    // master: the buses → warmth → glue compression → volume → a limiter to be safe
    const mix = gain(ctx, 1);
    const warm = ctx.createBiquadFilter();
    warm.type = "highshelf";
    warm.frequency.value = 6000;
    warm.gain.value = -4; // take the edge off: an old afternoon, not a crisp recording
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.ratio.value = 2.5;
    glue.attack.value = 0.02;
    glue.release.value = 0.25;
    this.master = gain(ctx, this.muted ? 0 : 0.7);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.1;
    mix.connect(warm).connect(glue).connect(this.master).connect(limiter).connect(ctx.destination);

    for (const bus of Object.keys(LEVELS) as Bus[]) {
      this.buses[bus] = gain(ctx, LEVELS[bus]);
      this.buses[bus].connect(mix);
    }
    // the echo: a convolution reverb with a made-up "impulse" (see streetEcho)
    const reverb = ctx.createConvolver();
    reverb.buffer = streetEcho(ctx);
    this.echo = gain(ctx, 1);
    this.echo.connect(reverb).connect(gain(ctx, 0.5)).connect(mix);

    for (const f of this.startListeners) f(ctx);
  }

  /** Run `f` once the sound has started (right away if it already has). */
  onStart(f: (ctx: Ctx) => void) {
    if (this.ctx) f(this.ctx);
    else this.startListeners.push(f);
  }

  bus(name: Bus): GainNode {
    return this.buses[name];
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  /**
   * A point in the street a sound comes from. Connect the sound into the
   * returned node; it gets quieter with distance (`near`: full volume within
   * this many metres) and comes from the right direction, then goes to `bus`
   * (and a little to the echo, `wet`).
   *
   * By default it fades the way real sound does, never quite to nothing
   * (right for a bell or a bat). `reach` instead fades it out completely by
   * that many metres: for sounds that never stop (a sizzle, a hum), which
   * would otherwise hang faintly over the whole street.
   */
  place(bus: Bus, x: number, y: number, z: number, near = 2, wet = 0.2, reach?: number): PannerNode {
    const ctx = this.ctx!;
    const p = ctx.createPanner();
    p.panningModel = "equalpower"; // cheap and clear; fine for a street's worth of sounds
    if (reach) {
      p.distanceModel = "linear"; // full at `near`, silent at `reach`
      p.refDistance = near;
      p.maxDistance = reach;
      p.rolloffFactor = 1;
    } else {
      p.distanceModel = "inverse";
      p.refDistance = near;
      p.rolloffFactor = 1.1;
      p.maxDistance = 400;
    }
    setPosition(p, x, y, z);
    p.connect(this.buses[bus]);
    if (wet > 0) p.connect(gain(ctx, wet)).connect(this.echo);
    return p;
  }

  /** Move the ears to the camera. Every frame. */
  listen(camera: THREE.Camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const e = camera.matrixWorld.elements;
    // the camera looks down its −z; its up is +y (columns of its world matrix)
    const [px, py, pz] = [e[12], e[13], e[14]];
    const [fx, fy, fz] = [-e[8], -e[9], -e[10]];
    const [ux, uy, uz] = [e[4], e[5], e[6]];
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setTargetAtTime(px, t, 0.02);
      l.positionY.setTargetAtTime(py, t, 0.02);
      l.positionZ.setTargetAtTime(pz, t, 0.02);
      l.forwardX.setTargetAtTime(fx, t, 0.02);
      l.forwardY.setTargetAtTime(fy, t, 0.02);
      l.forwardZ.setTargetAtTime(fz, t, 0.02);
      l.upX.setTargetAtTime(ux, t, 0.02);
      l.upY.setTargetAtTime(uy, t, 0.02);
      l.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      // older Safari: the old, instant way
      l.setPosition(px, py, pz);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }
}

/** Move a panner (the new way where there is one, the old way in older Safari). */
export function setPosition(p: PannerNode, x: number, y: number, z: number) {
  if (p.positionX) {
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
  } else p.setPosition(x, y, z);
}

/**
 * The echo of a narrow street, made in code: a burst of noise that dies away
 * over about a second and a half, with a few distinct early bounces (the
 * walls across the street, ~10 m away: a few hundredths of a second), and
 * the high frequencies dying first (plaster and dust soak them up).
 */
function streetEcho(ctx: Ctx): AudioBuffer {
  const seconds = 1.6;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const decay = Math.exp(-t * 4.2);
      // darker as it goes: less and less of the new noise gets through
      const k = 0.15 + 0.85 * Math.exp(-t * 6);
      smooth = smooth * (1 - k) + (Math.random() * 2 - 1) * k;
      data[i] = smooth * decay * 0.6;
    }
    // early reflections off the walls
    for (const [ms, amp] of [[23, 0.5], [31, 0.35], [52, 0.3], [71, 0.2]]) {
      const i = Math.floor(((ms + (ch ? 4 : 0)) / 1000) * ctx.sampleRate);
      data[i] += amp * (ch ? 0.9 : 1);
    }
  }
  return buffer;
}
