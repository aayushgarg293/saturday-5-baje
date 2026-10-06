import * as THREE from "three";
import { cue, passed } from "../core/cues";
import { timeOfDay } from "../core/timeOfDay";
import type { Rng } from "../core/rng";
import type { Placement } from "../world/props/batch";
import { type Actor, type Pose, makeActor, seenFrom, smooth, track, v } from "./actor";
import { buildPerson } from "./body";
import { bat, stumps, tennisBall } from "./props";
import { recipeFor } from "./recipes";

/**
 * Gully cricket in the gali (world/layout.ts, SLOTS.cricketGali): a batter
 * in front of brick-and-stick stumps at the far end, a bowler at the mouth
 * of the gali, and two fielders. One ball, every 7 seconds:
 *
 *   0.0  the bowler winds up          1.5  lets go; it bounces, reaches the bat
 *   2.1  the batter hits it           3.2  it lands by the first fielder
 *   3.4  he scoops it up              4.2  throws it back to the bowler
 *   4.9  the bowler catches it, polishes it on his shorts, and again
 *
 * All four kids share one 7-second action, so everything happens on cue.
 *
 * You can bat (activities/cricket.ts): the batter hands you his bat and
 * watches from the wall, and the bowler bowls to you, the same ball each
 * time. Swing as it reaches you: your timing decides where it goes (see
 * `Shot` below), and the ball goes there instead of to the first fielder.
 *
 * After 6 it's getting dark, and they've gone home (they leave while you're
 * not near enough to see them go: core/timeOfDay.ts).
 *
 * FRAME: the gali's, from `placeOnStreet` at the gali's mouth: +z out toward
 * the street, x across the gali (its walls at x = ±2), y up.
 */

const LOOP = 7;
/** When they go home (clock minutes), and how far away you must be for them to go (or come back). */
const GO_HOME = 18 * 60 + 5;
const UNSEEN = 25;
const middle = new THREE.Vector3();
const KID = 0.7; // the kids' height scale: the poses below are measured for it

// where everyone stands (gali frame); `turn` = which way they face
const BATTER = { x: 0.25, z: -5.4, turn: -Math.PI / 2 }; // side-on, the bowler on his left
const BOWLER = { x: 0, z: 1.2, turn: Math.PI }; // facing down the gali
const FIELD_A = { x: 1.2, z: 2.0, turn: Math.PI + 0.3 }; // near the mouth, where the ball goes
const FIELD_B = { x: -1.3, z: -2.4, turn: Math.PI / 2 + 0.4 }; // by the wall, halfway down
const STUMPS = { x: 0, z: -5.95 };

// the ball's flight, as fixed points (gali frame)
const RELEASE = v(0.12, 1.2 * KID + 0.35, 0.95);
const BOUNCE = v(0.02, 0.04, -3.8);
const HIT = v(0.05, 0.35, -5.0);
/** The first fielder picks it up here: a little in front of him. */
const LANDS = v(FIELD_A.x - 0.14, 0.04, FIELD_A.z - 0.42);
const THROWN = v(FIELD_A.x - 0.1, 1.0, FIELD_A.z - 0.1);
const CAUGHT = v(0.02, 0.85 * KID + 0.25, 0.95);
const T = { release: 1.5, bounce: 1.8, hit: 2.1, lands: 3.2, picked: 3.4, thrown: 4.2, caught: 4.9 };

/** A throw from `a` to `b`, `u` from 0 to 1, rising `peak` metres above the straight line. */
function arc(a: THREE.Vector3, b: THREE.Vector3, u: number, peak: number): THREE.Vector3 {
  return a.clone().lerp(b, u).add(v(0, 4 * peak * u * (1 - u), 0));
}

/**
 * Where the ball is at loop time `u`, while it's flying or lying on the
 * ground; `null` while someone holds it (then it's in their hand).
 */
function flight(u: number): THREE.Vector3 | null {
  if (u < T.release || u >= T.caught) return null;
  if (u < T.bounce) return RELEASE.clone().lerp(BOUNCE, (u - T.release) / (T.bounce - T.release));
  if (u < T.hit) return arc(BOUNCE, HIT, (u - T.bounce) / (T.hit - T.bounce), 0.15);
  if (u < T.lands) return arc(HIT, LANDS, (u - T.hit) / (T.lands - T.hit), 1.6);
  if (u < T.picked) return LANDS.clone();
  if (u < T.thrown) return null;
  return arc(THROWN, CAUGHT, (u - T.thrown) / (T.caught - T.thrown), 0.5);
}
/** Roughly where the ball is, for everyone's eyes to follow (also while held). */
function ballFor(u: number): THREE.Vector3 {
  return flight(u) ?? (u >= T.picked && u < T.thrown ? LANDS.clone().setY(0.6) : RELEASE.clone().setY(0.7));
}

type Spot = { x: number; z: number; turn: number };
/** The ball, as seen from a kid standing at `at`. */
const eyesOn = (at: Spot, u: number) => {
  const b = ballFor(u);
  return seenFrom(at, b.x, b.y, b.z);
};
const ramp = (u: number, a: number, b: number) => smooth(THREE.MathUtils.clamp((u - a) / (b - a), 0, 1));

// --- the bowler -------------------------------------------------------------------------------
function bowler(u: number): Pose {
  const HOLD = v(-0.1, 0.5, 0.18), HIPS_R = v(-0.15, 0.47, 0.03), HIPS_L = v(0.15, 0.47, 0.03);
  const CATCH_R = v(-0.05, 0.62, 0.24), CATCH_L = v(0.05, 0.62, 0.24);
  const rub = v(-0.11, 0.38 + Math.sin(u * 14) * 0.04, 0.07); // polishing the ball on his shorts
  const right = track(u, [0, 0.6, 1.0, 1.3, 1.5, 1.8, 2.5, 4.4, 4.8, 5.3, 5.6, 6.5, 7], [
    HOLD, v(-0.18, 0.55, -0.22), v(-0.16, 0.85, -0.12), v(-0.13, 0.94, 0.04), v(-0.1, 0.85, 0.2), v(0.08, 0.42, 0.2),
    HIPS_R, HIPS_R, CATCH_R, CATCH_R, rub, rub, HOLD,
  ]);
  const left = track(u, [0, 0.9, 1.4, 2.5, 4.4, 4.8, 5.3, 5.8, 7], [
    v(0.13, 0.45, 0.05), v(0.14, 0.75, 0.25), v(0.12, 0.5, 0.1), HIPS_L, HIPS_L, CATCH_L, CATCH_L, v(0.13, 0.43, 0.03), v(0.13, 0.45, 0.05),
  ]);
  const delivering = ramp(u, 1.0, 1.4) * (1 - ramp(u, 1.8, 2.4));
  return { right, left, look: eyesOn(BOWLER, u), lean: 0.05 + delivering * 0.35, twist: -0.2 * delivering, crouch: u > 5.4 && u < 6.4 ? 0.2 : 0 };
}

// --- the batter: both hands on the bat's handle; `tip` is where the bat's end points ---------------
function batterHands(u: number): { hands: THREE.Vector3; tip: THREE.Vector3 } {
  const tap = u < 1.4 ? Math.max(0, Math.sin(u * 5)) * 0.04 : 0;
  const times = [0, 1.6, 1.95, 2.1, 2.35, 2.8, 3.6, 7];
  const hands = track(u, times, [
    v(-0.02, 0.45, 0.14), v(-0.02, 0.45, 0.14), v(-0.1, 0.66, 0.02), v(0.1, 0.44, 0.2),
    v(0.12, 0.66, 0.12), v(0.1, 0.66, 0.1), v(-0.02, 0.45, 0.14), v(-0.02, 0.45, 0.14),
  ]);
  const tip = track(u, times, [
    v(-0.12, 0.02 + tap, 0.12), v(-0.12, 0.02, 0.12), v(-0.3, 0.95, -0.22), v(0.4, 0.32, 0.22),
    v(-0.05, 0.9, -0.08), v(-0.08, 0.85, -0.05), v(-0.12, 0.02, 0.12), v(-0.12, 0.02, 0.12),
  ]);
  return { hands, tip };
}
function batter(u: number): Pose {
  const { hands, tip } = batterHands(u);
  // the top hand (left) at the top of the handle, the bottom hand just below it
  const down = tip.clone().sub(hands).normalize().multiplyScalar(0.07);
  return { right: hands.clone().add(down), left: hands, look: eyesOn(BATTER, u), twist: 0.45, lean: 0.2, crouch: u < 1.9 ? 0.18 : 0.08 };
}

// --- the fielders ------------------------------------------------------------------------------
const READY_R = v(-0.09, 0.4, 0.18), READY_L = v(0.09, 0.4, 0.18); // hands on the knees, bent over
function fielderA(u: number): Pose {
  const pick = seenFrom(FIELD_A, LANDS.x, 0.14, LANDS.z);
  const right = track(u, [0, 2.6, 3.2, 3.5, 3.9, 4.2, 4.5, 5.5, 7], [
    READY_R, READY_R, pick, pick, v(-0.2, 0.62, -0.25), v(-0.1, 0.9, 0.22), v(0, 0.55, 0.2), READY_R, READY_R,
  ]);
  const left = track(u, [0, 2.6, 3.2, 3.6, 4.2, 5.5, 7], [READY_L, READY_L, v(0.12, 0.3, 0.25), v(0.15, 0.6, 0.2), v(0.18, 0.7, 0.2), READY_L, READY_L]);
  const bentDown = ramp(u, 2.6, 3.1) * (1 - ramp(u, 3.4, 3.8));
  const throwing = ramp(u, 3.8, 4.1) * (1 - ramp(u, 4.4, 5.0));
  return {
    right,
    left,
    look: eyesOn(FIELD_A, u),
    lean: 0.45 + bentDown * 0.55 - throwing * 0.35,
    crouch: 0.25 + bentDown * 0.6 - throwing * 0.25,
    twist: -0.5 * throwing, // turning toward the bowler to throw
  };
}
function fielderB(u: number): Pose {
  const HIPS_R = v(-0.15, 0.47, 0.03), HIPS_L = v(0.15, 0.47, 0.03);
  const up = ramp(u, 3.2, 3.8) * (1 - ramp(u, 6.2, 6.9)); // stands up, hands on hips, while the ball's away
  return {
    right: READY_R.clone().lerp(HIPS_R, up),
    left: READY_L.clone().lerp(HIPS_L, up),
    look: eyesOn(FIELD_B, u),
    lean: 0.45 * (1 - up),
    crouch: 0.25 * (1 - up),
  };
}

/**
 * What your swing did:
 *   six, four   timed right: over the bowler's head and out into the street,
 *               or along the ground past the fielder
 *   two, one    a little early or late: into the gap, run!
 *   caught      late, off the edge onto the wall and caught one-handed:
 *               "one tip one hand", out (gully rules)
 *   bowled      missed it, and it hit the stumps: out
 *   beaten      missed it, and it went past them
 */
export type Shot = "six" | "four" | "two" | "one" | "caught" | "bowled" | "beaten";

export type Cricket = {
  group: THREE.Group;
  /** Where the kids stand (gali frame), to collide with. */
  standing: { x: number; z: number }[];
  update(t: number, dt: number, player: THREE.Vector3): void;
  /** You, batting (activities/cricket.ts). */
  you: {
    /** The middle of the gali, where you ask to play (world). */
    middle: THREE.Vector3;
    /** Your eyes at the crease, and the bowler's hand you watch (world). */
    eye: THREE.Vector3;
    bowler: THREE.Vector3;
    /** Are the kids out playing (not gone home)? */
    here(): boolean;
    /** You take the bat (true), or give it back (false). */
    batting(on: boolean): void;
    /** You swing, now. */
    swing(): void;
    /** What happened to it (decided a moment after it reached you). */
    onShot: (shot: Shot) => void;
  };
};

/** Where the batter waits while you bat: by the wall, out of the way (gali frame). */
const WATCHING = { x: 1.5, z: -2.3, turn: -Math.PI / 2 - 0.6 };
/** How close to the moment the ball reaches the bat a swing must be (seconds): spot on, near enough, late. */
const TIMING = { right: 0.07, near: 0.15, late: 0.26 };
/** When the shot is decided (loop time): just after the ball would have reached the bat. */
const DECIDED = T.hit + TIMING.late;

/** Where the ball goes after your shot (gali frame), by loop time `u` (≥ T.hit); `null`: in someone's hand. */
function afterShot(shot: Shot, u: number, hand: () => THREE.Vector3): THREE.Vector3 | null {
  const back = (from: THREE.Vector3) => (u >= T.thrown ? arc(from, CAUGHT, Math.min(1, (u - T.thrown) / (T.caught - T.thrown)), 0.6) : from.clone());
  const fly = (to: THREE.Vector3, until: number, peak: number) => (u < until ? arc(HIT, to, (u - T.hit) / (until - T.hit), peak) : back(to));
  switch (shot) {
    case "six": return fly(SIX_LANDS, 3.8, 5.5);
    case "four": return fly(FOUR_STOPS, 3.4, 0.25);
    case "two":
    case "one": return flight(u);
    case "caught": {
      // off the edge, onto the wall, and into the second fielder's hand
      if (u < 2.35) return arc(HIT, WALL_HIT, (u - T.hit) / 0.25, 0.2);
      if (u < 2.65) return WALL_HIT.clone().lerp(hand(), (u - 2.35) / 0.3);
      return u < T.thrown ? null : back(FIELD_B_HAND);
    }
    case "bowled": {
      if (u < 2.2) return HIT.clone().lerp(STUMPS_HIT, (u - T.hit) / 0.1);
      return back(u < 2.45 ? STUMPS_HIT.clone().lerp(BEHIND, (u - 2.2) / 0.25) : BEHIND);
    }
    case "beaten": return back(u < 2.3 ? HIT.clone().lerp(BEHIND, (u - T.hit) / 0.2) : BEHIND);
  }
}
const SIX_LANDS = v(0.6, 0.04, 10);
const FOUR_STOPS = v(-0.7, 0.04, 6.2);
const WALL_HIT = v(-1.9, 1.1, -3.9);
const FIELD_B_HAND = v(FIELD_B.x, 0.7, FIELD_B.z);
const STUMPS_HIT = v(STUMPS.x, 0.3, STUMPS.z);
const BEHIND = v(0.25, 0.04, -6.5);

export function buildCricket(where: Placement, rng: Rng): Cricket {
  const group = new THREE.Group();
  group.name = "cricket";
  group.applyMatrix4(where.matrix);

  const kid = (at: Spot, pose: (u: number) => Pose, role: "kid" | "schoolboy" = "kid"): Actor => {
    const recipe = recipeFor(role, rng);
    recipe.build.scale = KID;
    recipe.outfit.bag = undefined; // (the schoolboy's bag is thrown down somewhere)
    recipe.outfit.feet = rng.next() < 0.6 ? "barefoot" : "chappals";
    const person = buildPerson(recipe);
    group.add(person.root);
    return makeActor({ person, at, actions: [{ name: "play", duration: LOOP, pose }], notice: "none" });
  };
  const players = {
    batter: kid(BATTER, batter, "schoolboy"),
    bowler: kid(BOWLER, bowler),
    fieldA: kid(FIELD_A, fielderA),
    fieldB: kid(FIELD_B, fielderB),
  };

  // while you bat, the batter stands by the wall, hands on his hips, watching (the same kid: his own body)
  const watching = makeActor({
    person: players.batter.person, at: WATCHING, notice: "none",
    actions: [{ name: "watch", duration: LOOP, pose: (u) => ({ right: v(-0.15, 0.47, 0.03), left: v(0.15, 0.47, 0.03), look: eyesOn(WATCHING, u), smile: u > T.hit && u < 4 }) }],
  });
  // (making an actor puts the body where it stands: put him back at the crease until you bat)
  const stand = (at: Spot) => {
    players.batter.person.root.position.set(at.x, 0, at.z);
    players.batter.person.root.rotation.y = at.turn;
  };
  stand(BATTER);
  let youBat = false;
  let swungAt = -1; // loop time of your swing (−1: none yet this ball)
  let swingNow = false; // (you've just swung: stamped with the loop time next frame)
  let shot: Shot | null = null;

  const theBat = bat();
  const ball = tennisBall();
  const wicket = stumps();
  wicket.position.set(STUMPS.x, 0, STUMPS.z);
  group.add(theBat, ball, wicket);

  const hands = new THREE.Vector3(), tip = new THREE.Vector3(), dir = new THREE.Vector3();
  // the sounds of the game: where in the world each happens, and when in the loop
  group.updateMatrixWorld(true);
  const sounds = [
    { name: "ballBounce", at: T.bounce, where: group.localToWorld(BOUNCE.clone()) },
    { name: "batHit", at: T.hit, where: group.localToWorld(HIT.clone()) },
    { name: "ballBounce", at: T.lands, where: group.localToWorld(LANDS.clone()) },
  ] as const;
  let before = 0;
  const handB = () => players.fieldB.grip("R", new THREE.Vector3());

  /** Your shot, from when you swung (loop time) against when the ball reached the bat. */
  const judge = (): Shot => {
    if (swungAt < 0) return Math.random() < 0.5 ? "bowled" : "beaten";
    const off = swungAt - T.hit; // (negative: early)
    if (Math.abs(off) <= TIMING.right) return Math.random() < 0.4 ? "six" : "four";
    if (Math.abs(off) <= TIMING.near) return off < 0 ? "two" : "one";
    if (off > 0) return Math.random() < 0.6 ? "caught" : "one";
    return Math.random() < 0.5 ? "bowled" : "beaten";
  };

  const you: Cricket["you"] = {
    middle: group.localToWorld(v(0, 0, -2)),
    eye: group.localToWorld(v(BATTER.x - 0.1, 1.42, BATTER.z + 0.15)),
    bowler: group.localToWorld(v(0, 0.85, 1.0)),
    here: () => group.visible,
    batting(on) {
      youBat = on;
      stand(on ? WATCHING : BATTER); // (he steps aside to the wall, or back to the crease)
      shot = null;
      swungAt = -1;
      theBat.visible = !on;
      wicket.rotation.set(0, 0, 0);
    },
    swing() {
      if (youBat && swungAt < 0) swingNow = true;
    },
    onShot: () => {},
  };

  return {
    group,
    standing: [BATTER, BOWLER, FIELD_A, FIELD_B],
    you,
    update(t, dt, player) {
      // home time (or back again, if the clock is turned back): only while you're not close
      const home = timeOfDay.minutes >= GO_HOME;
      if (home === group.visible && group.getWorldPosition(middle).distanceTo(player) > UNSEEN) group.visible = !home;
      if (!group.visible) return;
      const u = t % LOOP;
      for (const [name, p] of Object.entries(players)) if (!(youBat && name === "batter")) p.update(t, dt, player);
      if (youBat) watching.update(t, dt, player);

      // batting yourself: a new ball, your shot decided just after it reached you
      if (youBat) {
        if (u < before) {
          shot = null;
          swungAt = -1;
          wicket.rotation.set(0, 0, 0);
        }
        if (swingNow) {
          swingNow = false;
          if (!shot) swungAt = u;
        }
        // decided when you swing (once the ball's there), or, if you didn't, just after it passed you
        const swungIn = swungAt >= 0 && u >= Math.max(T.hit, swungAt) && u < 5;
        if (!shot && (swungIn || passed(before, u, DECIDED))) {
          shot = judge();
          if (shot === "bowled") wicket.rotation.set(0.5, 0, 0.15); // (knocked back)
          if (shot !== "beaten" && shot !== "bowled" && swungAt >= 0) cue("batHit", group.localToWorld(HIT.clone()));
          you.onShot(shot);
        }
      }
      for (const s of sounds) {
        // (batting yourself, the bat's knock comes with your shot, above)
        if (youBat && s.name === "batHit") continue;
        if (passed(before, u, s.at)) cue(s.name, s.where);
      }
      before = u;

      // the bat: from the top hand, toward where the pose says its end points
      players.batter.grip("L", hands);
      const b = batterHands(u);
      tip.copy(seenFrom({ x: 0, z: 0, turn: -BATTER.turn }, b.tip.x, b.tip.y, b.tip.z)).add(v(BATTER.x, 0, BATTER.z));
      theBat.position.copy(hands);
      theBat.quaternion.setFromUnitVectors(v(0, -1, 0), dir.copy(tip).sub(hands).normalize());

      // batting yourself: after the ball reaches you, it goes where your shot sent it
      if (youBat && shot && u >= T.hit) {
        const at = afterShot(shot, u, handB);
        if (at) ball.position.copy(at);
        else players.fieldB.grip("R", ball.position);
        if (shot !== "one" && shot !== "two") return;
      }
      if (youBat && !shot && u >= T.hit && u < DECIDED) {
        // (still deciding: it carries on toward the stumps)
        ball.position.copy(HIT).lerp(STUMPS_HIT, (u - T.hit) / (DECIDED - T.hit));
        return;
      }

      // the ball: flying, on the ground, or in someone's hand
      const free = flight(u);
      if (free) ball.position.copy(free);
      else if (u >= T.picked && u < T.thrown) players.fieldA.grip("R", ball.position);
      else players.bowler.grip("R", ball.position);
    },
  };
}
