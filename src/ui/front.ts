/**
 * The front page: a shop's rolling shutter with the game's name painted on
 * it (its look is in index.html, #front, so it shows the moment the page
 * opens, before this code has even downloaded).
 *
 *   loading   the shutter is down: "Ruko, dukaan khul rahi hai…"
 *   ready     the town is built: the shutter goes half up, the bazaar at
 *             sunset under it (a picture: public/front/bazaar.jpg), "Click"
 *   open      the click caught the mouse: the shutter rolls all the way up,
 *             the picture fades, and the real town is behind it
 *
 * After that it's gone for good: Esc brings up the small pause screen
 * (#start), not this.
 */

const front = document.querySelector<HTMLDivElement>("#front");
let opened = front === null;

/** Is the front page still up? (The game stays paused while it is.) */
export const frontIsUp = () => !opened;

/** The town is built: up goes the shutter, half way; a click on it (not on the chai link) calls `onClick`. */
export function frontReady(onClick: () => void) {
  if (!front) return;
  front.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) return; // (the chai link opens its own tab)
    onClick();
  });
  // (reading its size first makes sure the browser has drawn it shut, so the lift actually animates)
  void front.offsetWidth;
  front.classList.add("ready");
}

/**
 * A walk saved from before (core/save.ts): the shutter says you'll pick up where you were, with a small
 * "start over" under it (`startOver`).
 */
export function frontResuming(startOver: () => void) {
  if (!front) return;
  const click = front.querySelector(".go .click");
  if (click) click.innerHTML = `<span class="for-mouse">Click karo</span><span class="for-touch">Tap karo</span>, wahin se chalo`;
  const over = document.createElement("a");
  over.className = "over";
  over.href = "#";
  over.textContent = "ya naye sire se shuru karo";
  over.addEventListener("click", (e) => {
    e.preventDefault();
    startOver();
  });
  front.querySelector(".go")?.append(over);
}

/** Roll it all the way up and away (once the mouse is caught and the game is running). */
export function openFront() {
  if (opened || !front) return;
  opened = true;
  front.classList.add("open");
  window.setTimeout(() => front.remove(), 2500);
}
