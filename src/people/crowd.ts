import * as THREE from "three";
import type { Box } from "../core/colliders";
import { makeRng } from "../core/rng";
import { SLOTS } from "../world/layout";
import { StaticBatch, placeOnStreet } from "../world/props/batch";
import { buildChaiCorner } from "./chaiCorner";
import { buildChaiwala } from "./chaiwala";
import { golgappaCrew, iceGolaCrew, jalebiCrew, kachoriCrew } from "./sellers";

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

export type Crowd = {
  group: THREE.Group;
  /** People standing outside their stall's footprint: you can't walk through them. */
  colliders: Box[];
  update(t: number, dt: number, player: THREE.Vector3): void;
};

export function buildCrowd(): Crowd {
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
  for (const [build, spot] of crews) {
    const where = placeOnStreet(spot.s, spot.offset);
    const crew = build(where, rng);
    groups.push(crew);
    for (const p of crew.standing) bodies.collide(where, 0.5, 0.5, p.x, p.z);
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
