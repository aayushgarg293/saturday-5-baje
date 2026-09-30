/** Add a stylesheet to the page, once (each app keeps its own look next to its code). */
const added = new Set<string>();

export function addStyles(name: string, css: string) {
  if (added.has(name)) return;
  added.add(name);
  const s = document.createElement("style");
  s.textContent = css;
  document.head.append(s);
}
