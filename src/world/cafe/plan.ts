/**
 * The cafe hall's floor plan, as data: where the booths, the counter, the
 * fans, the tubelights, the clock and the signs are. Everything that builds
 * or uses the room reads it from here: the furniture (world/cafe/furniture.ts),
 * the colliders, the people, and sitting down at your computer.
 *
 * All in the cafe BUILDING's frame (world/buildings/cafe.ts): x across the
 * frontage (+x toward the stair end), z back from the street (0 at the plot
 * front, the hall runs from −1.3 back to −12.5), y up from the street
 * (the hall's floor is at 4.8).
 *
 *   seen from above (the street is at the top):
 *
 *        ┌──────── windows onto the street ────────┐
 *        │ ▯7  aisle ▯4│▯1   aisle   ║railing      │
 *        │ ▯8        ▯5│▯2 ← yours  ║ stairwell   │
 *        │ ▯9        ▯6│▯3          ║             │
 *        │ ▯10 (CS)                  ╚══╗          │
 *        │ ▯11 (CS)           ┌counter┐ ║ landing  │ ← you arrive here
 *        │ ▯12            owner│      │ ║          │
 *        │ ▯13                 └──────┘ ║          │
 *        │   water cooler, printer                  │
 *        └──────────────── back wall ───────────────┘
 */

/** The hall's inside faces (x0: the far side wall, x1: the railing) and its floor and ceiling heights. */
export const HALL = { x0: -4.78, x1: 2.85, z0: -12.48, z1: -1.32, floor: 4.8, ceiling: 8.0 };

/**
 * A booth. `x`, `z`: where its chair stands; `turn`: which way you face,
 * sitting (radians about the vertical, 0 = +z, the Three.js convention).
 * The desk is in front of the chair, the partitions either side, the
 * curtain across the opening behind.
 */
export type Booth = { n: number; x: number; z: number; turn: number };

/** Booth sizes: width (between partitions), desk depth, partition height; the chair's distance back from the desk's front edge. */
export const BOOTH = { width: 1.25, desk: 0.6, deskTop: 0.75, partition: 1.45, chairBack: 0.55, opening: 0.55 };

const FACE_WALL = -Math.PI / 2; // facing −x (toward the far side wall)
const FACE_RAILING = Math.PI / 2; // facing +x

/** The island down the middle: a spine partition, desks on both sides. */
export const ISLAND = { spine: -0.48, z0: -6.35, z1: -2.6 };

function row(first: number, count: number, z1: number, x: number, turn: number): Booth[] {
  return Array.from({ length: count }, (_, k) => ({ n: first + k, x, z: z1 - BOOTH.width * (k + 0.5), turn }));
}

/** Where the chair stands, given the desk's front edge: the chair is behind it, away from the way you face. */
const chairFrom = (deskEdge: number, facing: 1 | -1) => deskEdge - facing * BOOTH.chairBack;

export const BOOTHS: Booth[] = [
  // 1–3: the island's railing side, facing the spine (−x)
  ...row(1, 3, ISLAND.z1, chairFrom(ISLAND.spine + 0.02 + BOOTH.desk, -1), FACE_WALL),
  // 4–6: the island's other side, facing the spine (+x)
  ...row(4, 3, ISLAND.z1, chairFrom(ISLAND.spine - 0.02 - BOOTH.desk, 1), FACE_RAILING),
  // 7–13: along the far side wall, facing it
  ...row(7, 7, -2.0, chairFrom(HALL.x0 + BOOTH.desk, -1), FACE_WALL),
];

/** Your booth (the owner points you to it). */
export const YOUR_BOOTH = 2;

/** The owner's counter, at the top of the stairs, and where he sits behind it (facing the landing). */
export const COUNTER = { x0: 1.5, x1: 2.2, z0: -9.8, z1: -8.0, top: 1.0 };
export const OWNER_SEAT = { x: 0.85, z: -8.9, turn: FACE_RAILING };

/** Ceiling fans down the middle of the hall. */
export const FANS = [
  { x: -1.1, z: -3.2 },
  { x: -1.1, z: -6.8 },
  { x: -1.1, z: -10.4 },
];

/** Tubelights on the walls: where, and which way each faces (radians about the vertical). */
export const TUBES = [
  { x: HALL.x0 + 0.02, z: -4.0, y: 2.6, turn: Math.PI / 2 },
  { x: HALL.x0 + 0.02, z: -9.2, y: 2.6, turn: Math.PI / 2 },
  { x: 4.17, z: -10.3, y: 2.6, turn: -Math.PI / 2 },
  { x: -1.0, z: HALL.z0 + 0.02, y: 2.6, turn: 0 },
];

/** The wall clock, on the far side wall, where you can see it from your booth over the partitions. */
export const CLOCK = { x: HALL.x0 + 0.03, z: -4.5, y: 2.35, radius: 0.19 };
