/**
 * Saved camera spots for `__shot`.
 *
 * Checking the same views before and after a change is how visual
 * regressions get caught, so add a spot here whenever a new place in the
 * world is worth checking. `pos` is [x, z] in metres; `yaw` is the direction
 * faced (0 = north along the street, π = back south); `pitch` tilts the view
 * up (+) or down (-). Press C in the game to read these values off any spot.
 */
export type CameraSpot = {
  pos: [number, number];
  yaw: number;
  pitch?: number;
};

export const CAMERAS: Record<string, CameraSpot> = {
  /** The opening view: south end, looking up the street. */
  start: { pos: [0, -4], yaw: 0 },
  /** Halfway along, looking north. */
  middle: { pos: [0, -60], yaw: 0 },
  /** Near the north end, looking up at the closing building. */
  end: { pos: [0, -112], yaw: 0, pitch: 0.15 },
  /** From the north end, looking back down the whole street. */
  back: { pos: [0, -112], yaw: Math.PI },
};
