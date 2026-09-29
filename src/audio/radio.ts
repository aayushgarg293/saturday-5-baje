import type * as THREE from "three";
import type { AudioEngine } from "./engine";
import { type Ctx, filter, gain, noiseSource, rand } from "./synth";

/**
 * The transistor radio on the chai tapri's counter, playing an original
 * mid-2000s film song (instrumental, as the radio often played between
 * announcements).
 *
 * THE SONG is written below as note data, so it can be read and changed:
 * each part is a string of notes, "name+octave:length in beats", bars
 * separated by "|", "-" for a rest. 100 beats a minute, D minor, with the
 * raised C# of the harmonic minor that gives film songs their flavour.
 *
 *   intro (4 bars)      strings, the flute plays the hook
 *   verse (8)           the flute sings the tune; dholak, bass, strings
 *   chorus (8)          the hook on flute and a plucked sitar-like line,
 *                       fuller drums with a tambourine
 *   interlude (4)       a sitar riff
 *   verse, chorus again, then round to the intro: about 95 seconds a loop
 *
 * THE RADIO: everything goes through a small speaker (no deep bass, no
 * sparkle, a little grit) with the faintest hiss, placed on the counter.
 * It's only scheduled while you're within earshot; the song carries on
 * "on air" either way, so it's always somewhere in the middle.
 */

const BPM = 100;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
/** Radio heard up to this far, metres (beyond, nothing is scheduled). */
const EARSHOT = 55;

// --- the song -----------------------------------------------------------------------------------

/** The hook: the tune everyone knows by the second chorus. */
const HOOK = "D5:1.5 C5:.5 A4:1 G4:.5 A4:.5 | Bb4:1 A4:.5 G4:.5 F4:1 E4:1 | F4:.5 G4:.5 A4:1 C#5:1 D5:1 | E5:.5 D5:.5 C#5:.5 A4:.5 D5:2";
const HOOK_END = "D5:1.5 C5:.5 A4:1 G4:.5 A4:.5 | Bb4:1 A4:.5 G4:.5 F4:1 E4:1 | F4:.5 G4:.5 A4:1 Bb4:.5 A4:.5 G4:1 | F4:.5 E4:.5 C#4:1 D4:2";
const VERSE =
  "D4:1 F4:1 A4:1.5 G4:.5 | F4:1 E4:.5 D4:.5 E4:2 | E4:1 G4:1 C5:1.5 Bb4:.5 | A4:1 G4:.5 F4:.5 G4:2 | " +
  "A4:1 A4:.5 Bb4:.5 C5:1 D5:1 | C5:.5 Bb4:.5 A4:1 G4:2 | F4:1 G4:.5 A4:.5 Bb4:1 A4:1 | G4:.5 F4:.5 E4:1 D4:2";
const RIFF =
  "D5:.5 A4:.5 F4:.5 A4:.5 D5:.5 A4:.5 F4:.5 A4:.5 | C5:.5 G4:.5 E4:.5 G4:.5 C5:.5 G4:.5 E4:.5 G4:.5 | " +
  "Bb4:.5 F4:.5 D4:.5 F4:.5 Bb4:.5 F4:.5 D4:.5 F4:.5 | A4:.5 E4:.5 C#4:.5 E4:.5 A4:.5 C#5:.5 E5:.5 C#5:.5";

/** Chords, one per bar. */
const CHORDS: Record<string, string[]> = {
  Dm: ["D3", "F3", "A3"], Gm: ["G3", "Bb3", "D4"], C: ["C3", "E3", "G3"],
  Bb: ["Bb2", "D3", "F3"], A: ["A2", "C#3", "E3"],
};

/** How the drums play, one bar of eighths: kaherwa, the film song's everyday groove. */
const DRUMS = {
  soft: ["dha", "", "", "", "na", "", "", ""],
  kaherwa: ["dha", "ge", "na", "ti", "na", "ka", "dhi", "na"],
  fill: ["dha", "na", "dha", "na", "ti", "ti", "dha", "dha"],
} as const;

type Section = {
  bars: number;
  chords: (keyof typeof CHORDS)[];
  /** Tunes, and who plays them. */
  flute?: string;
  sitar?: string;
  drums: keyof typeof DRUMS;
  tambourine?: boolean;
  /** String pad loudness (0–1). */
  strings: number;
};

const SONG: Section[] = [
  { bars: 4, chords: ["Dm", "Gm", "A", "Dm"], flute: HOOK, drums: "soft", strings: 0.8 },
  { bars: 8, chords: ["Dm", "Dm", "C", "C", "Bb", "C", "Dm", "A"], flute: VERSE, drums: "kaherwa", strings: 0.5 },
  { bars: 8, chords: ["Dm", "Gm", "A", "Dm", "Dm", "Gm", "Bb", "A"], flute: HOOK + " | " + HOOK_END, sitar: HOOK + " | " + HOOK_END, drums: "kaherwa", tambourine: true, strings: 1 },
  { bars: 4, chords: ["Dm", "C", "Bb", "A"], sitar: RIFF, drums: "kaherwa", strings: 0.6 },
  { bars: 8, chords: ["Dm", "Dm", "C", "C", "Bb", "C", "Dm", "A"], flute: VERSE, drums: "kaherwa", strings: 0.5 },
  { bars: 8, chords: ["Dm", "Gm", "A", "Dm", "Dm", "Gm", "Bb", "A"], flute: HOOK + " | " + HOOK_END, sitar: HOOK + " | " + HOOK_END, drums: "kaherwa", tambourine: true, strings: 1 },
];

// --- turning the song into timed events ---------------------------------------------------------

type Event = { at: number; play: (voices: Instruments, t: number) => void };

const NOTE_INDEX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

/** "C#5" → its frequency, Hz (A4 = 440). */
export function hz(note: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(note);
  if (!m) throw new Error(`not a note: ${note}`);
  const midi = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** A tune string → notes with start (beats from the tune's start), length and pitch. */
function parseTune(tune: string): { beat: number; len: number; f: number | null }[] {
  const notes: { beat: number; len: number; f: number | null }[] = [];
  let beat = 0;
  for (const token of tune.split(/\s+/)) {
    if (!token || token === "|") continue;
    const [name, len] = token.split(":");
    const beats = Number(len);
    notes.push({ beat, len: beats, f: name === "-" ? null : hz(name) });
    beat += beats;
  }
  return notes;
}

/** The whole song as a list of events in time order, and its length in seconds. */
function compose(): { events: Event[]; length: number } {
  const events: Event[] = [];
  let bar0 = 0;
  SONG.forEach((sec) => {
    const start = bar0 * BAR;
    // the tunes
    for (const [who, tune] of [["flute", sec.flute], ["sitar", sec.sitar]] as const) {
      if (!tune) continue;
      let prev: number | null = null;
      for (const n of parseTune(tune)) {
        if (n.f === null) { prev = null; continue; }
        const from = prev, f = n.f, len = n.len * BEAT;
        events.push({ at: start + n.beat * BEAT, play: (v, t) => (who === "flute" ? v.flute(t, f, len, from) : v.sitar(t, f, len)) });
        prev = f;
      }
    }
    for (let b = 0; b < sec.bars; b++) {
      const barStart = start + b * BAR;
      const chord = CHORDS[sec.chords[b]].map(hz);
      const root = chord[0];
      // strings hold the chord for the bar; the bass walks root – root – fifth – root
      events.push({ at: barStart, play: (v, t) => v.strings(t, chord, BAR * 0.98, sec.strings) });
      for (const [beat, mult, len] of [[0, 0.5, 1.4], [1.5, 0.5, 0.45], [2, 0.75, 0.9], [3, 0.5, 0.9]] as const) {
        events.push({ at: barStart + beat * BEAT, play: (v, t) => v.bass(t, root * mult * 2, len * BEAT) });
      }
      // drums: a fill on the last bar of each section (except the soft intro)
      const pattern = b === sec.bars - 1 && sec.drums !== "soft" ? DRUMS.fill : DRUMS[sec.drums];
      pattern.forEach((stroke, k) => {
        if (stroke) events.push({ at: barStart + k * BEAT * 0.5, play: (v, t) => v.dholak(t, stroke) });
        if (sec.tambourine && k % 2 === 1) events.push({ at: barStart + k * BEAT * 0.5, play: (v, t) => v.tambourine(t) });
      });
    }
    bar0 += sec.bars;
  });
  events.sort((a, b) => a.at - b.at);
  return { events, length: bar0 * BAR };
}

// --- the instruments ----------------------------------------------------------------------------

type Instruments = ReturnType<typeof instruments>;

/** Small synthesized instruments, all playing into `out`. */
function instruments(ctx: Ctx, out: AudioNode) {
  const env = (g: GainNode, t: number, peak: number, attack: number, len: number, release: number) => {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, len - release));
    g.gain.linearRampToValueAtTime(0, t + len + release);
  };

  return {
    /** The flute: soft and breathy, sliding into each note from the last (the filmy glide), vibrato as it holds. */
    flute(t: number, f: number, len: number, from: number | null) {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o2.type = "triangle";
      for (const o of [o1, o2]) {
        if (from) {
          o.frequency.setValueAtTime(from, t);
          o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
        } else o.frequency.setValueAtTime(f, t);
      }
      const vib = ctx.createOscillator(), vibDepth = gain(ctx, 0);
      vib.frequency.value = 5.2;
      vib.connect(vibDepth);
      vibDepth.connect(o1.frequency);
      vibDepth.connect(o2.frequency);
      vibDepth.gain.setValueAtTime(0, t);
      vibDepth.gain.linearRampToValueAtTime(len > 0.5 ? f * 0.012 : 0, t + Math.min(len, 0.5));
      const g = gain(ctx, 0);
      o1.connect(g);
      o2.connect(gain(ctx, 0.2)).connect(g);
      const breath = noiseSource(ctx, "white");
      breath.connect(filter(ctx, "bandpass", f * 2, 1.5)).connect(gain(ctx, 0.05)).connect(g);
      g.connect(out);
      env(g, t, 0.22, 0.05, len, 0.08);
      const end = t + len + 0.15;
      for (const o of [o1, o2, vib]) { o.start(t); o.stop(end); }
      breath.start(t, rand(0, 3));
      breath.stop(end);
    },

    /** A plucked, buzzy string: bright at the pluck, mellowing as it rings (a synth sitar, as the 2000s songs used). */
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

    /** Soft strings holding the chord: detuned saws, slow to swell. */
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

    /** The bass: round and short. */
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

    /** The dholak: the low head's "dha/ge", the high head's "na/ti", a slap's "ka". */
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

    /** A tambourine's jingle on the off-beats. */
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

// --- the radio ------------------------------------------------------------------------------------

export class Radio {
  private song = compose();
  private voices: Instruments;
  /** When the song (its first loop) began, on the audio clock. */
  private startedAt: number;
  /** Everything before this time (audio clock) has been scheduled. */
  private scheduledUntil: number;
  private position: THREE.Vector3;

  constructor(engine: AudioEngine, private ctx: Ctx, position: THREE.Vector3) {
    this.position = position.clone();
    // the small speaker: no deep bass, no sparkle, a bump in the middle, a little grit
    const input = gain(ctx, 1);
    const drive = ctx.createWaveShaper();
    const curve = new Float32Array(new ArrayBuffer(1024 * 4));
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8);
    }
    drive.curve = curve;
    const speaker = engine.place("radio", position.x, position.y, position.z, 1.6, 0.15);
    const mid = filter(ctx, "peaking", 1500, 1);
    mid.gain.value = 5;
    input
      .connect(filter(ctx, "highpass", 380, 0.8))
      .connect(filter(ctx, "lowpass", 3400, 0.9))
      .connect(mid)
      .connect(drive)
      .connect(gain(ctx, 0.9))
      .connect(speaker);
    // the faintest hiss of a station not quite tuned in
    const hiss = noiseSource(ctx, "pink");
    hiss.connect(filter(ctx, "bandpass", 3000, 0.7)).connect(gain(ctx, 0.012)).connect(speaker);
    hiss.start(ctx.currentTime);

    this.voices = instruments(ctx, input);
    // it's been playing since before you arrived: start somewhere in the song
    this.startedAt = ctx.currentTime - rand(0, this.song.length);
    this.scheduledUntil = ctx.currentTime;
  }

  /** Every frame: schedule the notes due in the next moment, if you're within earshot. */
  update(_dt: number, player: THREE.Vector3) {
    const now = this.ctx.currentTime;
    const ahead = now + 0.6;
    if (player.distanceTo(this.position) > EARSHOT) {
      this.scheduledUntil = ahead; // out of earshot: skip, but keep time
      return;
    }
    const { events, length } = this.song;
    // the window to fill, in song time (it may wrap round the end of the loop)
    let from = this.scheduledUntil;
    while (from < ahead) {
      const loop = Math.floor((from - this.startedAt) / length);
      const loopStart = this.startedAt + loop * length;
      const to = Math.min(ahead, loopStart + length);
      for (const e of events) {
        const at = loopStart + e.at;
        if (at >= from && at < to) e.play(this.voices, Math.max(at, now));
      }
      from = to;
    }
    this.scheduledUntil = ahead;
  }
}
