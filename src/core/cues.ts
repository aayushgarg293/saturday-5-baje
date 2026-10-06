import type * as THREE from "three";

/**
 * Cues: things happening in the street that make a sound.
 *
 * The people and vehicles don't know anything about sound. When something
 * audible happens (the old woman rings the temple bell, the bat hits the
 * ball) they just call `cue("templeBell", where)`. The sound system
 * (audio/street.ts) listens for cues and plays them. Keeping them apart like
 * this means the street works without sound (in tests, before the first
 * click), and sounds can be changed without touching the people.
 */

export type Cue =
  | "templeBell" // the old woman swings the bell's clapper
  | "aartiBell" // the little handbell she rings through the evening aarti
  | "conch" // the conch blown once as the evening aarti begins
  | "batHit" // bat meets ball in the gali
  | "ballBounce" // the ball bouncing
  | "glassClink" // a chai glass set down, or knocked by the pan as he pours
  | "cycleBell" // the doodhwala's bicycle bell
  | "snip" // the barber's scissors closing
  | "keyClick" // a key pressed, in the cafe
  | "mouseClick" // a mouse button clicked, in the cafe
  | "modem"; // your computer's dial-up modem connecting

type Listener = (cue: Cue, where: THREE.Vector3) => void;
const listeners: Listener[] = [];

/** Something audible happened at `where` (world position). */
export function cue(name: Cue, where: THREE.Vector3) {
  for (const l of listeners) l(name, where);
}

/** Hear every cue from now on. Returns a function that stops listening. */
export function onCue(listener: Listener): () => void {
  listeners.push(listener);
  return () => listeners.splice(listeners.indexOf(listener), 1);
}

/** True if `at` lies in (before, now]: for firing a cue once, the frame a moment in a loop is passed. */
export function passed(before: number, now: number, at: number): boolean {
  return before < now ? before < at && at <= now : at > before || at <= now; // (the second case: the loop wrapped round)
}
