import { addStyles } from "../css";
import type { Kit } from "../kit";
import { portal } from "../sites/portal";
import { songz } from "../sites/songz";
import type { XpWindow } from "../windows";
import { ICONS } from "./basic";

/**
 * Internet Xplorer (a look-alike): Back, Home, the address bar, a Links
 * bar, the page, and the status bar at the bottom.
 *
 * On dial-up a page arrived slowly, top to bottom: this shows it uncovering
 * from the top over a few seconds while the status bar says "Opening page…",
 * then "Done".
 *
 * The sites are in `sites/`: each is a function that, given a path on that
 * site, builds the page (or returns null: "The page cannot be displayed").
 */

export type Page = {
  title: string;
  body: HTMLElement;
  /** Keys pressed while this page is showing (a search box being typed in). */
  keys?: (e: KeyboardEvent) => boolean;
};

/** What a page can do: go to another page, and reach the rest of the desktop. */
export type Nav = { go(url: string): void; kit: Kit };

/** A site: a page for `path` (the part after the site's address), or null if there's no such page. */
export type Site = (path: string, nav: Nav) => Page | null;

const SITES: Record<string, Site> = {
  "www.rediffit.com": portal,
  "www.songzpk.com": songz,
};

/** The page it opens on: the cafe owner set the portal as the home page. */
const HOME = "www.rediffit.com";

/** The Links bar: the sites everyone went to. */
const LINKS: [string, string][] = [
  ["Rediffit", "www.rediffit.com"],
  ["SongzPK", "www.songzpk.com"],
  ["Rediffit Mail", "mail.rediffit.com"],
  ["Yorkut", "www.yorkut.com"],
  ["MeToob", "www.metoob.com"],
];

/** Seconds a page takes to arrive, roughly (dial-up). */
const LOAD = 2.8;

export class Xplorer {
  private win: XpWindow | null = null;
  private root = document.createElement("div");
  private address!: HTMLSpanElement;
  private view!: HTMLDivElement;
  private status!: HTMLSpanElement;
  private history: string[] = [];
  private page: Page | null = null;
  private loading = -1; // seconds into loading the page (−1: not loading)
  private loadTime = LOAD;

  constructor(private kit: Kit) {
    addStyles("xplorer", CSS);
    this.build();
    kit.tick((dt) => this.update(dt));
  }

  /** Open the browser (on its home page the first time). */
  open() {
    if (this.win && this.kit.wm.list().includes(this.win)) {
      this.kit.wm.restore(this.win);
      return;
    }
    this.win = this.kit.wm.open({ id: "xplorer", title: "Internet Xplorer", icon: ICONS.xplorer, x: 30, y: 12, w: 680, h: 520, content: this.root });
    this.win.onKey = (e) => (this.loading < 0 && this.page?.keys?.(e)) || false;
    if (!this.history.length) this.go(HOME);
  }

  /** Go to an address ("www.songzpk.com/search"). */
  go(url: string) {
    this.history.push(url);
    this.show(url);
  }

  private back() {
    if (this.history.length < 2) return;
    this.history.pop();
    this.show(this.history[this.history.length - 1]);
  }

  private show(url: string) {
    const slash = url.indexOf("/");
    const host = slash < 0 ? url : url.slice(0, slash);
    const path = slash < 0 ? "" : url.slice(slash + 1);
    const nav: Nav = { go: (u) => this.go(u), kit: this.kit };
    this.page = SITES[host]?.(path, nav) ?? cannotDisplay();
    this.address.textContent = `http://${url}`;
    this.view.innerHTML = "";
    this.view.append(this.page.body);
    this.view.scrollTop = 0;
    this.loading = 0;
    this.loadTime = LOAD * (0.7 + Math.random() * 0.6);
    this.status.textContent = `Opening page http://${url}...`;
    this.reveal(0);
    this.win?.setTitle(`${this.page.title} - Internet Xplorer`);
  }

  private update(dt: number) {
    if (this.loading < 0) return;
    this.loading += dt;
    const k = Math.min(1, this.loading / this.loadTime);
    this.reveal(k);
    if (k >= 1) {
      this.loading = -1;
      this.status.textContent = "Done";
    }
  }

  /** Uncover the page from the top: `k` from 0 (nothing yet) to 1 (all of it). */
  private reveal(k: number) {
    // it arrives in uneven bursts, as dial-up did
    const bursty = Math.min(1, Math.floor(k * 7) / 7 + (k * 7 % 1) * 0.3);
    this.page!.body.style.clipPath = k >= 1 ? "" : `inset(0 0 ${Math.round((1 - bursty) * 100)}% 0)`;
  }

  private build() {
    const r = this.root;
    r.className = "ie";
    r.innerHTML = `
      <div class="ie-menu">File &nbsp; Edit &nbsp; View &nbsp; Favorites &nbsp; Tools &nbsp; Help</div>
      <div class="ie-tools"><span class="ie-btn back">◀ Back</span><span class="ie-btn off">▶</span><span class="ie-btn stop">✕</span>
        <span class="ie-btn home">⌂ Home</span><span class="ie-btn off">☆ Favorites</span></div>
      <div class="ie-address">Address <span class="ie-url"></span><span class="ie-go">→ Go</span></div>
      <div class="ie-links">Links</div>
      <div class="ie-view"></div>
      <div class="ie-status"><span class="text"></span><span class="zone">Internet</span></div>`;
    this.address = r.querySelector(".ie-url")!;
    this.view = r.querySelector(".ie-view")!;
    this.status = r.querySelector(".ie-status .text")!;
    r.querySelector(".back")!.addEventListener("click", () => this.back());
    r.querySelector(".home")!.addEventListener("click", () => this.go(HOME));
    r.querySelector(".stop")!.addEventListener("click", () => {
      if (this.loading >= 0) this.update(this.loadTime); // (stop: show what's there)
    });
    const links = r.querySelector(".ie-links")!;
    for (const [name, url] of LINKS) {
      const a = document.createElement("span");
      a.className = "ie-link";
      a.textContent = name;
      a.addEventListener("click", () => this.go(url));
      links.append(a);
    }
  }
}

/** Internet Xplorer's own error page, for any address it can't reach. */
function cannotDisplay(): Page {
  const body = document.createElement("div");
  body.className = "ie-error";
  body.innerHTML = `<h1>The page cannot be displayed</h1>
    <p>The page you are looking for is currently unavailable. The Web site might be experiencing technical
    difficulties, or you may need to adjust your browser settings.</p><hr>
    <p>Please try the following:</p><ul><li>Click the Refresh button, or try again later.</li>
    <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li></ul>
    <p class="small">Cannot find server or DNS Error<br>Internet Xplorer</p>`;
  return { title: "Cannot find server", body };
}

const CSS = /* css */ `
.ie { height: 100%; display: flex; flex-direction: column; background: #ece9d8; }
.ie-menu { flex: none; padding: 3px 6px; border-bottom: 1px solid #d0cbb8; }
.ie-tools { flex: none; display: flex; gap: 4px; padding: 3px 5px; border-bottom: 1px solid #d0cbb8; }
.ie-btn { padding: 3px 8px; border-radius: 3px; }
.ie-btn:hover { background: #fff; box-shadow: inset 0 0 0 1px #aab; }
.ie-btn.off { color: #aaa; }
.ie-btn.back { color: #1d6b1d; font-weight: bold; }
.ie-address { flex: none; display: flex; align-items: center; gap: 6px; padding: 3px 6px; color: #555; border-bottom: 1px solid #d0cbb8; }
.ie-url { flex: 1; padding: 2px 5px; color: #000; background: #fff; border: 1px solid #7f9db9; white-space: nowrap; overflow: hidden; }
.ie-go { color: #1d6b1d; }
.ie-links { flex: none; display: flex; gap: 12px; padding: 3px 6px; color: #555; border-bottom: 1px solid #b8b39e; }
.ie-link { color: #000; }
.ie-link::before { content: "e "; color: #1a5fb4; font: bold italic 11px Georgia, serif; }
.ie-link:hover { text-decoration: underline; }
.ie-view { flex: 1; overflow: auto; background: #fff; user-select: text; }
.ie-status { flex: none; display: flex; justify-content: space-between; padding: 2px 6px; border-top: 1px solid #fff; }
.ie-error { padding: 16px 24px; font: 12px Verdana, sans-serif; color: #000; }
.ie-error h1 { font: bold 18px Verdana, sans-serif; margin: 0 0 12px; }
.ie-error .small { color: #555; font-size: 11px; }
`;
