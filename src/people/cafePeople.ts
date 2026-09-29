import * as THREE from "three";
import { cue } from "../core/cues";
import type { Rng } from "../core/rng";
import { flat } from "../render/toon";
import { say } from "../ui/caption";
import { BOOTHS, BOOTH, type Booth, DESK, HALL, OWNER_SEAT, boothPoint } from "../world/cafe/plan";
import { type ScreenKind, screenTexture } from "../world/cafe/screens";
import { type Action, type Actor, makeActor, v } from "./actor";
import { buildPerson } from "./body";
import { bikeKeys, headphones, mobile, spectacles } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * The people in the cafe:
 *
 *   the owner         at his counter at the top of the stairs: typing,
 *                     writing in his register, watching the stairs. The
 *                     first time you come up, he looks at you, nods, and
 *                     points you to booth 2 ("Do number khaali hai").
 *   the CS boys       booths 10 and 11, headphones on, hunched over, flicking
 *                     the mouse; now and then one turns to shout to the other
 *   the uncle         booth 5, glasses on, poking the keys with one finger,
 *                     peering at the screen, hand on his chin
 *   the college guy   booth 7 by the window: typing in bursts, leaning back
 *                     grinning at his chat; his Nokia and bike keys on the desk
 *
 * Their screens are lit (world/cafe/screens.ts). All in the cafe building's
 * frame; poses in each person's own frame, which is their booth's frame
 * (plan.ts, DESK: where the keyboard, mouse and screen are).
 */

export type CafePeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

/** Seat heights above the hall's floor: the plastic chairs, the owner's revolving chair. */
const SEAT = { booth: 0.47, owner: OWNER_SEAT.seat + 0.02 };
/** Update them only when you're this near the cafe (they're indoors, upstairs). */
const NEAR = 30;

const KEYS = v(DESK.keyboard.u, DESK.keyboard.y + 0.04, DESK.keyboard.v);
const MOUSE = v(DESK.mouse.u, DESK.mouse.y + 0.04, DESK.mouse.v);
const SCREEN = v(DESK.screen.u, DESK.screen.y, DESK.screen.v);
const pulse = (u: number, every: number, sharp = 6) => Math.max(0, Math.sin((u / every) * Math.PI * 2)) ** sharp;

export function buildCafePeople(frame: THREE.Matrix4, rng: Rng): CafePeople {
  const group = new THREE.Group();
  group.name = "cafePeople";
  group.applyMatrix4(frame);
  // everyone sits on the hall's floor: a frame raised to it
  const floor = new THREE.Group();
  floor.position.y = HALL.floor;
  group.add(floor);
  const booth = (n: number) => BOOTHS.find((b) => b.n === n)!;

  const person = (role: Role, scale: number) => {
    const r = recipeFor(role, rng);
    r.build.scale = scale; // the reaches below are for this height
    if (r.outfit.top === "kurta") r.outfit.top = "halfShirt"; // seated: a kurta's stiff tails would go through the chair
    r.outfit.jacket = undefined;
    r.outfit.safa = undefined; // indoors
    r.outfit.bag = undefined;
    const p = buildPerson(r);
    floor.add(p.root);
    return p;
  };
  const onHead = (p: ReturnType<typeof buildPerson>, thing: THREE.Object3D, forward = 0) => {
    thing.position.set(0, 0.1 * p.scale, 0.005 + forward * p.scale);
    p.bone("head").add(thing);
  };

  // --- the owner ---------------------------------------------------------------------------
  // (in his frame: forward is toward the landing, his left is the back of the
  // hall; the counter's inner edge is 0.4 m ahead. His PC is at its far end,
  // to his left, turned toward him; the register in front of him.)
  const own = {
    keys: v(0.26, 1.07, 0.42),
    screen: v(0.5, 1.22, 0.72),
    register: v(-0.2, 1.03, 0.55),
    stairs: v(-1.4, 1.5, 2.55),
  };
  const ownerActions: Action[] = [
    {
      name: "type", duration: 7,
      pose: (u) => ({
        right: own.keys.clone().add(v(-0.09, pulse(u, 0.31) * 0.02, 0)),
        left: own.keys.clone().add(v(0.1, pulse(u + 0.13, 0.27) * 0.02, 0)),
        look: own.screen, lean: 0.25, twist: 0.35,
      }),
    },
    {
      name: "register", duration: 5,
      pose: (u) => ({
        right: own.register.clone().add(v(-0.06 + Math.sin(u * 7) * 0.025, 0, Math.sin(u * 2) * 0.02)),
        left: own.register.clone().add(v(0.12, -0.01, -0.05)),
        look: own.register, lean: 0.35, nod: 0.1,
      }),
    },
    { name: "type", duration: 6, pose: (u) => ({ right: own.keys.clone().add(v(-0.09, pulse(u, 0.29) * 0.02, 0)), left: own.keys.clone().add(v(0.1, pulse(u + 0.1, 0.33) * 0.02, 0)), look: own.screen, lean: 0.25, twist: 0.35 }) },
    { name: "watch", duration: 4, pose: () => ({ right: v(-0.13, 0.74, 0.3), left: v(0.13, 0.74, 0.3), look: own.stairs, lean: -0.1 }) },
  ];
  const pointAction: Action = {
    name: "point", duration: 3.2,
    // his right arm out toward the booths, then down
    pose: () => ({ right: v(-0.64, 1.38, 0.12), left: own.keys.clone().add(v(0.1, 0, 0)), look: v(-4.4, 1.3, -0.4), lean: 0.05, twist: -0.25, smile: true }),
  };
  const ownerPerson = person("shopkeeper", 1);
  const owner = makeActor({ person: ownerPerson, at: OWNER_SEAT, seat: SEAT.owner, actions: ownerActions, notice: "greet", phase: rng.range(0, 10) });
  let pointedYou = false;

  // --- the customers --------------------------------------------------------------------------------
  const customers: Actor[] = [];
  // who's typing, and where their keyboard and mouse are (for the clicks you hear)
  const typists: { actor: Actor; keys: THREE.Vector3; mouse: THREE.Vector3; keyIn: number; mouseIn: number }[] = [];
  group.updateMatrixWorld(true);
  const onDesk = (b: Booth, spot: { u: number; y: number; v: number }) => {
    const q = boothPoint(b, spot.u, spot.v);
    return group.localToWorld(new THREE.Vector3(q.x, HALL.floor + spot.y, q.z));
  };
  const seat = (b: Booth, p: ReturnType<typeof buildPerson>, actions: Action[], notice: "none" | "glance" = "none") => {
    const a = makeActor({ person: p, at: { x: b.x, z: b.z, turn: b.turn }, seat: SEAT.booth, actions, notice, phase: rng.range(0, 20) });
    customers.push(a);
    typists.push({ actor: a, keys: onDesk(b, DESK.keyboard), mouse: onDesk(b, DESK.mouse), keyIn: 0, mouseIn: 0 });
    return a;
  };
  {
    const k = group.localToWorld(new THREE.Vector3(1.58, HALL.floor + 1.02, -9.18)); // the owner's keyboard (furniture.ts, counter)
    typists.push({ actor: owner, keys: k, mouse: k, keyIn: 0, mouseIn: 0 });
  }

  // the CS boys: booth 10's friend is on his right, 11's on his left
  for (const [n, friendSide, screen] of [[10, -1, "game"], [11, 1, "game2"]] as const) {
    const flickEvery = rng.range(0.7, 1.1);
    const play = (duration: number): Action => ({
      name: "play", duration,
      pose: (u) => ({
        right: MOUSE.clone().add(v(Math.sin(u * 7) * 0.02 + pulse(u, flickEvery, 10) * 0.05, 0, Math.cos(u * 5) * 0.015)),
        left: KEYS.clone().add(v(0.11, pulse(u, 0.23, 4) * 0.015, 0.01)),
        look: SCREEN.clone().add(v(Math.sin(u * 3) * 0.03, 0, 0)),
        lean: 0.38, rock: Math.sin(u * 3) * 0.02,
      }),
    });
    const shout: Action = {
      name: "shout", duration: 2.4,
      pose: (u) => ({
        right: MOUSE,
        left: v(0.15 + Math.sin(u * 8) * 0.04, 1.02, 0.36),
        look: v(friendSide * 1.25, 1.15, 0.3), lean: -0.05, smile: true, twist: friendSide * 0.2,
      }),
    };
    const b = booth(n);
    const p = person("youngMan", 0.96);
    onHead(p, headphones());
    seat(b, p, [play(rng.range(8, 11)), shout, play(rng.range(10, 14))]);
    litScreen(group, b, screen);
  }

  // the uncle, pecking at the keys with one finger
  {
    const b = booth(5);
    const p = person("uncle", 1);
    onHead(p, spectacles(), 0.125);
    const onDesk = v(0.28, BOOTH.deskTop + 0.04, 0.5);
    seat(b, p, [
      {
        name: "peck", duration: 6,
        pose: (u) => ({
          right: KEYS.clone().add(v(-0.05 + Math.sin(u * 1.3) * 0.05, 0.06 - pulse(u, 0.8, 8) * 0.05, 0)),
          left: onDesk,
          look: u % 3 < 1.6 ? KEYS : SCREEN, lean: 0.4,
        }),
      },
      { name: "read", duration: 4, pose: () => ({ right: onDesk.clone().setX(-0.28), left: onDesk, look: SCREEN, lean: 0.5, nod: 0.05 }) },
      { name: "chin", duration: 3, pose: () => ({ right: v(-0.03, 1.16, 0.16), left: onDesk, look: SCREEN, lean: 0.3 }) },
    ]);
    litScreen(group, b, "mail");
  }

  // the college guy by the window, chatting
  {
    const b = booth(7);
    const p = person("youngMan", 1);
    seat(b, p, [
      {
        name: "type", duration: 4,
        pose: (u) => ({ right: KEYS.clone().add(v(-0.1, pulse(u, 0.14, 3) * 0.02, 0)), left: KEYS.clone().add(v(0.1, pulse(u + 0.07, 0.16, 3) * 0.02, 0)), look: SCREEN, lean: 0.25 }),
      },
      { name: "read", duration: 5, pose: (u) => ({ right: MOUSE, left: v(0.13, 0.62, 0.3), look: SCREEN, lean: -0.12, smile: u > 2.5 }) },
      { name: "laugh", duration: 2, pose: (u) => ({ right: MOUSE, left: v(0.13, 0.62, 0.3), look: SCREEN, lean: -0.2 + Math.abs(Math.sin(u * 8)) * 0.05, smile: true, nod: -0.1 }) },
    ], "glance");
    litScreen(group, b, "chat");
    // his Nokia and his bike keys on the desk
    const phone = mobile();
    const at = boothPoint(b, 0.4, BOOTH.chairBack + 0.12);
    phone.position.set(at.x, HALL.floor + BOOTH.deskTop + 0.02, at.z);
    phone.rotation.set(-Math.PI / 2, 0, b.turn);
    group.add(phone);
    const keys = bikeKeys();
    const kat = boothPoint(b, 0.3, BOOTH.chairBack + 0.3);
    keys.position.set(kat.x, HALL.floor + BOOTH.deskTop + 0.01, kat.z);
    keys.rotation.y = b.turn + 0.6;
    group.add(keys);
  }

  group.traverse((o) => { o.castShadow = false; }); // indoors: no sun reaches them
  const centre = new THREE.Vector3(-1, HALL.floor, -7).applyMatrix4(frame);
  const local = new THREE.Vector3();

  return {
    group,
    update(t, dt, player) {
      if (player.distanceTo(centre) > NEAR) return;
      owner.update(t, dt, player);
      for (const c of customers) c.update(t, dt, player);
      // the clicks of whoever's typing, at the pace of what they're doing:
      // bursts of typing, the uncle's one finger at a time, the gamers'
      // keys and mouse
      for (const ty of typists) {
        const doing = ty.actor.now.name;
        const pace = doing === "type" ? [0.06, 0.2] : doing === "peck" ? [0.75, 0.95] : doing === "play" ? [0.12, 0.4] : null;
        ty.keyIn -= dt;
        ty.mouseIn -= dt;
        if (pace && ty.keyIn < 0) {
          cue("keyClick", ty.keys);
          ty.keyIn = pace[0] + Math.random() * (pace[1] - pace[0]);
        }
        if (doing === "play" && ty.mouseIn < 0) {
          cue("mouseClick", ty.mouse);
          ty.mouseIn = 0.2 + Math.random() * 0.8;
        }
      }
      // the first time you come up and near the counter, he points you to your booth
      if (!pointedYou && player.y > HALL.floor - 0.5) {
        local.copy(player);
        group.worldToLocal(local);
        if (Math.hypot(local.x - OWNER_SEAT.x, local.z - OWNER_SEAT.z) < 4.5) {
          pointedYou = true;
          owner.perform(pointAction);
          say("Owner", "Do number khaali hai… wahan baith jao.", 4.5);
        }
      }
    },
  };
}

/** Light up booth `b`'s CRT with a picture (a plane just in front of its dark screen). */
function litScreen(group: THREE.Group, b: Booth, kind: ScreenKind) {
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.23), flat(0xffffff, { map: screenTexture(kind), opaque: true }));
  const at = boothPoint(b, 0, DESK.screen.v - 0.004);
  screen.position.set(at.x, HALL.floor + DESK.screen.y, at.z);
  screen.rotation.y = b.turn + Math.PI; // facing back at the person sitting there
  screen.name = `screen:${kind}`;
  group.add(screen);
}
