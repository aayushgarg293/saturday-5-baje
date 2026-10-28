/**
 * Which kind of device the game is on, and the screen it has to draw on.
 *
 * Touch: a phone or a tablet with no mouse (an iPad with a trackpad counts
 * as a laptop, it has one). Add `?touch` to the address to try the touch
 * controls on a laptop. Worked out by a few lines in index.html, before
 * anything else (so the front page is the right way round from the start),
 * which mark the page: html.touch, html.sideways.
 *
 * Always landscape. On a phone held upright, the page itself is turned a
 * quarter turn (html.sideways in index.html), so the game is drawn
 * sideways: hold the phone sideways and it's the right way up, whatever its
 * rotation lock says. (Android can also lock the screen sideways once the
 * game goes fullscreen, on the first tap: core/input.ts. iPhones can't, from
 * a web page: this is how they get landscape.) Everything that needs the
 * screen's size asks `viewport()`, which gives it the right way round.
 */

export const touchFirst = document.documentElement.classList.contains("touch"); // (decided in index.html)

/** Is the page turned sideways right now (a touch screen, held upright)? */
export const isSideways = () => touchFirst && window.innerHeight > window.innerWidth;

/** The size the game draws at: the window's, the right way round when the page is turned. */
export function viewport(): { width: number; height: number } {
  const w = window.innerWidth, h = window.innerHeight;
  return isSideways() ? { width: h, height: w } : { width: w, height: h };
}

/**
 * A point on the glass (a touch's clientX/Y) in the page's own terms: the same, or turned back a quarter
 * turn when the page is turned (it's turned clockwise: index.html).
 */
export function toPage(x: number, y: number): { x: number; y: number } {
  return isSideways() ? { x: y, y: window.innerWidth - x } : { x, y };
}
