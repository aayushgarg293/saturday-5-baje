import * as THREE from "three";

/**
 * How the light looks at each time of day, from the 4:30 pm afternoon the
 * game starts in to the blue dusk of the walk home.
 *
 * It's a list of moments (KEYS), each with the sun's height and colour,
 * the sky's colours, the haze, and the colour grade. Between two moments
 * everything blends smoothly. `lookAt(minutes)` gives the blend for a
 * clock time; main.ts hands it to the lights, the sky, the haze and the
 * grade every frame.
 *
 * `evening` (0 to 1) says how far into the evening it is: the lamps come
 * on and the street's life changes by it (later in phase 9).
 *
 * The game's clock runs ten times real speed on the street, so the whole
 * sunset passes in a few minutes of play: leaving the cafe after 6, you
 * come down into the golden light turning to a pink sunset (it's June: the
 * sun sets late, about 7:15), and walk home into the blue hour by 7:30.
 */

type Moment = {
  /** Degrees above the horizon (below zero: set), and compass direction it shines from (270 = west). */
  sunHeight: number;
  sunFrom: number;
  sun: number;
  sunStrength: number;
  /** The cool light from the other side of the sky that colours the shadows. */
  fill: number;
  fillStrength: number;
  /** Light from the sky above and bounced off the ground, so nothing goes black. */
  skyLight: number;
  groundLight: number;
  skyStrength: number;
  /** The sky dome: overhead, the middle, the horizon, and the glow on the sun's side. */
  skyTop: number;
  skyMid: number;
  skyHorizon: number;
  sunGlow: number;
  /** The distance haze (it matches the horizon, so the far street melts into the sky). */
  haze: number;
  /** The clouds' colour (they're painted white; this tints them). */
  clouds: number;
  /** The colour grade (render/post.ts): what the lights and darks lean toward, extra warmth. */
  gradeLight: number;
  gradeShadow: number;
  warmth: number;
  evening: number;
};

/** The moments, by clock time (hours:minutes, 24-hour). Edit freely. */
const KEYS: [string, Moment][] = [
  // the afternoon the game starts in (the look tuned in phase 3)
  ["16:30", { sunHeight: 38, sunFrom: 285, sun: 0xfff0d6, sunStrength: 2.2, fill: 0xb9c3e8, fillStrength: 0.55,
    skyLight: 0xcfe0f0, groundLight: 0xc9a67e, skyStrength: 1.05,
    skyTop: 0x7fa3c4, skyMid: 0xadc4d3, skyHorizon: 0xeadfc8, sunGlow: 0xf6e1b6, haze: 0xe6d9c1, clouds: 0xffffff,
    gradeLight: 0xfff5e4, gradeShadow: 0xddd6f2, warmth: 0.06, evening: 0 }],
  // late afternoon: lower, warmer
  ["17:40", { sunHeight: 16, sunFrom: 280, sun: 0xffe2b0, sunStrength: 2.0, fill: 0xb4bde6, fillStrength: 0.5,
    skyLight: 0xcad8ea, groundLight: 0xc9a07a, skyStrength: 1.0,
    skyTop: 0x7a9dc2, skyMid: 0xb4c6d2, skyHorizon: 0xf0d9b4, sunGlow: 0xf8d096, haze: 0xe8d4b4, clouds: 0xfff3dc,
    gradeLight: 0xfff0d8, gradeShadow: 0xd8d2f0, warmth: 0.08, evening: 0 }],
  // golden: the sun low over the rooftops, long shadows (June: it sets late, about 7:15. It goes down due
  // west (really it's a little north of west in June), in line with the town's east-west roads, and it "sets" behind
  // the hills, which stand 3–8° high: so it stays above them till about 7, for you to see it go)
  ["18:20", { sunHeight: 14, sunFrom: 274, sun: 0xffc488, sunStrength: 1.8, fill: 0xb0b6e2, fillStrength: 0.48,
    skyLight: 0xc8c8dc, groundLight: 0xc09070, skyStrength: 0.92,
    skyTop: 0x7092bc, skyMid: 0xc4bcc8, skyHorizon: 0xf6caa0, sunGlow: 0xffb070, haze: 0xe8c8a8, clouds: 0xffdcc0,
    gradeLight: 0xffead2, gradeShadow: 0xd6cbee, warmth: 0.1, evening: 0.12 }],
  // the pink sunset: the sun just above the hills, the sky rose and peach, pink clouds, a rosy haze
  // (what you come down from the cafe into)
  ["18:50", { sunHeight: 8, sunFrom: 271, sun: 0xffa684, sunStrength: 1.35, fill: 0xc4b2dc, fillStrength: 0.56,
    skyLight: 0xe2c6d6, groundLight: 0xc49284, skyStrength: 1.0,
    skyTop: 0x6478b0, skyMid: 0xcfa4c0, skyHorizon: 0xf8a8a0, sunGlow: 0xff9878, haze: 0xe2aeb0, clouds: 0xffb4bc,
    gradeLight: 0xffe6e6, gradeShadow: 0xd4c4ec, warmth: 0.07, evening: 0.3 }],
  // the sun going behind the hills: still pink and orange low down, the street in soft mauve light
  ["19:10", { sunHeight: -0.5, sunFrom: 270, sun: 0xff8a70, sunStrength: 0.35, fill: 0xa89cd0, fillStrength: 0.48,
    skyLight: 0xc0aacc, groundLight: 0x907070, skyStrength: 0.88,
    skyTop: 0x4a5c98, skyMid: 0xb08cb4, skyHorizon: 0xf49a90, sunGlow: 0xff8a70, haze: 0xc4949c, clouds: 0xf0a0b0,
    gradeLight: 0xfae2e6, gradeShadow: 0xc8c0ea, warmth: 0.05, evening: 0.55 }],
  // the blue hour: the lamps come into their own
  ["19:30", { sunHeight: -4, sunFrom: 270, sun: 0xff9a66, sunStrength: 0, fill: 0x5a6aa8, fillStrength: 0.36,
    skyLight: 0x6a78aa, groundLight: 0x4a4050, skyStrength: 0.72,
    skyTop: 0x1f2f5e, skyMid: 0x44507e, skyHorizon: 0x8a6a86, sunGlow: 0xa0647a, haze: 0x4e4e6c, clouds: 0x6a6a8a,
    gradeLight: 0xe8e4f4, gradeShadow: 0xb8bce8, warmth: 0, evening: 0.88 }],
  // night (only if you dawdle)
  ["20:00", { sunHeight: -12, sunFrom: 270, sun: 0xff9a66, sunStrength: 0, fill: 0x3a4680, fillStrength: 0.3,
    skyLight: 0x4a5688, groundLight: 0x2a2838, skyStrength: 0.58,
    skyTop: 0x0f1838, skyMid: 0x22305a, skyHorizon: 0x3a3a5a, sunGlow: 0x3a3a5a, haze: 0x2a2c44, clouds: 0x3a3c56,
    gradeLight: 0xe0e4f4, gradeShadow: 0xb0b8e8, warmth: 0, evening: 1 }],
];

const TIMES = KEYS.map(([t]) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
});

/** The blended look for one moment: numbers, colours, and the direction toward the sun. */
export type Look = {
  sunHeight: number;
  sunFrom: number;
  toSun: THREE.Vector3;
  sunStrength: number;
  fillStrength: number;
  skyStrength: number;
  warmth: number;
  evening: number;
  sun: THREE.Color;
  fill: THREE.Color;
  skyLight: THREE.Color;
  groundLight: THREE.Color;
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyHorizon: THREE.Color;
  sunGlow: THREE.Color;
  haze: THREE.Color;
  clouds: THREE.Color;
  gradeLight: THREE.Color;
  gradeShadow: THREE.Color;
};

const COLOURS = ["sun", "fill", "skyLight", "groundLight", "skyTop", "skyMid", "skyHorizon", "sunGlow", "haze", "clouds", "gradeLight", "gradeShadow"] as const;
const NUMBERS = ["sunHeight", "sunFrom", "sunStrength", "fillStrength", "skyStrength", "warmth", "evening"] as const;

// (one look, reused every frame: nothing new is made 60 times a second)
const look = { toSun: new THREE.Vector3() } as Look;
for (const c of COLOURS) look[c] = new THREE.Color();
const a = new THREE.Color(), b = new THREE.Color();

/** The look at `minutes` after midnight (before the first moment: the first; after the last: the last). */
export function lookAt(minutes: number): Look {
  let i = 0;
  while (i < TIMES.length - 2 && minutes > TIMES[i + 1]) i++;
  const k = THREE.MathUtils.clamp((minutes - TIMES[i]) / (TIMES[i + 1] - TIMES[i]), 0, 1);
  const s = k * k * (3 - 2 * k); // (eased, so it doesn't change pace with a jolt at each moment)
  const from = KEYS[i][1], to = KEYS[i + 1][1];
  for (const n of NUMBERS) look[n] = THREE.MathUtils.lerp(from[n], to[n], s);
  for (const c of COLOURS) look[c].copy(a.set(from[c])).lerp(b.set(to[c]), s);
  sunDirection(look.sunHeight, look.sunFrom, look.toSun);
  return look;
}

/** Unit vector from the ground toward the sun. +x east, −z north. */
export function sunDirection(heightDeg: number, fromDeg: number, out = new THREE.Vector3()): THREE.Vector3 {
  const elev = THREE.MathUtils.degToRad(heightDeg);
  const azim = THREE.MathUtils.degToRad(fromDeg);
  return out.set(Math.sin(azim) * Math.cos(elev), Math.sin(elev), -Math.cos(azim) * Math.cos(elev));
}
