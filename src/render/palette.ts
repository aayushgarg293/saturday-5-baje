/**
 * Named colours for the whole game.
 *
 * Keeping every colour here, instead of hex numbers scattered through the
 * code, means the look can be tuned in one place, and the palette stays
 * consistent. The names describe what the colour is *for*.
 *
 * First-pass values; phase 3 (the look) tunes them properly.
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
  drain: 0x57584c, // the open nali along the shopfronts

  // walls (lime-wash and stone, the Rajasthan town palette)
  limeWhite: 0xece4d4,
  limeYellow: 0xe8cf8a,
  limePink: 0xdcae9e,
  limeBlue: 0xa9c3cc,
  limeGreen: 0xb9c9a4,
  sandstone: 0xc99a6b,
  stoneTrim: 0xd9bf94, // cornices, door frames, plinth edges
  plinth: 0xb7ab98, // the raised stone platform (otla) shops sit on

  // building parts
  shopInside: 0x4a3a30, // the dim inside of an open shop
  windowDark: 0x3a3a44, // glass and dark rooms seen through windows
  wood: 0x7a5236, // doors, window frames, jharokha screens
  shutter: 0x8c8f8f, // rolling metal shutters
  tin: 0x9a8f80, // tin awnings, faded and rusty
  tarp: 0x5f86a3, // blue tarpaulin awnings
  railing: 0x5b5f5c, // balcony railings
  waterTank: 0x2a2a2a, // the black plastic rooftop tank
  metal: 0x77736e, // antennas, dishes, brackets
  pole: 0x8a8378, // concrete electricity poles
  wire: 0x2b2a28, // overhead wires (drawn unlit, as silhouettes)

  // signboards: blank for now, painted with text in phase 3
  boardYellow: 0xe9c24a,
  boardRed: 0xc2483a,
  boardBlue: 0x3e6fa8,
  boardWhite: 0xefe9dc,
  boardGreen: 0x4f8a57,
  cafeSign: 0x2f63b0, // the cyber cafe's sign: a bright blue that carries down the street

  // the far skyline, already faded by distance (drawn without haze)
  hillNear: 0xa9a4a8,
  hillMid: 0xbab8c0,
  hillFar: 0xcacbd4,
  fort: 0x9d948f, // walls facing the town
  fortShade: 0x8c837f, // bastions, towers and domes: a touch darker so shapes separate
  fortDark: 0x6f6864, // the gate's opening
} as const;

/** The wall colours buildings choose from. */
export const WALL_COLOURS = [
  PAL.limeWhite,
  PAL.limeYellow,
  PAL.limePink,
  PAL.limeBlue,
  PAL.limeGreen,
  PAL.sandstone,
] as const;

/** Signboard colours (the cafe's own blue is kept for the cafe). */
export const BOARD_COLOURS = [
  PAL.boardYellow,
  PAL.boardRed,
  PAL.boardWhite,
  PAL.boardGreen,
  PAL.boardYellow,
] as const;
