import { addStyles } from "./css";

/**
 * A yellow sticky note beside the screen, for when the player can't be
 * expected to guess: how to get Priya's song, how to mail Rohan's photo, and
 * that the hour's up. It comes a little after she asks, so anyone who works
 * it out alone never sees it, and goes as soon as the thing is done.
 */

type Note = {
  /** Shows once this has happened (a task or a `mark`: story.ts), or at this many minutes used. */
  from: string | { minutes: number };
  /** Goes once any of these has happened. */
  until: string[];
  title: string;
  lines: string[];
};

/** The first that's due is the one shown: the time comes first. */
const NOTES: Note[] = [
  {
    from: { minutes: 50 },
    until: [],
    title: "Ghanta poora hone wala hai!",
    lines: ["Start → Log Off", "phir neeche counter pe paise do"],
  },
  {
    from: "songAsked",
    until: ["songSent", "songMoment"],
    title: "Priya ka gaana",
    lines: ["Internet Xplorer mein SongzPK kholo", "Jab We Mate dhundho", "gaana download karo", "Yaaho! pe Priya ki window mein Send File"],
  },
  {
    from: "photoAsked",
    until: ["photoMailed", "photoMoment"],
    title: "Rohan ko photo",
    lines: ["Internet Xplorer mein Rediffit Mail kholo", "sign in karke Write Mail", "Attach Files: pen drive (F:) se team photo", "Rohan ki ID likho aur Send"],
  },
];

/** Seconds on the computer after it's due before the note comes up: time to work it out alone. */
const WAIT = 15;

export class StickyNote {
  readonly el = document.createElement("div");
  private shown: Note | null = null;
  /** Seconds each note has been due. */
  private due = new Map<Note, number>();

  constructor() {
    addStyles("stickyNote", CSS);
    this.el.className = "xp-sticky";
    this.el.hidden = true;
  }

  /** Every frame on the computer. */
  update(dt: number, isDone: (task: string) => boolean, minutesUsed: number) {
    let next: Note | null = null;
    for (const note of NOTES) {
      const reached = typeof note.from === "string" ? isDone(note.from) : minutesUsed >= note.from.minutes;
      if (!reached || note.until.some(isDone)) continue;
      const waited = (this.due.get(note) ?? 0) + dt;
      this.due.set(note, waited);
      if (waited >= (typeof note.from === "string" ? WAIT : 0)) next ??= note;
    }
    if (next !== this.shown) this.show(next);
  }

  private show(note: Note | null) {
    this.shown = note;
    this.el.hidden = !note;
    this.el.textContent = "";
    if (!note) return;
    const title = document.createElement("b");
    title.textContent = note.title;
    const list = document.createElement("ol");
    for (const line of note.lines) list.append(Object.assign(document.createElement("li"), { textContent: line }));
    this.el.append(title, list);
  }
}

const CSS = /* css */ `
.xp-sticky { position: absolute; right: 1.5cqw; top: 14cqh; z-index: 2; width: min(190px, 17cqw); padding: 12px 10px 14px 12px;
  background: linear-gradient(#ffef8a, #fbe26a); color: #2b2a4a; transform: rotate(1.5deg);
  font: 15px/1.3 "Noteworthy", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive;
  box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.45); pointer-events: none; }
.xp-sticky[hidden] { display: none; }
.xp-sticky b { display: block; margin-bottom: 6px; color: #a8261a; }
.xp-sticky ol { margin: 0; padding-left: 18px; }
.xp-sticky li { margin-bottom: 4px; }
html.touch .xp-sticky { padding: 8px; font-size: 12px; }
`;
