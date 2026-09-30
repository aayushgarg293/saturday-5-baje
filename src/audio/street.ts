import * as THREE from "three";
import { type Cue, onCue } from "../core/cues";
import { SLOTS } from "../world/layout";
import { placeOnStreet } from "../world/props/batch";
import type { AudioEngine } from "./engine";
import { type Ctx, filter, gain, noiseSource, rand } from "./synth";

/**
 * Sounds that belong to things in the street, played where they happen:
 *
 *   the temple bell    each time the old woman swings its clapper
 *   bat on ball        the knock of the hit in the gali; the ball's bounces
 *   chai glasses       clinking as the chaiwala pours along the row
 *   the cycle bell     the doodhwala's "trring-trring" at anyone in his way
 *   oil sizzling       steadily, at the kachori and jalebi kadhais
 *
 * The one-off sounds come as cues (core/cues.ts) from the people and the
 * traffic. All are built from fixed-pitch partials (no sliding pitch: the
 * owner didn't like the "pew" of a falling tone).
 */

/** Cues further than this from you aren't played, metres. */
const HEARD_WITHIN = 45;

export class StreetSounds {
  private player = new THREE.Vector3();
  /** Stop listening for cues (when these sounds are thrown away, as in dev/audioLab.ts). */
  readonly dispose: () => void;

  constructor(private engine: AudioEngine, private ctx: Ctx) {
    this.dispose = onCue((name, where) => this.play(name, where));

    // the kadhais of hot oil, sizzling (positions in each stall's own frame, from props/stalls.ts)
    const kadhais = [
      { spot: SLOTS.kachoriSamosa, local: new THREE.Vector3(-0.8, 0.75, 0) },
      { spot: SLOTS.jalebi, local: new THREE.Vector3(-0.5, 1.02, 0) },
    ];
    for (const { spot, local } of kadhais) {
      const at = local.applyMatrix4(placeOnStreet(spot.s, spot.offset).matrix);
      // heard only as you pass: full near the stall, gone by 7 m
      this.sizzle(engine.place("street", at.x, at.y, at.z, 1.5, 0.05, 7));
    }
  }

  /** Every frame: remember where you are (far-off cues are skipped). */
  update(_dt: number, player: THREE.Vector3) {
    this.player.copy(player);
  }

  private play(name: Cue, where: THREE.Vector3) {
    if (where.distanceTo(this.player) > HEARD_WITHIN) return;
    const t = this.ctx.currentTime + 0.01;
    const out = (near: number, wet: number) => this.engine.place("street", where.x, where.y, where.z, near, wet);
    switch (name) {
      case "templeBell": return templeBell(this.ctx, out(2.5, 0.35), t);
      case "aartiBell": return aartiBell(this.ctx, out(1.5, 0.3), t);
      case "conch": return conch(this.ctx, out(6, 0.5), t);
      case "batHit": return batHit(this.ctx, out(2, 0.2), t);
      case "ballBounce": return ballBounce(this.ctx, out(1.5, 0.1), t);
      case "glassClink": return glassClink(this.ctx, out(1.2, 0.1), t);
      case "cycleBell": return cycleBell(this.ctx, out(2, 0.15), t);
    }
  }

  /** Hot oil: a hiss full of tiny crackles, looping (made once, see sizzleBuffer). */
  private sizzle(out: AudioNode) {
    const src = this.ctx.createBufferSource();
    src.buffer = sizzleBuffer(this.ctx);
    src.loop = true;
    src.connect(filter(this.ctx, "highpass", 1800)).connect(filter(this.ctx, "lowpass", 7000)).connect(gain(this.ctx, 0.8)).connect(out);
    src.start(this.ctx.currentTime, rand(0, 3));
  }
}

/**
 * Ringing partials: a set of steady tones (Hz), each with its own loudness
 * and time to die away (s), struck at `t`. The sound of anything metal or
 * glass struck is mostly this.
 */
function partials(ctx: Ctx, out: AudioNode, t: number, parts: [number, number, number][], level: number) {
  const g = gain(ctx, level);
  g.connect(out);
  let end = t;
  for (const [f, amp, decay] of parts) {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const a = gain(ctx, 0);
    o.connect(a).connect(g);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(amp, t + 0.003);
    a.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    o.start(t);
    o.stop(t + decay + 0.05);
    end = Math.max(end, t + decay);
  }
  return end;
}

/** A short tick of noise at `t` (the strike itself), through a band-pass at `f`. */
function tick(ctx: Ctx, out: AudioNode, t: number, f: number, level: number, length = 0.02) {
  const n = noiseSource(ctx, "white");
  const g = gain(ctx, 0);
  n.connect(filter(ctx, "bandpass", f, 1.2)).connect(g).connect(out);
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  n.start(t, rand(0, 3));
  n.stop(t + length + 0.02);
}

/**
 * A brass temple bell (ghanta): a clang, then a long shimmering ring. Its
 * partials aren't in simple ratios (that's what makes a bell a bell, not a
 * note), and each is doubled a hair apart, so they beat slowly: the shimmer.
 */
function templeBell(ctx: Ctx, out: AudioNode, t: number) {
  const f = rand(600, 640);
  const parts: [number, number, number][] = [];
  for (const [ratio, amp, decay] of [[1, 1, 3.8], [2.01, 0.35, 2.4], [2.74, 0.5, 2], [3.9, 0.25, 1.2], [5.43, 0.15, 0.8]] as const) {
    parts.push([f * ratio - 0.8, amp * 0.5, decay], [f * ratio + 0.8, amp * 0.5, decay]);
  }
  partials(ctx, out, t, parts, 0.18);
  tick(ctx, out, t, 3200, 0.2);
}

/** The aarti's little brass handbell, shaken: a small, high, quick ring (many of them, one per shake). */
function aartiBell(ctx: Ctx, out: AudioNode, t: number) {
  const f = rand(1880, 2020);
  partials(ctx, out, t, [[f, 1, 0.45], [f * 2.32, 0.4, 0.3], [f * 3.61, 0.2, 0.18]], 0.07);
}

/**
 * The conch (shankh), blown once as the evening aarti begins: one long,
 * breathy note that swells, rises a little in pitch, and falls away.
 * A few harmonics of a low note, plus the breath through it.
 */
function conch(ctx: Ctx, out: AudioNode, t: number) {
  const len = 3.2;
  const level = gain(ctx, 0);
  const tone = filter(ctx, "lowpass", 2200);
  tone.connect(level).connect(out);
  level.gain.setValueAtTime(0, t);
  level.gain.linearRampToValueAtTime(0.16, t + 0.35);
  level.gain.setValueAtTime(0.16, t + len - 0.7);
  level.gain.linearRampToValueAtTime(0, t + len);
  for (const [harmonic, amp] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.12]] as const) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(288 * harmonic, t);
    o.frequency.linearRampToValueAtTime(300 * harmonic, t + 0.8); // (the rise as the breath settles)
    const g = gain(ctx, amp * 0.3);
    o.connect(g).connect(tone);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  const breath = noiseSource(ctx, "pink");
  breath.connect(filter(ctx, "bandpass", 900, 1.2)).connect(gain(ctx, 0.35)).connect(tone);
  breath.start(t);
  breath.stop(t + len + 0.05);
}

/** Bat on ball: a dry wooden knock. */
function batHit(ctx: Ctx, out: AudioNode, t: number) {
  partials(ctx, out, t, [[520, 1, 0.07], [1180, 0.5, 0.05], [180, 0.8, 0.05]], 0.35);
  tick(ctx, out, t, 1100, 0.5, 0.04);
}

/** The tennis ball bouncing on the packed earth: a soft thud. */
function ballBounce(ctx: Ctx, out: AudioNode, t: number) {
  partials(ctx, out, t, [[210, 1, 0.06], [420, 0.3, 0.04]], 0.25);
  tick(ctx, out, t, 700, 0.15, 0.03);
}

/** A cutting-chai glass knocked: a small, bright tink. */
function glassClink(ctx: Ctx, out: AudioNode, t: number) {
  const f = rand(2900, 3300);
  partials(ctx, out, t, [[f, 1, 0.25], [f * 1.52, 0.5, 0.15], [f * 2.36, 0.25, 0.1]], 0.18);
}

/**
 * The bicycle bell: a thumb lever spins a clapper against the dome, many
 * quick strikes in a row, "trrring", twice.
 */
function cycleBell(ctx: Ctx, out: AudioNode, t0: number) {
  const f = rand(2350, 2500);
  let t = t0;
  for (let ring = 0; ring < 2; ring++) {
    for (let k = 0; k < 6; k++) {
      partials(ctx, out, t, [[f, 1, 0.5], [f * 1.58, 0.45, 0.35], [f * 2.45, 0.2, 0.2]], 0.12);
      t += 0.055;
    }
    t += 0.18;
  }
}

/**
 * Hot oil, made once: a soft hiss full of tiny pops of every size, at random,
 * about a hundred a second. Looped, it never sounds like a loop.
 */
const sizzleCache = new WeakMap<Ctx, AudioBuffer>();
function sizzleBuffer(ctx: Ctx): AudioBuffer {
  const cached = sizzleCache.get(ctx);
  if (cached) return cached;
  const rate = ctx.sampleRate, length = rate * 4;
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.05; // the hiss
  for (let pop = 0; pop < 400; pop++) {
    const at = Math.floor(Math.random() * (length - rate * 0.01));
    const size = Math.random() ** 3; // mostly small, a few big
    const len = Math.floor(rate * (0.001 + size * 0.004));
    for (let k = 0; k < len; k++) data[at + k] += (Math.random() * 2 - 1) * (0.2 + size * 0.8) * (1 - k / len);
  }
  sizzleCache.set(ctx, buffer);
  return buffer;
}
