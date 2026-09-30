import type { Files } from "./files";
import type { DesktopSounds } from "./sounds";
import type { WindowManager } from "./windows";

/**
 * What every app on the desktop is handed: the windows, the sounds, the
 * files on this PC, the task board, and a way to be ticked every frame.
 */
export type Kit = {
  wm: WindowManager;
  sounds: DesktopSounds;
  files: Files;
  tasks: Tasks;
  /** A little balloon above the tray for a few seconds ("rohan_rockstar is now online"). */
  toast(text: string): void;
  /** Run `fn(dt)` every frame while you're on the desktop (downloads, pages loading…). Returns a way to stop. */
  tick(fn: (dt: number) => void): () => void;
};

/**
 * The task board: the apps post here when you've done something the story
 * is waiting for ("songSent": Priya has the song), and the story checks it
 * (the `waitFor` step, thread.ts).
 */
export class Tasks {
  /** Called whenever something is posted (the messenger reacts to some: story.ts, REACTIONS). */
  readonly onPost = new Set<(task: string) => void>();
  private done = new Set<string>();

  complete(task: string) {
    this.done.add(task);
    for (const fn of this.onPost) fn(task);
  }

  isDone(task: string): boolean {
    return this.done.has(task);
  }
}
