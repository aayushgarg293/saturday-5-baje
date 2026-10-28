import { touchFirst } from "../core/device";

/**
 * A key prompt near the bottom of the screen ("E  sit down"), shown while
 * something can be done where you are. `show(null)` hides it.
 *
 * On a phone (core/device.ts) there are no keys: each "[E] sit down" is a
 * button saying "sit down", and tapping it is pressing E (`onPromptTap`).
 */

/** What a tap on one of the phone's buttons does: the key it stands for ("E", "Click", "1"…). */
let tapped: (key: string) => void = () => {};
export function onPromptTap(f: (key: string) => void) {
  tapped = f;
}

let box: HTMLDivElement | null = null;
let current = "";

function element(): HTMLDivElement {
  if (box) return box;
  box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    left: "50%",
    bottom: "3.5%",
    transform: "translateX(-50%)",
    padding: "5px 12px",
    borderRadius: "5px",
    background: "rgba(20, 16, 12, 0.45)",
    color: "#fbf6ea",
    font: '500 15px "Helvetica Neue", Arial, sans-serif',
    whiteSpace: "pre",
    opacity: "0",
    transition: "opacity 0.25s",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  if (touchFirst) {
    // a row of buttons, above the touch controls (index.html, #prompt.touch)
    box.id = "prompt";
    box.className = "touch";
    box.removeAttribute("style");
  }
  document.body.appendChild(box);
  return box;
}

/** Show `text` (keys in square brackets are drawn as keys: "[E] sit down"), or hide with null. */
export function showPrompt(text: string | null) {
  if ((text ?? "") === current) return;
  current = text ?? "";
  const el = element();
  if (!text) {
    el.style.opacity = "0";
    if (touchFirst) el.innerHTML = ""; // (no invisible buttons left to tap)
    return;
  }
  el.innerHTML = "";
  if (touchFirst) return buttons(el, text);
  for (const part of text.split(/(\[[^\]]+\])/)) {
    if (!part) continue;
    if (part.startsWith("[")) {
      const key = document.createElement("span");
      key.textContent = part.slice(1, -1);
      Object.assign(key.style, { border: "1px solid #fbf6ea", borderRadius: "3px", padding: "0 5px", marginRight: "4px", fontWeight: "700" });
      el.append(key);
    } else el.append(document.createTextNode(part));
  }
  el.style.opacity = "1";
}

/** The phone's version: "[E] haan    [Q] nahi" → two buttons, "haan" and "nahi". */
function buttons(el: HTMLDivElement, text: string) {
  const parts = text.split(/\[([^\]]+)\]/); // (text, key, text, key, text…)
  const lead = parts[0].trim();
  if (lead) el.append(Object.assign(document.createElement("span"), { textContent: lead }));
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i], words = parts[i + 1].trim();
    if (words === "or") continue; // ("[E] or [Click] khao!": one button, the next one's words)
    const b = document.createElement("button");
    b.textContent = words || key;
    b.addEventListener("click", () => tapped(key));
    el.append(b);
  }
  el.style.opacity = "1";
}
