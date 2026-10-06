import type * as THREE from "three";
import type { AudioEngine } from "./engine";
import { type Instruments, instruments } from "./instruments";
import { PLAYLIST, type Song } from "./songs";
import { type Ctx, type Vowel, filter, gain, noiseSource, rand } from "./synth";

/**
 * A transistor radio, tuned to the one station everyone listens to: its
 * songs (audio/songs.ts) one after another, a moment of static between
 * them, round and round. There are two on the street: on the chai tapri's
 * counter, and on the saloon's mirror ledge. They play the same station, in
 * step (they share one "on air" clock), so walking from one to the other
 * the song carries on.
 *
 * THE RADIO: everything goes through a small speaker (no deep bass, no
 * sparkle, a little grit) with the faintest hiss. It's only scheduled while
 * you're within earshot; the station carries on "on air" either way, so it's
 * always somewhere in the middle of something.
 */

/** Radio heard up to this far, metres (beyond, nothing is scheduled). */
const EARSHOT = 55;
/** Seconds of static between songs. */
const GAP = 3;

// --- turning the songs into timed events ----------------------------------------------------------

type Event = { at: number; play: (band: Instruments, t: number) => void };

const NOTE_INDEX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

/** "C#5" → its frequency, Hz (A4 = 440). */
export function hz(note: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(note);
  if (!m) throw new Error(`not a note: ${note}`);
  const midi = NOTE_INDEX[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

type Note = { beat: number; len: number; f: number | null; vowel: Vowel };

/** A tune string → notes with start (beats from the tune's start), length, pitch and (sung) vowel. */
function parseTune(tune: string): Note[] {
  const notes: Note[] = [];
  let beat = 0;
  for (const token of tune.split(/\s+/)) {
    if (!token || token === "|") continue;
    const [name, rest] = token.split(":");
    const [len, vowel] = rest.split("/");
    const beats = Number(len);
    notes.push({ beat, len: beats, f: name === "-" ? null : hz(name), vowel: (vowel as Vowel) ?? "a" });
    beat += beats;
  }
  return notes;
}

/** One song as a list of events (seconds from its start), and its length. */
function compose(song: Song): { events: Event[]; length: number } {
  const beat = 60 / song.bpm, bar = 4 * beat;
  const events: Event[] = [];
  let bar0 = 0;
  for (const sec of song.sections) {
    const start = bar0 * bar;
    // the tunes
    for (const who of ["flute", "sitar", "singer", "whistle"] as const) {
      const tune = sec[who];
      if (!tune) continue;
      let prev: number | null = null;
      for (const n of parseTune(tune)) {
        if (n.f === null) { prev = null; continue; }
        const from = prev, f = n.f, len = n.len * beat, vowel = n.vowel;
        events.push({
          at: start + n.beat * beat,
          play: (band, t) => {
            if (who === "flute") band.flute(t, f, len, from);
            else if (who === "sitar") band.sitar(t, f, len);
            else if (who === "singer") band.singer(t, f, len, from, vowel);
            else band.whistle(t, f, len, from);
          },
        });
        prev = f;
      }
    }
    for (let b = 0; b < sec.bars; b++) {
      const barStart = start + b * bar;
      const chord = song.chords[sec.chords[b]].map(hz);
      const root = chord[0];
      // strings hold the chord for the bar; the bass walks root – root – fifth – root
      if (sec.strings > 0) events.push({ at: barStart, play: (band, t) => band.strings(t, chord, bar * 0.98, sec.strings) });
      for (const [at, mult, len] of [[0, 0.5, 1.4], [1.5, 0.5, 0.45], [2, 0.75, 0.9], [3, 0.5, 0.9]] as const) {
        events.push({ at: barStart + at * beat, play: (band, t) => band.bass(t, root * mult * 2, len * beat) });
      }
      // harmonium stabs on the off-beats
      if (sec.harmonium) for (let k = 0; k < 4; k++) events.push({ at: barStart + (k + 0.5) * beat, play: (band, t) => band.harmonium(t, chord, beat * 0.3) });
      // drums: a fill on the last bar of each section (except a soft one)
      const fill = song.drums.fill && b === sec.bars - 1 && sec.drums !== "soft";
      const pattern = fill ? song.drums.fill : song.drums[sec.drums];
      pattern.forEach((stroke, k) => {
        const at = barStart + k * beat * 0.5;
        if (stroke) events.push({ at, play: (band, t) => (song.kit === "bongo" ? band.bongo(t, stroke) : band.dholak(t, stroke)) });
        if (sec.tambourine && k % 2 === 1) events.push({ at, play: (band, t) => band.tambourine(t) });
      });
    }
    bar0 += sec.bars;
  }
  events.sort((a, b) => a.at - b.at);
  return { events, length: bar0 * bar };
}

/** The station: every song in the playlist, one after another with a gap, as one long loop. */
function station(): { events: Event[]; length: number } {
  const events: Event[] = [];
  let at = 0;
  for (const song of PLAYLIST) {
    const s = compose(song);
    for (const e of s.events) events.push({ at: at + e.at, play: e.play });
    at += s.length + GAP;
  }
  return { events, length: at };
}

/** When the station's loop began, on each audio clock (shared by every radio on it: they play in step). */
const onAirSince = new WeakMap<Ctx, number>();

// --- the radio set ----------------------------------------------------------------------------------

export class Radio {
  private song = station();
  private band: Instruments;
  /** When the station's loop began, on the audio clock. */
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

    this.band = instruments(ctx, input);
    // it's been on air since before you arrived: somewhere in the playlist (the same place for every radio)
    if (!onAirSince.has(ctx)) onAirSince.set(ctx, ctx.currentTime - rand(0, this.song.length));
    this.startedAt = onAirSince.get(ctx)!;
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
    // the window to fill, in station time (it may wrap round the end of the loop)
    let from = this.scheduledUntil;
    while (from < ahead) {
      const loop = Math.floor((from - this.startedAt) / length);
      const loopStart = this.startedAt + loop * length;
      const to = Math.min(ahead, loopStart + length);
      for (const e of events) {
        const at = loopStart + e.at;
        if (at >= from && at < to) e.play(this.band, Math.max(at, now));
      }
      from = to;
    }
    this.scheduledUntil = ahead;
  }
}
