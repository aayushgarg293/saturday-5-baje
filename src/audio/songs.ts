/**
 * THE RADIO'S SONGS, as data (audio/radio.ts plays them in turn, on the
 * instruments in audio/instruments.ts). All original, written in the styles
 * of the time; real film songs are copyrighted. Their titles are the ones on
 * the SongzPK page on the screen in booth 1 (world/cafe/screens.ts).
 *
 *   "Dil Ne Kaha Hello"    a mid-2000s song, instrumental, as the radio often
 *                          played: flute hook, sitar, dholak (D minor)
 *   "Chand Wali Gali"      a slow 90s romantic number: the singer hums the
 *                          tune, flute and strings answer (A minor)
 *   "Sapno Ki Railgaadi"   a bouncy 70s road song: a whistled tune,
 *                          harmonium stabs, bongos, the singer's "la la la"
 *                          (G major)
 *
 * HOW A TUNE IS WRITTEN: "name+octave:length in beats", bars separated by
 * "|", "-" for a rest; for the singer, "/vowel" says what he sings it on
 * ("A3:1/o": A3 for a beat, on "oo"; the default is "aa"). `octave(tune, n)`
 * moves a whole tune up or down n octaves (the singer sings a tune an octave
 * below the flute that plays it).
 */

export type Section = {
  bars: number;
  /** One chord a bar (names from the song's `chords`). */
  chords: string[];
  /** Tunes, and who plays (or sings) them. */
  flute?: string;
  sitar?: string;
  singer?: string;
  whistle?: string;
  /** The drum pattern (from the song's `drums`), one bar of eighths. */
  drums: string;
  tambourine?: boolean;
  /** Harmonium chord stabs on the off-beats. */
  harmonium?: boolean;
  /** String pad loudness (0–1). */
  strings: number;
};

export type Song = {
  title: string;
  bpm: number;
  /** Which drum: the dholak's "dha, ge, na…", or bongos' "tak, dum". */
  kit: "dholak" | "bongo";
  chords: Record<string, string[]>;
  /** Drum patterns, a bar of eighths each; "fill" (if there is one) plays on each section's last bar. */
  drums: Record<string, string[]>;
  sections: Section[];
};

/** Move every note of `tune` up (or down) `n` octaves. */
export function octave(tune: string, n: number): string {
  return tune.replace(/([A-G][#b]?)(\d)/g, (_m, name: string, oct: string) => `${name}${Number(oct) + n}`);
}

const KAHERWA = {
  soft: ["dha", "", "", "", "na", "", "", ""],
  kaherwa: ["dha", "ge", "na", "ti", "na", "ka", "dhi", "na"],
  fill: ["dha", "na", "dha", "na", "ti", "ti", "dha", "dha"],
};

// --- 1. "Dil Ne Kaha Hello" -------------------------------------------------------------------------

const HOOK = "D5:1.5 C5:.5 A4:1 G4:.5 A4:.5 | Bb4:1 A4:.5 G4:.5 F4:1 E4:1 | F4:.5 G4:.5 A4:1 C#5:1 D5:1 | E5:.5 D5:.5 C#5:.5 A4:.5 D5:2";
const HOOK_END = "D5:1.5 C5:.5 A4:1 G4:.5 A4:.5 | Bb4:1 A4:.5 G4:.5 F4:1 E4:1 | F4:.5 G4:.5 A4:1 Bb4:.5 A4:.5 G4:1 | F4:.5 E4:.5 C#4:1 D4:2";
const VERSE =
  "D4:1 F4:1 A4:1.5 G4:.5 | F4:1 E4:.5 D4:.5 E4:2 | E4:1 G4:1 C5:1.5 Bb4:.5 | A4:1 G4:.5 F4:.5 G4:2 | " +
  "A4:1 A4:.5 Bb4:.5 C5:1 D5:1 | C5:.5 Bb4:.5 A4:1 G4:2 | F4:1 G4:.5 A4:.5 Bb4:1 A4:1 | G4:.5 F4:.5 E4:1 D4:2";
const RIFF =
  "D5:.5 A4:.5 F4:.5 A4:.5 D5:.5 A4:.5 F4:.5 A4:.5 | C5:.5 G4:.5 E4:.5 G4:.5 C5:.5 G4:.5 E4:.5 G4:.5 | " +
  "Bb4:.5 F4:.5 D4:.5 F4:.5 Bb4:.5 F4:.5 D4:.5 F4:.5 | A4:.5 E4:.5 C#4:.5 E4:.5 A4:.5 C#5:.5 E5:.5 C#5:.5";

const DIL_NE_KAHA: Song = {
  title: "Dil Ne Kaha Hello",
  bpm: 100,
  kit: "dholak",
  chords: { Dm: ["D3", "F3", "A3"], Gm: ["G3", "Bb3", "D4"], C: ["C3", "E3", "G3"], Bb: ["Bb2", "D3", "F3"], A: ["A2", "C#3", "E3"] },
  drums: KAHERWA,
  sections: [
    { bars: 4, chords: ["Dm", "Gm", "A", "Dm"], flute: HOOK, drums: "soft", strings: 0.8 },
    { bars: 8, chords: ["Dm", "Dm", "C", "C", "Bb", "C", "Dm", "A"], flute: VERSE, drums: "kaherwa", strings: 0.5 },
    { bars: 8, chords: ["Dm", "Gm", "A", "Dm", "Dm", "Gm", "Bb", "A"], flute: HOOK + " | " + HOOK_END, sitar: HOOK + " | " + HOOK_END, drums: "kaherwa", tambourine: true, strings: 1 },
    { bars: 4, chords: ["Dm", "C", "Bb", "A"], sitar: RIFF, drums: "kaherwa", strings: 0.6 },
    { bars: 8, chords: ["Dm", "Dm", "C", "C", "Bb", "C", "Dm", "A"], flute: VERSE, drums: "kaherwa", strings: 0.5 },
    { bars: 8, chords: ["Dm", "Gm", "A", "Dm", "Dm", "Gm", "Bb", "A"], flute: HOOK + " | " + HOOK_END, sitar: HOOK + " | " + HOOK_END, drums: "kaherwa", tambourine: true, strings: 1 },
  ],
};

// --- 2. "Chand Wali Gali": slow, 90s, romantic ------------------------------------------------------

/** The mukhda (the opening lines), as sung. */
const CHAND_MUKHDA =
  "E4:1/a A4:1/a B4:.5/o C5:.5/o B4:1/a | A4:2/a -:1 E4:1/o | F4:1/e A4:1/a C5:1/o B4:.5/a A4:.5/a | G4:3/o -:1 | " +
  "G4:1/a C5:1/a D5:.5/e E5:.5/e D5:1/a | C5:2/o -:1 A4:1/a | B4:1/e A4:.5/a G#4:.5/a F4:1/o E4:1/a | A4:3/a -:1";
/** The hook: the line everyone sings along to. */
const CHAND_HOOK_A = "A4:1.5/o G4:.5/o E4:1/a G4:1/a | A4:1/o C5:1/a B4:1/a A4:1/o | G4:1.5/e F4:.5/e E4:1/a D4:1/a | E4:4/a";
const CHAND_HOOK_B = "F4:1/a G4:1/a A4:1/o C5:1/o | B4:1.5/a A4:.5/a G4:1/e E4:1/a | F4:1/o E4:.5/o D4:.5/o C4:1/a B3:1/a | A3:4/a";
const CHAND_HOOK = CHAND_HOOK_A + " | " + CHAND_HOOK_B;
const CHAND_ARPEGGIO =
  "A4:.5 C5:.5 E5:.5 C5:.5 A4:.5 C5:.5 E5:.5 C5:.5 | A4:.5 C5:.5 F5:.5 C5:.5 A4:.5 C5:.5 F5:.5 C5:.5 | " +
  "B4:.5 D5:.5 G5:.5 D5:.5 B4:.5 D5:.5 G5:.5 D5:.5 | G#4:.5 B4:.5 E5:.5 B4:.5 G#4:.5 B4:.5 E5:1";
const MUKHDA_CHORDS = ["Am", "Am", "Dm", "G", "C", "Am", "E", "Am"];
const HOOK_CHORDS = ["Am", "F", "G", "E", "F", "G", "Dm", "Am"];

const CHAND_WALI_GALI: Song = {
  title: "Chand Wali Gali",
  bpm: 76,
  kit: "dholak",
  chords: {
    Am: ["A2", "C3", "E3"], Dm: ["D3", "F3", "A3"], F: ["F2", "A2", "C3"], G: ["G2", "B2", "D3"],
    C: ["C3", "E3", "G3"], E: ["E2", "G#2", "B2"],
  },
  drums: KAHERWA,
  sections: [
    { bars: 4, chords: ["Am", "F", "G", "E"], flute: octave(CHAND_HOOK_A, 1), drums: "soft", strings: 0.9 },
    { bars: 8, chords: MUKHDA_CHORDS, singer: octave(CHAND_MUKHDA, -1), drums: "kaherwa", strings: 0.5 },
    { bars: 8, chords: HOOK_CHORDS, singer: octave(CHAND_HOOK, -1), flute: CHAND_HOOK, drums: "kaherwa", tambourine: true, strings: 1 },
    { bars: 4, chords: ["Am", "F", "G", "E"], sitar: CHAND_ARPEGGIO, drums: "kaherwa", strings: 0.6 },
    { bars: 8, chords: MUKHDA_CHORDS, singer: octave(CHAND_MUKHDA, -1), drums: "kaherwa", strings: 0.5 },
    { bars: 8, chords: HOOK_CHORDS, singer: octave(CHAND_HOOK, -1), flute: CHAND_HOOK, drums: "kaherwa", tambourine: true, strings: 1 },
  ],
};

// --- 3. "Sapno Ki Railgaadi": a 70s road song --------------------------------------------------------

const RAIL_WHISTLE = "D5:.5 G5:.5 B5:.5 A5:.5 G5:1 D5:1 | E5:.5 G5:.5 A5:.5 G5:.5 E5:1 C5:1 | C5:.5 E5:.5 A5:.5 G5:.5 E5:1 C5:1 | D5:1 A4:1 B4:.5 C5:.5 D5:1";
const RAIL_VERSE =
  "G4:.5 G4:.5 A4:.5 B4:.5 D5:1/o B4:1 | C5:.5/e B4:.5/e A4:.5/e G4:.5/e E4:2 | D4:.5 F#4:.5 A4:.5 D5:.5 C5:1/o A4:1 | B4:1/o G4:1 -:2 | " +
  "G4:.5 A4:.5 B4:.5 D5:.5 E5:1/o D5:1 | E5:.5/e D5:.5/e C5:.5/e B4:.5/e C5:2 | A4:.5 B4:.5 C5:.5 A4:.5 F#4:1/o D4:1 | G4:3 -:1";
/** "La la la…" */
const RAIL_CHORUS = "D5:1 D5:.5 B4:.5 G4:1 B4:1 | C5:1 C5:.5 A4:.5 E4:2 | D4:.5 F#4:.5 A4:.5 C5:.5 B4:1 A4:1 | G4:4";
const REST_4_BARS = "-:4 | -:4 | -:4 | -:4";

const SAPNO_KI_RAILGAADI: Song = {
  title: "Sapno Ki Railgaadi",
  bpm: 126,
  kit: "bongo",
  chords: { G: ["G2", "B2", "D3"], C: ["C3", "E3", "G3"], D: ["D3", "F#3", "A3"], Am: ["A2", "C3", "E3"] },
  drums: {
    soft: ["dum", "", "", "", "dum", "", "", ""],
    groove: ["dum", "", "tak", "tak", "dum", "tak", "", "tak"],
    fill: ["tak", "tak", "dum", "tak", "tak", "dum", "dum", "dum"],
  },
  sections: [
    { bars: 4, chords: ["G", "C", "Am", "D"], whistle: RAIL_WHISTLE, drums: "soft", harmonium: true, strings: 0 },
    { bars: 8, chords: ["G", "C", "D", "G", "G", "C", "D", "G"], singer: octave(RAIL_VERSE, -1), drums: "groove", harmonium: true, strings: 0.3 },
    { bars: 8, chords: ["G", "C", "D", "G", "G", "C", "D", "G"], singer: octave(RAIL_CHORUS + " | " + RAIL_CHORUS, -1), whistle: REST_4_BARS + " | " + RAIL_CHORUS, drums: "groove", tambourine: true, harmonium: true, strings: 0.5 },
    { bars: 4, chords: ["G", "C", "Am", "D"], whistle: RAIL_WHISTLE, drums: "groove", harmonium: true, strings: 0.2 },
    { bars: 8, chords: ["G", "C", "D", "G", "G", "C", "D", "G"], singer: octave(RAIL_VERSE, -1), drums: "groove", harmonium: true, strings: 0.3 },
    { bars: 8, chords: ["G", "C", "D", "G", "G", "C", "D", "G"], singer: octave(RAIL_CHORUS + " | " + RAIL_CHORUS, -1), whistle: REST_4_BARS + " | " + RAIL_CHORUS, drums: "groove", tambourine: true, harmonium: true, strings: 0.5 },
  ],
};

/** What the station plays, in order, round and round. */
export const PLAYLIST: Song[] = [DIL_NE_KAHA, CHAND_WALI_GALI, SAPNO_KI_RAILGAADI];
