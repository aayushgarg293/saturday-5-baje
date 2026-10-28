/**
 * Where you'd got to, kept in the browser, so a page that's reloaded (a
 * phone does that to a game left in the background for a call) picks up
 * where you were. main.ts says what goes in (`Saved`) and puts it back.
 *
 * Kept only a few hours (come back the next day and it's a new Saturday),
 * and cleared at the end. Browsers can refuse to keep anything (a private
 * window): then there's simply no saving, and nothing breaks.
 */

export type Saved = {
  /** The clock, game minutes after midnight. */
  minutes: number;
  /** Where you stood, and which way you looked. */
  at: { x: number; y: number; z: number; yaw: number; pitch: number };
  /** Mummy's chit: the lines done (core/errands.ts). */
  errands: string[];
  /** Your visit to the cafe, once it's over (logged off): its bill, whether it's paid, what was done on the computer. */
  cafe: { visitMinutes: number; paid: boolean; tasks: string[] } | null;
};

const KEY = "saturday-5-baje:save";
/** How long a save is good for, ms: a few hours. */
const KEEP_FOR = 3 * 60 * 60 * 1000;

export function readSave(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { savedAt, saved } = JSON.parse(raw) as { savedAt: number; saved: Saved };
    if (Date.now() - savedAt > KEEP_FOR) return null;
    return saved;
  } catch {
    return null;
  }
}

export function writeSave(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), saved }));
  } catch {
    // (not allowed to keep anything: no saving, then)
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // (as above)
  }
}
