/**
 * The time of day, shared: main.ts sets it every frame (the clock's minutes,
 * and how far into the evening it is, from render/daylight.ts). The street's
 * life and sounds read it: the cricket kids go home, the aarti begins, the
 * koel falls quiet.
 */
export const timeOfDay = {
  /** Minutes after midnight (the game's clock). */
  minutes: 16 * 60 + 30,
  /** 0 in the afternoon, 1 once it's dark. */
  evening: 0,
};
