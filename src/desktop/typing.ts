import { touchFirst } from "../core/device";

/**
 * Your side of a chat: pick a reply, then type it out.
 *
 * When it's your turn, 2–3 replies appear above the text box. Pick one
 * (click it, or press 1, 2 or 3); then every key you press types the next
 * few letters of it into the box, whatever the key (Backspace takes letters
 * back out, for second thoughts). Once it's all typed,
 * Enter (or the Send button) sends it. You can pick a different reply
 * before sending; the box starts again.
 *
 * On a phone there are no keys to press: a reply types itself once picked,
 * and a box types itself when tapped.
 */

/** Letters typed per key you press. */
const PER_KEY = 2;
/** On a phone, the text types itself: PER_KEY letters this often, ms. */
const SELF_TYPING_MS = 60;

/** Call `step` every SELF_TYPING_MS until it says it's done (true). Returns a way to stop it sooner. */
function typeItself(step: () => boolean): () => void {
  const timer = setInterval(() => step() && clearInterval(timer), SELF_TYPING_MS);
  return () => clearInterval(timer);
}

export class ReplyBox {
  /** The bottom of a chat window: the replies, the text box, Send. */
  readonly el: HTMLDivElement;
  /** Called when you send a reply: which one (its index) and its text. */
  onSend: (index: number, text: string) => void = () => {};

  private choicesEl: HTMLDivElement;
  private textEl: HTMLDivElement;
  private sendEl: HTMLDivElement;
  private replies: string[] = [];
  private chosen = -1;
  private typed = 0;
  private stopTyping = () => {};

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "ym-reply";
    this.choicesEl = document.createElement("div");
    this.choicesEl.className = "ym-choices";
    const row = document.createElement("div");
    row.className = "ym-row";
    this.textEl = document.createElement("div");
    this.textEl.className = "ym-text";
    this.sendEl = document.createElement("div");
    this.sendEl.className = "ym-send";
    this.sendEl.textContent = "Send";
    this.sendEl.addEventListener("click", () => this.send());
    row.append(this.textEl, this.sendEl);
    this.el.append(this.choicesEl, row);
    this.draw();
  }

  /** Your turn: offer these replies. */
  offer(replies: string[]) {
    this.stopTyping();
    this.replies = replies;
    this.chosen = -1;
    this.typed = 0;
    this.draw();
  }

  /** Is it your turn here? */
  get waiting(): boolean {
    return this.replies.length > 0;
  }

  /** A key pressed while this chat is in front. Returns true if it was used. */
  key(e: KeyboardEvent): boolean {
    if (!this.waiting) return false;
    const n = Number(e.key);
    if (this.chosen < 0) {
      if (n >= 1 && n <= this.replies.length) this.pick(n - 1);
      return n >= 1 && n <= this.replies.length;
    }
    if (e.key === "Enter") {
      this.send();
      return true;
    }
    if (e.key === "Backspace") {
      this.typed = Math.max(0, this.typed - PER_KEY);
      this.draw();
      return true;
    }
    // any other key (letters, space, numbers…) types the next letters
    if (e.key.length === 1) {
      this.typed = Math.min(this.replies[this.chosen].length, this.typed + PER_KEY);
      this.draw();
      return true;
    }
    return false;
  }

  private pick(k: number) {
    this.chosen = k;
    this.typed = 0;
    this.draw();
    if (!touchFirst) return;
    this.stopTyping();
    this.stopTyping = typeItself(() => {
      this.typed = Math.min(this.replies[k].length, this.typed + PER_KEY);
      this.draw();
      return this.typed >= this.replies[k].length;
    });
  }

  private send() {
    if (this.chosen < 0 || this.typed < this.replies[this.chosen].length) return;
    const k = this.chosen, text = this.replies[k];
    this.stopTyping();
    this.replies = [];
    this.chosen = -1;
    this.typed = 0;
    this.draw();
    this.onSend(k, text);
  }

  private draw() {
    this.choicesEl.innerHTML = "";
    this.replies.forEach((r, k) => {
      const c = document.createElement("div");
      c.className = "ym-choice" + (k === this.chosen ? " chosen" : "");
      c.textContent = `${k + 1}   ${r}`;
      c.addEventListener("click", () => this.pick(k));
      this.choicesEl.append(c);
    });
    this.choicesEl.hidden = !this.replies.length;
    const full = this.chosen >= 0 ? this.replies[this.chosen] : "";
    const done = this.chosen >= 0 && this.typed >= full.length;
    this.textEl.textContent = full.slice(0, this.typed);
    this.textEl.classList.toggle("hint", this.chosen < 0);
    if (this.chosen < 0) this.textEl.textContent = this.waiting ? (touchFirst ? "pick a reply…" : "pick a reply (1, 2, 3)…") : "";
    else if (!done) this.textEl.append(caret());
    this.sendEl.classList.toggle("ready", done);
    this.el.title = done && !touchFirst ? "Enter to send" : "";
  }
}

function caret(): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = "ym-caret";
  return s;
}

/**
 * A single text box that types a set text as you press keys (any keys),
 * like the reply box but with no choice: a search box, a user name. Enter,
 * once it's all typed, calls `onEnter`. `secret` shows dots (a password).
 * On a phone, a tap on it types it out.
 */
export class TypeField {
  readonly el: HTMLSpanElement;
  onEnter: () => void = () => {};
  /** Called once it's all typed by itself (on a phone). */
  onTyped: () => void = () => {};
  /** Is this the field being typed in (it shows the blinking caret)? */
  active = true;
  private typed = 0;
  private typing = false;

  constructor(private text: string, private secret = false) {
    this.el = document.createElement("span");
    this.el.className = "xp-field typing";
    if (touchFirst) this.el.addEventListener("click", () => this.typeOut());
    this.draw();
  }

  /** Type the rest out by itself (a phone: no keys). */
  typeOut() {
    if (this.complete || this.typing) return;
    this.typing = true;
    typeItself(() => {
      this.typed = Math.min(this.text.length, this.typed + PER_KEY);
      this.draw();
      if (!this.complete) return false;
      this.typing = false;
      this.onTyped();
      return true;
    });
  }

  get complete(): boolean {
    return this.typed >= this.text.length;
  }

  key(e: KeyboardEvent): boolean {
    if (e.key === "Enter") {
      if (this.complete) this.onEnter();
      return true;
    }
    if (e.key === "Backspace") this.typed = Math.max(0, this.typed - PER_KEY);
    else if (e.key.length === 1) this.typed = Math.min(this.text.length, this.typed + PER_KEY);
    else return false;
    this.draw();
    return true;
  }

  setActive(on: boolean) {
    this.active = on;
    this.draw();
  }

  private draw() {
    const shown = this.text.slice(0, this.typed);
    this.el.textContent = this.secret ? "•".repeat(shown.length) : shown;
    if (this.active && !this.complete) this.el.append(caret());
  }
}

/**
 * A form's typed fields (a sign-in page: ID, then password). Keys go to the
 * field you're in; when it's all typed you move on to the next. Click a
 * field to go back to it. Enter, once every field is typed, calls `onEnter`.
 */
export class Fields {
  onEnter: () => void = () => {};
  private at = 0;

  constructor(readonly fields: TypeField[]) {
    fields.forEach((f, k) => f.el.addEventListener("click", () => this.focus(k)));
    // (on a phone, one tap types the lot: each field, once typed, starts the next)
    fields.forEach((f, k) => (f.onTyped = () => {
      const next = fields.findIndex((g, i) => i > k && !g.complete);
      if (next < 0) return;
      this.focus(next);
      fields[next].typeOut();
    }));
    this.focus(0);
  }

  get complete(): boolean {
    return this.fields.every((f) => f.complete);
  }

  key(e: KeyboardEvent): boolean {
    if (e.key === "Enter") {
      if (this.complete) this.onEnter();
      return true;
    }
    const f = this.fields[this.at];
    const used = f.key(e);
    if (f.complete && this.at < this.fields.length - 1) this.focus(this.at + 1);
    return used;
  }

  private focus(k: number) {
    this.at = k;
    this.fields.forEach((f, i) => f.setActive(i === k));
  }
}
