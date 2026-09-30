/**
 * Slow transfers on a dial-up line: downloads, sending a file, attaching
 * a photo to a mail.
 *
 * A transfer shows the era's numbers ("5.2 KB/Sec", "7 min 40 sec left"),
 * but runs ten times faster than those numbers say, like the game's clock on
 * the street: each real second is ten on the transfer. So a 3.4 MB song
 * ("about 10 minutes" at dial-up speed) takes about a minute of play.
 */

/** Transfer seconds per real second. */
const SPEED_UP = 10;

export class Transfer {
  /** KB so far. */
  got = 0;
  done = false;
  private rate: number;
  private wobble = Math.random() * 10;

  /**
   * `size` in KB; `speed` the line's usual rate in KB per second (it
   * wanders a little around that, as dial-up did).
   */
  constructor(readonly size: number, private speed: number, private onDone: () => void) {
    this.rate = speed;
  }

  update(dt: number) {
    if (this.done) return;
    this.wobble += dt;
    this.rate = this.speed * (0.8 + 0.35 * Math.sin(this.wobble * 0.7) * Math.sin(this.wobble * 1.9 + 1));
    this.got = Math.min(this.size, this.got + this.rate * dt * SPEED_UP);
    if (this.got >= this.size) {
      this.done = true;
      this.onDone();
    }
  }

  get fraction(): number {
    return this.got / this.size;
  }

  /** "5.2 KB/Sec" */
  get rateLabel(): string {
    return `${this.rate.toFixed(1)} KB/Sec`;
  }

  /** "7 min 40 sec" */
  get leftLabel(): string {
    const s = Math.ceil((this.size - this.got) / Math.max(0.5, this.rate));
    return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} sec` : `${s} sec`;
  }
}

/** An XP progress bar: green blocks in a sunken white box. */
export function progressBar(): { el: HTMLDivElement; set(fraction: number): void } {
  const el = document.createElement("div");
  el.className = "xp-progress";
  const fill = document.createElement("div");
  el.append(fill);
  return {
    el,
    set(f) {
      fill.style.width = `${Math.round(Math.min(1, Math.max(0, f)) * 100)}%`;
    },
  };
}
