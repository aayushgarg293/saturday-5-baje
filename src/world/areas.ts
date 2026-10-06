import * as THREE from "three";
import { AREAS, type AreaSpec } from "./town";

/**
 * Only drawing what's near. The town's streets are corridors: from the
 * bazaar you can't see court road or the bus stand (the buildings are in the
 * way), but the graphics card would still draw every building, sign and
 * person there, because they're inside the view's cone. So each part of the
 * town beyond the bazaar (world/town.ts, AREAS) is shown only while you're
 * within its `reach` of it; the rest of the time it's hidden (it still
 * carries on: its people move as before).
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
  const areas: Area[] = AREAS.map((a) => ({ ...a, objects: [], shown: true }));
  const at = new THREE.Vector3();
  const inside = (a: AreaSpec, x: number, z: number) => x >= a.box.x0 && x <= a.box.x1 && z >= a.box.z0 && z <= a.box.z1;
  return {
    assign(objects) {
      for (const o of objects) {
        o.getWorldPosition(at);
        const area = areas.find((a) => inside(a, at.x, at.z));
        if (area) area.objects.push(o);
      }
    },
    update(player) {
      for (const a of areas) {
        // how far you are from the area's box (0 inside it)
        const dx = Math.max(a.box.x0 - player.x, 0, player.x - a.box.x1);
        const dz = Math.max(a.box.z0 - player.z, 0, player.z - a.box.z1);
        const show = Math.hypot(dx, dz) < a.reach;
        if (show === a.shown) continue;
        a.shown = show;
        for (const o of a.objects) o.visible = show;
      }
    },
  };
}
