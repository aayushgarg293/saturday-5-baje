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
  // sky and air: a warm, dusty summer afternoon
  skyTop: 0x7fa3c4, // dusty blue straight overhead
  skyMid: 0xadc4d3,
  skyHorizon: 0xeadfc8, // warm cream haze at the horizon
  sunGlow: 0xf6e1b6, // the sky on the sun's side, low down
  haze: 0xe6d9c1, // distance haze on the street: matches the horizon, so the far end melts into the sky

  // light
  sun: 0xfff0d6, // warm late-afternoon sun
  skyLight: 0xcfe0f0, // fill light from the sky above
  fillLight: 0xb9c3e8, // cool light from the side away from the sun: colours the shadows
  groundLight: 0xc9a67e, // warm light bounced up off the dusty ground
  shadowTint: 0x6c5f8c, // shadow sides lean cool violet, not grey

  // ground
  dust: 0xcdb48e, // the unpaved edges of the street
  asphalt: 0x827a72, // the worn, sun-bleached, dusty road down the middle
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

  // stalls, goods and props
  bamboo: 0xb99a63,
  woodLight: 0xa77c4e, // carts, counters, benches
  steel: 0xb9bcc0, // pots, bowls, tumblers
  ironBlack: 0x3a3634, // kadhai, stove, tyres
  terracotta: 0xb86b45, // clay matka, flowerpots
  burlap: 0xc9b28a, // grain sacks
  glassPale: 0xcfe0e3, // display cases (drawn opaque but pale)
  oilGold: 0xd9a441, // hot oil, fried puris and kachoris
  jalebiOrange: 0xf08a1c,
  ice: 0xe6f3f8,
  saffron: 0xf08a24, // temple flag, paint
  marigold: 0xf5a623,
  templeWhite: 0xf3ede2,
  leafDark: 0x4f7a3e, // the peepal tree
  leafLight: 0x6f9a4c,
  bark: 0x6e5a45,
  crateRed: 0xb3332b,
  coolerCream: 0xe3dac8,

  // vehicles and animals
  scooterBlue: 0x7fa8c9,
  scooterRed: 0xb84a3c,
  scooterCream: 0xe4d8bd,
  bikeBlack: 0x2c2a29,
  tyre: 0x232120,
  autoYellow: 0xf2c230,
  autoGreen: 0x3f7a4a,
  chrome: 0xc9ccce,
  seatDark: 0x3b2f2a,
  cowWhite: 0xe8e1d2,
  cowShade: 0xcfc4b1,
  horn: 0x6b5a45,
  dogTan: 0xba8752,
  dogBrown: 0x7a5236,
  dogBlack: 0x2f2a27,

  // signboards: blank for now, painted with text in phase 3
  boardYellow: 0xe9c24a,
  boardRed: 0xc2483a,
  boardBlue: 0x3e6fa8,
  boardWhite: 0xefe9dc,
  boardGreen: 0x4f8a57,
  cafeSign: 0x2f63b0, // the cyber cafe's sign: a bright blue that carries down the street

  // the far skyline, already faded by distance (drawn without haze)
  // (violet-greys that sit against the warm horizon; paler = further away)
  hillNear: 0xa69ca0,
  hillMid: 0xb9aeb1,
  hillFar: 0xcdc3c3,
  fort: 0x9a8d88, // walls facing the town
  fortShade: 0x8a7e7a, // bastions, towers and domes: a touch darker so shapes separate
  fortDark: 0x6a5f5a, // the gate's opening
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
