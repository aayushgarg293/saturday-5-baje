import type { AudioEngine } from "../audio/engine";
import { ICONS, messageBox, openFolder, openMyComputer, openMyDocuments, openRecycleBin } from "./apps/basic";
import { Xplorer } from "./apps/xplorer";
import { Yaaho } from "./apps/yaaho";
import { Files } from "./files";
import { type Kit, Tasks } from "./kit";
import { type DesktopSounds, desktopSounds } from "./sounds";
import { CSS, SCREEN } from "./styles";
import { wallpaperImage } from "./wallpaper";
import { WindowManager } from "./windows";

/**
 * The computer's desktop, when you've leaned in to use it: Windoze XP (a
 * look-alike), filling your view, seen through the glass of the CRT (its
 * beige bezel round the edge, faint scanlines, darker curved corners).
 *
 * It's an HTML page laid over the game (not drawn in 3D): 800 × 600 of its
 * own pixels, scaled up to fit, with an XP arrow for the mouse. While it's
 * up, the game doesn't draw the 3D room (main.ts), and the mouse isn't
 * captured.
 *
 * Esc, or a click on the bezel, leans you back out to the booth.
 */

type App = { name: string; icon: string; open: () => void };

export class Desktop {
  isOpen = false;
  /** You want to lean back out: Esc (`byClick` false), or a click on the bezel (true). */
  onLeave: (byClick: boolean) => void = () => {};
  /** You chose Log Off. */
  onLogOff: () => void = () => {};

  readonly windows: WindowManager;
  readonly kit: Kit;
  readonly yaaho: Yaaho;
  readonly xplorer: Xplorer;
  /** Things moved on every frame while the desktop is up (downloads, pages loading, the chats). */
  private tickers = new Set<(dt: number) => void>();
  readonly sounds: DesktopSounds;
  private overlay: HTMLDivElement;
  private glass: HTMLDivElement;
  private screen: HTMLDivElement;
  private menu: HTMLDivElement;
  private tasks: HTMLDivElement;
  private clock: HTMLSpanElement;
  private scale = 1;
  private chimed = false;
  /** The apps, by name (later steps add Yaaho! Messenger, Internet Xplorer…). */
  readonly apps: Record<string, App> = {};

  constructor(engine: AudioEngine) {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.append(style);
    this.sounds = desktopSounds(engine);

    this.overlay = div("xp-overlay");
    this.overlay.hidden = true;
    const bezel = div("xp-bezel");
    this.glass = div("xp-glass");
    this.screen = div("xp-screen");
    this.screen.style.backgroundImage = `url(${wallpaperImage(SCREEN.w, SCREEN.h)})`;
    this.glass.append(this.screen, div("xp-crt"));
    bezel.append(this.glass);
    this.overlay.append(bezel);
    document.body.append(this.overlay);
    // a click on the bezel or round it (not on the screen) leans you back. (Checked by what was
    // clicked, not by "is it outside the screen": a link's page is gone by the time its click gets here.)
    this.overlay.addEventListener("click", (e) => {
      if (this.isOpen && (e.target === this.overlay || e.target === bezel)) this.onLeave(true);
    });

    this.windows = new WindowManager(this.screen, () => this.scale, this.sounds);
    this.windows.onChange = () => this.drawTasks();

    this.kit = {
      wm: this.windows,
      sounds: this.sounds,
      files: new Files(),
      tasks: new Tasks(),
      tick: (fn) => {
        this.tickers.add(fn);
        return () => this.tickers.delete(fn);
      },
    };
    this.yaaho = new Yaaho(this.kit);
    this.xplorer = new Xplorer(this.kit);
    this.addApp("computer", "My Computer", ICONS.computer, () => openMyComputer(this.windows));
    this.addApp("documents", "My Documents", ICONS.documents, () => openMyDocuments(this.kit));
    this.addApp("xplorer", "Internet Xplorer", ICONS.xplorer, () => this.xplorer.open());
    this.addApp("yaaho", "Yaaho! Messenger", ICONS.yaaho, () => this.yaaho.openList());
    this.addApp("recycle", "Recycle Bin", ICONS.recycle, () => openRecycleBin(this.windows));

    // the taskbar: start, the open windows, the tray (the time)
    const taskbar = div("xp-taskbar");
    const start = div("xp-start");
    start.innerHTML = `<span style="display:inline-block;width:18px;height:18px;border-radius:3px;background:conic-gradient(#e53935 0 25%,#43a047 0 50%,#fdd835 0 75%,#1e88e5 0)"></span>start`;
    this.tasks = div("xp-tasks");
    const tray = div("xp-tray");
    tray.innerHTML = `<div class="smiley" title="Yaaho! Messenger"></div><span class="time"></span>`;
    this.clock = tray.querySelector(".time")!;
    tray.querySelector(".smiley")!.addEventListener("click", () => this.yaaho.openList());
    taskbar.append(start, this.tasks, tray);
    this.screen.append(taskbar);

    this.menu = this.buildMenu();
    this.screen.append(this.menu);
    start.addEventListener("click", (e) => {
      e.stopPropagation();
      this.sounds.play("click");
      this.menu.classList.toggle("open");
    });
    this.screen.addEventListener("click", () => this.menu.classList.remove("open"));

    window.addEventListener("resize", () => this.fit());
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.code === "Escape") this.onLeave(false);
      // other keys go to the window in front (typing a reply, a search…)
      else if (this.windows.focused()?.onKey?.(e)) e.preventDefault();
    });
    this.drawIcons();
  }

  /** Add an app: a desktop icon (in order), and a way to open it by name. */
  addApp(key: string, name: string, icon: string, open: () => void) {
    this.apps[key] = { name, icon, open };
    this.drawIcons();
  }

  /** Show the desktop (you've leaned in). */
  show() {
    this.isOpen = true;
    this.overlay.hidden = false;
    this.fit();
    requestAnimationFrame(() => this.overlay.classList.add("open")); // (fades in)
    if (!this.chimed) {
      this.chimed = true;
      this.sounds.play("chime");
    }
  }

  /** Hide it (you've leaned back). */
  hide() {
    this.isOpen = false;
    this.menu.classList.remove("open");
    this.overlay.classList.remove("open");
    setTimeout(() => { if (!this.isOpen) this.overlay.hidden = true; }, 350);
  }

  /** Every frame. The desktop's life (the chats) only moves on while you're on it. */
  update(dt: number) {
    if (!this.isOpen) return;
    this.yaaho.update(dt);
    for (const fn of this.tickers) fn(dt);
  }

  /** The time in the tray. */
  setTime(label: string) {
    if (this.clock.textContent !== label) this.clock.textContent = label;
  }

  /** Close everything (after logging off). */
  reset() {
    this.windows.closeAll();
    this.chimed = false;
  }

  /** Scale the 800×600 screen to fit the window, inside its bezel. */
  private fit() {
    // as big as fits, leaving just room for the bezel (2 × 1.2vh) and a sliver round it
    this.scale = Math.min((window.innerWidth * 0.95) / SCREEN.w, (window.innerHeight * 0.95) / SCREEN.h);
    this.glass.style.width = `${SCREEN.w * this.scale}px`;
    this.glass.style.height = `${SCREEN.h * this.scale}px`;
    this.screen.style.transform = `scale(${this.scale})`;
  }

  private drawIcons() {
    if (!this.screen) return;
    for (const old of this.screen.querySelectorAll(".xp-icon")) old.remove();
    Object.values(this.apps).forEach((app, k) => {
      const icon = div("xp-icon");
      icon.style.left = `${12}px`;
      icon.style.top = `${12 + k * 84}px`; // (room for a two-line name)
      icon.innerHTML = `<div class="pic" style="background:${app.icon}"></div><span></span>`;
      icon.querySelector("span")!.textContent = app.name;
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        for (const i of this.screen.querySelectorAll(".xp-icon")) i.classList.remove("selected");
        icon.classList.add("selected");
        this.menu.classList.remove("open");
      });
      icon.addEventListener("dblclick", () => {
        this.sounds.play("click");
        app.open();
      });
      this.screen.append(icon);
    });
  }

  private drawTasks() {
    this.tasks.innerHTML = "";
    const focused = this.windows.focused();
    for (const w of this.windows.list()) {
      const t = div("xp-task" + (w === focused ? " focused" : ""));
      t.textContent = w.title;
      t.addEventListener("click", (e) => {
        e.stopPropagation();
        if (w.minimised) this.windows.restore(w);
        else if (w === focused) this.windows.minimise(w);
        else this.windows.focus(w);
      });
      this.tasks.append(t);
    }
  }

  private buildMenu(): HTMLDivElement {
    const menu = div("xp-menu");
    const item = (icon: string, name: string, action: () => void) => {
      const d = div("item");
      d.innerHTML = `<div class="pic" style="background:${icon}"></div><span></span>`;
      d.querySelector("span")!.textContent = name;
      d.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("open");
        this.sounds.play("click");
        action();
      });
      return d;
    };
    const denied = () => messageBox(this.windows, "denied", "Restrictions",
      "This operation has been cancelled due to restrictions in effect on this computer. Please contact your system administrator.");
    const left = div("left"), right = div("right");
    const byName = (key: string) => () => this.apps[key]?.open();
    left.append(
      item(ICONS.xplorer, "Internet Xplorer", byName("xplorer")),
      item(ICONS.yaaho, "Yaaho! Messenger", byName("yaaho")),
      item(ICONS.paint, "Paint", denied),
      item(ICONS.game, "Solitaire", denied),
      item(ICONS.game, "Minesweeper", denied),
    );
    right.append(
      item(ICONS.documents, "My Documents", byName("documents")),
      item(ICONS.music, "My Music", () => openFolder(this.kit, "music")),
      item(ICONS.computer, "My Computer", byName("computer")),
      item(ICONS.control, "Control Panel", denied),
    );
    const head = div("head");
    head.innerHTML = `<div class="pic"></div>Guest`;
    const cols = div("cols");
    cols.append(left, right);
    const foot = div("foot");
    const logOff = div("btn");
    logOff.innerHTML = `<div class="pic" style="background:${ICONS.logoff}"></div>Log Off`;
    logOff.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.remove("open");
      this.sounds.play("click");
      this.confirmLogOff();
    });
    const off = div("btn");
    off.innerHTML = `<div class="pic" style="background:${ICONS.power}"></div>Turn Off Computer`;
    off.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.remove("open");
      messageBox(this.windows, "management", "Management", "Kripya computer band na karein. Log Off karke jaayein. — Management");
    });
    foot.append(logOff, off);
    menu.append(head, cols, foot);
    return menu;
  }

  /** "Log Off Windoze": are you sure? */
  private confirmLogOff() {
    const box = document.createElement("div");
    box.style.height = "100%";
    box.innerHTML = `<div style="background:#ece9d8;height:100%;padding:18px;box-sizing:border-box;text-align:center">
      <div style="margin-bottom:18px;font-size:12px">Are you sure you want to log off?</div>
      <span class="xp-button yes">Log Off</span> &nbsp; <span class="xp-button no">Cancel</span></div>`;
    const win = this.windows.open({ id: "logoff", title: "Log Off Windoze", icon: ICONS.logoff, x: 260, y: 220, w: 280, h: 130, content: box });
    box.querySelector(".no")!.addEventListener("click", () => this.windows.close(win));
    box.querySelector(".yes")!.addEventListener("click", () => {
      this.windows.close(win);
      this.onLogOff();
    });
  }
}

function div(className: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = className;
  return d;
}
