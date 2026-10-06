import * as THREE from "three";
import type { Box } from "../core/colliders";
import { makeRng } from "../core/rng";
import { SLOTS } from "../world/layout";
import { StaticBatch, placeOnStreet } from "../world/props/batch";
import type { WorldPeopleSpot } from "../world/street";
import { buildChaiCorner } from "./chaiCorner";
import { buildChaiwala } from "./chaiwala";
import { type Cricket, buildCricket } from "./cricket";
import { buildDevotee } from "./devotee";
import { buildBusStandPeople } from "./busStand";
import { buildConstruction } from "./construction";
import { buildCourtPeople } from "./court";
import { buildPco } from "./pco";
import { type Saloon, buildSaloon } from "./saloon";
import { type GolgappaCrew, golgappaCrew, iceGolaCrew, jalebiCrew, kachoriCrew } from "./sellers";
import { buildShopkeeper } from "./shopkeepers";
import { buildTailor } from "./tailor";

/**
 * Everyone on the street: puts each group of people at its spot (the spots
 * are in world/layout.ts) and moves them every frame.
 *
 * People far away aren't worth animating every frame: beyond FULL metres
 * they're updated a few times a second (at that distance nobody can tell),
 * and beyond the haze not at all.
 */

type Group = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

const FULL = 35; // metres: closer than this, every frame
const FAR = 120; // metres: further than this, not at all (lost in the haze)
const SLOW_EVERY = 0.2; // seconds between updates in between
/**
 * Shopkeepers you can see: one from each of these trades (for variety), each
 * at least `apart` metres from the others, so they're spread along the walk.
 */
const SHOPKEEPERS = { trades: ["kirana", "sweets", "electrical", "cycle", "cloth", "general"], max: 5, apart: 22 };

export type Crowd = {
  group: THREE.Group;
  /** People standing outside their stall's footprint: you can't walk through them. */
  colliders: Box[];
  update(t: number, dt: number, player: THREE.Vector3): void;
  /** The golgappa cart, which can also serve you (activities/paniPuri.ts). */
  golgappa: GolgappaCrew;
  /** The saloon, whose chair can be yours (activities/haircut.ts). */
  saloon: Saloon;
  /** The gully cricket, where you can bat (activities/cricket.ts). */
  cricket: Cricket;
};

/** `spots`: the places the buildings offer for people (world/street.ts), south to north. */
export function buildCrowd(spots: WorldPeopleSpot[]): Crowd {
  const rng = makeRng(2004);
  const group = new THREE.Group();
  group.name = "crowd";
  const groups: Group[] = [];
  const bodies = new StaticBatch(); // only its colliders are used

  const tapri = placeOnStreet(SLOTS.chaiTapri.s, SLOTS.chaiTapri.offset);
  groups.push(buildChaiwala(tapri), buildChaiCorner(tapri, rng));
  const crews = [
    [golgappaCrew, SLOTS.golgappa],
    [kachoriCrew, SLOTS.kachoriSamosa],
    [jalebiCrew, SLOTS.jalebi],
    [iceGolaCrew, SLOTS.iceGola],
  ] as const;
  let golgappa: GolgappaCrew | null = null;
  for (const [build, spot] of crews) {
    const where = placeOnStreet(spot.s, spot.offset);
    const crew = build(where, rng);
    if (build === golgappaCrew) golgappa = crew as GolgappaCrew;
    groups.push(crew);
    for (const p of crew.standing) bodies.collide(where, 0.5, 0.5, p.x, p.z);
  }

  // gully cricket in the gali
  const gali = placeOnStreet(SLOTS.cricketGali.s, SLOTS.cricketGali.offset);
  const cricket = buildCricket(gali, rng);
  groups.push(cricket);
  for (const p of cricket.standing) bodies.collide(gali, 0.45, 0.45, p.x, p.z);

  // the old woman at the temple
  for (const spot of spots.filter((s) => s.kind === "temple")) groups.push(buildDevotee(spot, rng));
  // the saloon: a barber at work on a customer
  let saloon: Saloon | null = null;
  for (const spot of spots.filter((s) => s.kind === "saloon")) groups.push((saloon = buildSaloon(spot)));
  // the tailor at his sewing machine
  for (const spot of spots.filter((s) => s.kind === "tailor")) groups.push(buildTailor(spot));
  // the STD booth under the cafe: a caller in cabin 1, a man waiting, the owner at the counter
  for (const spot of spots.filter((s) => s.kind === "pco")) groups.push(buildPco(spot));
  // the town (world/town.ts): the typists and the stamp vendor outside the court
  groups.push(buildCourtPeople());
  // …and the conductor and the waiting passengers at the bus stand
  groups.push(buildBusStandPeople());
  // …and the labourers at the house going up there
  for (const spot of spots.filter((s) => s.kind === "construction")) groups.push(buildConstruction(spot));

  // shopkeepers, spread out along the street (the rest of the shops' keepers are inside, out of sight)
  const taken: THREE.Vector3[] = [];
  for (const trade of SHOPKEEPERS.trades) {
    if (taken.length >= SHOPKEEPERS.max) break;
    // the first shop of this trade, from the south, that isn't too near one already taken
    const spot = spots.find((s) => s.trade === trade && taken.every((p) => p.distanceTo(s.position) >= SHOPKEEPERS.apart));
    if (!spot) continue;
    taken.push(spot.position);
    groups.push(buildShopkeeper(spot, rng));
  }

  for (const g of groups) {
    group.add(g.group);
    g.group.traverse((o) => { o.castShadow = true; });
  }
  // each group's centre, and when it was last updated
  const centres = groups.map((g) => g.group.getWorldPosition(new THREE.Vector3()));
  const lastUpdate = groups.map(() => -1);

  return {
    group,
    golgappa: golgappa!,
    saloon: saloon!,
    cricket,
    colliders: bodies.colliders,
    update(t, dt, player) {
      groups.forEach((g, i) => {
        const d = centres[i].distanceTo(player);
        if (d > FAR) return;
        if (d > FULL && t - lastUpdate[i] < SLOW_EVERY) return;
        g.update(t, lastUpdate[i] < 0 ? dt : t - lastUpdate[i], player);
        lastUpdate[i] = t;
      });
    },
  };
}
