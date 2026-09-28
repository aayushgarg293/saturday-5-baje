import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import { makeRng } from "../core/rng";
import { PAL, WALL_COLOURS } from "../render/palette";
import { toon } from "../render/toon";

/**
 * The placeholder street: flat ground, a road, and plain box buildings.
 *
 * This is the walking-skeleton version. Phase 2 replaces the boxes with real
 * shopfronts, havelis and the cafe building, but keeps this layout's idea:
 * everything is measured from the constants below.
 *
 * Layout (seen from above; the player starts at the south end facing north):
 *
 *          north end (building across the street)
 *      ┌───┐               ┌───┐
 *      │   │    street     │   │    buildings line both sides,
 *      │   │   (7 m wide)  ├───┘
 *   ───┘   │               ════     ← a gali (side lane), closed at the back
 *      │   │               ├───┐
 *      └───┘               └───┘
 *          south end (building across the street)
 *
 * Coordinates: +x is east, -z is north, y is up. Metres throughout.
 */

/** Street length, from the south end (z = 0) to the north end. */
export const STREET_LENGTH = 120;
/** Distance between the shopfronts on the two sides. */
export const STREET_WIDTH = 7;
/** The paved strip down the middle; the rest is dusty edge. */
const ROAD_WIDTH = 4;
/** How far each building goes back from its shopfront. */
const BUILDING_DEPTH = 8;
/** Range of building frontage widths and heights. */
const FRONTAGE = { min: 3, max: 6 };
const HEIGHT = { min: 6, max: 12 };
/** Where the side lanes open, and how wide they are. */
const GALIS = [
  { side: "west", z: -45, width: 3 },
  { side: "east", z: -78, width: 3 },
] as const;
/** Seed for the random building sizes: change it for a different street. */
const SEED = 2006;

export type Street = {
  group: THREE.Group;
  colliders: Box[];
  /** Where the player starts, and the direction they face (yaw, radians). */
  spawn: { x: number; z: number; yaw: number };
};

export function buildStreet(): Street {
  const group = new THREE.Group();
  group.name = "street";
  const colliders: Box[] = [];
  const rng = makeRng(SEED);

  // One shared 1×1×1 box, stretched per building with `scale`. Sharing it is
  // cheaper than making a new shape for every building.
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0); // sit on the ground rather than half-buried

  /**
   * Add a box building and its collider. Sizes are along the world axes
   * (sizeX east–west, sizeZ north–south), not "width" and "depth", because
   * which one is the frontage depends on the side of the street.
   */
  function building(cx: number, cz: number, sizeX: number, sizeZ: number, height: number) {
    const mesh = new THREE.Mesh(unitBox, toon({ color: rng.pick(WALL_COLOURS) }));
    mesh.position.set(cx, 0, cz);
    mesh.scale.set(sizeX, height, sizeZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(boxAt(cx, cz, sizeX, sizeZ));
  }

  // --- ground and road ----------------------------------------------------
  const groundSize = { x: STREET_WIDTH + BUILDING_DEPTH * 2 + 40, z: STREET_LENGTH + 40 };
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize.x, groundSize.z),
    toon({ color: PAL.dust }),
  );
  ground.rotation.x = -Math.PI / 2; // planes are made standing up; lay it flat
  ground.position.z = -STREET_LENGTH / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, STREET_LENGTH),
    toon({ color: PAL.asphalt }),
  );
  road.rotation.x = -Math.PI / 2;
  // 1 cm above the ground, so the two flat surfaces don't flicker through
  // each other ("z-fighting")
  road.position.set(0, 0.01, -STREET_LENGTH / 2);
  road.receiveShadow = true;
  group.add(road);

  // --- the two rows of buildings --------------------------------------------
  for (const side of ["west", "east"] as const) {
    const sign = side === "west" ? -1 : 1;
    const cx = sign * (STREET_WIDTH / 2 + BUILDING_DEPTH / 2);
    const gali = GALIS.find((g) => g.side === side);

    // Walk north from the south end, placing buildings until the row is full.
    let z = 0;
    while (z > -STREET_LENGTH) {
      // Leave the gap for the gali when we reach it...
      if (gali && z <= gali.z + gali.width / 2 && z > gali.z - gali.width / 2) {
        z = gali.z - gali.width / 2;
        continue;
      }
      // Room left before the next stop: the gali's near edge, or the north end.
      const stop = gali && z > gali.z + gali.width / 2 ? gali.z + gali.width / 2 : -STREET_LENGTH;
      const room = z - stop;
      let width = rng.range(FRONTAGE.min, FRONTAGE.max);
      // Never run past the stop, and never leave a sliver too thin to be a
      // building: if what would be left is under the minimum, fill it now.
      if (room - width < FRONTAGE.min) width = room;
      // The row runs north–south, so the frontage is along z and the depth along x.
      building(cx, z - width / 2, BUILDING_DEPTH, width, rng.range(HEIGHT.min, HEIGHT.max));
      z -= width;
    }

    // Close the far end of the gali, so it's a short dead end for now.
    if (gali) {
      const backX = sign * (STREET_WIDTH / 2 + BUILDING_DEPTH + 2);
      building(backX, gali.z, 4, gali.width + 2, rng.range(HEIGHT.min, HEIGHT.max));
    }
  }

  // --- close both ends of the street ---------------------------------------
  const acrossWidth = STREET_WIDTH + BUILDING_DEPTH * 2;
  building(0, 3, acrossWidth, 6, 10); // south end, behind the player at the start
  building(0, -STREET_LENGTH - 3, acrossWidth, 6, 12); // north end

  return {
    group,
    colliders,
    spawn: { x: 0, z: -4, yaw: 0 },
  };
}
