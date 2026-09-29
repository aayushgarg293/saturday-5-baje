import * as THREE from "three";
import type { AudioEngine } from "./engine";
import { type Ctx, type Vowel, envelope, filter, gain, noiseSource, pick, rand, stopAt, voice } from "./synth";

/**
 * The layer you hear everywhere on the street, softly: a summer afternoon in
 * a small Rajasthan town.
 *
 *   the town's hum     a low rumble, and now and then a vehicle passing on a
 *                      road beyond the rooftops
 *   birds              a koel's rising "ku-oo" from a tree, pigeons cooing
 *                      on a ledge
 *   far off            a pressure cooker's whistle from a kitchen, a dog, a
 *                      horn two streets away, a hawker's call
 *
 * The one-off sounds are placed around you (from a direction, far away:
 * duller and more echoey the further), at random, so it never loops.
 *
 * (Taken out after the owner listened: the crows, which came across as a
 * "pew pew" every few seconds, and the murmur of voices, too random to be
 * pleasant.)
 */

/** How long between each kind of far-off sound, seconds (min, max). */
const EVERY = {
  koel: [25, 50],
  pigeon: [9, 22],
  cooker: [60, 120],
  dog: [25, 60],
  horn: [14, 32],
  hawker: [12, 28],
  traffic: [7, 18],
} as const;
type Kind = keyof typeof EVERY;

export class Bed {
  private next = {} as Record<Kind, number>;
  /** The hum's volume (0 silences it, for measuring the rest). */
  readonly levels: { hum: GainNode };

  constructor(private engine: AudioEngine, private ctx: Ctx) {
    const out = engine.bus("bed");
    const now = ctx.currentTime;
    for (const k of Object.keys(EVERY) as Kind[]) this.next[k] = now + rand(1, EVERY[k][1] * 0.6);

    // the town's hum: two slow rumbles, one each side, so it's wide, not a point
    const hum = gain(ctx, 1);
    hum.connect(out);
    for (const side of [-0.7, 0.7]) {
      const rumble = noiseSource(ctx, "brown");
      const pan = ctx.createStereoPanner();
      pan.pan.value = side;
      rumble.connect(filter(ctx, "lowpass", 260)).connect(gain(ctx, 0.11)).connect(pan).connect(hum);
      rumble.start(now, rand(0, 3));
    }
    // ...and the air above it: a faint wash of distant activity in the middle
    // frequencies. (Laptop speakers hardly play the rumble at all; without
    // this the street would sound thin and close.)
    const air = noiseSource(ctx, "pink");
    air.connect(filter(ctx, "bandpass", 900, 0.5)).connect(gain(ctx, 0.05)).connect(hum);
    air.start(now, rand(0, 3));
    this.levels = { hum };
  }

  /** Every frame. `player`: where you are. */
  update(dt: number, player: THREE.Vector3) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // the one-off sounds, each when its time comes
    for (const kind of Object.keys(EVERY) as Kind[]) {
      if (now < this.next[kind]) continue;
      const [a, b] = EVERY[kind];
      this.next[kind] = now + rand(a, b);
      this.play(kind, player, now + 0.05);
    }
  }

  private play(kind: Kind, player: THREE.Vector3, t: number) {
    switch (kind) {
      case "koel": return koel(this.ctx, this.around(player, 30, 60, 8, 14), t);
      case "pigeon": return pigeon(this.ctx, this.around(player, 6, 14, 6, 9), t);
      case "cooker": return cooker(this.ctx, this.around(player, 25, 45, 4, 6), t);
      case "dog": return dog(this.ctx, this.around(player, 30, 70, 0.5, 1), t);
      case "horn": return farHorn(this.ctx, this.around(player, 50, 90, 1, 1.5), t);
      case "hawker": return hawker(this.ctx, this.around(player, 18, 45, 1.5, 1.7), t);
      case "traffic": return passing(this.ctx, this.engine.bus("bed"), t);
    }
  }

  /**
   * A point `near`..`far` metres from you in a random direction, `low`..`high`
   * up, ready to connect a sound into: further away is quieter (the panner),
   * duller (a low-pass) and more echoey.
   */
  private around(player: THREE.Vector3, near: number, far: number, low: number, high: number): AudioNode {
    const a = rand(0, Math.PI * 2), d = rand(near, far);
    const x = player.x + Math.cos(a) * d, z = player.z + Math.sin(a) * d;
    const p = this.engine.place("bed", x, rand(low, high), z, 4, Math.min(0.9, d / 50));
    const dull = filter(this.ctx, "lowpass", 9000 / (1 + d / 18));
    dull.connect(p);
    return dull;
  }
}

// --- birds -----------------------------------------------------------------------------------------

/** The koel: "ku-oo", again and again, each call a little higher, the way it builds on a hot day. */
function koel(ctx: Ctx, out: AudioNode, t0: number) {
  const calls = Math.floor(rand(4, 8));
  const osc = ctx.createOscillator();
  const level = gain(ctx, 0);
  osc.connect(level).connect(gain(ctx, 0.45)).connect(out);
  let t = t0, f = rand(820, 900);
  for (let k = 0; k < calls; k++) {
    // "ku": short and lower; "oo": a longer rising note
    osc.frequency.setValueAtTime(f, t);
    envelope(level.gain, t, 0.5, 0.02, 0.08, 0.06);
    osc.frequency.setValueAtTime(f * 1.25, t + 0.2);
    osc.frequency.linearRampToValueAtTime(f * 1.42, t + 0.55);
    envelope(level.gain, t + 0.2, 0.6, 0.04, 0.25, 0.1);
    t += rand(0.9, 1.1);
    f *= 1.045;
  }
  osc.start(t0);
  stopAt(t, osc);
}

/** A pigeon on a ledge: a soft, throaty "croo-OO-oo". */
function pigeon(ctx: Ctx, out: AudioNode, t0: number) {
  const osc = ctx.createOscillator();
  const wobble = ctx.createOscillator();
  wobble.frequency.value = 28; // the throaty flutter
  const depth = gain(ctx, 12);
  wobble.connect(depth).connect(osc.frequency);
  const level = gain(ctx, 0);
  osc.connect(level).connect(filter(ctx, "lowpass", 900)).connect(gain(ctx, 0.5)).connect(out);
  const base = rand(300, 360);
  let t = t0;
  for (let k = 0; k < Math.floor(rand(1, 3)); k++) {
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 1.25, t + 0.35);
    osc.frequency.linearRampToValueAtTime(base * 0.9, t + 0.9);
    envelope(level.gain, t, 0.5, 0.12, 0.45, 0.3);
    t += rand(1.2, 1.8);
  }
  osc.start(t0);
  wobble.start(t0);
  stopAt(t, osc, wobble);
}

// --- far off ----------------------------------------------------------------------------------------

/** A pressure cooker's whistle from somebody's kitchen: a hiss that rises into a shriek, then dies. */
function cooker(ctx: Ctx, out: AudioNode, t0: number) {
  const hiss = noiseSource(ctx, "white");
  const bp = filter(ctx, "bandpass", 1800, 18);
  const level = gain(ctx, 0);
  hiss.connect(bp).connect(level).connect(gain(ctx, 2.5)).connect(out);
  const tone = ctx.createOscillator();
  const toneLevel = gain(ctx, 0);
  tone.connect(toneLevel).connect(out);
  const len = rand(1.8, 3);
  bp.frequency.setValueAtTime(1800, t0);
  bp.frequency.exponentialRampToValueAtTime(2900, t0 + 0.6);
  tone.frequency.setValueAtTime(2700, t0);
  tone.frequency.linearRampToValueAtTime(2950, t0 + len);
  envelope(level.gain, t0, 0.5, 0.4, len, 0.6);
  envelope(toneLevel.gain, t0 + 0.3, 0.05, 0.3, len - 0.2, 0.5);
  hiss.start(t0, rand(0, 3));
  tone.start(t0);
  stopAt(t0 + len + 1.3, hiss, tone);
}

/** A dog two streets away: a few barks. */
function dog(ctx: Ctx, out: AudioNode, t0: number) {
  const v = voice(ctx, rand(260, 340), 1.35);
  v.output.connect(gain(ctx, 0.8)).connect(out);
  let t = t0;
  for (let k = 0; k < Math.floor(rand(2, 5)); k++) {
    v.say("a", t, 0.01);
    v.pitch.setValueAtTime(v.pitch.value * 1.1, t);
    v.pitch.exponentialRampToValueAtTime(rand(180, 220), t + 0.15);
    envelope(v.level, t, 0.8, 0.01, 0.06, 0.1);
    v.say("u", t + 0.06, 0.05);
    t += rand(0.3, 0.6);
  }
  v.start(t0);
  v.stop(t + 0.2);
}

/** A horn from a street or two away: an auto's or a truck's two-tone "paa-paaa". */
function farHorn(ctx: Ctx, out: AudioNode, t0: number) {
  const tones = [rand(380, 440), rand(470, 540)];
  const level = gain(ctx, 0);
  level.connect(filter(ctx, "lowpass", 1400)).connect(gain(ctx, 0.35)).connect(out);
  const oscs = tones.map((f) => {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    o.connect(level);
    o.start(t0);
    return o;
  });
  const end = envelope(level.gain, t0, 0.5, 0.01, 0.18, 0.05);
  const end2 = envelope(level.gain, end + 0.08, 0.5, 0.01, rand(0.3, 0.6), 0.08);
  stopAt(end2, ...oscs);
}

/** A hawker somewhere down the street: a long, sing-song call, no words you can make out. */
function hawker(ctx: Ctx, out: AudioNode, t0: number) {
  const base = rand(150, 200);
  const v = voice(ctx, base, 1);
  v.output.connect(gain(ctx, 1.1)).connect(out);
  // two or three stretched syllables, the last held and falling: "aa-le-looo"
  const parts: [Vowel, number, number][] = pick([
    [["a", 1.15, 0.45], ["e", 1.3, 0.3], ["o", 1.0, 0.9]],
    [["a", 1.2, 0.7], ["o", 0.95, 1.0]],
    [["e", 1.1, 0.35], ["a", 1.35, 0.5], ["i", 1.1, 0.8]],
  ]);
  let t = t0;
  v.level.setValueAtTime(0, t0);
  for (const [vowel, rise, len] of parts) {
    v.say(vowel, t, 0.08);
    v.pitch.setTargetAtTime(base * rise, t, 0.06);
    v.level.setTargetAtTime(0.7, t, 0.04);
    t += len;
  }
  v.pitch.setTargetAtTime(base * 0.85, t - 0.4, 0.2);
  v.level.setTargetAtTime(0, t, 0.12);
  v.start(t0);
  v.stop(t + 0.8);
}

/** A vehicle passing on a road beyond the rooftops: a swell of rumble that moves from one side to the other. */
function passing(ctx: Ctx, out: AudioNode, t0: number) {
  const rumble = noiseSource(ctx, "pink");
  const bp = filter(ctx, "bandpass", 500, 0.8);
  const level = gain(ctx, 0);
  const pan = ctx.createStereoPanner();
  rumble.connect(bp).connect(level).connect(pan).connect(out);
  const len = rand(3, 6), from = rand(-1, 1) < 0 ? -0.9 : 0.9;
  pan.pan.setValueAtTime(from, t0);
  pan.pan.linearRampToValueAtTime(-from, t0 + len);
  bp.frequency.setValueAtTime(350, t0);
  bp.frequency.linearRampToValueAtTime(700, t0 + len / 2);
  bp.frequency.linearRampToValueAtTime(380, t0 + len);
  level.gain.setValueAtTime(0, t0);
  level.gain.linearRampToValueAtTime(rand(0.15, 0.3), t0 + len / 2);
  level.gain.linearRampToValueAtTime(0, t0 + len);
  rumble.start(t0, rand(0, 3));
  stopAt(t0 + len, rumble);
}

/** A soft-clipping curve: `drive` > 1 roughens a sound (a crow's rasp, a cheap speaker). */
export function shaper(drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(1024 * 4));
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}
