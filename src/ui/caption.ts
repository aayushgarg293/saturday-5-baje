/**
 * A caption: a line of what someone says, at the bottom of the screen, for a
 * few seconds (people don't speak aloud in the game: no voices). Used for the
 * cafe owner's words.
 */

let box: HTMLDivElement | null = null;
let hideAt = 0;

function element(): HTMLDivElement {
  if (box) return box;
  box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    left: "50%",
    bottom: "9%",
    transform: "translateX(-50%)",
    maxWidth: "70%",
    padding: "8px 16px",
    borderRadius: "6px",
    background: "rgba(20, 16, 12, 0.55)",
    color: "#fbf6ea",
    font: '500 18px "Helvetica Neue", Arial, sans-serif',
    textAlign: "center",
    opacity: "0",
    transition: "opacity 0.4s",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(box);
  return box;
}

/** Show `who` saying `line` for `seconds`. */
export function say(who: string, line: string, seconds = 4) {
  const el = element();
  el.innerHTML = "";
  const name = document.createElement("span");
  name.textContent = `${who}: `;
  name.style.color = "#f2c542";
  el.append(name, document.createTextNode(line));
  el.style.opacity = "1";
  hideAt = performance.now() + seconds * 1000;
  window.setTimeout(() => {
    if (performance.now() >= hideAt - 10) el.style.opacity = "0";
  }, seconds * 1000);
}
