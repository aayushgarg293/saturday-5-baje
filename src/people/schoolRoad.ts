import * as THREE from "three";
import { makeRng } from "../core/rng";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import { BENCHES, PEANUTS, PLAY, parkOrigin } from "../world/places/park";
import { CHOWKIDAR, schoolOrigin } from "../world/places/school";
import { type Actor, makeActor, v } from "./actor";
import { buildPerson } from "./body";
import { stool } from "./props";
import { type Role, recipeFor } from "./recipes";

/**
 * The people on school road (world/schoolRoad.ts), apart from the tuition's
 * kids (people/tuition.ts):
 *
 *   the chowkidar     on his stool inside the school's gate (it's shut,
 *                     Saturday), watching the road, scratching his head
 *   in the park       two old men on a bench, one talking and one nodding;
 *                     two kids on the see-saw, up and down; one on a swing,
 *                     swinging; the peanut seller outside the gate stirring
 *                     the hot sand in his kadhai, twisting paper cones
 *
 * Their own random numbers (the street's people don't change). FRAMES: the
 * school's and the park's (world/places/school.ts, park.ts: square to the
 * world, x east, z south); each group placed where its place is.
 */

export type SchoolRoadPeople = { group: THREE.Group; update(t: number, dt: number, player: THREE.Vector3): void };

function propMesh(p: Parts, name: string) {
  const m = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  m.name = name;
  m.castShadow = true;
  return m;
}

export function buildSchoolRoadPeople(): SchoolRoadPeople {
  const rng = makeRng(7751);
  // the whole group sits at the park (people/crowd.ts updates it when you're near there); the school's
  // people go in a group of their own, at the school
  const po = parkOrigin(), so = schoolOrigin();
  const group = new THREE.Group();
  group.name = "schoolRoadPeople";
  group.position.set(po.x, 0, po.z);
  const school = new THREE.Group();
  school.position.set(so.x - po.x, 0, so.z - po.z);
  group.add(school);
  group.updateMatrixWorld(true);
  const actors: Actor[] = [];
  const person = (role: Role, parent: THREE.Object3D, seated: boolean, dress?: (o: ReturnType<typeof recipeFor>["outfit"]) => void) => {
    const r = recipeFor(role, rng);
    if (role !== "kid") r.build.scale = 1;
    if (seated && r.outfit.top === "kurta") r.outfit.top = "halfShirt"; // (a kurta's tails would hang through the seat)
    r.outfit.jacket = undefined;
    r.outfit.bag = undefined;
    dress?.(r.outfit);
    const p = buildPerson(r);
    parent.add(p.root);
    return p;
  };
  const knees = { r: v(-0.13, 0.6, 0.35), l: v(0.13, 0.6, 0.35) };

  // --- the chowkidar, inside the gate -------------------------------------------------------------------
  const st = stool(0.45);
  st.position.set(CHOWKIDAR.x, 0, CHOWKIDAR.z);
  school.add(st);
  actors.push(makeActor({
    person: person("uncle", school, true, (o) => {
      o.top = "halfShirt";
      o.topColour = 0xb8a26a; // khaki
      o.bottom = "trousers";
      o.bottomColour = 0x8a7a50;
    }),
    at: CHOWKIDAR, seat: 0.45, notice: "glance", phase: 0,
    actions: [
      { name: "watch", duration: 7, pose: () => ({ right: knees.r, left: knees.l, look: v(0, 1.4, 6) }) },
      { name: "scratch", duration: 2.5, pose: (u) => ({ right: v(-0.08, 1.72 + Math.sin(u * 9) * 0.02, 0.02), left: knees.l, look: v(1, 1.5, 4) }) },
      { name: "down", duration: 5, pose: () => ({ right: knees.r, left: knees.l, look: v(-3, 1.4, 5) }) },
    ],
  }));

  // --- two old men on the park bench ---------------------------------------------------------------------
  const b = BENCHES[0];
  const onBench = (dx: number) => {
    // (the bench faces `turn`; its seat is 0.45 high, sit a little back from its front edge)
    const c = Math.cos(b.turn), s = Math.sin(b.turn);
    return { x: b.x + dx * c - 0.05 * s, z: b.z - dx * s - 0.05 * c, turn: b.turn };
  };
  actors.push(makeActor({
    person: person("uncle", group, true), at: onBench(-0.45), seat: 0.45, notice: "glance", phase: 0,
    actions: [
      { name: "talk", duration: 6, pose: (u) => ({ right: v(-0.22 + Math.sin(u * 2.1) * 0.07, 0.95 + Math.sin(u * 2.9) * 0.06, 0.3), left: knees.l, look: v(0.8, 1.05, 0.6), smile: u > 4 }) },
      { name: "rest", duration: 4, pose: () => ({ right: knees.r, left: knees.l, look: v(0.3, 1.2, 5) }) },
    ],
  }));
  actors.push(makeActor({
    person: person("uncle", group, true), at: onBench(0.45), seat: 0.45, notice: "glance", phase: 3,
    actions: [
      { name: "listen", duration: 7, pose: (u) => ({ right: knees.r, left: knees.l, look: v(-0.8, 1.05, 0.6), nod: 0.08 + Math.max(0, Math.sin(u * 1.8)) * 0.1 }) },
      { name: "laugh", duration: 3, pose: (u) => ({ right: v(-0.1, 0.75, 0.3), left: knees.l, look: v(-0.6, 1.3, 0.8), nod: -0.12 + Math.abs(Math.sin(u * 8)) * 0.07, smile: true }) },
    ],
  }));

  // --- the see-saw: the plank tips up and down; a kid at each end goes with it ------------------------------
  const ss = PLAY.seesaw;
  const pivot = new THREE.Group();
  pivot.position.set(ss.x, ss.y + 0.05, ss.z);
  group.add(pivot);
  const plank = new Parts();
  plank.box(3.4, 0.07, 0.3, 0, 0, 0, 0xc84a3a);
  for (const x of [-1.45, 1.45]) plank.box(0.06, 0.3, 0.3, x + Math.sign(x) * -0.25, 0.15, 0, 0x3f6a8a); // the handles
  pivot.add(propMesh(plank, "seesawPlank"));
  const seesawKids = [-1.45, 1.45].map((x, k) => {
    const seat = new THREE.Group();
    seat.position.set(x, 0.04, 0);
    pivot.add(seat);
    const hold = v(0.08, 0.62, 0.32);
    return makeActor({
      person: person("kid", seat, true), at: { x: 0, z: 0, turn: x < 0 ? Math.PI / 2 : -Math.PI / 2 }, seat: 0.0, notice: "none", phase: k,
      actions: [{ name: "ride", duration: 4, pose: () => ({ right: v(-0.08, 0.62, 0.32), left: hold, look: v(0, 0.9, 2), smile: true }) }],
    });
  });
  actors.push(...seesawKids);

  // --- a kid on the swing: the chains and seat swing about the top bar, the kid with them -----------------------
  const sw = PLAY.swing;
  const swing = new THREE.Group();
  swing.position.set(sw.x, sw.top, sw.z);
  group.add(swing);
  const chains = new Parts();
  for (const dx of [-0.22, 0.22]) chains.box(0.015, sw.top - 0.48, 0.015, dx, -(sw.top - 0.48) / 2, 0, 0x8a8f92);
  chains.box(0.5, 0.04, 0.22, 0, -(sw.top - 0.46), 0, 0xc8a050);
  swing.add(propMesh(chains, "swing"));
  const rider = new THREE.Group();
  rider.position.set(0, -(sw.top - 0.44), 0);
  swing.add(rider);
  actors.push(makeActor({
    person: person("kid", rider, true), at: { x: 0, z: 0.05, turn: 0 }, seat: 0.0, notice: "none", phase: 0,
    actions: [{ name: "swing", duration: 5, pose: () => ({ right: v(-0.2, 0.55, 0.0), left: v(0.2, 0.55, 0.0), look: v(0, 0.6, 3), smile: true }) }],
  }));

  // --- the peanut seller -------------------------------------------------------------------------------------------
  const ladle = new Parts();
  ladle.cylinder(0.012, 0.012, 0.45, 0, -0.2, 0, 0x6a5a44, { segments: 5 });
  ladle.box(0.12, 0.01, 0.1, 0, -0.43, 0.02, 0x5a5a5c);
  const ladleMesh = propMesh(ladle, "sandLadle");
  group.add(ladleMesh);
  const kadhai = v(0, 1.18, 0.75); // in his frame: the kadhai's middle, in front of him (to his right)
  const seller = makeActor({
    person: person("man", group, false, (o) => {
      o.top = "vest";
      o.topColour = 0xe8e2d4;
      o.bottom = "dhoti";
      o.bottomColour = 0xd8cbb0;
      o.gamchha = true;
    }),
    at: PEANUTS.seller, notice: "greet", phase: 0,
    actions: [
      { name: "stir", duration: 5, pose: (u) => ({ right: v(-0.3 + Math.cos(u * 4) * 0.12, 1.32, 0.62 + Math.sin(u * 4) * 0.1), left: v(0.15, 0.95, 0.45), look: kadhai, lean: 0.25 }) },
      { name: "cone", duration: 3, pose: (u) => ({ right: v(-0.04, 1.05 + Math.sin(u * 6) * 0.02, 0.36), left: v(0.06, 1.05, 0.36), look: v(0, 1.0, 0.4), nod: 0.2 }) },
      { name: "call", duration: 3, pose: () => ({ right: v(-0.2, 0.95, 0.3), left: v(0.2, 0.95, 0.3), look: v(-2, 1.5, 4) }) },
    ],
  });
  actors.push(seller);

  const _p = new THREE.Vector3();
  return {
    group,
    update(t, dt, player) {
      // the see-saw tips, slow at the ends (a kid pushing off the ground each time); the swing swings
      pivot.rotation.z = Math.sin(t * 1.6) * 0.22;
      swing.rotation.x = Math.sin(t * 2.1) * 0.55;
      for (const a of actors) a.update(t, dt, player);
      // the ladle in his right hand, its scoop down in the sand
      seller.grip("R", _p);
      ladleMesh.position.copy(_p);
      ladleMesh.rotation.set(seller.now.name === "stir" ? 0.3 : 1.2, 0, 0);
      ladleMesh.visible = seller.now.name !== "cone";
    },
  };
}
