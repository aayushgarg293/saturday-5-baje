/**
 * Daulatbagh's trains (world/railway.ts), as a timetable worked out from the
 * game clock alone: where each train is, how fast it's going, and whether the
 * crossing's barriers are down, all from the time. So jumping the clock
 * forward puts the trains where they'd be, and nothing has to be remembered.
 *
 * Every 15 game minutes a train comes through, turn and turn about:
 *
 *   the passenger   (5 coaches) slows in, stops at the platform for half a
 *                   minute (people get down, others climb in), then pulls
 *                   out; it stops past the crossing, so the barriers go up
 *                   while it stands
 *   the express     (8 coaches) doesn't stop: horn, clatter, gone
 *
 * Both run north (toward −z in the station's frame). Distances are metres
 * along the line from the crossing (+ south, − north); a train's `front` is
 * its engine's nose. Times are real seconds (a game minute is 6 of them:
 * core/clock.ts).
 */

export type TrainKind = "passenger" | "express";

/** Cars: the engine, then this many coaches; their lengths (m). */
export const ENGINE = 17, COACH = 22;
export const COACHES: Record<TrainKind, number> = { passenger: 5, express: 8 };
export const trainLength = (kind: TrainKind) => ENGINE + COACHES[kind] * COACH;

/** Every this many game minutes a train, the passenger first; from the walk's start (4:30). */
const EVERY = 15, FIRST = 16 * 60 + 30 + 4;
const SECONDS_PER_MINUTE = 6;

/** Where they come into sight (the line south), and where they've gone (north). */
const FROM = 260, GONE = -230;
/** When the barriers start down (s into the train's turn), how long they take, and how long to rise. */
const LOWER_AT = 1, LOWER = 6, RAISE = 5;
/** The bell rings while they come down. */
const BELL = { from: 0, to: LOWER_AT + LOWER + 1 };

/** The passenger: in at this speed, braking at this rate to stop with its tail just past the crossing; the stop; the pull-out. */
const PASSENGER = { appear: 12, speed: 12, brake: 0.6, tailStops: -6, stop: 30, pull: 0.5 };
/** The express: in sight at this time, at this speed throughout. */
const EXPRESS = { appear: 10, speed: 16 };

export type TrainNow = {
  kind: TrainKind;
  /** Which train of the day this is (counting from the first), so each is told apart. */
  turn: number;
  /** Seconds into this train's turn. */
  tau: number;
  /** In sight (somewhere between FROM and GONE)? */
  running: boolean;
  /** The engine's nose, and the speed (m/s). */
  front: number;
  speed: number;
  /** Standing at the platform. */
  stopped: boolean;
  /** Seconds since it stopped (−1 when not standing), and since it pulled out again (−1 before). */
  stoppedFor: number;
  pulledOutFor: number;
  /** The barriers: 0 up, 1 down. */
  barriers: number;
  bell: boolean;
};

/**
 * The trains on the line at `minutes` (game minutes after midnight): the one whose turn it is, and the
 * one before it if it's still pulling away (the passenger leaves late in its turn; the express that
 * follows is far behind it by the time it's near).
 */
export function trainsAt(minutes: number): TrainNow[] {
  const turn = Math.floor((minutes - FIRST) / EVERY);
  const before = trainOf(turn - 1, minutes);
  return before.running ? [trainOf(turn, minutes), before] : [trainOf(turn, minutes)];
}

/** Train number `turn` of the day, at `minutes`. */
function trainOf(turn: number, minutes: number): TrainNow {
  const since = minutes - FIRST;
  const kind: TrainKind = ((turn % 2) + 2) % 2 === 0 ? "passenger" : "express";
  const tau = (since - turn * EVERY) * SECONDS_PER_MINUTE;
  const length = trainLength(kind);
  let front = FROM, speed = 0, stopped = false, stoppedFor = -1, pulledOutFor = -1, clearAt: number;

  if (kind === "passenger") {
    const P = PASSENGER, w = passengerTimes(length);
    if (tau < w.stopAt) {
      front = passengerFront(tau, w);
      speed = tau < P.appear ? 0 : tau < w.brakeAt ? P.speed : P.speed - P.brake * (tau - w.brakeAt);
    } else if (tau < w.leaveAt) {
      front = w.stopFront;
      stopped = true;
      stoppedFor = tau - w.stopAt;
    } else {
      const t = (pulledOutFor = tau - w.leaveAt);
      front = w.stopFront - (P.pull * t * t) / 2;
      speed = P.pull * t;
    }
    // the barriers go up once its tail is past the crossing (just before it stops)
    clearAt = whenNoseReaches(-3 - length, P.appear, w.stopAt, (t) => passengerFront(t, w));
  } else {
    const E = EXPRESS;
    front = tau < E.appear ? FROM : FROM - (tau - E.appear) * E.speed;
    speed = tau < E.appear ? 0 : E.speed;
    clearAt = E.appear + (FROM + 3 + length) / E.speed;
  }
  const running = (tau >= (kind === "passenger" ? PASSENGER.appear : EXPRESS.appear)) && front + length > GONE;

  // the barriers: down from LOWER_AT, up again once the train's clear of the crossing
  let barriers = 0;
  if (tau >= LOWER_AT && tau < clearAt) barriers = Math.min(1, (tau - LOWER_AT) / LOWER);
  else if (tau >= clearAt && tau < clearAt + RAISE) barriers = 1 - (tau - clearAt) / RAISE;
  return { kind, turn, tau, running, front, speed, stopped, stoppedFor, pulledOutFor, barriers, bell: tau >= BELL.from && tau < BELL.to };
}

/** The passenger's turn: when it starts braking, stops, and pulls out; where its nose stops; how far it runs before braking. */
function passengerTimes(length: number) {
  const P = PASSENGER;
  const stopFront = P.tailStops - length;
  const braking = (P.speed * P.speed) / (2 * P.brake);
  const cruiseFor = (FROM - stopFront - braking) / P.speed;
  const brakeAt = P.appear + cruiseFor, stopAt = brakeAt + P.speed / P.brake;
  return { stopFront, cruiseFor, brakeAt, stopAt, leaveAt: stopAt + P.stop };
}

/** The passenger's nose at `tau`, while it comes in (up to its stop). */
function passengerFront(tau: number, w: ReturnType<typeof passengerTimes>): number {
  const P = PASSENGER;
  if (tau < P.appear) return FROM;
  if (tau < w.brakeAt) return FROM - (tau - P.appear) * P.speed;
  const t = Math.min(tau - w.brakeAt, P.speed / P.brake);
  return FROM - w.cruiseFor * P.speed - (P.speed * t - (P.brake * t * t) / 2);
}

/** When (between t0 and t1) a nose that only moves north first reaches `target`: found by halving. */
function whenNoseReaches(target: number, t0: number, t1: number, front: (t: number) => number): number {
  if (front(t1) > target) return t1;
  let lo = t0, hi = t1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (front(mid) > target) lo = mid;
    else hi = mid;
  }
  return hi;
}
