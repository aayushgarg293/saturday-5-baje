import { CAFE, pointAt, yawAlong } from "../world/layout";

/**
 * Saved camera spots for `__shot`.
 *
 * Checking the same views before and after a change is how visual
 * regressions get caught, so add a spot here whenever a new place in the
 * world is worth checking. `pos` is world [x, z] in metres; `yaw` is the
 * direction faced (0 = north); `pitch` tilts the view up (+) or down (-).
 * Press C in the game to read these values off any spot.
 *
 * Most spots are defined by distance along the street (`along`), so they
 * stay put even if the street's curve is changed.
 */
export type CameraSpot = {
  pos: [number, number];
  yaw: number;
  pitch?: number;
};

/** A spot `s` metres along the street, `offset` to the side, looking along the street turned by `turn` radians (left +). */
function along(s: number, offset = 0, turn = 0, pitch = 0): CameraSpot {
  const p = pointAt(s, offset);
  return { pos: [p.x, p.z], yaw: yawAlong(s, turn), pitch };
}

const cafeMid = (CAFE.s0 + CAFE.s1) / 2;

export const CAMERAS: Record<string, CameraSpot> = {
  /** The opening view: the south end, looking up the street. The cafe sign should be visible. */
  start: along(1.5),
  /** Shops on the left, early in the walk. */
  shops: along(22, 1, 0.55),
  /** The first gali, from the street. */
  gali: along(56, 0.5, 1.2),
  /** In the middle of the bend, among the havelis. */
  bend: along(88, 0, 0, 0.05),
  /** Looking up at haveli rooftops and wires. */
  rooftops: along(110, -1, -0.5, 0.45),
  /** The cricket gali, from the street. */
  cricket: along(116, 0, -1.1),
  /** Approaching the cafe: its front and blade sign. */
  cafeApproach: along(158, -1.5, -0.12, 0.08),
  /** Standing in front of the cafe. */
  cafe: along(cafeMid, -1.8, -1.35, 0.15),
  /** Beyond the cafe, looking at the end of the street and the hills over it. */
  end: along(196, 0, 0, 0.1),
  /** From the far end, looking back down the whole street. */
  back: along(200, 0, Math.PI),

  // --- street life (phase 4) ---
  /** The chai tapri at the first gali's mouth. */
  chai: along(51, 0.8, 0.45, -0.1),
  /** The golgappa cart. */
  golgappa: along(69, -0.8, -0.5, -0.1),
  /** Kachori and samosa, with a cow in the road beyond. */
  kachori: along(33, -0.6, -0.45, -0.1),
  /** The jalebi stall. */
  jalebi: along(127, 0.6, 0.5, -0.1),
  /** The ice gola cart. */
  iceGola: along(145, -0.6, -0.5, -0.05),
  /** The temple and its peepal tree. */
  temple: along(89, 1, 0.55, 0.12),
  /** Into the south side road, where the traffic comes from. */
  sideRoad: along(6, -1.5, -0.9, 0),
};
