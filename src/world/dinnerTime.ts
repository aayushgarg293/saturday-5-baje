import * as THREE from "three";
import { cue } from "../core/cues";
import { timeOfDay } from "../core/timeOfDay";
import type { HouseFront } from "./street";

/**
 * Dinner on the stove: from about 6:40, every minute or two a pressure
 * cooker whistles in one of the houses near you (the sound, a real
 * whistle, muffled by the wall: audio/street.ts). Never one right in your
 * ear, never one so far it's lost: a house 10–40 m away. In the bazaar,
 * with no houses about, there's none; walk into a lane and there soon is.
 *
 * No random numbers from the town's streams: these are only for when a
 * sound plays, so `Math.random` is fine.
 */

/** From when (game minutes): the evening's dal and rice going on. */
const FROM = 18 * 60 + 40;
/** Real seconds between whistles, at least and at most. */
const EVERY = { min: 50, max: 120 };
/** How near a house must be to be heard from, and how far: metres. */
const NEAR = 10, FAR = 40;

export type DinnerTime = { update(dt: number, player: THREE.Vector3): void };

export function buildDinnerTime(houses: Map<string, HouseFront>): DinnerTime {
  // each house's kitchen window: in its front wall, a little above its door
  const kitchens = [...houses.values()].map((h) => new THREE.Vector3(h.door.x, h.door.y + 1.6, h.door.z).applyMatrix4(h.frame));
  const between = (min: number, max: number) => min + Math.random() * (max - min);
  let wait = between(15, 40); // (the first, a little after it's time)

  return {
    update(dt, player) {
      if (timeOfDay.minutes < FROM) return;
      wait -= dt;
      if (wait > 0) return;
      const near = kitchens.filter((k) => {
        const d = k.distanceTo(player);
        return d > NEAR && d < FAR;
      });
      if (near.length === 0) {
        wait = 8; // (no houses about: look again in a little while)
        return;
      }
      cue("cooker", near[Math.floor(Math.random() * near.length)]);
      wait = between(EVERY.min, EVERY.max);
    },
  };
}
