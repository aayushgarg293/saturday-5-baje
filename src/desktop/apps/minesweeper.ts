import { addStyles } from "../css";
import type { Kit } from "../kit";
import { ICONS } from "./basic";

/**
 * Minesweeper, the Beginner board: 9 × 9, 10 mines. Click a square to open
 * it (the first one's always safe); a number says how many mines touch it;
 * right-click to plant a flag. Open every safe square to win. The smiley
 * starts a new game; the red counters show mines left and seconds.
 *
 * Every cafe PC had it, and every cafe owner found someone playing it for
 * an hour on a Rs 20 ticket.
 */

const SIZE = 9, MINES = 10;
/** The classic colours of the numbers 1–8. */
const NUMBER_COLOURS = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];

type Cell = { mine: boolean; open: boolean; flag: boolean; near: number };

export function openMinesweeper(kit: Kit) {
  addStyles("minesweeper", CSS);
  const root = document.createElement("div");
  root.className = "ms";
  root.innerHTML = `<div class="ms-menu">Game &nbsp; Help</div><div class="ms-frame"><div class="ms-top">
    <div class="ms-led left"></div><div class="ms-face">🙂</div><div class="ms-led time"></div></div><div class="ms-grid"></div></div>`;
  const grid = root.querySelector<HTMLDivElement>(".ms-grid")!;
  const face = root.querySelector<HTMLDivElement>(".ms-face")!;
  const leftEl = root.querySelector<HTMLDivElement>(".left")!;
  const timeEl = root.querySelector<HTMLDivElement>(".time")!;

  let cells: Cell[] = [];
  let state: "ready" | "playing" | "won" | "lost" = "ready";
  let seconds = 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= SIZE || y >= SIZE ? null : cells[y * SIZE + x]);
  const around = (k: number) => {
    const x = k % SIZE, y = Math.floor(k / SIZE), out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy)) out.push((y + dy) * SIZE + x + dx);
    return out;
  };

  function newGame() {
    cells = Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, flag: false, near: 0 }));
    state = "ready";
    seconds = 0;
    face.textContent = "🙂";
    draw();
  }

  /** Lay the mines once the first square is chosen, never on it or around it. */
  function layMines(first: number) {
    const keepClear = new Set([first, ...around(first)]);
    let laid = 0;
    while (laid < MINES) {
      const k = Math.floor(Math.random() * cells.length);
      if (cells[k].mine || keepClear.has(k)) continue;
      cells[k].mine = true;
      laid++;
    }
    cells.forEach((c, k) => (c.near = around(k).filter((j) => cells[j].mine).length));
  }

  function open(k: number) {
    const c = cells[k];
    if (c.open || c.flag) return;
    c.open = true;
    // an empty square opens everything round it (and on, until numbers)
    if (!c.mine && c.near === 0) for (const j of around(k)) open(j);
  }

  function click(k: number) {
    if (state === "won" || state === "lost" || cells[k].flag) return;
    if (state === "ready") {
      layMines(k);
      state = "playing";
    }
    if (cells[k].mine) {
      state = "lost";
      face.textContent = "😵";
      cells.forEach((c) => { if (c.mine) c.open = true; });
      cells[k].near = -1; // (the one you hit, shown red)
    } else {
      open(k);
      if (cells.every((c) => c.mine || c.open)) {
        state = "won";
        face.textContent = "😎";
        cells.forEach((c) => { if (c.mine) c.flag = true; });
      }
    }
    draw();
  }

  function flag(k: number) {
    if (state !== "playing" && state !== "ready") return;
    if (!cells[k].open) cells[k].flag = !cells[k].flag;
    draw();
  }

  function draw() {
    grid.innerHTML = "";
    cells.forEach((c, k) => {
      const d = document.createElement("div");
      d.className = "ms-cell" + (c.open ? " open" : "");
      if (c.open && c.mine) {
        d.textContent = "✹";
        if (c.near === -1) d.classList.add("hit");
      } else if (c.open && c.near > 0) {
        d.textContent = String(c.near);
        d.style.color = NUMBER_COLOURS[c.near];
      } else if (c.flag) d.textContent = "⚑";
      d.addEventListener("mousedown", (e) => {
        if (e.button === 0 && state !== "won" && state !== "lost") face.textContent = "😮"; // (the face as you press)
      });
      d.addEventListener("click", () => {
        if (state === "playing" || state === "ready") face.textContent = "🙂";
        click(k);
      });
      d.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        flag(k);
      });
      grid.append(d);
    });
    const flags = cells.filter((c) => c.flag).length;
    leftEl.textContent = String(Math.max(0, MINES - flags)).padStart(3, "0");
    timeEl.textContent = String(Math.min(999, Math.floor(seconds))).padStart(3, "0");
  }

  face.addEventListener("click", () => {
    kit.sounds.play("click");
    newGame();
  });
  const stop = kit.tick((dt) => {
    if (state !== "playing") return;
    const before = Math.floor(seconds);
    seconds += dt;
    if (Math.floor(seconds) !== before) timeEl.textContent = String(Math.min(999, Math.floor(seconds))).padStart(3, "0");
  });
  newGame();
  kit.wm.open({ id: "minesweeper", title: "Minesweeper", icon: ICONS.mines, x: 240, y: 110, w: 196, h: 268, content: root, onClose: stop });
}

const CSS = /* css */ `
.ms { height: 100%; background: #c0c0c0; user-select: none; }
.ms-menu { padding: 2px 6px; background: #ece9d8; border-bottom: 1px solid #aca899; }
.ms-frame { margin: 6px; padding: 5px; border: 3px solid; border-color: #fff #808080 #808080 #fff; }
.ms-top { display: flex; justify-content: space-between; align-items: center; padding: 4px; margin-bottom: 6px;
  border: 2px solid; border-color: #808080 #fff #fff #808080; }
.ms-led { width: 39px; padding: 1px 2px; color: #ff0000; background: #000; font: bold 20px "Courier New", monospace; text-align: right; }
.ms-face { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 15px;
  background: #c0c0c0; border: 2px solid; border-color: #fff #808080 #808080 #fff; }
.ms-face:active { border-color: #808080 #fff #fff #808080; }
.ms-grid { display: grid; grid-template-columns: repeat(${SIZE}, 16px); border: 3px solid; border-color: #808080 #fff #fff #808080; width: max-content; }
.ms-cell { width: 16px; height: 16px; box-sizing: border-box; border: 2px solid; border-color: #fff #808080 #808080 #fff;
  font: bold 12px Arial, sans-serif; line-height: 12px; text-align: center; color: #c00; }
.ms-cell.open { border: 1px solid #808080; border-width: 0 1px 1px 0; line-height: 15px; color: #000; }
.ms-cell.hit { background: #ff0000; }
`;
