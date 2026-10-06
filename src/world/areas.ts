import * as THREE from "three";
import { BAZAAR, STREET_LENGTH } from "./layout";
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
    name: "bazaar", box, reach: 60,
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
  /** Every frame: show the areas you're near, hide the rest. */
  update(player: THREE.Vector3): void;
};

export function buildAreas(): Areas {
  const areas: Area[] = [...AREAS, ...SCHOOL_AREAS, bazaarArea()].map((a) => ({ ...a, objects: [], shown: true }));
  const at = new THREE.Vector3();
  const inside = (b: AreaBox, x: number, z: number) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
  return {
    assign(objects) {
      for (const o of objects) {
        // (the ground, and the roads' and lanes' paving, are built where they lie, their meshes left at the
        // world's origin, inside the bazaar's box: they're under everything, so they're always drawn)
        if (o.name === "ground" || /^(road|lane):/.test(o.name)) continue;
        o.getWorldPosition(at);
        const area = areas.find((a) => inside(a.box, at.x, at.z));
        if (area) area.objects.push(o);
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
