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
/** At the desk, how fast the clock catches up to the story's time: game minutes per real second (you see the minutes roll by). */
const CATCH_UP = 3;

export class GameClock {
  /** Minutes after midnight (fractional). */
  minutes = START;
  /**
   * At the desk the story sets the time (BRIEF.md): the clock stands still
   * until the story moves it on to its next moment ("5:25 pm, Rohan comes
   * online"), then runs quickly up to it. Elsewhere it runs at 10×.
   */
  storyDriven = false;
  private target = START;

  /** The story's next moment (minutes after midnight). Never goes backwards. */
  advanceTo(minutes: number) {
    this.target = Math.max(this.target, minutes);
  }

  update(dt: number) {
    if (!this.storyDriven) this.minutes += dt * RATE;
    else if (this.target > this.minutes) this.minutes = Math.min(this.target, this.minutes + dt * CATCH_UP);
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
