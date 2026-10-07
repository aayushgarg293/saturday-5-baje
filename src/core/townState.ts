/**
 * What's happened in the town today, shared (like the time of day:
 * core/timeOfDay.ts): the 6:30 bus has come in (world/busArrival.ts); the
 * conductor calls it, and Mama's parcel can be collected off it (Mummy's
 * errands: activities/errands.ts).
 */
export const townState = {
  /** The 6:30 from Jaipur is in, parked in its bay. */
  jaipurBusIn: false,
  /** You're in the middle of an errand's few words with someone (activities/errands.ts): the conductor holds his shouting. */
  talking: false,
};
