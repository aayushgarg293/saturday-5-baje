import * as THREE from "three";
import { type Errand, errands } from "../core/errands";
import { makeRng } from "../core/rng";
import { timeOfDay } from "../core/timeOfDay";
import { townState } from "../core/townState";
import { buildShopkeeper } from "../people/shopkeepers";
import { say } from "../ui/caption";
import { SHOP_NAMES } from "../world/names";
import { CONDUCTOR } from "../world/places/busStand";
import { TYPIST_TABLES } from "../world/places/court";
import type { Street } from "../world/street";
import { BUS_STAND, COURT, COURT_ROAD, inBusStand } from "../world/town";

/**
 * Mummy's errands (her chit: core/errands.ts, ui/chit.ts). Walk up to the
 * one who has it, a prompt comes up ("[E] Mathur ji ke kapde?"), E, and a few
 * words go back and forth as captions. You can still move and look round
 * (nothing takes the camera, unlike the pani puri); walk off before it's
 * done and it's left undone, to try again. At the end, the chit's line is
 * ticked.
 *
 *   the dry cleaner   Modern Dry Cleaners, the bazaar's right side past the
 *                     temple: Papa's ironed clothes
 *   the chemist       Jain Medical, just right of home: Dettal and Krocin
 *   the typist        outside the court, the free one at the third table:
 *                     Papa's stamp paper, typed (two minutes, he says)
 *   the conductor     at the bus stand: Mama's parcel, off the 6:30 from
 *                     Jaipur (only once it's in: townState.jaipurBusIn;
 *                     before that, he tells you when it comes)
 *
 * The dry cleaner and the chemist get a keeper on a stool out front (most
 * shops' keepers are inside, out of sight): built here, from their own
 * random numbers. No money changes hands (prices are only spoken).
 */

type Line = { who: string; line: string; seconds: number };
type Stop = {
  errand: Errand;
  /** Where you stand to ask (world x/z), and how near you must be. */
  at: THREE.Vector3;
  reach: number;
  prompt: () => string;
  /** What's said: the words, in turn, each for its seconds. */
  lines: () => Line[];
  /** Is it there to be had yet? (If not, `lines` is what you're told instead, and nothing's ticked.) */
  ready: () => boolean;
};

export type Errands = {
  /** The keepers out front of the dry cleaner's and the chemist's (main.ts adds them to the bazaar's area). */
  group: THREE.Group;
  canStart(): boolean;
  start(): void;
  prompt(): string | null;
  update(t: number, dt: number, player: THREE.Vector3): void;
};

/** Walk further than this from where you asked, and it's left (undone). */
const WALK_OFF = 5;
/** The two keepers are posed only within this many metres of you. */
const KEEPERS_SEEN = 60;

const you = (line: string, seconds = 3): Line => ({ who: "You", line, seconds });

export function buildErrands(street: Street, playerPos: THREE.Vector3): Errands {
  const group = new THREE.Group();
  group.name = "errandKeepers";
  const rng = makeRng(7501);

  /** A shop's keeper on his stool out front (found by its board's name), and where you stand to ask him. */
  function keeperAt(name: string) {
    const index = SHOP_NAMES.findIndex((n) => n.en === name);
    const board = street.signs.find((s) => s.nameIndex === index)!;
    const d = (p: (typeof street.people)[number]) => p.position.distanceTo(board.position.clone().setY(p.position.y));
    const spot = street.people.filter((p) => d(p) < 4.5).sort((a, b) => d(a) - d(b))[0];
    const keeper = buildShopkeeper(spot, rng);
    group.add(keeper.group);
    // (in front of him, out on the street: his frame faces it)
    const front = new THREE.Vector3(0, 0, 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.rotationY).add(spot.position).setY(0);
    return { keeper, front };
  }
  const dryCleaner = keeperAt("Modern Dry Cleaners");
  const chemist = keeperAt("Jain Medical Store");

  // the typist at the third table (the second has a client), and the conductor: in their places' frames
  const courtMid = COURT_ROAD.pointAt((COURT.s0 + COURT.s1) / 2, 0);
  const typist = TYPIST_TABLES[2];
  const atTypist = new THREE.Vector3(courtMid.x + typist.x, 0, courtMid.z + typist.z + 1.3);
  const yard = inBusStand(BUS_STAND.depth / 2, 0);
  const atConductor = new THREE.Vector3(yard.x + CONDUCTOR.x - 0.9, 0, yard.z + CONDUCTOR.z);

  const STOPS: Stop[] = [
    {
      errand: "kapde", at: dryCleaner.front, reach: 2.2, ready: () => true,
      prompt: () => "[E] Mathur ji ke kapde?",
      lines: () => [
        you("Bhaiya, Mathur ji ke kapde. Press wale."),
        { who: "Dry cleaner", line: "Mathur ji… haan, ye rahe. Paanch kapde, gin lo.", seconds: 3.5 },
        { who: "Dry cleaner", line: "Papa ko bolna, starch zyada daala hai is baar. Pichhli baar shikayat ki thi.", seconds: 4.5 },
      ],
    },
    {
      errand: "dawai", at: chemist.front, reach: 2.2, ready: () => true,
      prompt: () => "[E] Dettal aur Krocin",
      lines: () => [
        you("Uncle, ek Dettal aur Krocin ka ek patta."),
        { who: "Chemist", line: "Dettal aur Krocin? …ye lo. Bees rupaye.", seconds: 3.5 },
        { who: "Chemist", line: "Mummy ko bolna, Krocin khaali pet mat lena.", seconds: 3.5 },
      ],
    },
    {
      errand: "stampPaper", at: atTypist, reach: 1.8, ready: () => true,
      prompt: () => "[E] stamp paper type karwao",
      lines: () => [
        you("Bhaiya, ye stamp paper type karna hai. Papa ne likh ke diya hai.", 3.5),
        { who: "Typist", line: "Do minute, beta. Khade raho.", seconds: 3 },
        // (and he types: he was typing anyway, people/court.ts. Twenty seconds of it)
        { who: "Typist", line: "(khat-khat-khat… ting!… khat-khat…)", seconds: 20 },
        { who: "Typist", line: "Ye lo. Dhyan se le jaana, mudna nahi chahiye.", seconds: 3.5 },
      ],
    },
    {
      errand: "parcel", at: atConductor, reach: 2.2, ready: () => townState.jaipurBusIn,
      prompt: () => (townState.jaipurBusIn ? "[E] Mama ka parcel?" : "[E] Jaipur wali bus kab aayegi?"),
      lines: () => townState.jaipurBusIn
        ? [
          you("Bhaiya, Mathur ji ka parcel? Jaipur se Mama ne bheja hai.", 3.5),
          { who: "Conductor", line: "Kaun? Mathur? …haan, ye lo, Jaipur se aaya hai.", seconds: 3.5 },
          { who: "Conductor", line: "Bhaari hai, sambhal ke le jaana.", seconds: 3 },
        ]
        : [
          you("Bhaiya, Jaipur wali bus kab aayegi?"),
          // (how long to wait, by the clock: it comes in about 6:30)
          timeOfDay.minutes < 18 * 60
            ? { who: "Conductor", line: "Saadhe chhe baje aati hai. Abhi bahut time hai, ghoom ke aao.", seconds: 4 }
            : { who: "Conductor", line: "Saadhe chhe wali? Aati hi hogi. Yahin ruko, teesre number pe lagegi.", seconds: 4 },
        ],
    },
  ];

  // --- what's happening: one at a time ----------------------------------------------------------
  let current: { stop: Stop; lines: Line[]; next: number; wait: number; getsIt: boolean } | null = null;
  const near = (stop: Stop) => playerPos.distanceTo(_flat.copy(stop.at).setY(playerPos.y)) < stop.reach;
  const _flat = new THREE.Vector3();
  /** The stop you're at that you could ask now (not one already done). */
  const stopHere = () => STOPS.find((s) => !errands.isDone(s.errand) && near(s)) ?? null;

  return {
    group,
    canStart: () => !current && playerPos.y < 0.5 && stopHere() !== null,
    start() {
      const stop = stopHere();
      if (!stop) return;
      current = { stop, lines: stop.lines(), next: 0, wait: 0, getsIt: stop.ready() };
      townState.talking = true;
    },
    prompt: () => (current ? null : stopHere()?.prompt() ?? null),
    update(t, dt, player) {
      // (the keepers: only while you're near enough to see them move)
      for (const { keeper, front } of [dryCleaner, chemist]) if (player.distanceTo(front) < KEEPERS_SEEN) keeper.update(t, dt, player);
      if (!current) return;
      // walked off before it's done: left undone (ask again)
      if (player.distanceTo(_flat.copy(current.stop.at).setY(player.y)) > WALK_OFF) {
        current = null;
        townState.talking = false;
        return;
      }
      current.wait -= dt;
      if (current.wait > 0) return;
      if (current.next < current.lines.length) {
        const { who, line, seconds } = current.lines[current.next++];
        say(who, line, seconds);
        current.wait = seconds + 0.25;
        return;
      }
      // all said: done (if it was there to be had)
      if (current.getsIt) errands.markDone(current.stop.errand);
      current = null;
      townState.talking = false;
    },
  };
}
