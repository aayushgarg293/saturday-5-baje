import { touchFirst } from "../core/device";
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
/** As it goes away, the once: how to bring it back. */
const CHIT_REMINDER = touchFirst ? "📝 dabao, chit phir se dikhegi" : "Tab dabao, chit phir se dikhegi";

let called = false;

/** She's already called after you (a game picked up where it was: core/save.ts): not again. */
export function mummyHasCalled() {
  called = true;
}

/** Once, the first time you start walking. */
export function mummyCallsAfterYou() {
  if (called) return;
  called = true;
  let at = 2.6; // (once the front page's shutter has rolled up out of the way: ui/front.ts)
  for (const { line, seconds } of LINES) {
    window.setTimeout(() => say("Mummy", line, seconds), at * 1000);
    at += seconds + 0.3;
  }
  window.setTimeout(() => showChit(CHIT_SECONDS), (at - 1) * 1000);
  window.setTimeout(() => say("", CHIT_REMINDER, 4), (at - 1 + CHIT_SECONDS) * 1000);
}
