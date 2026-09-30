import type { DesktopSounds } from "../sounds";
import { BUDDIES, type Presence, THREADS, YOU } from "../story";
import { type Chat, ThreadRunner } from "../thread";
import { ReplyBox } from "../typing";
import type { WindowManager, XpWindow } from "../windows";
import { ICONS } from "./basic";

/**
 * Yaaho! Messenger (a look-alike): the friends list, and a chat window per
 * friend. It signs in by itself a moment after the desktop comes up, as it
 * did at every cafe.
 *
 * The conversations themselves are in `story.ts`; each is played by a
 * `ThreadRunner`, which tells this what to show through the `Chat` methods
 * below (someone typing, a message arriving, your turn to reply…).
 */

type Line = { from: "you" | "they" | "system" | "buzz"; text: string };

type Person = {
  id: string;
  presence: Presence;
  message: string;
  log: Line[];
  typing: boolean;
  /** Your turn: the replies on offer, and who to tell which you sent. */
  ask: { replies: string[]; answer: (k: number) => void } | null;
  win: { xp: XpWindow; log: HTMLDivElement; status: HTMLDivElement; box: ReplyBox } | null;
};

/** Seconds after the desktop comes up before Yaaho! starts signing in, and how long signing in takes. */
const AUTOSTART = 1.5;
const SIGNING_IN = 2.5;

export class Yaaho implements Chat {
  /** The story moves the clock (minutes after midnight). */
  onTime: (minutes: number) => void = () => {};

  private people = new Map<string, Person>();
  private runners: ThreadRunner[];
  private list: XpWindow | null = null;
  private listBody = document.createElement("div");
  private clock = 0;
  private signIn = -1; // seconds since signing in began (−1: not yet)
  private chats = 0; // chat windows opened so far (each opens a little further along)

  constructor(private wm: WindowManager, private sounds: DesktopSounds) {
    injectStyles();
    for (const b of BUDDIES) this.people.set(b.id, { ...b, log: [], typing: false, ask: null, win: null });
    this.runners = THREADS.map((t) => new ThreadRunner(t, this));
    this.listBody.className = "ym-list";
  }

  get signedIn(): boolean {
    return this.signIn >= SIGNING_IN;
  }

  /** Every frame while you're on the desktop. */
  update(dt: number) {
    this.clock += dt;
    if (this.signIn < 0 && this.clock >= AUTOSTART) this.openList();
    if (this.signIn >= 0 && !this.signedIn) {
      this.signIn += dt;
      if (this.signedIn) this.drawList();
    }
    if (this.signedIn) for (const r of this.runners) r.update(dt);
  }

  /** The friends list window (opening it the first time signs in). */
  openList() {
    if (this.signIn < 0) this.signIn = 0;
    if (!this.list || !this.wm.list().includes(this.list)) {
      this.list = this.wm.open({ id: "yaaho", title: "Yaaho! Messenger", icon: ICONS.yaaho, x: 566, y: 16, w: 218, h: 430, content: this.listBody });
    } else this.wm.restore(this.list);
    this.drawList();
  }

  /** A key pressed on the desktop: it goes to the chat window in front, if any. */
  key(e: KeyboardEvent): boolean {
    const front = this.wm.focused();
    for (const p of this.people.values()) if (p.win && p.win.xp === front) return p.win.box.key(e);
    return false;
  }

  // --- what a conversation can do (the Chat interface) ---------------------------------

  typing(id: string, on: boolean) {
    const p = this.person(id);
    p.typing = on;
    this.drawStatus(p);
  }

  receive(id: string, text: string) {
    const p = this.person(id);
    this.add(p, { from: "they", text });
    this.openChat(id, false);
    this.sounds.play("ding");
  }

  ask(id: string, replies: string[], answer: (k: number) => void) {
    const p = this.person(id);
    p.ask = { replies, answer };
    p.win?.box.offer(replies);
  }

  presence(id: string, presence: Presence) {
    const p = this.person(id);
    if (presence === "online" && p.presence === "offline") this.sounds.play("knock");
    p.presence = presence;
    if (presence === "offline") this.add(p, { from: "system", text: `${id} has signed out.` });
    this.drawList();
  }

  buzz(id: string) {
    const p = this.person(id);
    this.add(p, { from: "buzz", text: "BUZZ!!!" });
    this.openChat(id, false);
    this.sounds.play("buzz");
    this.win(p)?.xp.shake();
  }

  time(minutes: number) {
    this.onTime(minutes);
  }

  isOpen(id: string): boolean {
    return !!this.win(this.person(id));
  }

  // --- the windows -----------------------------------------------------------------

  /** Open (or bring forward) the chat with `id`. */
  openChat(id: string, bringForward = true) {
    const p = this.person(id);
    const open = this.win(p);
    if (open) {
      if (bringForward || open.xp.minimised) this.wm.restore(open.xp);
      return;
    }
    const root = document.createElement("div");
    root.className = "ym-chat";
    root.innerHTML = `<div class="ym-tools"><span>☺ Emoticons</span><span>♫ Audibles</span><span>BUZZ!</span></div>`;
    const log = document.createElement("div");
    log.className = "ym-log";
    const status = document.createElement("div");
    status.className = "ym-status";
    const box = new ReplyBox();
    box.onSend = (k, text) => {
      this.add(p, { from: "you", text });
      const ask = p.ask;
      p.ask = null;
      ask?.answer(k);
    };
    root.append(log, status, box.el);
    const n = this.chats++ % 4;
    const xp = this.wm.open({ id: `chat-${id}`, title: `${id} - Instant Message`, icon: ICONS.yaaho, x: 150 + n * 24, y: 70 + n * 24, w: 390, h: 380, content: root });
    p.win = { xp, log, status, box };
    for (const line of p.log) log.append(lineEl(line, id));
    if (p.presence === "offline" && !p.log.length) log.append(lineEl({ from: "system", text: `${id} is offline. Your messages will be delivered when they sign in.` }, id));
    log.scrollTop = log.scrollHeight;
    if (p.ask) box.offer(p.ask.replies);
    this.drawStatus(p);
  }

  private add(p: Person, line: Line) {
    p.log.push(line);
    const w = this.win(p);
    if (!w) return;
    w.log.append(lineEl(line, p.id));
    w.log.scrollTop = w.log.scrollHeight;
  }

  /** Their chat window, if it's still open. */
  private win(p: Person) {
    if (p.win && !this.wm.list().includes(p.win.xp)) p.win = null; // (closed since)
    return p.win;
  }

  private person(id: string): Person {
    const p = this.people.get(id);
    if (!p) throw new Error(`Yaaho!: no buddy "${id}" (story.ts)`);
    return p;
  }

  private drawStatus(p: Person) {
    const w = this.win(p);
    if (w) w.status.textContent = p.typing ? `✎ ${p.id} is typing a message...` : "";
  }

  private drawList() {
    const body = this.listBody;
    if (!this.signedIn) {
      body.innerHTML = `<div class="ym-brand">Yaaho!</div><div class="ym-signin"><div class="ym-spin"></div>Signing in as<br><b>${YOU.id}</b>…</div>`;
      return;
    }
    const all = [...this.people.values()];
    const on = all.filter((p) => p.presence !== "offline").length;
    body.innerHTML = `<div class="ym-brand">Yaaho! <span>Messenger</span></div>
      <div class="ym-me"><div class="pic"></div><div><b>${YOU.id}</b><span>● ${YOU.status}</span></div></div>
      <div class="ym-group">▾ Friends (${on}/${all.length})</div>`;
    for (const p of all) {
      const row = document.createElement("div");
      row.className = `ym-buddy ${p.presence}`;
      row.innerHTML = `<div class="ym-face ${p.presence}"></div><div><div class="name"></div><div class="msg"></div></div>`;
      row.querySelector(".name")!.textContent = p.id;
      row.querySelector(".msg")!.textContent = p.message;
      row.addEventListener("dblclick", () => {
        this.sounds.play("click");
        this.openChat(p.id);
      });
      body.append(row);
    }
    const ad = document.createElement("div");
    ad.className = "ym-ad";
    ad.innerHTML = "<b>Yaaho! Mail</b>: now 1 GB free storage!";
    body.append(ad);
  }
}

/** One line of a chat: "name: text", or a grey note, or BUZZ!!! (`them`: their ID). */
function lineEl(line: Line, them: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = line.from;
  if (line.from === "you" || line.from === "they") {
    const b = document.createElement("b");
    b.textContent = `${line.from === "you" ? YOU.id : them}: `;
    d.append(b, line.text);
  } else d.textContent = line.text;
  return d;
}

let styled = false;
function injectStyles() {
  if (styled) return;
  styled = true;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.append(s);
}

const CSS = /* css */ `
.ym-list { height: 100%; display: flex; flex-direction: column; background: #fff; }
.ym-brand { height: 34px; flex: none; display: flex; align-items: center; gap: 5px; padding: 0 10px; color: #fff;
  font: bold italic 18px Georgia, serif; background: linear-gradient(#8a4cc4, #4d1f7c); }
.ym-brand span { font: 12px Tahoma, sans-serif; opacity: 0.85; }
.ym-signin { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  text-align: center; color: #4d1f7c; line-height: 1.5; }
.ym-spin { width: 26px; height: 26px; border-radius: 50%; border: 4px solid #e2d4f0; border-top-color: #6a2c91;
  animation: ym-spin 0.9s linear infinite; }
@keyframes ym-spin { to { transform: rotate(360deg); } }
.ym-me { display: flex; gap: 8px; padding: 8px; border-bottom: 1px solid #cfd9e8; background: linear-gradient(#f6f9fd, #e1eaf6); }
.ym-me .pic { width: 34px; height: 34px; flex: none; border: 1px solid #99a; background: linear-gradient(135deg, #4a7fc1, #1d3f7a); }
.ym-me b { display: block; margin-bottom: 2px; }
.ym-me span { color: #2e8b2e; }
.ym-group { padding: 4px 8px; font-weight: bold; color: #334; background: #eef3fa; border-bottom: 1px solid #dde4ee; }
.ym-buddy { display: flex; gap: 6px; padding: 4px 8px; }
.ym-buddy:hover { background: #dbe8fb; }
.ym-face { width: 13px; height: 13px; flex: none; margin-top: 1px; border-radius: 50%; background: #f2d024; box-shadow: inset 0 0 0 1px #9a7a00; }
.ym-face.offline { background: #cfcfcf; box-shadow: inset 0 0 0 1px #8a8a8a; }
.ym-face.idle { background: radial-gradient(circle at 70% 30%, #fff 20%, transparent 22%), #f2d024; }
.ym-buddy .name { font-weight: bold; }
.ym-buddy.offline .name { color: #888; font-weight: normal; }
.ym-buddy.idle .name::after { content: " (idle)"; color: #888; font-weight: normal; }
.ym-buddy .msg { color: #777; font-size: 10px; }
.ym-ad { margin-top: auto; padding: 7px; text-align: center; color: #6a4a00; background: #fff6cc; border-top: 1px solid #e0d090; }

.ym-chat { height: 100%; display: flex; flex-direction: column; background: #e6edf7; }
.ym-tools { height: 22px; flex: none; display: flex; gap: 12px; align-items: center; padding: 0 8px; color: #445;
  border-bottom: 1px solid #c5d2e4; background: linear-gradient(#fbfdff, #e1e9f5); }
.ym-log { flex: 1; overflow: auto; margin: 4px; padding: 6px; background: #fff; border: 1px solid #9fb1cc;
  font: 12px Arial, sans-serif; line-height: 1.5; user-select: text; }
.ym-log .you b { color: #1a3fbf; }
.ym-log .they b { color: #c01818; }
.ym-log .system { color: #888; font-style: italic; }
.ym-log .buzz { color: #c01818; font-weight: bold; }
.ym-status { height: 15px; flex: none; padding: 0 8px; color: #556; font-size: 10px; }
.ym-reply { flex: none; padding: 0 4px 4px; }
.ym-choices { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
.ym-choices[hidden] { display: none; }
.ym-choice { padding: 3px 7px; background: #fff; border: 1px solid #b9c7dc; border-radius: 3px; font: 12px Arial, sans-serif; white-space: pre; }
.ym-choice:hover { background: #fff7d6; border-color: #e0b64a; }
.ym-choice.chosen { background: #ffeeb0; border-color: #d9a441; }
.ym-row { display: flex; gap: 4px; height: 44px; }
.ym-text { flex: 1; padding: 4px 6px; background: #fff; border: 1px solid #7f9db9; font: 12px Arial, sans-serif; overflow: hidden; }
.ym-text.hint { color: #999; font-style: italic; }
.ym-caret { display: inline-block; width: 1px; height: 13px; margin-left: 1px; vertical-align: -2px; background: #000;
  animation: ym-blink 1s steps(1) infinite; }
@keyframes ym-blink { 50% { opacity: 0; } }
.ym-send { width: 58px; display: flex; align-items: center; justify-content: center; color: #999; border: 1px solid #7f9db9;
  border-radius: 3px; background: linear-gradient(#fff, #e6e6e6); }
.ym-send.ready { color: #000; box-shadow: inset 0 0 0 2px #f8b636; }
`;
