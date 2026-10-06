import { type Ctx, type Vowel, filter, gain, noiseSource, rand, voice } from "./synth";

/**
 * The radio's band: small synthesized instruments (audio/radio.ts plays the
 * songs in audio/songs.ts on them), all playing into `out`.
 *
 *   flute       soft and breathy, gliding into each note (the filmy glide)
 *   sitar       a plucked, buzzy string (the synth sitar of 2000s songs)
 *   singer      a man humming the tune on vowels ("aa", "oo"): no words
 *   whistle     the whistled tune of a 70s road song
 *   harmonium   reedy chord stabs
 *   strings     soft held chords
 *   bass        round and short
 *   dholak      the film song's drum: "dha", "ge", "na", "ti", "ka"
 *   bongo       a pair of bongos: "tak" (high), "dum" (low)
 *   tambourine  a jingle on the off-beats
 */
export type Instruments = ReturnType<typeof instruments>;

export function instruments(ctx: Ctx, out: AudioNode) {
  const env = (g: GainNode, t: number, peak: number, attack: number, len: number, release: number) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, len - release));
    g.gain.linearRampToValueAtTime(0, t + len + release);
  };
  /** Vibrato on `params` (oscillator frequencies): `rate` Hz, growing to `depth` (a fraction of `f`) over the first half-second of a long note. */
  const vibrato = (params: AudioParam[], t: number, f: number, len: number, rate: number, depth: number, end: number) => {
    const vib = ctx.createOscillator(), amount = gain(ctx, 0);
    vib.frequency.value = rate;
    vib.connect(amount);
    for (const p of params) amount.connect(p);
    amount.gain.setValueAtTime(0, t);
    amount.gain.linearRampToValueAtTime(len > 0.5 ? f * depth : 0, t + Math.min(len, 0.5));
    vib.start(t);
    vib.stop(end);
  };

  return {
    flute(t: number, f: number, len: number, from: number | null) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o2.type = "triangle";
      for (const o of [o1, o2]) {
        if (from) {
          o.frequency.setValueAtTime(from, t);
          o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
        } else o.frequency.setValueAtTime(f, t);
      }
      const end = t + len + 0.15;
      vibrato([o1.frequency, o2.frequency], t, f, len, 5.2, 0.012, end);
      const g = gain(ctx, 0);
      o1.connect(g);
      o2.connect(gain(ctx, 0.2)).connect(g);
      const breath = noiseSource(ctx, "white");
      breath.connect(filter(ctx, "bandpass", f * 2, 1.5)).connect(gain(ctx, 0.05)).connect(g);
      g.connect(out);
      env(g, t, 0.22, 0.05, len, 0.08);
      for (const o of [o1, o2]) { o.start(t); o.stop(end); }
      breath.start(t, rand(0, 3));
      breath.stop(end);
    },

    sitar(t: number, f: number, len: number) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f * 0.985, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
      const tone = filter(ctx, "lowpass", 4500, 1);
      tone.frequency.setValueAtTime(4500, t);
      tone.frequency.exponentialRampToValueAtTime(900, t + 0.35);
      const buzz = filter(ctx, "peaking", 2600, 3);
      buzz.gain.value = 6;
      const g = gain(ctx, 0);
      o.connect(tone).connect(buzz).connect(g).connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.35, len * 1.3));
      o.start(t);
      o.stop(t + Math.max(0.4, len * 1.3) + 0.05);
    },

    /**
     * The singer: a man's voice humming the tune on a vowel, sliding up or
     * down into each note from the last (as film singers did), with vibrato
     * on the long ones, and a little dip in loudness between notes so each
     * reads as a syllable.
     */
    singer(t: number, f: number, len: number, from: number | null, vowel: Vowel) {
      const v = voice(ctx, f, 1);
      if (from) {
        v.pitch.setValueAtTime(from, t);
        v.pitch.exponentialRampToValueAtTime(f, t + 0.09);
      } else {
        // (the first note of a phrase: scooped up into from just below)
        v.pitch.setValueAtTime(f * 0.97, t);
        v.pitch.exponentialRampToValueAtTime(f, t + 0.06);
      }
      const end = t + len + 0.2;
      vibrato([v.pitch], t, f, len, 5.6, 0.018, end);
      v.say(vowel, t, 0.02);
      v.level.setValueAtTime(0, t);
      v.level.linearRampToValueAtTime(1, t + 0.05);
      v.level.setValueAtTime(1, t + Math.max(0.05, len - 0.06));
      v.level.linearRampToValueAtTime(0, t + len + 0.08);
      v.output.connect(gain(ctx, 0.55)).connect(out);
      v.start(t);
      v.stop(end);
    },

    /** Whistling: an almost pure tone, sliding between notes, a fast vibrato, a breath of air. */
    whistle(t: number, f: number, len: number, from: number | null) {
      const o = ctx.createOscillator();
      if (from) {
        o.frequency.setValueAtTime(from, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      } else o.frequency.setValueAtTime(f, t);
      const end = t + len + 0.1;
      vibrato([o.frequency], t, f, len, 6.5, 0.01, end);
      const g = gain(ctx, 0);
      o.connect(g).connect(out);
      const air = noiseSource(ctx, "white");
      air.connect(filter(ctx, "bandpass", f, 8)).connect(gain(ctx, 0.08)).connect(g);
      env(g, t, 0.18, 0.02, len * 0.9, 0.04);
      o.start(t);
      o.stop(end);
      air.start(t, rand(0, 3));
      air.stop(end);
    },

    /** The harmonium: a short reedy chord (square waves, a touch out of tune with each other, so they beat). */
    harmonium(t: number, chord: number[], len: number) {
      const g = gain(ctx, 0);
      g.connect(filter(ctx, "lowpass", 2400)).connect(out);
      for (const f of chord) {
        for (const detune of [-5, 6]) {
          const o = ctx.createOscillator();
          o.type = "square";
          o.frequency.value = f * 2;
          o.detune.value = detune;
          o.connect(g);
          o.start(t);
          o.stop(t + len + 0.1);
        }
      }
      env(g, t, 0.022, 0.02, len, 0.05);
    },

    strings(t: number, chord: number[], len: number, level: number) {
      const g = gain(ctx, 0);
      g.connect(filter(ctx, "lowpass", 1600)).connect(out);
      for (const f of chord) {
        for (const detune of [-7, 7]) {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = f * 2;
          o.detune.value = detune;
          o.connect(g);
          o.start(t);
          o.stop(t + len + 0.4);
        }
      }
      env(g, t, 0.022 * level, 0.35, len, 0.35);
    },

    bass(t: number, f: number, len: number) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const g = gain(ctx, 0);
      o.connect(filter(ctx, "lowpass", 700)).connect(g).connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.02, t + len);
      g.gain.linearRampToValueAtTime(0, t + len + 0.05);
      o.start(t);
      o.stop(t + len + 0.1);
    },

    /** The dholak: the low head's "dha/ge/dhi", the high head's "na/ti", a slap's "ka". */
    dholak(t: number, stroke: string) {
      const low = stroke === "dha" || stroke === "ge" || stroke === "dhi";
      const high = stroke === "dha" || stroke === "na" || stroke === "ti" || stroke === "dhi";
      if (low) {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(stroke === "ge" ? 120 : 150, t);
        o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        const g = gain(ctx, 0);
        o.connect(g).connect(out);
        g.gain.setValueAtTime(stroke === "ge" ? 0.35 : 0.55, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t);
        o.stop(t + 0.32);
      }
      if (high) {
        const o = ctx.createOscillator();
        o.frequency.value = 540;
        const o2 = ctx.createOscillator();
        o2.type = "triangle";
        o2.frequency.value = 1090;
        const g = gain(ctx, 0);
        o.connect(g);
        o2.connect(gain(ctx, 0.4)).connect(g);
        g.connect(out);
        g.gain.setValueAtTime(stroke === "ti" ? 0.1 : 0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        for (const x of [o, o2]) { x.start(t); x.stop(t + 0.18); }
      }
      // every stroke has a little slap of skin
      const click = noiseSource(ctx, "white");
      const cg = gain(ctx, 0);
      click.connect(filter(ctx, "bandpass", stroke === "ka" ? 2500 : 3500, 1.2)).connect(cg).connect(out);
      cg.gain.setValueAtTime(stroke === "ka" ? 0.25 : 0.08, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      click.start(t, rand(0, 3));
      click.stop(t + 0.05);
    },

    /** Bongos: "tak" on the small drum, "dum" on the big one (a pitched thump and a slap of skin). */
    bongo(t: number, stroke: string) {
      const small = stroke === "tak";
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(small ? 420 : 260, t);
      o.frequency.exponentialRampToValueAtTime(small ? 360 : 210, t + 0.08);
      const g = gain(ctx, 0);
      o.connect(g).connect(out);
      g.gain.setValueAtTime(small ? 0.22 : 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (small ? 0.12 : 0.2));
      o.start(t);
      o.stop(t + 0.22);
      const slap = noiseSource(ctx, "white");
      const sg = gain(ctx, 0);
      slap.connect(filter(ctx, "bandpass", small ? 3200 : 1800, 1.5)).connect(sg).connect(out);
      sg.gain.setValueAtTime(0.07, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      slap.start(t, rand(0, 3));
      slap.stop(t + 0.04);
    },

    tambourine(t: number) {
      const n = noiseSource(ctx, "white");
      const g = gain(ctx, 0);
      n.connect(filter(ctx, "highpass", 6500)).connect(g).connect(out);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      n.start(t, rand(0, 3));
      n.stop(t + 0.08);
    },
  };
}
