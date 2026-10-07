import { CHIT, errands } from "../core/errands";

/**
 * Mummy's chit (core/errands.ts): a scrap torn from a ruled notebook, in her
 * blue ballpoint, a little crooked, in the top right corner. Each line gets a
 * tick once it's done. Tab shows or hides it (main.ts); as you leave home it
 * comes up by itself for a few seconds (`showChit(seconds)`).
 */

let box: HTMLDivElement | null = null;
let hideTimer = 0;

/** Ballpoint "handwriting": fonts every Mac has, and the nearest elsewhere. */
const HAND = '"Noteworthy", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';
const INK = "#1f3a8a";

function element(): HTMLDivElement {
  if (box) return box;
  box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    top: "4%",
    right: "3%",
    width: "min(340px, 40vw)",
    padding: "18px 18px 30px 30px",
    // ruled lines (blue), and the red margin line down the left
    background: "linear-gradient(90deg, transparent 22px, rgba(200, 60, 60, 0.45) 22px, rgba(200, 60, 60, 0.45) 23.5px, transparent 23.5px), " +
      "repeating-linear-gradient(180deg, #fbf7ea 0 25px, rgba(90, 130, 190, 0.35) 25px 26px)",
    backgroundColor: "#fbf7ea",
    color: INK,
    font: `17px/26px ${HAND}`,
    transform: "rotate(-2.5deg)",
    boxShadow: "2px 4px 10px rgba(30, 20, 10, 0.35)",
    // the torn bottom edge
    clipPath: "polygon(0 0, 100% 0, 100% 94%, 92% 97%, 84% 93%, 75% 98%, 66% 94%, 57% 99%, 48% 94%, 38% 98%, 29% 93%, 19% 97%, 10% 94%, 0 98%)",
    opacity: "0",
    transition: "opacity 0.35s",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(box);
  draw();
  errands.onChange(draw);
  return box;
}

/** Write it out again (the ticks). */
function draw() {
  if (!box) return;
  box.innerHTML = "";
  CHIT.forEach(({ errand, line, where }, k) => {
    const row = document.createElement("div");
    row.style.position = "relative";
    const ticked = errands.isDone(errand);
    const text = document.createElement("span");
    text.textContent = `${k + 1}. ${line}`;
    row.append(text);
    if (where) {
      const small = document.createElement("div");
      small.textContent = `(${where})`;
      Object.assign(small.style, { fontSize: "13px", lineHeight: "26px", paddingLeft: "18px", opacity: "0.85" });
      row.append(small);
    }
    if (ticked) {
      // a quick tick in the margin, in pencil-ish green
      const tick = document.createElement("span");
      tick.textContent = "✓";
      Object.assign(tick.style, { position: "absolute", left: "-24px", top: "-3px", color: "#2f7a32", fontSize: "24px", fontWeight: "700" });
      row.append(tick);
      text.style.textDecoration = "line-through";
      text.style.textDecorationColor = "rgba(31, 58, 138, 0.6)";
    }
    box!.append(row);
  });
  const hint = document.createElement("div");
  hint.textContent = "[Tab]";
  Object.assign(hint.style, { font: '600 11px "Helvetica Neue", Arial, sans-serif', color: "#7a6e58", textAlign: "right", marginTop: "4px" });
  box.append(hint);
}

let open = false;

function set(show: boolean) {
  open = show;
  element().style.opacity = show ? "1" : "0";
}

/** Show the chit: for `seconds` and then away again, or (no seconds) until hidden. */
export function showChit(seconds?: number) {
  window.clearTimeout(hideTimer);
  set(true);
  if (seconds) hideTimer = window.setTimeout(() => set(false), seconds * 1000);
}

/** Tab: show it, or put it away. */
export function toggleChit() {
  window.clearTimeout(hideTimer);
  set(!open);
}

export function hideChit() {
  window.clearTimeout(hideTimer);
  set(false);
}
