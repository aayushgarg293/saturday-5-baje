import * as THREE from "three";
import { type Box, boxAt } from "../core/colliders";
import type { Patch } from "../core/floors";
import { type Rng, makeRng, shuffled } from "../core/rng";
import { PAL, WALL_COLOURS } from "../render/palette";
import { buildCafe } from "./buildings/cafe";
import { type BuildContext, type BuildResult, type PeopleSpot, type SignSpot } from "./buildings/common";
import { buildHaveli } from "./buildings/haveli";
import { buildHouse } from "./buildings/house";
import { buildShop } from "./buildings/shop";
import { buildTemple } from "./props/temple";
import { Parts, ribbon } from "./kit";
import { SHOP_NAMES } from "./names";
import {
  CAFE, DRAIN, PLOT_DEPTH, ROAD_WIDTH, SIDE_ROADS, STREET_LENGTH,
  type Plot, centreAt, planPlots, pointAt, streetCoords, yawAlong,
} from "./layout";

/**
 * Builds the street: the ground, the curved road and drains, and a building
 * on every plot from the plan in `layout.ts`. Also collects everything the
 * player can bump into, and where everything with words on it goes
 * (painted by `signs.ts`).
 */

/** A signboard, ad or poster's place in the world, for `signs.ts` to paint. */
export type WorldSign = {
  kind: SignSpot["kind"];
  position: THREE.Vector3;
  /** Which way the board faces (rotation about the vertical axis). */
  rotationY: number;
  w: number;
  h: number;
  /** For two-sided boards: distance from the front face to the back face. */
  backOffset?: number;
  /** The words on a stall board. */
  label?: string;
  /** Which shop name a shop board shows (world/names.ts). */
  nameIndex?: number;
};

export type Street = {
  group: THREE.Group;
  colliders: Box[];
  /** Floors to stand on above the street (the cafe's stairs and first floor). */
  floors: Patch[];
  signs: WorldSign[];
  /** Where the player starts, and the direction they face (yaw, radians). */
  spawn: { x: number; z: number; yaw: number };
  /** Places for people (shopkeepers, the temple), in world terms, south to north. */
  people: WorldPeopleSpot[];
};

/** A `PeopleSpot` placed in the world: its position, and which way it faces (rotation about the vertical). */
export type WorldPeopleSpot = Omit<PeopleSpot, "x" | "y" | "z" | "turn"> & { position: THREE.Vector3; rotationY: number };

/** Seed for the random parts of the street: change it for a different street. */
const SEED = 2006;

type Builder = (c: BuildContext) => BuildResult;
const BUILDERS: Record<"shop" | "haveli" | "house" | "cafe" | "temple" | "wall", Builder> = {
  wall: buildBoundaryWall,
  shop: buildShop,
  haveli: buildHaveli,
  house: buildHouse,
  cafe: buildCafe,
  temple: buildTemple,
};

export function buildStreet(): Street {
  const group = new THREE.Group();
  group.name = "street";
  const colliders: Box[] = [];
  const floors: Patch[] = [];
  const signs: WorldSign[] = [];
  const people: WorldPeopleSpot[] = [];
  const rng = makeRng(SEED);

  group.add(buildGround());

  /**
   * Build one building with its front edge running from `a` to `b` (world
   * x/z), facing into the street along `normal`. Adds its collider and signs.
   */
  function place(
    type: keyof typeof BUILDERS, a: { x: number; z: number }, b: { x: number; z: number },
    normal: THREE.Vector2, name: string, shopName?: number,
  ) {
    const w = Math.hypot(b.x - a.x, b.z - a.z);
    const parts = new Parts();
    const wall = type === "cafe" ? PAL.limeWhite : rng.pick(WALL_COLOURS);
    const spots: PeopleSpot[] = [];
    const result = BUILDERS[type]({ parts, w, rng: forkRng(rng), wall, shopName, people: spots });

    const mesh = parts.build(name);
    // Turn the building so its local +z (its front) points along `normal`.
    const rot = Math.atan2(normal.x, normal.y);
    mesh.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    mesh.rotation.y = rot;
    mesh.updateMatrixWorld();
    group.add(mesh);

    // colliders: the building's own walls if it has any (the cafe: you can go
    // in), otherwise the whole footprint, from the front edge back PLOT_DEPTH metres
    const centre = (x0: number, x1: number, z0: number, z1: number) =>
      new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2).applyMatrix4(mesh.matrixWorld);
    if (result.colliders) {
      for (const b of result.colliders) {
        const c = centre(b.x0, b.x1, b.z0, b.z1);
        colliders.push({ ...boxAt(c.x, c.z, b.x1 - b.x0, b.z1 - b.z0, rot), y0: b.y0, y1: b.y1 });
      }
    } else {
      const back = new THREE.Vector3(0, 0, -PLOT_DEPTH / 2).applyMatrix4(mesh.matrixWorld);
      colliders.push(boxAt(back.x, back.z, w, PLOT_DEPTH, rot));
    }
    for (const f of result.floors ?? []) {
      const c = centre(f.x0, f.x1, f.z0, f.z1);
      floors.push({ cx: c.x, cz: c.z, hx: (f.x1 - f.x0) / 2, hz: (f.z1 - f.z0) / 2, rot, front: f.front, back: f.back });
    }

    for (const sp of result.signs) addSign(sp, mesh, rot);
    for (const { x, y, z, turn, ...rest } of spots) {
      people.push({ ...rest, position: new THREE.Vector3(x, y, z).applyMatrix4(mesh.matrixWorld), rotationY: rot + turn });
    }
    return { mesh, rot, w, height: result.height };
  }

  /** Record a sign given in a building's own frame, in world terms. */
  function addSign(sp: SignSpot, mesh: THREE.Mesh, rot: number) {
    signs.push({
      kind: sp.kind,
      position: new THREE.Vector3(sp.x, sp.y, sp.z).applyMatrix4(mesh.matrixWorld),
      rotationY: rot + (sp.ry ?? 0),
      w: sp.w,
      h: sp.h,
      backOffset: sp.backOffset,
      label: sp.label,
      nameIndex: sp.nameIndex,
    });
  }

  // --- the plots on both sides ---------------------------------------------------
  // Each side's buildings in order along the street, for finding wall-ad spots.
  const rows: Record<"left" | "right", RowEntry[]> = { left: [], right: [] };
  // Each shop gets a name from world/names.ts, in a fixed shuffled order. The
  // name decides both its signboard and the goods it lays out.
  const shopOrder = shuffled(SHOP_NAMES.length, 11);
  let shopCount = 0;

  for (const plot of planPlots(rng)) {
    const sign = plot.side === "left" ? -1 : 1;
    const a = pointAt(plot.s0, sign * plot.setback);
    const b = pointAt(plot.s1, sign * plot.setback);
    // the building faces across the street, toward the centre line
    const along = new THREE.Vector2(b.x - a.x, b.z - a.z).normalize();
    const normal = plot.side === "left"
      ? new THREE.Vector2(-along.y, along.x)
      : new THREE.Vector2(along.y, -along.x);

    if (plot.type === "road") {
      openSideRoad(plot, normal);
      rows[plot.side].push({ s0: plot.s0, height: 0 }); // a gap, like a gali
      continue;
    }
    if (plot.type === "gali") {
      closeGali(plot, normal);
      rows[plot.side].push({ s0: plot.s0, height: 0 }); // a gap: the walls either side are exposed to the ground
      continue;
    }
    const shopName = plot.type === "shop" ? shopOrder[shopCount++ % shopOrder.length] : undefined;
    const built = place(plot.type, a, b, normal, `${plot.type}@${plot.side}${plot.s0.toFixed(0)}`, shopName);
    rows[plot.side].push({ s0: plot.s0, ...built });
  }

  addWallAds(rows, addSign);

  /**
   * A side road (layout.ts, SIDE_ROADS): a gap in the row leading to a lane
   * behind the buildings, with a house across the far side of the lane and a
   * wall across each end of it. From the street you see into the gap, the
   * lane and the house; the lane runs off round the corners, out of sight.
   */
  function openSideRoad(plot: Plot, normal: THREE.Vector2) {
    const road = plot.s0 < STREET_LENGTH / 2 ? SIDE_ROADS.south : SIDE_ROADS.north;
    const sign = plot.side === "left" ? -1 : 1;
    const near = plot.setback + PLOT_DEPTH; // where the lane starts (behind the row)
    const far = near + road.lane; // and ends (the closing house's front)
    const s0 = plot.s0 - road.reach, s1 = plot.s1 + road.reach;
    place("house", pointAt(s0, sign * far), pointAt(s1, sign * far), normal, `road-end@${plot.s0}`);
    // walls across both ends of the lane; their fronts face into the lane
    const h = centreAt(plot.s0).heading;
    const along = new THREE.Vector2(Math.sin(h), -Math.cos(h));
    place("wall", pointAt(s0, sign * (near - 1.5)), pointAt(s0, sign * far), along.clone(), `road-wall@${s0}`);
    place("wall", pointAt(s1, sign * far), pointAt(s1, sign * (near - 1.5)), along.clone().negate(), `road-wall@${s1}`);
  }

  /** A gali is a gap in the row; a house across its far end makes it a short dead end. */
  function closeGali(plot: Plot, normal: THREE.Vector2) {
    const sign = plot.side === "left" ? -1 : 1;
    const back = sign * (plot.setback + PLOT_DEPTH);
    place("house", pointAt(plot.s0 - 1, back), pointAt(plot.s1 + 1, back), normal, `gali-end@${plot.s0.toFixed(0)}`);
  }

  // --- close both ends of the street with three buildings across it ----------------
  for (const end of [0, STREET_LENGTH]) {
    const facing = end === 0 ? 1 : -1; // the south end faces north, the north end south
    const h = centreAt(end).heading;
    const normal = new THREE.Vector2(Math.sin(h), -Math.cos(h)).multiplyScalar(facing);
    // lower houses, so the hills and the fort show over the far end
    const types = ["house", "house", "house"] as const;
    for (let k = -1; k <= 1; k++) {
      // three 9 m frontages side by side, 13.5 m either side of the centre
      const from = pointAt(end, (k - 0.5) * 9 * facing);
      const to = pointAt(end, (k + 0.5) * 9 * facing);
      place(types[k + 1], from, to, normal, `end@${end}:${k}`);
    }
  }

  // south to north, so whoever picks from them can space them out along the walk
  const along = (p: THREE.Vector3) => streetCoords(p.x, p.z).s;
  people.sort((a, b) => along(a.position) - along(b.position));
  return { group, colliders, floors, signs, spawn: { ...pointAt(1.5, 0), yaw: yawAlong(1.5) }, people };
}

/** A plain boundary wall with a coping on top (the ends of the side roads' back lanes). */
function buildBoundaryWall(c: BuildContext): BuildResult {
  c.parts.slab(-c.w / 2, c.w / 2, 0, 2.6, -0.35, 0, c.wall);
  c.parts.slab(-c.w / 2 - 0.05, c.w / 2 + 0.05, 2.6, 2.7, -0.42, 0.07, PAL.stoneTrim);
  return { height: 2.7, signs: [] };
}

/** One building (or gap) in a row along the street. */
type RowEntry = {
  s0: number;
  height: number;
  /** Missing for a gap (a gali). */
  mesh?: THREE.Mesh;
  rot?: number;
  w?: number;
};

/** At most this many painted wall ads on the street. */
const MAX_WALL_ADS = 8;

/**
 * Painted wall ads go on the classic spot: the bare side wall of a building
 * that stands taller than its neighbour (or next to a gali), high enough to be
 * seen down the street. Worked out from the buildings' heights.
 *
 * Which end of a building faces which neighbour: a building's local +x points
 * toward increasing `s` on the left side of the street, and toward decreasing
 * `s` on the right (they face opposite ways).
 */
function addWallAds(
  rows: Record<"left" | "right", RowEntry[]>,
  addSign: (sp: SignSpot, mesh: THREE.Mesh, rot: number) => void,
) {
  const spots: { sp: SignSpot; e: RowEntry; score: number }[] = [];
  for (const side of ["left", "right"] as const) {
    const row = rows[side];
    const nextIsPlusX = side === "left" ? 1 : -1;
    row.forEach((e, i) => {
      if (!e.mesh || e.w === undefined) return;
      for (const [nb, sign] of [[row[i - 1], -nextIsPlusX], [row[i + 1], nextIsPlusX]] as const) {
        if (!nb) continue; // the street ends are closed off by other buildings
        const roofY = e.height - 0.85; // below the parapet
        const y0 = Math.max(nb.height + 0.4, 2.4);
        const top = roofY - 0.3;
        const bottom = Math.max(y0, top - 4.2); // ads are at most ~4 m tall
        if (top - bottom < 2.2) continue;
        spots.push({
          e,
          score: top - bottom + (nb.height === 0 ? 2 : 0), // prefer big walls, and gali corners
          sp: {
            kind: "wallAd",
            x: sign * (e.w / 2),
            y: (top + bottom) / 2,
            z: -5, // centred on the wall's depth, behind the facade's ledges
            w: 6.4,
            h: top - bottom,
            ry: sign * (Math.PI / 2), // face out of the side wall
          },
        });
      }
    });
  }
  spots.sort((a, b) => b.score - a.score);
  for (const { sp, e } of spots.slice(0, MAX_WALL_ADS)) addSign(sp, e.mesh!, e.rot!);
}

/** The ground: a big dusty plane, the road ribbon down the middle, and the two drains. */
function buildGround(): THREE.Mesh {
  const parts = new Parts();
  // one big plane under everything (the street wanders, so make it generous)
  const mid = centreAt(STREET_LENGTH / 2);
  const plane = new THREE.PlaneGeometry(140, STREET_LENGTH + 80);
  plane.rotateX(-Math.PI / 2);
  parts.add(plane, mid.x, 0, mid.z, PAL.dust);

  const steps = STREET_LENGTH;
  const along = (offset: number) => (t: number) => pointAt(t * STREET_LENGTH, offset);
  // road, 1 cm up so it doesn't flicker against the ground ("z-fighting")
  parts.add(ribbon(along(-ROAD_WIDTH / 2), along(ROAD_WIDTH / 2), steps, 0.01), 0, 0, 0, PAL.asphalt);
  for (const side of [-1, 1]) {
    // ribbon(left edge, right edge): keep the edges in that order on both sides
    const inner = along(side * DRAIN.inner), outer = along(side * DRAIN.outer);
    parts.add(ribbon(side < 0 ? outer : inner, side < 0 ? inner : outer, steps, 0.012), 0, 0, 0, PAL.drain);
  }
  return parts.build("ground", { castShadow: false });
}


/**
 * Each building gets its own random sequence, seeded from the street's. That
 * way, changing how one building type uses randomness doesn't reshuffle every
 * building after it.
 */
function forkRng(rng: Rng): Rng {
  return makeRng(Math.floor(rng.next() * 2 ** 31));
}

/** The cafe's plot, re-exported for cameras and tests. */
export { CAFE };
