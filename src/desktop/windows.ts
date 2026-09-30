import type { DesktopSounds } from "./sounds";

/**
 * Windows on the desktop, XP style: a blue title bar you drag it by, its
 * minimise and close buttons, and a body the app fills. The manager keeps
 * the stacking order (the last clicked is on top, the others go pale) and
 * tells the taskbar what's open.
 */

export type WindowOptions = {
  /** Also the key: opening a window that's already open just brings it forward. */
  id: string;
  title: string;
  /** The little picture in its title bar and taskbar button (a CSS background). */
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Fills the window's body. */
  content: HTMLElement;
  onClose?: () => void;
};

export type XpWindow = {
  id: string;
  title: string;
  icon: string;
  el: HTMLDivElement;
  body: HTMLDivElement;
  minimised: boolean;
  setTitle(title: string): void;
  /** Shake it (a BUZZ!). */
  shake(): void;
  /** Keys pressed while this window is in front (typing): return true if used. */
  onKey?: (e: KeyboardEvent) => boolean;
};

export class WindowManager {
  private windows: XpWindow[] = [];
  private top = 10;
  /** Called whenever the set of windows, their order or state changes (the taskbar redraws). */
  onChange: () => void = () => {};

  constructor(private screen: HTMLElement, private scale: () => number, private sounds: DesktopSounds) {}

  /** The open windows, in the order they were opened. */
  list(): readonly XpWindow[] {
    return this.windows;
  }

  focused(): XpWindow | undefined {
    return this.windows.filter((w) => !w.minimised).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
  }

  open(o: WindowOptions): XpWindow {
    const existing = this.windows.find((w) => w.id === o.id);
    if (existing) {
      this.restore(existing);
      return existing;
    }
    const el = document.createElement("div");
    el.className = "xp-window";
    Object.assign(el.style, { left: `${o.x}px`, top: `${o.y}px`, width: `${o.w}px`, height: `${o.h}px` });
    const title = document.createElement("div");
    title.className = "xp-title";
    title.innerHTML = `<div class="pic" style="background:${o.icon}"></div><div class="name"></div><div class="b min">_</div><div class="b close">✕</div>`;
    title.querySelector(".name")!.textContent = o.title;
    const body = document.createElement("div");
    body.className = "xp-body";
    body.append(o.content);
    el.append(title, body);
    this.screen.append(el);

    const win: XpWindow = {
      id: o.id, title: o.title, icon: o.icon, el, body, minimised: false,
      setTitle: (t) => {
        win.title = t;
        title.querySelector(".name")!.textContent = t;
        this.onChange();
      },
      shake: () => {
        const x0 = el.offsetLeft;
        let k = 0;
        const step = () => {
          el.style.left = `${x0 + (k % 2 ? 6 : -6) * (1 - k / 12)}px`;
          if (++k <= 12) setTimeout(step, 30);
          else el.style.left = `${x0}px`;
        };
        step();
      },
    };
    this.windows.push(win);

    // clicking anywhere on it brings it forward
    el.addEventListener("pointerdown", () => this.focus(win));
    title.querySelector(".min")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.sounds.play("click");
      this.minimise(win);
    });
    title.querySelector(".close")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.sounds.play("click");
      this.close(win);
      o.onClose?.();
    });
    // dragging by the title bar (the screen is scaled: divide the mouse's movement by the scale)
    title.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).classList.contains("b")) return;
      const startX = e.clientX, startY = e.clientY, left = el.offsetLeft, top = el.offsetTop;
      const move = (m: PointerEvent) => {
        const k = this.scale();
        el.style.left = `${Math.round(left + (m.clientX - startX) / k)}px`;
        el.style.top = `${Math.max(0, Math.round(top + (m.clientY - startY) / k))}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });

    this.focus(win);
    return win;
  }

  focus(win: XpWindow) {
    win.el.style.zIndex = String(++this.top);
    for (const w of this.windows) w.el.classList.toggle("inactive", w !== win);
    this.onChange();
  }

  minimise(win: XpWindow) {
    win.minimised = true;
    win.el.classList.add("minimised");
    const next = this.focused();
    if (next) this.focus(next);
    else this.onChange();
  }

  restore(win: XpWindow) {
    win.minimised = false;
    win.el.classList.remove("minimised");
    this.focus(win);
  }

  close(win: XpWindow) {
    win.el.remove();
    this.windows = this.windows.filter((w) => w !== win);
    const next = this.focused();
    if (next) this.focus(next);
    else this.onChange();
  }

  closeAll() {
    for (const w of [...this.windows]) this.close(w);
  }
}
