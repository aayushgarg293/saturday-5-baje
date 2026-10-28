import { type Ctx, gain } from "./synth";

/**
 * The few real recordings the game plays (public/sounds/), each a short
 * one-off sound, chosen by the owner by ear (2026-10-28). All CC0 (free to
 * use, no credit needed), from Freesound, trimmed and evened out in
 * loudness for the game:
 *
 *   shutter          a shop's rolling shutter going up: the front page's
 *                    roll-up (Areti18, freesound.org/s/394947)
 *   modem            a dial-up modem connecting, 21 s: your computer at the
 *                    cafe (G_M_D_THREE, freesound.org/s/454651)
 *   cycle bell       one ring: the tuition kids riding off (gis_sweden,
 *                    freesound.org/s/536554)
 *   pressure cooker  one whistle: houses cooking dinner (Jibanshil,
 *                    freesound.org/s/536520)
 *
 * The train's wheels are the owner's own recording, looped: audio/train.ts.
 *
 * The files are fetched as soon as the page opens (they're small), and
 * unpacked into sound once the sound has started (prepareRecordings). If one
 * can't be had, it simply isn't played (or, for the modem, the old made-up
 * one plays instead).
 */

const FILES = {
  shutter: "shutter.mp3",
  modem: "modem.mp3",
  cycleBell: "cycle bell.mp3",
  cooker: "pressure cooker.mp3",
} as const;
export type Recording = keyof typeof FILES;

const NAMES = Object.keys(FILES) as Recording[];
const url = (file: string) => `${import.meta.env.BASE_URL}sounds/${encodeURIComponent(file)}`;

/** Each file's bytes, fetching from the start. */
const bytes = new Map(NAMES.map((name) => [name, fetch(url(FILES[name])).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null)]));
/** Each one unpacked, ready to play (once prepareRecordings has run). */
const unpacked = new Map<Recording, Promise<AudioBuffer | null>>();
const ready = new Map<Recording, AudioBuffer>();

/** Once the sound has started: unpack them all. (Done when they all are: dev/audioLab.ts waits for that.) */
export function prepareRecordings(ctx: Ctx): Promise<unknown> {
  for (const name of NAMES) {
    // (a copy of the bytes: unpacking uses them up, and an offline test context may unpack them again)
    const p = bytes.get(name)!.then((b) => (b ? ctx.decodeAudioData(b.slice(0)) : null)).catch(() => null);
    unpacked.set(name, p);
    void p.then((buffer) => buffer && ready.set(name, buffer));
  }
  return Promise.all(unpacked.values());
}

/** Play `name` into `out` at time `at`, at `level`. False if it isn't ready (not loaded yet, or missing). */
export function playRecording(ctx: Ctx, name: Recording, out: AudioNode, at: number, level = 1): boolean {
  const buffer = ready.get(name);
  if (!buffer) return false;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(gain(ctx, level)).connect(out);
  src.start(at);
  return true;
}

/** The same, as soon as it's ready (for the shutter: the click that starts the sound is the moment it's needed). */
export function playRecordingSoon(ctx: Ctx, name: Recording, out: AudioNode, level = 1) {
  void unpacked.get(name)?.then((buffer) => buffer && playRecording(ctx, name, out, ctx.currentTime + 0.01, level));
}
