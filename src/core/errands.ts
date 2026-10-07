/**
 * Mummy's chit: what she asked for as you left, and what you've done of it,
 * shared (like core/storySoFar.ts). The chit shows it (ui/chit.ts); the
 * errands tick it off (activities/errands.ts; the cafe's line when you pay
 * the owner: main.ts); and at the door, she reads it.
 */

export type Errand = "cafe" | "kapde" | "dawai" | "stampPaper" | "parcel" | "sabzi";

/** Her lines on the chit, in her order. */
export const CHIT: { errand: Errand; line: string; where: string }[] = [
  { errand: "cafe", line: "Cafe: 1 ghanta, 6 baje tak!", where: "" },
  { errand: "kapde", line: "Papa ke press ke kapde", where: "Modern Dry Cleaners, mandir ke aage, cricket wali gali se pehle" },
  { errand: "dawai", line: "Dettal aur Krocin", where: "Jain Medical, ghar se nikalte hi daayein haath pe" },
  { errand: "stampPaper", line: "Papa ka stamp paper", where: "court ke bahar typist se type karwana" },
  { errand: "parcel", line: "Mama ka parcel", where: "bus stand, 6:30 wali Jaipur bus, conductor se" },
  { errand: "sabzi", line: "Sabzi: aadha kilo tamatar, dhaniya-mirchi", where: "park wali mandi, School Road" },
];

const done = new Set<Errand>();
const listeners: (() => void)[] = [];

export const errands = {
  isDone: (e: Errand) => done.has(e),
  /** Tick it off (and tell whoever's showing the chit). */
  markDone(e: Errand) {
    if (done.has(e)) return;
    done.add(e);
    for (const f of listeners) f();
  },
  onChange: (f: () => void) => listeners.push(f),
  /** Any errand at all (not counting the cafe)? */
  anyErrand: () => CHIT.some(({ errand }) => errand !== "cafe" && done.has(errand)),
};
