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
 *
 * To try the phone's setting on a laptop: ?quality=phone in the address.
 */

export type Quality = {
  name: "laptop" | "phone";
  shadowMapSize: number;
  reach: number;
  haze: { near: number; far: number };
  pixelRatio: number;
};

const LAPTOP: Quality = { name: "laptop", shadowMapSize: 4096, reach: 1, haze: { near: 45, far: 240 }, pixelRatio: 1.5 };
// (A shorter reach was tried, 0.8: it left a hole where a row is seen across the open playground. So for
// now the phone only gets the smaller shadow picture; more, once a phone's own numbers say it's needed.)
const PHONE: Quality = { name: "phone", shadowMapSize: 2048, reach: 1, haze: { near: 45, far: 240 }, pixelRatio: 1.5 };

const asked = new URLSearchParams(location.search).get("quality");
export const quality: Quality = asked === "phone" ? PHONE : asked === "laptop" ? LAPTOP : touchFirst ? PHONE : LAPTOP;
