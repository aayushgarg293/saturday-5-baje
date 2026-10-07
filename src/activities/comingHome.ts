import * as THREE from "three";
import { CHIT, errands } from "../core/errands";
import { makeRng } from "../core/rng";
import { timeOfDay } from "../core/timeOfDay";
import { type Action, makeActor, v } from "../people/actor";
import { buildPerson } from "../people/body";
import { recipeFor } from "../people/recipes";
import { PAL } from "../render/palette";
import { say } from "../ui/caption";
import { Parts } from "../world/kit";

/**
 * Coming home. Once you've been to the cafe, or done any of Mummy's errands,
 * home's door is open when you come up to it, and she's standing in it (in a
 * salwar-kameez and dupatta, a hand at her waist): "Aa gaya?". E, and
 * the two of you have a few words, built from what you did (core/errands.ts):
 *
 *   late          after 7:30: "Kitni der kar di!"
 *   everything    all five errands: "Shabaash! Sab le aaya?"
 *   not quite     a light tease for what's missing (two at most)
 *   always        "Chal andar aa, khana lag gaya hai."
 *
 * and then you go in: main.ts fades to the ending card (ui/ending.ts), which
 * lists what came home with you (`broughtHome`).
 *
 * Walk off instead, and she stays in the door a moment ("Ab kahan chala?").
 * FRAME: the door's (street.homeDoorFrame): its middle at the threshold, +z
 * out toward the street.
 */

type Line = { who: string; line: string; seconds: number };

export type ComingHome = {
  group: THREE.Group;
  /** Can you go in now (allowed, near, and not already)? */
  canGoIn(): boolean;
  /** E at the door: the few words, then `onIn` (the ending). */
  goIn(onIn: () => void): void;
  prompt(): string | null;
  update(t: number, dt: number, player: THREE.Vector3): void;
};

/** She comes to the door when you're this near (metres from the threshold), and you can go in from this near. */
const SEEN = 6, IN_REACH = 2.4;
/** Late, by her: after 7:30. */
const LATE = 19 * 60 + 30;

/** What came home, in a few words each, for the ending card. */
const BROUGHT: Partial<Record<(typeof CHIT)[number]["errand"], string>> = {
  kapde: "Papa ke kapde",
  dawai: "Dettal-Krocin",
  stampPaper: "stamp paper",
  parcel: "Mama ka parcel",
  sabzi: "tamatar",
};

/** Her tease for each thing not brought. */
const TEASE: Record<"kapde" | "dawai" | "stampPaper" | "parcel" | "sabzi", string> = {
  kapde: "Papa ke kapde? Kal Papa office kya pehen ke jaayenge?",
  dawai: "Dettal-Krocin bhi bhool gaya? Ab sar mera dukh raha hai.",
  stampPaper: "Aur stamp paper? Papa ko Monday ko court mein dena hai…",
  parcel: "Parcel? Cafe mein hi reh gaya dimaag…",
  sabzi: "Tamatar? Ab aaj bina tamatar ki sabzi banegi.",
};

export function broughtHome(): string[] {
  return CHIT.flatMap(({ errand }) => (errands.isDone(errand) && BROUGHT[errand] ? [BROUGHT[errand]!] : []));
}

export function buildComingHome(doorFrame: THREE.Matrix4, playerPos: THREE.Vector3): ComingHome {
  const group = new THREE.Group();
  group.name = "comingHome";
  doorFrame.decompose(group.position, group.quaternion, group.scale);
  group.visible = false;
  group.updateMatrixWorld(true);

  // the door open: the hallway's dim warmth where the door was, and the edge of the leaf swung in
  const p = new Parts();
  p.box(1.0, 2.15, 0.01, 0, 1.075, 0.006, 0x2a1f19);
  p.box(0.07, 2.15, 0.03, -0.46, 1.075, 0.02, PAL.wood);
  group.add(p.build("homeDoorOpen", { castShadow: false, unlit: true }));

  // Mummy: a salwar-kameez in maroon, a cream salwar, and her dusty-pink dupatta drawn over her head (as
  // at home in the evening: from the front, hair alone doesn't say "woman" in the game's simple figures)
  const recipe = recipeFor("woman", makeRng(7601));
  recipe.outfit = { top: "kameez", topColour: 0x8a2d3b, bottom: "salwar", bottomColour: 0xe8dcc0, odhni: [0xd99a9a, 0xb5485a], bangles: 0xc0392b, feet: "chappals" };
  recipe.hair = "bun";
  recipe.face.age = 0.4;
  recipe.build.scale = 0.95;
  const person = buildPerson(recipe);
  group.add(person.root);
  // (in the doorway, just out on the step: a hand at her waist, the other talking)
  const ON_HIP = v(-0.2, 0.95, 0.1), WAIST = v(0.14, 0.96, 0.16), TALK = v(0.2, 1.08, 0.32);
  const AHEAD = v(0, 1.5, 4);
  const actions: Action[] = [
    { name: "wait", duration: 4, pose: () => ({ right: ON_HIP, left: WAIST, look: AHEAD }) },
    { name: "talk", duration: 2.5, pose: (u) => ({ right: ON_HIP, left: TALK.clone().add(v(0, Math.sin(u * 5) * 0.04, 0)), look: AHEAD, nod: 0.05 }) },
  ];
  const mummy = makeActor({ person, at: { x: 0, z: 0.25, turn: 0 }, actions, notice: "glance" });

  let state: "shut" | "waiting" | "talking" | "in" = "shut";
  let said: { lines: Line[]; next: number; wait: number; done: () => void } | null = null;
  let toldOff = false;
  const local = new THREE.Vector3();
  const nearDoor = () => group.worldToLocal(local.copy(playerPos)).setY(0).length();
  /** Allowed home: after the cafe, or any errand. */
  const allowed = () => errands.isDone("cafe") || errands.anyErrand();

  function words(): Line[] {
    const lines: Line[] = [];
    const late = timeOfDay.minutes >= LATE;
    const missing = (["kapde", "dawai", "stampPaper", "parcel", "sabzi"] as const).filter((e) => !errands.isDone(e));
    const her = (line: string, seconds = 3.5): Line => ({ who: "Mummy", line, seconds });
    const you = (line: string, seconds = 3): Line => ({ who: "You", line, seconds });
    if (late) lines.push(her("Kitni der kar di! Saadhe saat baj gaye, pata hai?", 4), you("Sorry Mummy… time ka pata hi nahi chala."));
    if (missing.length === 0) lines.push(her("Shabaash! Sab le aaya?"), you("Haan Mummy, sab. Kapde, dawai, stamp paper, parcel, tamatar."), her("Mera beta! Papa ko bataungi."));
    else if (missing.length === 5) lines.push(her("Ek bhi kaam nahi kiya? Haan, cafe yaad tha bas…", 4));
    else {
      // a tease for each thing missing, two at most (the parcel's says "cafe": only if you went)
      for (const e of missing.slice(0, 2)) lines.push(her(e === "parcel" && !errands.isDone("cafe") ? "Parcel? Mama phone karenge, kya bolungi?" : TEASE[e]));
      if (missing.length > 2) lines.push(her("…aur baaki bhi. Chal, kal kar dena."));
      lines.push(you("Kal pakka, Mummy."));
    }
    lines.push(her("Chal andar aa, khana lag gaya hai."));
    return lines;
  }

  return {
    group,
    canGoIn: () => state === "waiting" && nearDoor() < IN_REACH,
    goIn(onIn) {
      state = "talking";
      said = { lines: words(), next: 0, wait: 0, done: onIn };
    },
    prompt() {
      if (state === "waiting" && nearDoor() < IN_REACH) return "[E] andar chalo";
      return null;
    },
    update(t, dt, player) {
      // she comes to the door as you come up to it (once you may come home); goes in if you never do
      if (state === "shut" && allowed() && nearDoor() < SEEN) {
        state = "waiting";
        group.visible = true;
        toldOff = false;
        say("Mummy", "Aa gaya?", 2.5);
      } else if (state === "waiting" && nearDoor() > SEEN + 2) {
        if (!toldOff) say("Mummy", "Ab kahan chala? Jaldi aana!", 3);
        toldOff = true;
        if (nearDoor() > SEEN + 25) {
          state = "shut";
          group.visible = false;
        }
      }
      if (!group.visible) return;
      mummy.update(t, dt, player);
      if (state !== "talking" || !said) return;
      said.wait -= dt;
      if (said.wait > 0) return;
      if (said.next < said.lines.length) {
        const { who, line, seconds } = said.lines[said.next++];
        say(who, line, seconds);
        said.wait = seconds + 0.3;
        return;
      }
      state = "in";
      said.done();
      said = null;
    },
  };
}
