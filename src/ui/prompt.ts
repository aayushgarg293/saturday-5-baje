/**
 * A key prompt near the bottom of the screen ("E  sit down"), shown while
 * something can be done where you are. `show(null)` hides it.
 */

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
    return;
  }
  el.innerHTML = "";
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
