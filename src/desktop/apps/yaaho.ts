import { addStyles } from "../css";
import { sizeLabel, type VFile } from "../files";
import type { Kit } from "../kit";
import { openBox } from "../openBox";
import { Transfer, progressBar } from "../progress";
import { BUDDIES, type Presence, REACTIONS, THREADS, YOU } from "../story";
import { type Chat, ThreadRunner } from "../thread";
import { ReplyBox } from "../typing";
import type { XpWindow } from "../windows";
import { ICONS, messageBox } from "./basic";

/**
 * Yaaho! Messenger (a look-alike): the friends list, and a chat window per
 * friend. It signs in by itself a moment after the desktop comes up, as it
 * did at every cafe. "Send File" in a chat sends them a file from this PC,
 * slowly (the song Priya asks for).
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
  /** A file on its way to them (one at a time). */
  sending: boolean;
  win: { xp: XpWindow; log: HTMLDivElement; status: HTMLDivElement; box: ReplyBox } | null;
};

/** Sending a file: your line's upload speed, KB per second (see progress.ts for how fast that really runs). */
const UP_SPEED = 7;
/** Where chat windows open, in turn. */
const CHAT_SPOTS = [[150, 60], [40, 150], [180, 110], [70, 40]];
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

  private wm: Kit["wm"];
  private sounds: Kit["sounds"];

  constructor(private kit: Kit) {
    this.wm = kit.wm;
    this.sounds = kit.sounds;
    addStyles("yaaho", CSS);
    for (const b of BUDDIES) this.people.set(b.id, { ...b, log: [], typing: false, ask: null, sending: false, win: null });
    this.runners = THREADS.map((t) => new ThreadRunner(t, this));
    // a few things you do get a quick reaction (sending the wrong file…: story.ts)
    kit.tasks.onPost.add((task) => {
      const r = REACTIONS[task];
      if (r) setTimeout(() => this.receive(r.buddy, r.says), 2500);
    });
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

  // --- what a conversation can do (the Chat interface) ---------------------------------

  typing(id: string, on: boolean) {
    const p = this.person(id);
    p.typing = on;
    this.drawStatus(p);
  }

  receive(id: string, text: string) {
    const p = this.person(id);
    this.add(p, { from: "they", text });
    this.popUp(p);
    this.sounds.play("ding");
  }

  ask(id: string, replies: string[], answer: (k: number) => void) {
    const p = this.person(id);
    p.ask = { replies, answer };
    p.win?.box.offer(replies);
    if (p.win) this.wm.flash(p.win.xp);
  }

  presence(id: string, presence: Presence) {
    const p = this.person(id);
    if (presence === "online" && p.presence === "offline") {
      this.sounds.play("knock"); // (the door: a friend has come online)
      this.kit.toast(`${id} is now online`);
    }
    p.presence = presence;
    if (presence === "offline") this.add(p, { from: "system", text: `${id} has signed out.` });
    this.drawList();
  }

  buzz(id: string) {
    const p = this.person(id);
    this.add(p, { from: "buzz", text: "BUZZ!!!" });
    this.popUp(p);
    this.sounds.play("buzz");
    this.win(p)?.xp.shake();
  }

  time(minutes: number) {
    this.onTime(minutes);
  }

  isOpen(id: string): boolean {
    return !!this.win(this.person(id));
  }

  isDone(task: string): boolean {
    return this.kit.tasks.isDone(task);
  }

  mark(name: string) {
    this.kit.tasks.complete(name);
  }

  // --- the windows -----------------------------------------------------------------

  /**
   * Something new from them: their chat pops up if it isn't open. If you're
   * busy in another window it opens behind, and its taskbar button flashes.
   */
  private popUp(p: Person) {
    const front = this.wm.focused();
    const busy = !!front && front !== this.list; // (just the friends list in front: not busy)
    if (!this.win(p)) this.openChat(p.id, !busy);
    const w = this.win(p)!;
    if (w.xp.minimised) this.wm.restore(w.xp);
    this.wm.flash(w.xp);
  }

  /** Open (or bring forward) the chat with `id` (`inFront` false: open it behind the window you're in). */
  openChat(id: string, inFront = true) {
    const p = this.person(id);
    const open = this.win(p);
    if (open) {
      if (inFront) this.wm.restore(open.xp);
      return;
    }
    const root = document.createElement("div");
    root.className = "ym-chat";
    root.innerHTML = `<div class="ym-tools"><span>☺ Emoticons</span><span>♫ Audibles</span><span class="file">⇪ Send File</span></div>`;
    root.querySelector(".file")!.addEventListener("click", () => this.chooseFile(p));
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
    // the first two chats open apart, so both can be seen at once
    const [x, y] = CHAT_SPOTS[this.chats++ % CHAT_SPOTS.length];
    const xp = this.wm.open({ id: `chat-${id}`, title: `${id} - Instant Message`, icon: ICONS.yaaho, x, y, w: 390, h: 380, content: root, behind: !inFront });
    xp.onKey = (e) => box.key(e); // (typing goes to this chat while it's in front)
    p.win = { xp, log, status, box };
    for (const line of p.log) log.append(lineEl(line, id));
    if (p.presence === "offline" && !p.log.length) log.append(lineEl({ from: "system", text: `${id} is offline. Your messages will be delivered when they sign in.` }, id));
    log.scrollTop = log.scrollHeight;
    if (p.ask) box.offer(p.ask.replies);
    this.drawStatus(p);
  }

  /** "Send File": pick a file, then send it (slowly). */
  private chooseFile(p: Person) {
    if (p.presence === "offline") return messageBox(this.wm, "ym-nofile", "Yaaho! Messenger", `You can only send files to friends who are online.`);
    if (p.sending) return messageBox(this.wm, "ym-nofile", "Yaaho! Messenger", `Please wait: a file is already being sent to ${p.id}.`);
    openBox(this.kit, { title: `Send a File to ${p.id}`, folder: "music", onPick: (file) => this.sendFile(p, file) });
  }

  private sendFile(p: Person, file: VFile) {
    p.sending = true;
    this.add(p, { from: "system", text: `Sending "${file.name}" (${sizeLabel(file.size)})...` });
    const bar = progressBar();
    const label = document.createElement("span");
    const row = document.createElement("div");
    row.className = "ym-transfer";
    row.append(bar.el, label);
    this.win(p)?.log.append(row);
    const transfer = new Transfer(file.size, UP_SPEED, () => {
      stop();
      row.remove();
      p.sending = false;
      this.add(p, { from: "system", text: `${p.id} has received the file "${file.name}".` });
      this.sounds.play("ding");
      // the song Priya asked for; anything else, she wonders what it is (REACTIONS, story.ts)
      this.kit.tasks.complete(file.tag === "jabWeMate" ? "songSent" : `wrongFile:${p.id}`);
    });
    const stop = this.kit.tick((dt) => {
      transfer.update(dt);
      bar.set(transfer.fraction);
      label.textContent = ` ${Math.floor(transfer.fraction * 100)}%  (${transfer.leftLabel} left)`;
    });
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
.ym-tools .file:hover { text-decoration: underline; }
.ym-transfer { display: flex; align-items: center; gap: 6px; margin: 3px 0; color: #555; font-size: 11px; }
.ym-transfer .xp-progress { width: 140px; }
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
