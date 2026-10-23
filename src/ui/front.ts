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

/** Roll it all the way up and away (once the mouse is caught and the game is running). */
export function openFront() {
  if (opened || !front) return;
  opened = true;
  front.classList.add("open");
  window.setTimeout(() => front.remove(), 1800);
}
