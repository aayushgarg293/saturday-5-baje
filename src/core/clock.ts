/**
 * The game's time of day. It never runs out; it just keeps ticking, faster
 * than real time, so a visit to the cafe eats up the afternoon the way it
 * did (BRIEF.md: "the clock").
 *
 * The walk starts at 4:30 pm. Ten game minutes pass every real minute: a
 * twenty-minute visit is well over three hours on the clock, and it's
 * dusk by the time he walks home.
 */

/** When the game starts: 4:30 pm, in minutes after midnight. */
const START = 16 * 60 + 30;
/** Game minutes per real second (10 game minutes per real minute). */
const RATE = 10 / 60;

export class GameClock {
  /** Minutes after midnight (fractional). */
  minutes = START;

  update(dt: number) {
    this.minutes += dt * RATE;
  }

  get hours(): number {
    return Math.floor(this.minutes / 60) % 24;
  }

  get minute(): number {
    return this.minutes % 60;
  }

  /** "5:07 PM", as a desktop's clock shows it. */
  label(): string {
    const h = this.hours, m = Math.floor(this.minute);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
}
