import { ICONS } from "./apps/basic";
import { FOLDERS, type Folder, sizeLabel, type VFile } from "./files";
import type { Kit } from "./kit";

/**
 * The XP "Open" box: pick a file to send or attach. The folders down the
 * left, the files in the chosen one, then Open (or double-click a file).
 */
export function openBox(kit: Kit, o: { title: string; folder: Folder; onPick: (file: VFile) => void }) {
  let folder = o.folder;
  let chosen: VFile | null = null;

  const root = document.createElement("div");
  root.className = "xp-dialog xp-openbox";
  root.innerHTML = `<div class="places"></div><div class="main">
      <div class="look">Look in: <b></b></div><div class="files"></div>
      <div class="name">File name: <span class="xp-field"></span></div>
      <div class="buttons"><span class="xp-button open">Open</span> <span class="xp-button cancel">Cancel</span></div>
    </div>`;
  const places = root.querySelector<HTMLDivElement>(".places")!;
  const filesEl = root.querySelector<HTMLDivElement>(".files")!;
  const nameEl = root.querySelector<HTMLSpanElement>(".xp-field")!;

  const win = kit.wm.open({ id: "openbox", title: o.title, icon: ICONS.folder, x: 170, y: 110, w: 460, h: 300, content: root });
  const close = () => {
    kit.files.onChange.delete(draw);
    kit.wm.close(win);
  };
  const pick = () => {
    if (!chosen) return;
    close();
    o.onPick(chosen);
  };
  root.querySelector(".open")!.addEventListener("click", pick);
  root.querySelector(".cancel")!.addEventListener("click", close);

  function draw() {
    places.innerHTML = "";
    for (const f of Object.keys(FOLDERS) as Folder[]) {
      const p = document.createElement("div");
      p.className = "place" + (f === folder ? " here" : "");
      p.innerHTML = `<div class="pic" style="background:${ICONS.folder}"></div><span></span>`;
      p.querySelector("span")!.textContent = FOLDERS[f];
      p.addEventListener("click", () => {
        folder = f;
        chosen = null;
        draw();
      });
      places.append(p);
    }
    root.querySelector(".look b")!.textContent = FOLDERS[folder];
    filesEl.innerHTML = "";
    for (const file of kit.files.list(folder)) {
      const row = document.createElement("div");
      row.className = "file" + (file === chosen ? " chosen" : "");
      row.innerHTML = `<div class="pic" style="background:${file.kind === "mp3" ? ICONS.music : ICONS.photo}"></div><span></span><i></i>`;
      row.querySelector("span")!.textContent = file.name;
      row.querySelector("i")!.textContent = sizeLabel(file.size);
      row.addEventListener("click", () => {
        chosen = file;
        draw();
      });
      row.addEventListener("dblclick", () => {
        chosen = file;
        pick();
      });
      filesEl.append(row);
    }
    nameEl.textContent = chosen?.name ?? "";
  }
  draw();
  kit.files.onChange.add(draw);
}
