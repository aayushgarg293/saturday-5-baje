import * as THREE from "three";
import type { Rng } from "../core/rng";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import type { Placement } from "../world/props/batch";
import { type Action, type Actor, makeActor, seenFrom, smooth, track, v } from "./actor";
import { buildPerson } from "./body";
import { batterCloth, gola, jalebi, jhara, kachori, puri } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * The people at the food stalls (world/props/stalls.ts): the sellers, and a
 * customer or two, each doing their stall's work in a loop.
 *
 *   golgappa   the seller picks a puri, dips it in the matka, hands it over;
 *              a woman takes it and eats it
 *   kachori    the halwai stirs the kachoris in the oil with his jhara, lifts
 *              them out to drain, wipes his brow
 *   jalebi     the halwai squeezes batter from a cloth in spirals into the oil
 *   ice gola   the seller shaves the ice, presses it into a ball, pours the
 *              syrup; a kid licks one he's already bought
 *
 * There's no room behind a stall (the shop platforms start there), so the
 * sellers stand at one end of their stall. Positions are in the stall's
 * frame (x along the stall, +z toward the street); `P(at)` turns a point in
 * the stall's frame into the person's own frame, which poses are written in.
 */

export type Crew = {
  group: THREE.Group;
  /** Where people stand outside the stall's own footprint (stall frame), to collide with. */
  standing: { x: number; z: number }[];
  update(t: number, dt: number, player: THREE.Vector3): void;
};

/**
 * The golgappa cart can also serve you (activities/paniPuri.ts): where you
 * stand, where your leaf bowl is held out (in the world), and one puri made
 * for you at a time. While he does, the woman beside you waits her turn.
 */
export type GolgappaCrew = Crew & {
  you: {
    /** Where you stand (on the ground), and where your leaf bowl is held, in the world. */
    stand: THREE.Vector3;
    bowl: THREE.Vector3;
    /** What you look at while he works: his hands over the matka. */
    hands: THREE.Vector3;
    /** Seconds from the start of a serve until the puri's in your bowl, and the whole serve. */
    lands: number;
    takes: number;
  };
  /** He makes one for you: picks a puri, cracks it, fills it, dips it, and puts it in your bowl. */
  serveYou(): void;
};

/**
 * A stall that can serve you something to eat or drink (activities/kachori.ts, jalebi.ts), all in the world:
 * where you stand (on the ground), where your hand holds out the dona or paper, what you look at while he
 * works, and the seconds from the start of a serve until it's in your hand, and the whole serve.
 */
export type ServesYou = { stand: THREE.Vector3; held: THREE.Vector3; looks: THREE.Vector3; lands: number; takes: number };

/** The kachori halwai can make you one: a fresh one out of the oil, on his jhara, into your dona. */
export type KachoriCrew = Crew & { you: ServesYou; serveYou(): void };

/** The jalebi halwai can weigh you some: out of the oil, onto his little hand scale, onto your paper. */
export type JalebiCrew = Crew & { you: ServesYou; serveYou(grams: 100 | 250): void };

type At = { x: number; z: number; turn: number };
const P = (at: At) => (x: number, y: number, z: number) => seenFrom(at, x, y, z);

/** Someone of `role`, at a fixed height (the reaches below are measured for it). */
function member(group: THREE.Group, role: Role, rng: Rng, scale: number, at: At, actions: Action[], notice: "greet" | "glance" | "none", phase = 0): Actor {
  const recipe = recipeFor(role, rng);
  recipe.build.scale = scale;
  const person = buildPerson(recipe);
  group.add(person.root);
  return makeActor({ person, at, actions, notice, phase });
}

function frame(name: string, where: Placement): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.applyMatrix4(where.matrix);
  return group;
}

/** Hands at rest, standing (person frame): a fist on the hip, or hanging loosely. */
const HIP_L = v(0.21, 0.95, 0.03), HANG_R = v(-0.2, 0.84, 0.05);
const _at = new THREE.Vector3(), _tip = new THREE.Vector3();

/** Aim a long tool (built pointing down from the hand) from the hand toward `tip` (stall frame). */
function aim(tool: THREE.Object3D, hand: THREE.Vector3, tip: THREE.Vector3) {
  tool.position.copy(hand);
  tool.quaternion.setFromUnitVectors(v(0, -1, 0), _tip.copy(tip).sub(hand).normalize());
}

// --- golgappa -------------------------------------------------------------------------

export function golgappaCrew(where: Placement, rng: Rng): GolgappaCrew {
  const group = frame("golgappaCrew", where);
  const deck = 0.85;
  const sellerAt: At = { x: 1.05, z: 0.05, turn: -Math.PI / 2 }; // at the matka's end, facing along the cart
  const buyerAt: At = { x: 0.75, z: 0.85, turn: 2.84 }; // in front, turned toward him
  const s = P(sellerAt), b = P(buyerAt);
  const handover = [0.92, 1.1, 0.5] as const;
  const buyerHead = s(0.75, 1.45, 0.85);

  // pick a puri from the case → dip it in the matka → hold it out → back
  const sellerServe: Action = {
    name: "serve",
    duration: 4.5,
    pose: (u) => ({
      right: track(u, [0, 0.7, 1.1, 1.6, 2.0, 2.3, 2.9, 3.5, 4.5], [
        s(0.75, deck + 0.17, 0.2), s(0.3, deck + 0.53, 0), s(0.3, deck + 0.53, 0), s(0.52, deck + 0.47, 0),
        s(0.52, deck + 0.37, 0), s(0.52, deck + 0.47, 0), s(...handover), s(...handover), s(0.75, deck + 0.17, 0.2),
      ]),
      left: s(0.7, deck + 0.13, -0.25), // steadying himself on the cart
      look: u < 2.4 ? s(0.4, deck + 0.35, 0) : buyerHead,
      lean: u < 2.4 ? 0.25 : 0.1,
    }),
  };
  const sellerWait: Action = {
    name: "wait",
    duration: 2,
    pose: () => ({ right: s(0.75, deck + 0.17, 0.2), left: HIP_L, look: buyerHead }),
  };
  const buyerRest = v(-0.05, 0.98, 0.24), mouth = v(-0.02, 1.49, 0.14);
  const buyerServe: Action = {
    name: "serve",
    duration: 4.5,
    pose: (u) => ({
      // waits, reaches for the puri he holds out, pops it in her mouth
      right: track(u, [0, 2.9, 3.4, 4.1, 4.5], [buyerRest, buyerRest, b(...handover), mouth, buyerRest]),
      left: v(0.05, 0.97, 0.25), // holding her little leaf bowl
      look: u < 3.8 ? b(0.6, deck + 0.4, 0) : v(0, 1.4, 1),
      nod: u > 3.9 ? -0.1 : 0.05,
    }),
  };
  const buyerChew: Action = {
    name: "chew",
    duration: 2,
    pose: (u) => ({ right: buyerRest, left: v(0.05, 0.97, 0.25), look: b(1.05, 1.5, 0.05), smile: u > 0.8, nod: Math.sin(u * 9) * 0.03 }),
  };

  const seller = member(group, "halwai", rng, 1, sellerAt, [sellerServe, sellerWait], "greet");
  const buyer = member(group, "woman", rng, 0.94, buyerAt, [buyerServe, buyerChew], "none");
  const ball = puri();
  group.add(ball);

  // --- serving you (activities/paniPuri.ts) ------------------------------------------------
  // you stand further along the cart's front (he faces along the cart: toward you), she's to
  // your right; your leaf bowl held out just clear of the cart's edge (any nearer and the edge hides it), in front of the matka
  const you = { x: -0.05, z: 0.85 };
  const bowl = [0.42, 1.08, 0.66] as const;
  const serveYou: Action = {
    name: "serveYou",
    duration: 4.2,
    pose: (u) => ({
      // the same as hers (pick, crack with his thumb, dip), but into your bowl, and a little quicker
      right: track(u, [0, 0.6, 1.0, 1.5, 1.9, 2.2, 2.9, 3.3, 4.2], [
        s(0.75, deck + 0.17, 0.2), s(0.3, deck + 0.53, 0), s(0.3, deck + 0.53, 0), s(0.52, deck + 0.47, 0),
        s(0.52, deck + 0.37, 0), s(0.52, deck + 0.47, 0), s(bowl[0] + 0.04, bowl[1] + 0.07, bowl[2] - 0.04), s(bowl[0] + 0.04, bowl[1] + 0.07, bowl[2] - 0.04), s(0.75, deck + 0.17, 0.2),
      ]),
      left: s(0.7, deck + 0.13, -0.25),
      look: u < 2.3 ? s(0.4, deck + 0.35, 0) : s(you.x, 1.5, you.z),
      lean: u < 2.3 ? 0.25 : 0.2,
    }),
  };
  // meanwhile she waits her turn, chewing the last one, watching his hands
  const buyerWaits: Action = {
    name: "waits", duration: 4.2,
    pose: (u) => ({ right: buyerRest, left: v(0.05, 0.97, 0.25), look: b(0.45, deck + 0.4, 0), nod: Math.sin(u * 7) * 0.02 }),
  };
  const world = (x: number, y: number, z: number) => group.localToWorld(new THREE.Vector3(x, y, z));
  group.updateMatrixWorld(true);

  return {
    group,
    standing: [sellerAt, buyerAt],
    you: { stand: world(you.x, 0, you.z), bowl: world(...bowl), hands: world(0.5, deck + 0.3, 0.15), lands: 3.0, takes: serveYou.duration },
    serveYou() {
      seller.perform(serveYou);
      buyer.perform(buyerWaits);
    },
    update(t, dt, player) {
      seller.update(t, dt, player);
      buyer.update(t, dt, player);
      // the puri: in his fingers from the case to the handover, then in hers until it's eaten
      // (yours: in his fingers until it's in your bowl; from there it's activities/paniPuri.ts's)
      const { name, u } = seller.now;
      if (name === "serveYou") {
        ball.visible = u > 0.9 && u < 3.0;
        if (ball.visible) ball.position.copy(seller.grip("R", _at));
        return;
      }
      ball.visible = name === "serve" && u > 1.0 && u < 4.2;
      if (ball.visible) ball.position.copy(u < 3.4 ? seller.grip("R", _at) : buyer.grip("R", _at));
    },
  };
}

// --- kachori ---------------------------------------------------------------------------

export function kachoriCrew(where: Placement, rng: Rng): KachoriCrew {
  const group = frame("kachoriCrew", where);
  const at: At = { x: -1.55, z: 0.05, turn: Math.PI / 2 }; // beside the stove, facing the kadhai
  const s = P(at);
  const kadhai = { x: -0.8, oil: 0.67 };
  const street = s(0, 1.4, 5);
  let tip = new THREE.Vector3(); // where the jhara's end is (stall frame), set by the poses

  const fry: Action = {
    name: "fry",
    duration: 6,
    pose: (u) => {
      // turning the kachoris over: the jhara goes round slowly in the oil
      const a = u * 1.1;
      tip = v(kadhai.x + 0.17 * Math.cos(a), kadhai.oil + 0.01, 0.17 * Math.sin(a));
      return { right: s(-1.12 + 0.04 * Math.cos(a), 1.06, 0.04 * Math.sin(a)), left: HIP_L, look: s(kadhai.x, kadhai.oil, 0), lean: 0.35, rock: Math.sin(a) * 0.03 };
    },
  };
  const lift: Action = {
    name: "lift",
    duration: 2.6,
    pose: (u) => {
      // lift a scoop out and hold it over the oil, shaking it to drain
      const up = smooth(THREE.MathUtils.clamp(Math.min(u / 0.6, (2.6 - u) / 0.6), 0, 1));
      const shake = u > 0.7 && u < 1.9 ? Math.sin(u * 30) * 0.015 : 0;
      tip = v(kadhai.x - 0.05, kadhai.oil + 0.01 + up * 0.28 + shake, 0);
      return { right: s(-1.12, 1.06 + up * 0.14, shake), left: HIP_L, look: tip.clone(), lean: 0.3 };
    },
  };
  const wipe: Action = {
    name: "wipe",
    duration: 2.2,
    pose: (u) => {
      // the jhara rests in the kadhai; the other hand wipes his brow; a look at the street
      tip = v(kadhai.x - 0.2, kadhai.oil + 0.02, 0.2);
      const wiping = u > 0.3 && u < 1.6;
      return { right: s(-1.2, 0.98, 0.15), left: wiping ? v(0.02 + Math.sin(u * 8) * 0.04, 1.66, 0.14) : HIP_L, look: street, nod: wiping ? -0.1 : 0 };
    },
  };
  const halwai = member(group, "halwai", rng, 1, at, [fry, lift, fry, wipe], "greet");
  const tool = jhara();
  group.add(tool);

  // --- serving you (activities/kachori.ts) -------------------------------------------------
  // you stand in front of the stove, your dona held out just in front of it, near enough for his jhara
  const you = { x: -0.95, z: 1.0 };
  const held = v(-1.0, 1.05, 0.68);
  const rest = v(-1.12, 1.06, 0), restTip = v(kadhai.x + 0.17, kadhai.oil + 0.01, 0);
  const inOil = v(-1.15, 1.0, 0.05), oilTip = v(kadhai.x - 0.05, kadhai.oil + 0.01, 0.05);
  const lifted = v(-1.15, 1.22, 0.08), liftedTip = v(kadhai.x - 0.05, kadhai.oil + 0.31, 0.08);
  const over = v(-1.2, 1.36, 0.4), aboveDona = held.clone().add(v(0, 0.12, 0)), tipped = held.clone().add(v(0.05, 0.02, 0.05));
  const SERVE = [0, 0.6, 1.1, 1.6, 2.4, 2.8, 3.3, 4.2];
  const serveYou: Action = {
    name: "serveYou",
    duration: 4.2,
    pose: (u) => {
      // into the oil for a fresh one → lift it out and let it drain → over your dona → tip it in → back
      const hand = track(u, SERVE, [rest, inOil, inOil, lifted, over, over, over, rest]);
      tip = track(u, SERVE, [restTip, oilTip, oilTip, liftedTip, aboveDona, tipped, aboveDona, restTip]);
      const shake = u > 1.2 && u < 1.6 ? Math.sin(u * 30) * 0.012 : 0;
      tip.y += shake;
      return { right: s(hand.x, hand.y + shake, hand.z), left: HIP_L, look: u < 3.0 ? s(tip.x, tip.y, tip.z) : s(you.x, 1.5, you.z), lean: 0.3 };
    },
  };
  const yours = kachori(); // riding on the jhara, from the oil to your dona
  yours.visible = false;
  group.add(yours);
  const world = (x: number, y: number, z: number) => group.localToWorld(new THREE.Vector3(x, y, z));
  group.updateMatrixWorld(true);

  return {
    group,
    standing: [at],
    you: { stand: world(you.x, 0, you.z), held: world(held.x, held.y, held.z), looks: world(kadhai.x, 0.75, 0.1), lands: 2.8, takes: serveYou.duration },
    serveYou() {
      halwai.perform(serveYou);
    },
    update(t, dt, player) {
      halwai.update(t, dt, player); // (sets `tip` through the pose)
      const hand = halwai.grip("R", _at);
      aim(tool, hand, tip);
      // yours sits in the jhara's bowl, at its far end, from when it leaves the oil until it's tipped into your dona
      const { name, u } = halwai.now;
      yours.visible = name === "serveYou" && u > 1.1 && u < 2.8;
      if (yours.visible) yours.position.copy(tip).sub(hand).normalize().multiplyScalar(0.43).add(hand).add(v(0, 0.02, 0));
    },
  };
}

// --- jalebi ------------------------------------------------------------------------------

export function jalebiCrew(where: Placement, rng: Rng): JalebiCrew {
  const group = frame("jalebiCrew", where);
  const at: At = { x: -1.25, z: 0.05, turn: Math.PI / 2 };
  const s = P(at);
  const centre = { x: -0.72, y: 1.22 }; // above the near half of the flat kadhai

  const swirl: Action = {
    name: "swirl",
    duration: 6,
    pose: (u) => {
      // spirals: each one winding outward over two seconds, then the next
      const r = 0.03 + 0.1 * ((u % 2) / 2);
      const a = u * 7;
      return { right: s(centre.x + r * Math.cos(a), centre.y, r * Math.sin(a)), left: s(-0.95, 0.8, -0.3), look: s(-0.6, 1.0, 0), lean: 0.3 };
    },
  };
  const rest: Action = {
    name: "rest",
    duration: 3,
    pose: (u) => ({ right: v(-0.08, 1.12, 0.3 + Math.sin(u * 2) * 0.01), left: HIP_L, look: s(0, 1.4, 5), lean: 0.05 }),
  };
  const halwai = member(group, "halwai", rng, 1, at, [swirl, swirl, rest], "greet", 2);
  const cloth = batterCloth();
  group.add(cloth);

  // --- weighing you some (activities/jalebi.ts) ---------------------------------------------
  // He puts the batter cloth down at the counter's front corner and takes his tarazu (a little hand scale)
  // off its hook on a bamboo pole beside him; his other hand lifts fresh jalebis out of the oil with a jhara
  // (it lies at the counter's back corner) and drops them in the scale's pan, which swings down level with
  // the weight; then he tips them onto your paper, hangs the scale back up, and picks up the cloth again.
  const you = { x: -0.7, z: 1.25 };
  const held = v(-0.8, 0.98, 0.6); // your paper, held out
  const clothSpot = v(-0.98, 0.82, 0.3), clothAbove = v(-0.98, 0.9, 0.3);
  const hook = v(-1.38, 1.5, 0.42); // (beside him, on his right: not between you and him)
  const tarazu = buildTarazu();
  group.add(tarazu.group, tarazu.pole);
  tarazu.pole.position.set(hook.x - 0.05, 0, hook.z);
  const jharaSpot = v(-0.98, 0.8, -0.3), jharaAbove = v(-0.98, 0.88, -0.3), lyingTip = v(-0.98, 0.8, 0.13);
  const tool = jhara();
  group.add(tool);
  const coils: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const c = jalebi();
    c.visible = false;
    group.add(c);
    coils.push(c);
  }
  let grams: 100 | 250 = 100;

  // the right hand: cloth down → scale off the hook → held out → over your paper → scale back → cloth up
  const R_T = [0, 0.5, 0.7, 1.3, 1.6, 2.6, 4.8, 5.4, 5.8, 6.3, 6.6, 6.9, 7.2];
  const restR = v(-0.9, 1.15, 0.1), front = v(-0.95, 1.45, 0.3), overPaper = v(-0.95, 1.42, 0.55);
  const R_P = [restR, clothAbove, clothSpot, hook, hook, front, front, overPaper, overPaper, hook, clothAbove, clothSpot, restR];
  // the left hand: the jhara up → into the oil → lift → over the scale's pan → tip → jhara back down
  const L_T = [0, 0.8, 1.0, 1.6, 2.2, 2.6, 3.1, 3.5, 3.8, 4.1, 4.6, 4.9];
  const overOil = v(-0.95, 1.25, -0.15), inOil = v(-0.9, 1.12, -0.12), liftedL = v(-0.95, 1.38, -0.1), overPan = v(-1.1, 1.5, 0.05);
  const L_P = [jharaAbove, jharaSpot, jharaSpot, overOil, inOil, inOil, liftedL, overPan, overPan, overPan, jharaSpot, jharaAbove];
  const TIP_T = [1.0, 1.6, 2.2, 2.6, 3.1, 3.5, 3.8, 4.1, 4.6];
  const panA = (handAt: THREE.Vector3) => handAt.clone().add(v(0.15, -0.32, 0)); // the jalebi pan, hanging level
  const TIP_P = [lyingTip, v(-0.55, 1.1, -0.1), v(-0.5, 1.0, -0.05), v(-0.5, 1.0, -0.05), v(-0.65, 1.22, 0.1), panA(front).add(v(0, 0.12, 0)), panA(front).add(v(0, 0.12, 0)), panA(front).add(v(0.02, 0.06, 0.03)), lyingTip];
  let right = restR.clone(), left = jharaAbove.clone();
  const weigh: Action = {
    name: "weigh",
    duration: 7.2,
    pose: (u) => {
      right = track(u, R_T, R_P);
      left = track(u, L_T, L_P);
      const look = u < 1.2 ? clothSpot : u < 3.0 ? v(-0.6, 1.05, 0) : u < 5.0 ? panA(front) : u < 6.0 ? held : s(you.x, 1.5, you.z);
      return { right: s(right.x, right.y, right.z), left: s(left.x, left.y, left.z), look: s(look.x, look.y, look.z), lean: u > 1.6 && u < 3.2 ? 0.3 : 0.12 };
    },
  };
  const LANDS = 5.6;
  const world = (x: number, y: number, z: number) => group.localToWorld(new THREE.Vector3(x, y, z));
  group.updateMatrixWorld(true);
  const _hand = new THREE.Vector3(), _end = new THREE.Vector3();

  return {
    group,
    standing: [at],
    you: { stand: world(you.x, 0, you.z), held: world(held.x, held.y, held.z), looks: world(-0.6, 1.0, 0.1), lands: LANDS, takes: weigh.duration },
    serveYou(g) {
      grams = g;
      halwai.perform(weigh);
    },
    update(t, dt, player) {
      halwai.update(t, dt, player);
      const { name, u } = halwai.now;
      const weighing = name === "weigh";
      // the cloth: in his right hand, except while it lies on the counter
      if (weighing && u > 0.7 && u < 6.9) cloth.position.copy(clothSpot).add(v(0, 0.08, 0));
      else cloth.position.copy(halwai.grip("R", _at));
      // the jhara: lying at the back corner, except while his left hand has it
      if (weighing && u > 1.0 && u < 4.6) aim(tool, halwai.grip("L", _hand), track(u, TIP_T, TIP_P));
      else aim(tool, jharaSpot, lyingTip);
      // the scale: on its hook, except while his right hand holds it out; its beam swings to level once the
      // jalebis are in, and back once they're out
      const inHand = weighing && u > 1.6 && u < 6.3;
      const top = inHand ? halwai.grip("R", _end).clone() : hook.clone();
      const full = weighing && u > 3.9 && u < LANDS;
      const since = u - 3.9;
      const tilt = !weighing || u < 3.9 ? 0.3 : full ? 0.3 * Math.exp(-since * 4) * Math.cos(since * 9) : 0.3 * Math.min(1, (u - LANDS) / 0.4);
      const pan = tarazu.hang(top, tilt);
      // the jalebis: on the jhara's bowl out of the oil, then in the pan, then off onto your paper
      const count = grams === 100 ? 3 : 6;
      coils.forEach((c, i) => {
        c.visible = weighing && i < count && u > 2.6 && u < LANDS;
        if (!c.visible) return;
        const pile = v(((i % 3) - 1) * 0.022, Math.floor(i / 3) * 0.012 + 0.012, ((i * 2) % 3 - 1) * 0.015);
        if (u < 3.9) c.position.copy(track(u, TIP_T, TIP_P)).sub(_hand).normalize().multiplyScalar(0.43).add(_hand).add(pile);
        else if (u < 5.4) c.position.copy(pan).add(pile);
        else c.position.lerpVectors(_end.copy(pan).add(pile), held.clone().add(pile), (u - 5.4) / 0.2);
      });
    },
  };
}

/**
 * The jalebi-maker's tarazu: a hand scale. A string from the hand to a beam, and a pan hanging from each end
 * of the beam: the near one for the jalebis, the far one with a weight in it. It hangs on a hook on a bamboo
 * pole when he isn't weighing. `hang(top, tilt)` puts it under `top` (where the string is held) with the beam
 * tilted (0 = level; more = the weight's side down), and returns where the jalebi pan is.
 */
function buildTarazu() {
  const group = new THREE.Group();
  group.name = "tarazu";
  const steel = toon({ color: 0xb9b6ad });
  const string = toon({ color: 0x6b5a45 });
  const line = (len: number) => new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 4).translate(0, -len / 2, 0), string);
  const top = line(0.1);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), steel);
  const pans = [0, 1].map(() => {
    const pan = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.015, 12), steel);
    const cord = line(0.2);
    cord.position.y = 0.2;
    pan.add(dish, cord);
    return pan;
  });
  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.03, 8), toon({ color: 0x3a3632 }));
  weight.position.y = 0.022;
  pans[1].add(weight);
  group.add(top, beam, ...pans);
  // the pole it hangs on, with a hook at the top
  const pole = new THREE.Group();
  const bamboo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 1.62, 6).translate(0, 0.81, 0), toon({ color: PAL.bamboo }));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 4).rotateZ(Math.PI / 2).translate(0.04, 1.56, 0), steel);
  pole.add(bamboo, arm);

  const end = new THREE.Vector3();
  return {
    group,
    pole,
    hang(at: THREE.Vector3, tilt: number): THREE.Vector3 {
      top.position.copy(at);
      const centre = at.clone().add(new THREE.Vector3(0, -0.1, 0));
      beam.position.copy(centre);
      beam.rotation.set(0, 0, tilt);
      // the near (jalebi) pan at the +x end goes up as the beam tilts, the weight's pan at −x goes down
      for (const [i, side] of [[0, 1], [1, -1]] as const) {
        end.set(side * 0.15 * Math.cos(tilt), side * 0.15 * Math.sin(tilt), 0).add(centre);
        pans[i].position.copy(end).add(new THREE.Vector3(0, -0.22, 0));
      }
      return pans[0].position.clone().add(new THREE.Vector3(0, 0.01, 0));
    },
  };
}

// --- ice gola --------------------------------------------------------------------------------

export function iceGolaCrew(where: Placement, rng: Rng): Crew {
  const group = frame("iceGolaCrew", where);
  const deck = 0.85;
  const sellerAt: At = { x: -1.0, z: 0, turn: Math.PI / 2 }; // between the cart's handles
  const kidAt: At = { x: -0.35, z: 0.8, turn: Math.PI }; // in front, facing the cart
  const s = P(sellerAt), kd = P(kidAt);
  const ball = s(-0.62, deck + 0.38, 0.1); // where he shapes the gola

  const shave: Action = {
    name: "shave",
    duration: 3,
    pose: (u) => ({ right: s(-0.28 + 0.12 * Math.sin(u * 4), deck + 0.41, 0), left: s(-0.45, deck + 0.27, -0.15), look: s(-0.25, deck + 0.35, 0), lean: 0.3, rock: Math.sin(u * 4) * 0.03 }),
  };
  const press: Action = {
    name: "press",
    duration: 2,
    pose: (u) => {
      const squeeze = Math.sin(u * 6) * 0.015;
      return { right: ball.clone().add(v(0, 0.05 + squeeze, -0.04)), left: ball.clone().add(v(0, -0.04, 0.04)), look: ball, lean: 0.2 };
    },
  };
  const syrup: Action = {
    name: "syrup",
    duration: 2.6,
    pose: (u) => ({
      // to a bottle, over the gola (pouring), back
      right: track(u, [0, 0.6, 0.9, 1.3, 2.1, 2.6], [ball.clone().add(v(0, 0.1, 0)), s(-0.3, deck + 0.35, 0.28), s(-0.3, deck + 0.35, 0.28), ball.clone().add(v(0, 0.2, 0)), ball.clone().add(v(0, 0.2, 0)), HANG_R]),
      left: ball.clone().add(v(0, -0.04, 0.04)),
      look: ball,
      lean: 0.15,
    }),
  };
  const offer: Action = {
    name: "offer",
    duration: 2,
    pose: () => ({ right: HANG_R, left: s(-0.45, 1.12, 0.45), look: s(kidAt.x, 1.0, kidAt.z), smile: true }),
  };
  const seller = member(group, "man", rng, 1, sellerAt, [shave, press, syrup, offer], "greet");

  // the kid, with the gola he's already got
  const licking: Action = {
    name: "lick",
    duration: 2.5,
    pose: (u) => ({ right: v(-0.03, 0.98, 0.12), left: v(0.13, 0.62, 0.03), look: v(0, 1.05, 0.4), nod: 0.1 + Math.max(0, Math.sin(u * 5)) * 0.06 }),
  };
  const watching: Action = {
    name: "watch",
    duration: 3,
    pose: () => ({ right: v(-0.1, 0.8, 0.2), left: v(0.13, 0.62, 0.03), look: kd(sellerAt.x, 1.5, sellerAt.z) }),
  };
  const kid = member(group, rng.next() < 0.5 ? "kid" : "schoolboy", rng, 0.7, kidAt, [licking, watching, licking], "glance", 1);

  const colour = [0xd6283a, 0x2e9e47, 0xf28a1d][Math.floor(rng.next() * 3)];
  const hisGola = gola(0x2a67c6), kidsGola = gola(colour);
  group.add(hisGola, kidsGola);
  return {
    group,
    standing: [sellerAt, kidAt],
    update(t, dt, player) {
      seller.update(t, dt, player);
      kid.update(t, dt, player);
      hisGola.visible = seller.now.name !== "shave";
      if (hisGola.visible) hisGola.position.copy(seller.grip("L", _at));
      kidsGola.position.copy(kid.grip("R", _at));
    },
  };
}
