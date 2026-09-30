import type { Presence } from "./story";

/**
 * Plays one conversation from `story.ts`, a step at a time.
 *
 * It's ticked every frame (`update`), but only while you're on the desktop:
 * lean back, and the conversation waits for you. It doesn't draw anything
 * itself; it tells the messenger what to show (the `Chat` it's given).
 */

export type Choice = { say: string; then?: Step[] };

export type Step =
  | { they: string }
  | { you: Choice[] }
  | { wait: number }
  | { hesitate: number }
  | { time: string }
  | { status: Presence }
  | { buzz: true }
  | WaitFor;

/**
 * Wait until you've done something (a task: "songSent"), while the rest of
 * the desktop goes on. Meanwhile they nudge now and then ("??"); if you
 * still haven't after `giveUpAfter` seconds, they let it go. Then `done`
 * or `notDone` plays.
 */
export type WaitFor = {
  waitFor: string;
  nudges?: string[];
  giveUpAfter?: number;
  done?: Step[];
  notDone?: Step[];
};

export type Thread = {
  /** Whose conversation (their Yaaho! ID). */
  buddy: string;
  /** When it begins: seconds after you're first on the desktop, or only once you open their chat window. */
  start: { after: number } | "whenYouOpenTheChat";
  steps: Step[];
};

/** What a conversation can make the messenger do. */
export type Chat = {
  typing(buddy: string, on: boolean): void;
  receive(buddy: string, text: string): void;
  /** Offer your replies; call `answer` with the one you sent. */
  ask(buddy: string, replies: string[], answer: (index: number) => void): void;
  presence(buddy: string, presence: Presence): void;
  buzz(buddy: string): void;
  /** The clock moves on to this time (minutes after midnight). */
  time(minutes: number): void;
  /** Is their chat window open? */
  isOpen(buddy: string): boolean;
  /** Have you done this task yet? */
  isDone(task: string): boolean;
};

/** Seconds they "type" a line: a little per letter, within limits (people then typed slowly). */
const typingTime = (text: string) => Math.min(6, Math.max(1.4, 0.8 + text.length * 0.1));
/** Seconds between one message and their next move (so two lines don't land at once). */
const GAP = 1.1;
/** Seconds after your reply before they react (they're reading it). */
const READING = 1.4;

export class ThreadRunner {
  done = false;
  private started = false;
  private clock = 0;
  /** Steps still to play: the main list, and on top of it any reply's `then`. */
  private stack: { steps: Step[]; i: number }[];
  /** Seconds until `after` runs (0: free to take the next step). */
  private timer = 0;
  private after: (() => void) | null = null;
  private waitingForYou = false;
  /** Waiting for a task: the step, seconds so far, nudges sent. */
  private task: { step: WaitFor; t: number; nudged: number } | null = null;

  constructor(readonly thread: Thread, private chat: Chat) {
    this.stack = [{ steps: thread.steps, i: 0 }];
  }

  update(dt: number) {
    if (this.done) return;
    const b = this.thread.buddy, chat = this.chat;
    if (!this.started) {
      this.clock += dt;
      const s = this.thread.start;
      this.started = s === "whenYouOpenTheChat" ? chat.isOpen(b) : this.clock >= s.after;
      if (!this.started) return;
    }
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer > 0) return;
      const then = this.after;
      this.after = null;
      then?.();
      return;
    }
    if (this.waitingForYou) return;
    if (this.task) return this.waitForTask(dt);

    const step = this.next();
    if (!step) {
      this.done = true;
      return;
    }
    if ("they" in step) {
      chat.typing(b, true);
      this.wait(typingTime(step.they), () => {
        chat.typing(b, false);
        chat.receive(b, step.they);
        this.wait(GAP);
      });
    } else if ("you" in step) {
      this.waitingForYou = true;
      chat.ask(b, step.you.map((c) => c.say), (k) => {
        this.waitingForYou = false;
        const then = step.you[k].then;
        if (then) this.stack.push({ steps: then, i: 0 });
        this.wait(READING);
      });
    } else if ("wait" in step) {
      this.wait(step.wait);
    } else if ("hesitate" in step) {
      chat.typing(b, true);
      this.wait(step.hesitate, () => {
        chat.typing(b, false);
        this.wait(1.5);
      });
    } else if ("time" in step) {
      chat.time(parseTime(step.time));
    } else if ("status" in step) {
      chat.presence(b, step.status);
    } else if ("buzz" in step) {
      chat.buzz(b);
      this.wait(GAP);
    } else if ("waitFor" in step) {
      this.task = { step, t: 0, nudged: 0 };
    }
  }

  private waitForTask(dt: number) {
    const w = this.task!, step = w.step, b = this.thread.buddy;
    w.t += dt;
    const give = step.giveUpAfter ?? Infinity;
    const finished = this.chat.isDone(step.waitFor);
    if (finished || w.t >= give) {
      this.task = null;
      const then = finished ? step.done : step.notDone;
      if (then) this.stack.push({ steps: then, i: 0 });
      this.wait(READING);
      return;
    }
    // the nudges, spread evenly through the wait
    const nudges = step.nudges ?? [];
    if (w.nudged < nudges.length && w.t >= ((w.nudged + 1) * give) / (nudges.length + 1)) {
      const text = nudges[w.nudged++];
      this.chat.typing(b, true);
      this.wait(typingTime(text), () => {
        this.chat.typing(b, false);
        this.chat.receive(b, text);
      });
    }
  }

  private wait(seconds: number, then: (() => void) | null = null) {
    this.timer = seconds;
    this.after = then;
  }

  /** The next step: from the innermost list that still has one. */
  private next(): Step | null {
    while (this.stack.length) {
      const top = this.stack[this.stack.length - 1];
      if (top.i < top.steps.length) return top.steps[top.i++];
      this.stack.pop();
    }
    return null;
  }
}

/** "5:05" → minutes after midnight. The story is all afternoon and evening, so hours under 12 are pm. */
export function parseTime(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return (h < 12 ? h + 12 : h) * 60 + m;
}
