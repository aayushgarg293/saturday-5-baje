import { ICONS } from "./apps/basic";
import { FOLDERS, sizeLabel, type VFile } from "./files";
import type { Kit } from "./kit";
import { Transfer, progressBar } from "./progress";

/** The line's usual download speed, KB per second (a 56k modem on a good day; about a minute of play for a song). */
const DOWN_SPEED = 7;

/**
 * Downloading a file, as Internet Xplorer did it: first "File Download: do
 * you want to open or save this file?", then Save, then a progress window
 * that crawls along (it keeps going while you do other things) and, when
 * it's done, says so. The file then appears in its folder.
 */
export function download(kit: Kit, file: VFile, from: string) {
  const ask = document.createElement("div");
  ask.className = "xp-dialog";
  ask.innerHTML = `<div style="margin-bottom:10px">Do you want to open or save this file?</div>
    <div class="facts"><div class="pic" style="background:${ICONS.music}"></div><div>
      <div>Name: <b></b></div><div>Type: MP3 Format Sound, ${sizeLabel(file.size)}</div><div>From: <span></span></div></div></div>
    <div class="buttons"><span class="xp-button open">Open</span> <span class="xp-button save">Save</span> <span class="xp-button cancel">Cancel</span></div>`;
  ask.querySelector("b")!.textContent = file.name;
  ask.querySelector(".facts span")!.textContent = from;
  const win = kit.wm.open({ id: `download-${file.name}`, title: "File Download", icon: ICONS.info, x: 220, y: 150, w: 360, h: 190, content: ask });
  ask.querySelector(".cancel")!.addEventListener("click", () => kit.wm.close(win));
  // (Open would play it from a temporary folder: Save is the one you want. Both save, as a kindness.)
  for (const b of ask.querySelectorAll(".open, .save")) b.addEventListener("click", () => {
    kit.wm.close(win);
    progress(kit, file, from);
  });
}

function progress(kit: Kit, file: VFile, from: string) {
  const body = document.createElement("div");
  body.className = "xp-dialog";
  body.innerHTML = `<div class="what"></div><div class="from"></div><div class="bar"></div>
    <div class="facts2"><div>Estimated time left: <span class="left"></span></div>
    <div>Download to: C:\\...\\${FOLDERS[file.folder]}\\</div><div>Transfer rate: <span class="rate"></span></div></div>
    <div class="buttons"><span class="xp-button cancel">Cancel</span></div>`;
  body.querySelector(".from")!.textContent = `${file.name} from ${from}`;
  const bar = progressBar();
  body.querySelector(".bar")!.append(bar.el);
  const what = body.querySelector<HTMLDivElement>(".what")!;
  const left = body.querySelector<HTMLSpanElement>(".left")!;
  const rate = body.querySelector<HTMLSpanElement>(".rate")!;

  const win = kit.wm.open({ id: `download-${file.name}`, title: `0% of ${file.name}`, icon: ICONS.xplorer, x: 230, y: 160, w: 360, h: 200, content: body });
  const cancel = body.querySelector<HTMLSpanElement>(".cancel")!;

  const transfer = new Transfer(file.size, DOWN_SPEED, () => {
    stop();
    kit.files.add(file);
    what.textContent = "Download complete";
    win.setTitle("Download complete");
    left.textContent = `${sizeLabel(file.size)} downloaded`;
    bar.set(1);
    cancel.textContent = "Close";
    kit.sounds.play("ding");
  });
  // every frame: move the transfer on; redraw its numbers a few times a second (every frame, they'd flicker)
  let since = 1;
  const stop = kit.tick((dt) => {
    transfer.update(dt);
    since += dt;
    if (since < 0.25 || transfer.done) return;
    since = 0;
    what.textContent = `Saving: ${file.name}`;
    win.setTitle(`${Math.floor(transfer.fraction * 100)}% of ${file.name} Completed`);
    left.textContent = `${transfer.leftLabel} (${sizeLabel(transfer.got)} of ${sizeLabel(file.size)} copied)`;
    rate.textContent = transfer.rateLabel;
    bar.set(transfer.fraction);
  });
  cancel.addEventListener("click", () => {
    stop();
    kit.wm.close(win);
  });
}
