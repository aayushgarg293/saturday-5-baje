import * as THREE from "three";
import type { Rng } from "../core/rng";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import type { Ride, VehicleKind } from "../world/props/vehicles";
import { type Person, type PersonRecipe, buildPerson } from "./body";
import { lookAt, plant, reach } from "./pose";
import { recipeFor } from "./recipes";

/**
 * The people on the moving vehicles (world/traffic.ts):
 *
 *   auto       the driver in his khaki uniform, and a passenger in the back
 *   scooter    an uncle, with a small child standing on the footboard in
 *              front of him, holding the handlebar
 *   bicycle    the doodhwala, steel milk cans hanging off the carrier; his
 *              feet go round with the pedals
 *
 * Each sits on the seat (the vehicle says where: `Ride` in props/vehicles.ts),
 * hands on the grips and feet on the footboard or pedals by IK, leaning
 * into the ride, looking ahead, and glancing at you when stopped near you.
 *
 * FRAME: the vehicle's own (+x forward, +z its right, y up). A person faces
 * +z in their own frame, so each is turned a quarter turn to face +x; then
 * their right is the vehicle's +z.
 */

export type Riders = { group: THREE.Group; update(dt: number, speed: number, player: THREE.Vector3): void };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const FACE_FORWARD = Math.PI / 2;
/** Knees point forward and up; elbows down, back and out to each side (vehicle frame). */
const KNEE = v(1, 0.6, 0);
const ELBOW = { R: v(-0.3, -0.6, 0.7), L: v(-0.3, -0.6, -0.7) };
const WHEEL = 0.34; // the bicycle's wheel radius
const GEAR = 2.4; // the wheels turn this many times for each turn of the pedals

type Seat = {
  person: Person;
  ride: Ride;
  /** Standing (the child on the footboard) rather than sitting. */
  standing: boolean;
  look: THREE.Vector3;
  blinkIn: number;
};

export function buildRiders(kind: VehicleKind, ride: Ride, rng: Rng): Riders {
  const group = new THREE.Group();
  group.name = "riders";
  const seats: Seat[] = [];
  const add = (recipe: PersonRecipe, r: Ride, standing = false) => {
    // seated, a kurta's stiff tails would hang through the seat (see chaiCorner.ts)
    if (!standing && (recipe.outfit.top === "kurta" || recipe.outfit.top === "kameez")) recipe.outfit.top = "halfShirt";
    recipe.outfit.jacket = undefined;
    recipe.outfit.bag = undefined;
    const person = buildPerson(recipe);
    person.root.position.set(r.seat.x, standing ? r.seat.y : 0, 0);
    person.root.rotation.y = FACE_FORWARD;
    group.add(person.root);
    seats.push({ person, ride: r, standing, look: v(8, 1.4, 0), blinkIn: rng.range(1, 4) });
  };

  const driver = recipeFor(kind === "bicycle" ? "halwai" : kind === "motorcycle" ? "youngMan" : "man", rng);
  driver.build.scale = 1; // the reaches are measured for this height
  if (kind === "auto") {
    // the auto-wallah's khaki
    driver.outfit = { top: "halfShirt", topColour: 0xbca77e, bottom: "trousers", bottomColour: 0xa89370, feet: "chappals" };
  }
  if (kind === "bicycle") {
    // the doodhwala: white shirt, dhoti, a white safa
    driver.outfit = { top: "halfShirt", topColour: 0xefeade, bottom: "dhoti", bottomColour: PAL.dhotiWhite, safa: [0xf0f0e6, 0xd6283a], feet: "chappals" };
  }
  add(driver, ride);

  if (kind === "auto") {
    // a passenger on the back seat, hands on his knees, feet on the floor
    const passenger = recipeFor("uncle", rng);
    passenger.build.scale = 1;
    add(passenger, { seat: { x: -0.82, y: 1.01 }, grip: { x: -0.47, y: 1.14, z: 0.14 }, foot: { x: -0.4, y: 0.87, z: 0.15 }, lean: 0.05 });
  }
  if (kind === "scooter") {
    // a small child standing on the footboard, between his knees, holding the middle of the handlebar
    const child = recipeFor("kid", rng);
    child.build.scale = 0.55;
    child.outfit.feet = "chappals";
    add(child, { seat: { x: 0.3, y: 0.315 }, grip: { x: 0.56, y: 1.05, z: 0.07 }, foot: { x: 0.3, y: 0.34, z: 0.06 }, lean: 0.05 }, true);
  }
  if (kind === "bicycle") group.add(milkCans());

  let crank = rng.next() * Math.PI * 2;
  let t = 0;
  const local = new THREE.Vector3();

  return {
    group,
    update(dt, speed, player) {
      t += dt;
      crank += (speed * dt) / WHEEL / GEAR;
      group.updateMatrixWorld(true);
      const world = (p: THREE.Vector3) => group.localToWorld(p.clone());
      const dirOf = (d: THREE.Vector3) => d.clone().transformDirection(group.matrixWorld);
      local.copy(player);
      group.worldToLocal(local);

      for (const s of seats) {
        const { person, ride: r } = s;
        const k = person.scale;
        // the body: on the seat (or standing), leaning into the ride, breathing
        if (!s.standing) person.bone("hips").position.set(0, r.seat.y + 0.1 * k, 0);
        person.bone("spine").rotation.set(r.lean * 0.4 + Math.sin(t * 1.7) * 0.012, 0, 0);
        person.bone("chest").rotation.set(r.lean * 0.6, 0, 0);
        person.root.updateMatrixWorld(true);

        // feet: on the pedals as they go round, or on the footboard / floor
        if (!s.standing) {
          for (const [side, sign, turn] of [["R", 1, 0], ["L", -1, Math.PI]] as const) {
            const f = r.foot;
            const at = "crank" in f
              ? v(f.crank.x + Math.cos(crank + turn) * f.radius, f.crank.y + Math.sin(crank + turn) * f.radius + 0.05, sign * f.z)
              : v(f.x, f.y, sign * f.z);
            plant(person, side, world(at), dirOf(KNEE));
          }
        }
        // hands on the grips (or, for the passenger, on his knees)
        reach(person, "R", world(v(r.grip.x, r.grip.y, r.grip.z)), dirOf(ELBOW.R));
        reach(person, "L", world(v(r.grip.x, r.grip.y, -r.grip.z)), dirOf(ELBOW.L));

        // eyes on the road; on you, if the vehicle's stopped and you're close
        const glance = speed < 0.5 && local.length() < 6;
        const target = glance ? player.clone().setY(1.5) : world(v(9, 1.3, Math.sin(t * 0.4 + r.seat.x) * 2));
        s.look.lerp(target, Math.min(1, dt * 3));
        lookAt(person, s.look, 1);

        s.blinkIn -= dt;
        if (s.blinkIn < -0.13) s.blinkIn = 2 + Math.random() * 3;
        person.face.set(s.blinkIn < 0 ? "blink" : "neutral");
      }
    },
  };
}

/** Two steel milk cans hanging either side of the bicycle's carrier. */
function milkCans(): THREE.Mesh {
  const p = new Parts();
  for (const z of [0.22, -0.22]) {
    p.cylinder(0.1, 0.11, 0.34, -0.5, 0.52, z, PAL.steel, { segments: 12 });
    p.cylinder(0.06, 0.1, 0.06, -0.5, 0.72, z, PAL.steel, { segments: 12 }); // the shoulder
    p.cylinder(0.05, 0.05, 0.05, -0.5, 0.77, z, 0x9ea2a6, { segments: 10 }); // the lid
    p.strut({ x: -0.5, y: 0.8, z }, { x: -0.5, y: 0.73, z: z * 0.45 }, 0.008, PAL.metal); // hung from the carrier
  }
  const mesh = new THREE.Mesh(p.geometry(), toon({ color: 0xffffff, vertexColors: true, flatShading: false }));
  mesh.name = "milkCans";
  mesh.castShadow = true;
  return mesh;
}
