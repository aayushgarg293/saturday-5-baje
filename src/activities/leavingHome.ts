import { say } from "../ui/caption";
import { showChit } from "../ui/chit";

/**
 * The start: as you step out, Mummy calls after you from the door behind
 * (she isn't seen: only her words, as captions), and hands you the chit,
 * which comes up for a few seconds (ui/chit.ts; Tab brings it back).
 */

const LINES: { line: string; seconds: number }[] = [
  { line: "Cafe ja raha hai? Ek ghante se zyada mat baithna, haan!", seconds: 4 },
  { line: "Aur sunn… aate waqt ye kaam bhi karte aana.", seconds: 3.5 },
];
/** How long the chit stays up by itself, the first time. */
const CHIT_SECONDS = 9;

let called = false;

/** Once, the first time you start walking. */
export function mummyCallsAfterYou() {
  if (called) return;
  called = true;
  let at = 0.8; // (a moment after the click, so it isn't lost under the start screen going)
  for (const { line, seconds } of LINES) {
    window.setTimeout(() => say("Mummy", line, seconds), at * 1000);
    at += seconds + 0.3;
  }
  window.setTimeout(() => showChit(CHIT_SECONDS), (at - 1) * 1000);
}
