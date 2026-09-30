import type { WindowManager } from "../windows";

/**
 * The small, plain windows: My Computer, My Documents, the Recycle Bin, and
 * the message box (for the cafe's locked-down settings, as every cafe had).
 */

/** Icon pictures, as CSS backgrounds (simple painted shapes, no image files). */
export const ICONS = {
  computer: "linear-gradient(#e8e0b0 55%, #6f7f96 55% 70%, #e8e0b0 70%)",
  documents: "linear-gradient(135deg, #f2d36b 60%, #d9a441 60%)",
  xplorer: "radial-gradient(circle at 40% 40%, #7fc3ff, #1a5fb4 70%)",
  yaaho: "radial-gradient(circle at 50% 45%, #f2d024 55%, #6a2c91 56%)",
  recycle: "linear-gradient(#cfd8dc 20%, #9aa7ad 20% 25%, #cfd8dc 25%)",
  folder: "linear-gradient(#f5d27a 30%, #e8b84a 30%)",
  file: "linear-gradient(90deg, #fff 80%, #ccc 80%)",
  paint: "conic-gradient(#e53935 0 25%, #fdd835 0 50%, #43a047 0 75%, #1e88e5 0)",
  game: "linear-gradient(135deg, #2e7d32 50%, #c62828 50%)",
  control: "linear-gradient(#90caf9 50%, #6d8faf 50%)",
  logoff: "radial-gradient(circle, #f2c542 55%, #b8860b 56%)",
  power: "radial-gradient(circle, #e74c3c 55%, #8e1f14 56%)",
  disc: "radial-gradient(circle, #fff 12%, #9aa7ad 13% 18%, #e0e6ea 19% 45%, #b8c4cc 46% 69%, transparent 70%)",
  info: "radial-gradient(circle, #3c8cfe 60%, #1a4fb0 61%)",
};

const el = (html: string) => {
  const d = document.createElement("div");
  d.innerHTML = html;
  d.style.height = "100%"; // (so a grey dialog fills its window to the bottom)
  return d;
};

/** A list of things with icons (a folder's contents). */
function listing(items: [string, string][]): HTMLElement {
  return el(`<div style="padding:10px;display:flex;flex-wrap:wrap;gap:14px">${items
    .map(([icon, name]) => `<div style="width:84px;text-align:center"><div style="width:34px;height:34px;margin:0 auto 4px;border-radius:4px;background:${icon}"></div>${name}</div>`)
    .join("")}</div>`);
}

export function openMyComputer(wm: WindowManager) {
  wm.open({
    id: "computer", title: "My Computer", icon: ICONS.computer, x: 120, y: 60, w: 460, h: 300,
    content: listing([[ICONS.computer, "Local Disk (C:)"], [ICONS.computer, "Local Disk (D:)"], [ICONS.disc, "DVD-RW Drive (E:)"], [ICONS.folder, "Shared Documents"]]),
  });
}

export function openMyDocuments(wm: WindowManager) {
  wm.open({
    id: "documents", title: "My Documents", icon: ICONS.documents, x: 160, y: 90, w: 460, h: 300,
    content: listing([[ICONS.folder, "My Music"], [ICONS.folder, "My Pictures"], [ICONS.folder, "New Folder (2)"], [ICONS.file, "resume_final_FINAL.doc"], [ICONS.file, "Copy of desktop.ini"]]),
  });
}

export function openRecycleBin(wm: WindowManager) {
  wm.open({
    id: "recycle", title: "Recycle Bin", icon: ICONS.recycle, x: 200, y: 120, w: 400, h: 240,
    content: el(`<div style="padding:16px;color:#666">The Recycle Bin is empty.</div>`),
  });
}

/** A message box: an icon, a message, an OK button. */
export function messageBox(wm: WindowManager, id: string, title: string, message: string) {
  const body = el(`<div style="display:flex;gap:14px;padding:16px 16px 10px;background:#ece9d8;height:100%;box-sizing:border-box">
    <div style="width:32px;height:32px;flex:none;border-radius:50%;background:${ICONS.info};color:#fff;font:bold 20px Georgia;display:flex;align-items:center;justify-content:center">i</div>
    <div style="flex:1"><div style="margin-bottom:16px;line-height:1.4">${message}</div>
    <div style="text-align:center"><span class="xp-button ok">OK</span></div></div></div>`);
  const win = wm.open({ id, title, icon: ICONS.info, x: 220, y: 190, w: 380, h: 170, content: body });
  body.querySelector(".ok")!.addEventListener("click", () => wm.close(win));
}
