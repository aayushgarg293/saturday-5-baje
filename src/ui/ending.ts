/**
 * The end: reaching home's door, the screen slowly fades to black; then the
 * title card comes up, the closing line under it, then what came home with
 * you (Mummy's errands: activities/comingHome.ts), and small credits. A click
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

/** If they liked it: a small yellow sign, the same as on the front page (its look: index.html, `.chai`). */
const CHAI = "https://www.buymeacoffee.com/aayushgarg";

/**
 * Passing it on: the phone's own share sheet (WhatsApp, LinkedIn…), or on a computer that has none, the link
 * copied. Always the GitHub Pages address: inside itch.io's frame, the page's own address isn't one to share.
 */
const SHARE = {
  title: "Saturday, 5 Baje",
  text: "Yaad hai, Saturday shaam, ek ghanta cyber cafe? Ek baar phir jee lo 🖥️",
  url: "https://aayushgarg293.github.io/saturday-5-baje/",
};
async function share(button: HTMLButtonElement) {
  try {
    if (navigator.share) return await navigator.share(SHARE);
    await navigator.clipboard.writeText(`${SHARE.text} ${SHARE.url}`);
    button.textContent = "link copy ho gaya ✓";
  } catch {
    // (closed the share sheet without sending, or no clipboard: nothing to do)
  }
}

/** `brought`: what came home with you, a few words each ("Papa ke kapde", "Mama ka parcel"). */
export function playEnding(brought: string[] = []) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const veil = document.createElement("div");
  veil.className = "ending";
  veil.innerHTML = `<h1></h1><p class="line"></p><p class="brought"></p><div class="credits"></div><p class="again">click to walk it again</p><div class="asks"><button class="share">&#128228; apne batch walon ko bhejo</button><a class="chai" href="${CHAI}" target="_blank" rel="noopener">&#9749; achha laga? ek cutting chai pila do</a></div>`;
  veil.querySelector("h1")!.textContent = TITLE;
  veil.querySelector(".line")!.textContent = LINE;
  // (nothing brought: no line at all)
  veil.querySelector(".brought")!.textContent = brought.join("  •  ");
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
  show(".brought", FADE + 4.3);
  show(".credits", FADE + 5.5);
  show(".again", FADE + 8);
  show(".asks", FADE + 9);
  // (the chai link opens its own tab, and sharing is sharing: neither counts as the click that starts the walk again)
  veil.querySelector(".chai")!.addEventListener("click", (e) => e.stopPropagation());
  const shareButton = veil.querySelector<HTMLButtonElement>(".share")!;
  shareButton.addEventListener("click", (e) => {
    e.stopPropagation();
    void share(shareButton);
  });
  setTimeout(() => veil.addEventListener("click", () => location.reload()), (FADE + 8) * 1000);
}

const CSS = /* css */ `
.ending { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 18px; background: #0b0a10; opacity: 0; transition: opacity ${FADE}s ease-in;
  color: #f1e6d2; font-family: Georgia, "Times New Roman", serif; text-align: center; cursor: default; }
.ending.dark { opacity: 1; }
.ending > * { opacity: 0; transition: opacity 2.5s; margin: 0; }
.ending > .shown { opacity: 1; }
.ending h1 { font-size: clamp(34px, 6cqw, 64px); font-weight: normal; font-style: italic; letter-spacing: 0.02em; }
.ending .line { font-size: clamp(16px, 2.2cqw, 22px); color: #d9c8a8; }
.ending .brought { font: italic clamp(13px, 1.6cqw, 16px) Georgia, serif; color: #a8977a; min-height: 1em; }
.ending .credits { margin-top: 40px; font: 13px/2 "Helvetica Neue", Arial, sans-serif; color: #8f8578; }
.ending .asks { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 14px; margin-top: 14px; }
.ending .share { padding: 8px 16px; border-radius: 6px; border: 1.5px solid #d9c8a8; background: transparent; color: #f1e6d2;
  font: 600 15px "Helvetica Neue", Arial, sans-serif; cursor: pointer; }
.ending .share:hover { background: rgba(241, 230, 210, 0.12); }
.ending .again { margin-top: 30px; font: 12px "Helvetica Neue", Arial, sans-serif; color: #6f675d; }
`;
