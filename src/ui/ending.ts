/**
 * The end: reaching home's door, the screen slowly fades to black; then the
 * title card comes up, the closing line under it, and small credits. A click
 * at the end starts the walk again from the beginning.
 */

const TITLE = "Saturday, 5 Baje";
const LINE = "next saturday. pakka.";
const CREDITS = [
  "a walk to the cyber cafe, somewhere in Rajasthan, sometime in the 2000s",
  "every name, site and song in it is a look-alike",
  "thank you for playing",
];

/** Seconds: the fade to black; then each part of the card coming up. */
const FADE = 3.5;

export function playEnding() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const veil = document.createElement("div");
  veil.className = "ending";
  veil.innerHTML = `<h1></h1><p class="line"></p><div class="credits"></div><p class="again">click to walk it again</p>`;
  veil.querySelector("h1")!.textContent = TITLE;
  veil.querySelector(".line")!.textContent = LINE;
  const credits = veil.querySelector(".credits")!;
  for (const c of CREDITS) {
    const d = document.createElement("div");
    d.textContent = c;
    credits.append(d);
  }
  document.body.append(veil);
  // (reading its size makes the browser lay it out first, transparent, so the fade actually runs)
  void veil.offsetWidth;
  veil.classList.add("dark");
  const show = (selector: string, at: number) => setTimeout(() => veil.querySelector(selector)!.classList.add("shown"), at * 1000);
  show("h1", FADE + 1);
  show(".line", FADE + 3);
  show(".credits", FADE + 5.5);
  show(".again", FADE + 8);
  setTimeout(() => veil.addEventListener("click", () => location.reload()), (FADE + 8) * 1000);
}

const CSS = /* css */ `
.ending { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 18px; background: #0b0a10; opacity: 0; transition: opacity ${FADE}s ease-in;
  color: #f1e6d2; font-family: Georgia, "Times New Roman", serif; text-align: center; cursor: default; }
.ending.dark { opacity: 1; }
.ending > * { opacity: 0; transition: opacity 2.5s; margin: 0; }
.ending > .shown { opacity: 1; }
.ending h1 { font-size: clamp(34px, 6vw, 64px); font-weight: normal; font-style: italic; letter-spacing: 0.02em; }
.ending .line { font-size: clamp(16px, 2.2vw, 22px); color: #d9c8a8; }
.ending .credits { margin-top: 40px; font: 13px/2 "Helvetica Neue", Arial, sans-serif; color: #8f8578; }
.ending .again { margin-top: 30px; font: 12px "Helvetica Neue", Arial, sans-serif; color: #6f675d; }
`;
