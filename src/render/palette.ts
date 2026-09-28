/**
 * Named colours for the whole game.
 *
 * Keeping every colour here, instead of hex numbers scattered through the
 * code, means the look can be tuned in one place, and the palette stays
 * consistent. The names describe what the colour is *for*.
 *
 * Placeholder values for the grey skeleton; phase 3 tunes them properly.
 */
export const PAL = {
  // sky and air
  sky: 0xbcd6e6,
  haze: 0xe9dcc3, // warm dusty haze toward the ends of the street

  // light
  sun: 0xfff0d6, // warm late-afternoon sun
  skyLight: 0xcfe0f0, // fill light from the sky above
  groundLight: 0xc9a67e, // warm light bounced up off the dusty ground
  shadowTint: 0x6c5f8c, // shadow sides lean cool violet, not grey

  // ground
  dust: 0xcdb48e, // the unpaved edges of the street
  asphalt: 0x6f6a66, // the worn road down the middle

  // walls (lime-wash and stone, the Rajasthan town palette)
  limeWhite: 0xece4d4,
  limeYellow: 0xe8cf8a,
  limePink: 0xdcae9e,
  limeBlue: 0xa9c3cc,
  limeGreen: 0xb9c9a4,
  sandstone: 0xc99a6b,
} as const;

/** The wall colours the placeholder buildings choose from. */
export const WALL_COLOURS = [
  PAL.limeWhite,
  PAL.limeYellow,
  PAL.limePink,
  PAL.limeBlue,
  PAL.limeGreen,
  PAL.sandstone,
] as const;
