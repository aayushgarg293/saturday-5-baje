import { touchFirst } from "./device";

/**
 * How much the game draws: everything on a laptop, a little less on a phone
 * (core/device.ts decides which). The look stays the same; a phone's
 * graphics chip and memory are smaller, and its screen is small enough that
 * nobody misses the difference.
 *
 *   shadowMapSize   the sharpness of the sun's shadows: the size of the
 *                   picture they're drawn into (4096² is 64 MB of graphics
 *                   memory; iPhones are strict about memory)
 *   reach           parts of town are drawn only within reach of you
 *                   (world/areas.ts): this scales those distances
 *   haze            where the distance haze begins and where it's total, m:
 *                   pulled in with the reach, so nothing pops into view
 *                   out of clear air
 *   pixelRatio      the most screen pixels drawn per page pixel
 *   paint           how many pixels the painted pictures get (signboards, posters, the nameplates' and
 *                   labels' sheets), across and down, as a share of the laptop's: 0.5 is a quarter of
 *                   the memory (render/memory.ts)
 *   faceSize        the canvas each face is painted on, pixels square (three per person: neutral,
 *                   blinking, smiling)
 *   keepCopies      whether the page keeps its own copy of every picture and shape once the graphics
 *                   chip has one to draw from (render/memory.ts)
 *
 * The last three are for iPhones, which stop a page that holds too much memory: on one, the game showed
 * nothing at all (2026-11-19). It held 675 MB of painted pictures, 430 MB of them faces, and 250 MB of
 * shapes, each kept twice.
 *
 * To try the phone's setting on a laptop: ?quality=phone in the address.
 */

export type Quality = {
  name: "laptop" | "phone";
  shadowMapSize: number;
  reach: number;
  haze: { near: number; far: number };
  pixelRatio: number;
  paint: number;
  faceSize: number;
  keepCopies: boolean;
};

const LAPTOP: Quality = {
  name: "laptop", shadowMapSize: 4096, reach: 1, haze: { near: 45, far: 240 }, pixelRatio: 1.5,
  paint: 1, faceSize: 512, keepCopies: true,
};
// (A shorter reach was tried, 0.8: it left a hole where a row is seen across the open playground. So the
// phone draws as far, with a smaller shadow picture and lighter pictures. A face on a phone is a few dozen
// pixels tall at most, so 128 is plenty.)
const PHONE: Quality = {
  name: "phone", shadowMapSize: 2048, reach: 1, haze: { near: 45, far: 240 }, pixelRatio: 1.5,
  paint: 0.5, faceSize: 128, keepCopies: false,
};

const asked = new URLSearchParams(location.search).get("quality");
export const quality: Quality = asked === "phone" ? PHONE : asked === "laptop" ? LAPTOP : touchFirst ? PHONE : LAPTOP;
