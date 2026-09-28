import type { Rng } from "../core/rng";
import { CLOTH, PAL, SKIN_TONES } from "../render/palette";
import type { PersonRecipe } from "./body";
import type { Outfit } from "./clothes";

/**
 * Who people are: a role in, a varied person recipe out.
 *
 * Each role draws from a seeded random mix of age, height, build, skin tone,
 * face and clothing, within what that kind of person on a Rajasthan market
 * street in the 2000s would plausibly wear. So no two look alike, and the
 * street's the same on every load.
 */

export type Role =
  | "uncle" // an older man: kurta or shirt, often a safa, a proud moustache
  | "man" // a man in his 30s–50s: half-sleeve shirt and trousers, or kurta-pyjama
  | "youngMan" // jeans and a shirt
  | "halwai" // a sweet-maker or stall seller: vest or kurta, a dhoti or pyjama
  | "shopkeeper" // kurta or shirt, sometimes a Nehru jacket
  | "villageWoman" // ghagra, choli and odhni
  | "woman" // salwar-kameez and dupatta, or ghagra-odhni
  | "kid" // t-shirt and shorts
  | "schoolboy"; // uniform and a school bag

const brown = (rng: Rng, deep = 0) => SKIN_TONES[Math.min(SKIN_TONES.length - 1, Math.floor(rng.next() * SKIN_TONES.length) + deep)];
const black = (rng: Rng, age: number) => (age > 0.75 && rng.next() < 0.6 ? PAL.hairGrey : PAL.hairBlack);

export function recipeFor(role: Role, rng: Rng): PersonRecipe {
  switch (role) {
    case "uncle":
    case "man":
    case "youngMan":
    case "halwai":
    case "shopkeeper":
      return manRecipe(role, rng);
    case "villageWoman":
    case "woman":
      return womanRecipe(role, rng);
    case "kid":
    case "schoolboy":
      return childRecipe(role, rng);
  }
}

function manRecipe(role: Role, rng: Rng): PersonRecipe {
  const age = role === "uncle" ? rng.range(0.65, 0.95) : role === "youngMan" ? rng.range(0.1, 0.25) : rng.range(0.3, 0.7);
  let outfit: Outfit;
  const pick = rng.next();
  switch (role) {
    case "uncle":
      outfit = pick < 0.6
        ? { top: "kurta", topColour: rng.pick(CLOTH.kurtas), bottom: "dhoti", bottomColour: PAL.dhotiWhite, feet: "chappals" }
        : { top: "halfShirt", topColour: rng.pick(CLOTH.shirts), bottom: "pyjama", bottomColour: PAL.dhotiWhite, feet: "chappals" };
      if (rng.next() < 0.7) outfit.safa = [...rng.pick(CLOTH.safas)] as [number, number];
      break;
    case "youngMan":
      outfit = { top: rng.next() < 0.5 ? "shirt" : "tshirt", topColour: rng.pick([...CLOTH.shirts, ...CLOTH.tshirts]), bottom: "jeans", bottomColour: CLOTH.jeans, feet: "shoes" };
      break;
    case "halwai":
      outfit = pick < 0.5
        ? { top: "vest", topColour: PAL.vestCream, bottom: rng.next() < 0.5 ? "dhoti" : "pyjama", bottomColour: PAL.dhotiWhite, feet: "chappals" }
        : { top: "kurta", topColour: rng.pick(CLOTH.kurtas), bottom: "pyjama", bottomColour: rng.pick(CLOTH.trousers), feet: "chappals" };
      if (rng.next() < 0.4) outfit.gamchha = true;
      break;
    case "shopkeeper":
      outfit = pick < 0.5
        ? { top: "kurta", topColour: rng.pick(CLOTH.kurtas), bottom: "pyjama", bottomColour: rng.pick(CLOTH.trousers), feet: "chappals" }
        : { top: "halfShirt", topColour: rng.pick(CLOTH.shirts), bottom: "trousers", bottomColour: rng.pick(CLOTH.trousers), feet: "chappals" };
      if (outfit.top === "kurta" && rng.next() < 0.4) outfit.jacket = rng.pick(CLOTH.jackets);
      break;
    default:
      outfit = pick < 0.6
        ? { top: "halfShirt", topColour: rng.pick(CLOTH.shirts), bottom: "trousers", bottomColour: rng.pick(CLOTH.trousers), feet: rng.next() < 0.5 ? "chappals" : "shoes" }
        : { top: "kurta", topColour: rng.pick(CLOTH.kurtas), bottom: "pyjama", bottomColour: rng.pick(CLOTH.trousers), feet: "chappals" };
  }
  const bigMoustache = age > 0.5 && rng.next() < 0.7;
  return {
    body: "man",
    build: { scale: rng.range(0.95, 1.06), girth: rng.range(0.95, 1.05) + age * rng.range(0, 0.18) },
    skin: brown(rng),
    hair: age > 0.55 && rng.next() < 0.6 ? "receding" : "short",
    hairColour: black(rng, age),
    face: {
      moustache: bigMoustache ? (role === "uncle" && rng.next() < 0.5 ? "curled" : "thick") : rng.next() < 0.6 ? "thin" : "none",
      beard: rng.next() < 0.3 ? "stubble" : "none",
      age,
      tilak: rng.next() < 0.3,
      bindi: false,
      brow: rng.range(9, 14),
      hair: black(rng, age),
    },
    outfit,
  };
}

function womanRecipe(role: Role, rng: Rng): PersonRecipe {
  const age = role === "villageWoman" ? rng.range(0.4, 0.9) : rng.range(0.2, 0.55);
  const traditional = role === "villageWoman" || rng.next() < 0.35;
  let outfit: Outfit;
  if (traditional) {
    const [ghagra, border] = rng.pick(CLOTH.ghagras);
    const odhni = rng.pick(CLOTH.odhnis);
    outfit = {
      top: "choli", topColour: rng.pick([ghagra, border, odhni[0]]),
      bottom: "ghagra", bottomColour: ghagra, trim: border,
      odhni: [odhni[0], odhni[1]], bangles: rng.pick(CLOTH.bangles), feet: rng.next() < 0.7 ? "chappals" : "barefoot",
    };
  } else {
    const [kameez, salwar, dupatta] = rng.pick(CLOTH.suits);
    outfit = { top: "kameez", topColour: kameez, bottom: "salwar", bottomColour: salwar, dupatta, bangles: rng.pick(CLOTH.bangles), feet: "chappals" };
  }
  return {
    body: "woman",
    build: { scale: rng.range(0.9, 0.97), girth: rng.range(0.84, 0.92) + age * 0.08 },
    skin: brown(rng),
    hair: rng.next() < 0.5 ? "bun" : "braid",
    hairColour: black(rng, age),
    face: {
      moustache: "none", beard: "none", age: age * 0.8, tilak: false, bindi: true,
      brow: rng.range(6, 8), hair: PAL.hairBlack, lashes: true,
      noseRing: traditional && rng.next() < 0.6, lips: PAL.lipShade,
    },
    outfit,
  };
}

function childRecipe(role: Role, rng: Rng): PersonRecipe {
  const outfit: Outfit = role === "schoolboy"
    ? { top: "schoolShirt", topColour: CLOTH.schoolShirt, bottom: "shorts", bottomColour: CLOTH.schoolShorts, bag: "school", feet: "shoes" }
    : { top: "tshirt", topColour: rng.pick(CLOTH.tshirts), bottom: "shorts", bottomColour: rng.pick([CLOTH.schoolShorts, 0x6b6257, 0x2f3e57]), feet: rng.next() < 0.5 ? "chappals" : "barefoot" };
  return {
    body: "child",
    build: { scale: rng.range(0.64, 0.76), girth: 0.92 },
    skin: brown(rng),
    hair: "kid",
    hairColour: PAL.hairBlack,
    face: { moustache: "none", beard: "none", age: 0, tilak: false, bindi: false, brow: 7, hair: PAL.hairBlack, eyeScale: 1.25 },
    outfit,
  };
}
