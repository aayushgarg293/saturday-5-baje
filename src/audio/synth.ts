/**
 * Small building blocks for making sounds in code with the browser's Web
 * Audio: noise, envelopes (how a sound swells and dies away), and a "voice"
 * (a buzzing source shaped by vowel resonances, the way a throat and mouth
 * shape a voice).
 *
 * Web Audio in one paragraph: sounds are made by connecting NODES in a chain,
 * source → filters → volume → out. Sources are oscillators (a steady tone)
 * or buffers (recorded or, here, generated samples). Every setting that can
 * change over time (volume, pitch, filter frequency) is an AudioParam you
 * can schedule: "at time t, ramp to this value". Times are in seconds on
 * the audio clock, `ctx.currentTime`.
 */

/** The audio clock: a live one while playing, or an offline one (dev/audioLab.ts renders to measure levels). */
export type Ctx = BaseAudioContext;

// --- noise -------------------------------------------------------------------------

const noiseCache = new WeakMap<Ctx, Record<string, AudioBuffer>>();

/**
 * A few seconds of noise, made once and reused. "white" is hiss (all
 * frequencies), "pink" softer (like rain or a crowd far off), "brown" a deep
 * rumble (traffic, wind, the town's hum).
 */
export function noise(ctx: Ctx, kind: "white" | "pink" | "brown" = "white"): AudioBuffer {
  let cache = noiseCache.get(ctx);
  if (!cache) noiseCache.set(ctx, (cache = {}));
  if (cache[kind]) return cache[kind];
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") data[i] = white * 0.5;
    else if (kind === "pink") {
      // Paul Kellet's cheap pink filter: three leaky integrators of white noise
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    } else {
      last = (last + 0.02 * white) / 1.02; // integrate: the rumble
      data[i] = last * 3.5;
    }
  }
  return (cache[kind] = buffer);
}

/** A looping noise source (start it yourself). */
export function noiseSource(ctx: Ctx, kind: "white" | "pink" | "brown" = "white"): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, kind);
  src.loop = true;
  // start somewhere different each time, so two noises never line up
  src.loopStart = 0;
  src.loopEnd = src.buffer.duration;
  return src;
}

// --- shaping -------------------------------------------------------------------------

export function gain(ctx: Ctx, value = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

export function filter(ctx: Ctx, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

/**
 * A volume envelope on `param` starting at time `t`: rise to `peak` over
 * `attack` seconds, hold `hold`, then fade to silence over `release`.
 * Returns when it ends.
 */
export function envelope(param: AudioParam, t: number, peak: number, attack: number, hold: number, release: number): number {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
  param.setValueAtTime(Math.max(0.0001, peak), t + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return t + attack + hold + release;
}

/** Stop `nodes` (sources) at `end` and let them be cleaned up. */
export function stopAt(end: number, ...sources: AudioScheduledSourceNode[]) {
  for (const s of sources) s.stop(end + 0.05);
}

// --- voices --------------------------------------------------------------------------

/**
 * The resonances of a mouth saying a vowel (the first three "formants", Hz),
 * roughly for a man's voice. A buzzing source filtered at these peaks sounds
 * like someone saying the vowel, without any words.
 */
export const VOWELS = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  i: [270, 2290, 3010],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
} as const;
export type Vowel = keyof typeof VOWELS;

export type Voice = {
  /** The pitch (Hz) of the buzz: schedule it to make intonation. */
  pitch: AudioParam;
  /** Loudness: schedule it to make syllables. */
  level: AudioParam;
  /** Glide the mouth to a vowel at time `t`, over `glide` seconds. */
  say(vowel: Vowel, t: number, glide?: number): void;
  output: AudioNode;
  start(t: number): void;
  stop(t: number): void;
};

/**
 * A voice: a buzz (sawtooth, with a little breath noise) through three vowel
 * filters in parallel. `formantScale` > 1 for women and children (smaller
 * mouths, higher resonances).
 */
export function voice(ctx: Ctx, basePitch: number, formantScale = 1): Voice {
  const buzz = ctx.createOscillator();
  buzz.type = "sawtooth";
  buzz.frequency.value = basePitch;
  const breath = noiseSource(ctx, "white");
  const breathLevel = gain(ctx, 0.06);
  const level = gain(ctx, 0);
  const output = gain(ctx, 1);
  const formants = [0, 1, 2].map((k) => {
    const f = filter(ctx, "bandpass", VOWELS.a[k] * formantScale, [7, 9, 11][k]);
    const g = gain(ctx, [1, 0.6, 0.25][k]);
    f.connect(g).connect(output);
    return f;
  });
  buzz.connect(level);
  breath.connect(breathLevel).connect(level);
  for (const f of formants) level.connect(f);
  return {
    pitch: buzz.frequency,
    level: level.gain,
    output,
    say(vowel, t, glide = 0.05) {
      VOWELS[vowel].forEach((hz, k) => formants[k].frequency.setTargetAtTime(hz * formantScale, t, glide / 3));
    },
    start(t) {
      buzz.start(t);
      breath.start(t, Math.random() * 3);
    },
    stop(t) {
      buzz.stop(t);
      breath.stop(t);
    },
  };
}

// --- randomness ------------------------------------------------------------------------

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
