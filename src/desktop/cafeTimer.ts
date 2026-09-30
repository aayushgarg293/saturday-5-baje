import { addStyles } from "./css";

/**
 * The cafe's timer: the little always-on-top strip that cafe software put in
 * the corner of every screen: your booth, the time you've used, what you
 * owe. The owner reads the same numbers at the counter (phase 9: paying).
 *
 * The rates are the board on the cafe's wall (world/signs.ts): ₹15 for half
 * an hour, ₹20 for an hour; after that, ₹10 for each half hour begun.
 */
export function charge(minutes: number): number {
  const halves = Math.max(1, Math.ceil(minutes / 30 - 1e-6));
  if (halves === 1) return 15;
  return 20 + (halves - 2) * 10;
}

export class CafeTimer {
  readonly el = document.createElement("div");
  private shown = "";

  constructor(booth: number) {
    addStyles("cafeTimer", CSS);
    this.el.className = "cafe-timer";
    this.el.innerHTML = `<b>CyberTime</b><span>Booth ${booth}</span><span class="used"></span><span class="owe"></span>`;
  }

  /** Minutes used so far (game minutes). */
  set(minutes: number) {
    const m = Math.max(0, Math.floor(minutes));
    const text = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}|₹${charge(m)}`;
    if (text === this.shown) return;
    this.shown = text;
    const [used, owe] = text.split("|");
    this.el.querySelector(".used")!.textContent = `Used ${used}`;
    this.el.querySelector(".owe")!.textContent = owe;
  }
}

const CSS = /* css */ `
.cafe-timer { position: absolute; top: 0; right: 0; z-index: 970; display: flex; gap: 8px; align-items: center;
  padding: 2px 8px; color: #b8ffb0; font: 10px Tahoma, sans-serif; background: rgba(20, 40, 20, 0.85);
  border-bottom-left-radius: 5px; pointer-events: none; }
.cafe-timer b { color: #fff; }
.cafe-timer .owe { color: #ffe27a; font-weight: bold; }
`;
