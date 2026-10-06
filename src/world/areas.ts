import * as THREE from "three";
import { BAZAAR, STREET_LENGTH } from "./layout";
import { HOME_AREAS } from "./homeLane";
import { MOHALLA, inMohalla } from "./mohalla";
import { CRICKET_LANE, CRICKET_Z, SCHOOL, SCHOOL_AREAS } from "./schoolRoad";
import { STATION, inStation } from "./station";
import { AREAS, type AreaBox, type AreaSpec, CHOWK, boxAround } from "./town";

/**
 * The bazaar and the chowk: drawn always, until the town grew big enough to
 * walk out of sight of them (school road, the park). Last in the list, so
 * everything in the other areas' boxes belongs to them. Seen from far down
 * the long straight views that end at it: the cricket lane, the mohalla's
 * first lane, the station lane, court road and the bus stand.
 */
function bazaarArea(): AreaSpec {
  const box: AreaBox = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (let s = -12; s <= STREET_LENGTH + CHOWK.depth + 4; s += 4) {
    for (const off of [-26, 26]) {
      const p = BAZAAR.pointAt(s, off);
      box.x0 = Math.min(box.x0, p.x); box.x1 = Math.max(box.x1, p.x);
      box.z0 = Math.min(box.z0, p.z); box.z1 = Math.max(box.z1, p.z);
    }
  }
  const named = (name: string) => AREAS.find((a) => a.name === name)!.box;
  return {
    name: "bazaar", box, reach: 100,
    seenFrom: [
      { x0: CRICKET_LANE.pointAt(0, 0).x, x1: SCHOOL.x + 4, z0: CRICKET_Z - 3, z1: CRICKET_Z + 3 },
      boxAround({ u0: 0, u1: MOHALLA.square.u1, v0: -3, v1: 3 }, inMohalla),
      boxAround({ u0: 0, u1: STATION.enclosure.west, v0: -STATION.half - 1, v1: STATION.half + 1 }, inStation),
      named("court road"),
      named("bus stand"),
    ],
  };
}

/**
 * Only drawing what's near. The town's streets are corridors: from the
 * bazaar you can't see court road or the bus stand (the buildings are in the
 * way), but the graphics card would still draw every building, sign and
 * person there, because they're inside the view's cone. So each part of the
 * town (world/town.ts, AREAS; the bazaar too, last: `bazaarArea`) is shown
 * only while you're within its `reach` of it, or inside one of the places it
 * can be seen from far off (`seenFrom`); the rest of the time it's hidden
 * (it still carries on: its people move as before).
 *
 * Which part of the town a thing belongs to is decided once, by where it is
 * (`assign`); `update` then shows and hides them as you walk.
 */

type Area = AreaSpec & { objects: THREE.Object3D[]; shown: boolean };

export type Areas = {
  /** Sort these things into the areas they stand in (anything outside every area is left alone: always drawn). */
  assign(objects: THREE.Object3D[]): void;
  /**
   * Split a list of things (washing lines, nameplates, lamps…) by the area each
   * stands in, keeping their order: one batch per area (−1: in none), so each
   * batch can be built and then shown and hidden with its area (`add`).
   */
  split<T>(items: T[], where: (item: T) => { x: number; z: number }): [number, T[]][];
  /** Put this into area `index` (from `split`), or into the area called `name`. (Index −1: none: always drawn.) */
  add(area: number | string, ...objects: THREE.Object3D[]): void;
  /** Every frame: show the areas you're near, hide the rest. */
  update(player: THREE.Vector3): void;
};

/** How far either side of the bazaar's middle its own buildings reach (their rows' backs, 13.2 m, and a little). */
const BAZAAR_STRIP = 14;

export function buildAreas(): Areas {
  const areas: Area[] = [...AREAS, ...SCHOOL_AREAS, ...HOME_AREAS, bazaarArea()].map((a) => ({ ...a, objects: [], shown: true }));
  const at = new THREE.Vector3();
  const inside = (b: AreaBox, x: number, z: number) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  /**
   * Which area a point is in: anything in the bazaar's own strip (its rows, either side of its middle,
   * end to end, the chowk too) is the bazaar's; otherwise the first area whose box holds it (the bazaar's
   * box is last, so the others win), or −1. (Some of the bazaar's roof lines, behind its rows, stand inside
   * the station's or the home lane's box: they're the bazaar's all the same.)
   */
  const bazaarIndex = areas.length - 1;
  const indexAt = (x: number, z: number) => {
    const { s, offset } = BAZAAR.roadCoords(x, z);
    if (Math.abs(offset) < BAZAAR_STRIP && s > -12 && s < STREET_LENGTH + CHOWK.depth) return bazaarIndex;
    return areas.findIndex((a) => inside(a.box, x, z));
  };
  return {
    split(items, where) {
      const batches = new Map<number, (typeof items)[number][]>();
      for (const item of items) {
        const p = where(item);
        const i = indexAt(p.x, p.z);
        if (!batches.has(i)) batches.set(i, []);
        batches.get(i)!.push(item);
      }
      return [...batches.entries()];
    },
    add(area, ...objects) {
      const a = typeof area === "number" ? areas[area] : areas.find((x) => x.name === area);
      if (!a) return;
      a.objects.push(...objects);
      for (const o of objects) o.visible = a.shown;
    },
    assign(objects) {
      for (const o of objects) {
        // (the ground, and the roads' and lanes' paving, are built where they lie, their meshes left at the
        // world's origin, inside the bazaar's box: they're under everything, so they're always drawn)
        if (o.name === "ground" || /^(road|lane):/.test(o.name)) continue;
        o.getWorldPosition(at);
        const i = indexAt(at.x, at.z);
        if (i >= 0) areas[i].objects.push(o);
      }
    },
    update(player) {
      for (const a of areas) {
        // how far you are from the area's box (0 inside it)
        const dx = Math.max(a.box.x0 - player.x, 0, player.x - a.box.x1);
        const dz = Math.max(a.box.z0 - player.z, 0, player.z - a.box.z1);
        const show = Math.hypot(dx, dz) < a.reach || (a.seenFrom ?? []).some((b) => inside(b, player.x, player.z));
        if (show === a.shown) continue;
        a.shown = show;
        for (const o of a.objects) o.visible = show;
      }
    },
  };
}
