import { makeRng } from "../core/rng";

/**
 * The match everyone's following while you're at the computer: India chasing
 * Australia's 263 in a one-dayer, the last ten overs, live on Rediffit's
 * scorecard (sites/portal.ts), a ball every few seconds.
 *
 * The match is decided before it starts (from its own random numbers, so
 * it's the same every time you play): it goes down to the last over. It
 * moves on only while you're on the desktop (desktop.ts ticks it), like
 * everything there; the scorecard and Sunny's shouts on Yaaho! follow it
 * (story.ts, REACTIONS: "cricketSix", "cricketWicket", "cricketWon").
 *
 * Players: look-alike names, as everywhere in the game.
 */

export type Ball = { over: string; runs: number; out: boolean; text: string };

/** Where the chase stands when you first look. */
const START = { runs: 199, wickets: 4, balls: 240, target: 264 };
/** Real seconds between balls, and the extra pause between overs. */
const PACE = { ball: 7, over: 14 };

const BATSMEN = ["M.S. Dhony", "Y. Singhh", "R. Uthapa", "I. Pathaan", "Harbhajjan", "Z. Khaan", "R.P. Singhh", "S. Sreeshaant"];
const BOWLERS = ["B. Leee", "M. Johnsen", "N. Bracken", "B. Hogg"];

/** What each ball can be, and how likely (out of 100). */
const OUTCOMES: [number, number][] = [[0, 30], [1, 36], [2, 12], [4, 12], [6, 6], [-1, 4]]; // (−1: out)

const SHOTS: Record<number, string[]> = {
  0: ["no run, beaten outside off", "defended back to the bowler", "dot ball, the pressure builds", "swing and a miss!"],
  1: ["pushed to long-on for one", "a quick single, good running", "worked off the pads for one", "tapped into the covers, they scamper through"],
  2: ["driven wide of long-off, they come back for two", "two more, good running between the wickets"],
  4: ["FOUR! driven through the covers", "FOUR! pulled hard to the square-leg fence", "FOUR! a thick edge races past slip", "FOUR! glorious straight drive"],
  6: ["SIX! launched over long-on", "SIX! the helicopter shot, into the crowd!", "SIX! that's gone miles, out of the stadium"],
};

/** Which chase it is: picked (by trying them) for one that goes down to the last over and India win. */
const SEED = 239; // (India win off the second-last ball, with a six)

/** The whole chase, ball by ball, worked out once. */
export function play(seed = SEED): Ball[] {
  const rng = makeRng(seed);
  const balls: Ball[] = [];
  let { runs, wickets, balls: bowled } = START;
  let striker = 0, next = 2;
  while (runs < START.target && wickets < 10 && bowled < 300 && next <= BATSMEN.length) {
    let roll = rng.next() * 100, result = 0;
    for (const [r, chance] of OUTCOMES) if ((roll -= chance) < 0) { result = r; break; }
    // (at the death they swing at everything)
    if (bowled >= 288 && result === 0 && rng.next() < 0.5) result = 4;
    const over = `${Math.floor(bowled / 6)}.${(bowled % 6) + 1}`;
    const bowler = BOWLERS[Math.floor(bowled / 6) % BOWLERS.length];
    const bat = BATSMEN[striker];
    bowled++;
    let text: string;
    if (result < 0) {
      wickets++;
      text = `${bowler} to ${bat}, OUT! ${rng.pick(["caught at deep midwicket", "bowled him! the stumps are everywhere", "caught behind, a faint edge", "run out, a terrible mix-up"])}`;
      striker = next++;
    } else {
      runs += result;
      text = `${bowler} to ${bat}, ${rng.pick(SHOTS[result])}`;
      if (result % 2 === 1) striker = striker === 0 ? 1 : 0;
    }
    if (bowled % 6 === 0) striker = striker === 0 ? 1 : 0; // (ends swap at the over)
    balls.push({ over, runs: result < 0 ? 0 : result, out: result < 0, text });
  }
  return balls;
}

export class Match {
  readonly balls = play();
  /** How many balls have been bowled since you first sat down. */
  shown = 0;
  /** Called after every ball (the scorecard redraws; the story hears of sixes, wickets, the end). */
  readonly onBall = new Set<(b: Ball) => void>();
  private wait = PACE.ball * 2;

  /** Every frame while you're on the desktop. */
  update(dt: number) {
    if (this.shown >= this.balls.length) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    const b = this.balls[this.shown++];
    this.wait = b.over.endsWith(".6") ? PACE.over : PACE.ball;
    for (const fn of this.onBall) fn(b);
  }

  /** The score now. */
  get score() {
    let runs = START.runs, wickets = START.wickets;
    for (const b of this.balls.slice(0, this.shown)) {
      runs += b.runs;
      if (b.out) wickets++;
    }
    const bowled = START.balls + this.shown;
    const over = `${Math.floor(bowled / 6)}.${bowled % 6}`;
    const need = START.target - runs;
    const left = 300 - bowled;
    const result = need <= 0 ? `INDIA WIN by ${10 - wickets} wickets!` : wickets >= 10 || left <= 0 ? `Australia win by ${need - 1} runs` : null;
    return { runs, wickets, over, need, left, target: START.target, result };
  }

  /** The last few balls, newest first (the commentary). */
  recent(n: number): Ball[] {
    return this.balls.slice(Math.max(0, this.shown - n), this.shown).reverse();
  }
}

/** The one match (the scorecard and the story share it). */
export const MATCH = new Match();
