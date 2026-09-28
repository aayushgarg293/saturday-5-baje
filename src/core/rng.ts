/**
 * Seeded random numbers.
 *
 * `Math.random()` gives different numbers on every load, so the street would
 * change each time you open the game. A seeded generator gives the *same*
 * sequence for the same seed: the street looks random but is identical on
 * every load, which also means a bug seen once can be seen again.
 */

export type Rng = {
  /** A number from 0 (inclusive) to 1 (exclusive). */
  next(): number;
  /** A number from `min` to `max`. */
  range(min: number, max: number): number;
  /** One item from a list. */
  pick<T>(items: readonly T[]): T;
};

export function makeRng(seed: number): Rng {
  // mulberry32: a tiny, well-known generator; good enough for placing props
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}
