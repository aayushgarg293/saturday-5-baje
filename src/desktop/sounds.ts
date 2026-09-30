import type { AudioEngine } from "../audio/engine";
import { filter, gain, noiseSource } from "../audio/synth";

/**
 * The computer's sounds, from its little speakers either side of the CRT
 * (original, made in code: in the spirit of the era's sounds, not copies):
 *
 *   chime   the desktop coming up: a short, warm rising phrase
 *   click   a button pressed
 *   ding    a new message
 *   knock   a friend comes online (the messenger's "door")
 *   buzz    BUZZ!
 *
 * They play on the cafe's `inside` bus, not placed in 3D: you're right in
 * front of the speakers.
 */

type Sound = "chime" | "click" | "ding" | "knock" | "buzz";

export function desktopSounds(engine: AudioEngine) {
  const play = (sound: Sound) => {
    const ctx = engine.ctx;
    if (!ctx) return;
    const out = gain(ctx, 0.6);
    // the speakers: small, no deep bass
    out.connect(filter(ctx, "highpass", 180)).connect(engine.bus("inside"));
    const t = ctx.currentTime + 0.01;

    /** A soft note: a sine with a little of its octave, fading over `len`. */
    const note = (f: number, at: number, len: number, level: number) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator();
      o.frequency.value = f;
      o2.frequency.value = f * 2;
      const g = gain(ctx, 0);
      o.connect(g);
      o2.connect(gain(ctx, 0.15)).connect(g);
      g.connect(out);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, at + len);
      for (const x of [o, o2]) { x.start(at); x.stop(at + len + 0.05); }
    };

    switch (sound) {
      case "chime": {
        // a rising phrase over a held chord (E♭ major, then up to the octave)
        [311.1, 392.0, 466.2].forEach((f) => note(f, t, 2.8, 0.05));
        [622.3, 466.2, 784.0, 932.3].forEach((f, k) => note(f, t + 0.15 + k * 0.28, 1.6, 0.09));
        break;
      }
      case "click":
        note(1800, t, 0.03, 0.05);
        break;
      case "ding":
        note(1320, t, 0.5, 0.12);
        note(1760, t + 0.11, 0.7, 0.12);
        break;
      case "knock":
        // two soft knocks on wood: a low thud with a click on top
        for (const at of [t, t + 0.16]) {
          note(180, at, 0.12, 0.25);
          const n = noiseSource(ctx, "white");
          const g = gain(ctx, 0);
          n.connect(filter(ctx, "bandpass", 900, 1.5)).connect(g).connect(out);
          g.gain.setValueAtTime(0.12, at);
          g.gain.exponentialRampToValueAtTime(0.0005, at + 0.05);
          n.start(at);
          n.stop(at + 0.07);
        }
        break;
      case "buzz": {
        // a rough, rattling buzz
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = 110;
        const wobble = ctx.createOscillator();
        wobble.frequency.value = 30;
        const depth = gain(ctx, 20);
        wobble.connect(depth).connect(o.frequency);
        const g = gain(ctx, 0);
        o.connect(filter(ctx, "lowpass", 1200)).connect(g).connect(out);
        g.gain.setValueAtTime(0.12, t);
        g.gain.setValueAtTime(0.12, t + 0.45);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        o.start(t);
        wobble.start(t);
        o.stop(t + 0.55);
        wobble.stop(t + 0.55);
        break;
      }
    }
  };
  return { play };
}

export type DesktopSounds = ReturnType<typeof desktopSounds>;
