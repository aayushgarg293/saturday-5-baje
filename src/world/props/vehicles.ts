import * as THREE from "three";
import type { Rng } from "../../core/rng";
import { PAL } from "../../render/palette";
import { Parts } from "../kit";
import type { Mark } from "./vehicleMarks";

/**
 * The street's vehicles, from the period: a Chetak-style scooter, a
 * commuter motorcycle, a black roadster bicycle, a cycle-rickshaw and an
 * auto-rickshaw. Stylised from simple parts, like everything else.
 *
 * Frame: +x is forward (the nose), y up, +z the vehicle's RIGHT (seen by
 * someone sitting on it), origin on the ground under the middle.
 *
 * Parked vehicles have their wheels merged in; moving ones (world/traffic.ts)
 * get their wheels back as a list, so they can be separate meshes that spin.
 *
 * Each also lists its `marks`: number plates, makers' names, what's painted
 * on it (painted in vehicleMarks.ts). No random choices for those: the
 * street's vehicles stay exactly as they were.
 */

export type Wheel = { x: number; y: number; z: number; radius: number; width: number };

export type Vehicle = {
  parts: Parts;
  /** Footprint for colliders: length (x) and width (z). */
  size: [number, number];
  /** Wheels not merged into `parts` (only when asked for). */
  wheels: Wheel[];
  /** Where a rider (or driver) sits, holds on and rests their feet (people/riders.ts). */
  ride?: Ride;
  /** What's painted on it (vehicleMarks.ts). */
  marks: Mark[];
};

/**
 * A rider's place on a vehicle, in its frame: the top of the seat, the
 * right-hand grip (the left one is its mirror, at −z), and where the right
 * foot goes (mirrored for the left): a footboard or footpeg, or, on a
 * bicycle, the pedal crank, which turns.
 */
export type Ride = {
  seat: { x: number; y: number };
  grip: { x: number; y: number; z: number };
  foot: { x: number; y: number; z: number } | { crank: { x: number; y: number }; radius: number; z: number };
  /** How far the rider leans forward, radians. */
  lean: number;
};

export type VehicleKind = "scooter" | "motorcycle" | "bicycle" | "rickshaw" | "auto";

export function buildVehicle(kind: VehicleKind, rng: Rng, separateWheels = false): Vehicle {
  const p = new Parts();
  const wheels: Wheel[] = [];
  const wheel = (x: number, y: number, z: number, radius: number, width: number, thin = false) => {
    if (separateWheels) wheels.push({ x, y, z, radius, width });
    else addWheel(p, { x, y, z, radius, width }, thin);
  };
  switch (kind) {
    case "scooter": {
      const colour = rng.pick([PAL.scooterBlue, PAL.scooterRed, PAL.scooterCream, 0x9bb58a]);
      p.box(0.62, 0.42, 0.5, -0.32, 0.5, 0, colour); // rounded rear body (the engine cowl)
      p.cylinder(0.25, 0.25, 0.62, -0.32, 0.64, 0, colour, { rz: Math.PI / 2, segments: 10 }); // its rounded top
      p.box(0.5, 0.07, 0.36, 0.2, 0.28, 0, PAL.bikeBlack); // floorboard
      p.box(0.09, 0.62, 0.44, 0.47, 0.58, 0, colour, { rz: -0.25 }); // front apron
      p.box(0.62, 0.09, 0.3, -0.32, 0.92, 0, PAL.seatDark); // seat
      p.strut({ x: 0.5, y: 0.3, z: 0 }, { x: 0.58, y: 1.05, z: 0 }, 0.03, PAL.metal); // steering column
      p.box(0.1, 0.06, 0.62, 0.58, 1.06, 0, colour); // handlebar
      p.cylinder(0.08, 0.08, 0.06, 0.66, 1.02, 0, PAL.chrome, { rz: Math.PI / 2, segments: 10 }); // headlight
      p.box(0.22, 0.18, 0.14, 0.57, 0.3, 0, colour); // front mudguard
      wheel(0.57, 0.19, 0, 0.19, 0.11);
      wheel(-0.4, 0.19, 0, 0.19, 0.11);
      const marks: Mark[] = [
        { what: "plate", x: -0.632, y: 0.46, z: 0, w: 0.2, h: 0.075, facing: "back" },
        { what: "plate", x: 0.682, y: 0.3, z: 0, w: 0.12, h: 0.045, facing: "front" }, // on the front mudguard
        { what: "chetak", x: -0.34, y: 0.56, z: 0.252, w: 0.38, h: 0.1, facing: "right" },
        { what: "chetak", x: -0.34, y: 0.56, z: -0.252, w: 0.38, h: 0.1, facing: "left" },
        { what: "bajaaj", x: 0.551, y: 0.714, z: 0, w: 0.18, h: 0.045, facing: "front", rz: -0.25 }, // on the sloping apron
      ];
      return {
        parts: p, size: [1.5, 0.7], wheels, marks,
        // Sitting at the front of the seat, leaning forward, as you must to
        // reach a scooter's handlebar; feet wide apart on the floorboard (a
        // child often stands between them).
        ride: { seat: { x: -0.1, y: 0.96 }, grip: { x: 0.46, y: 1.07, z: 0.24 }, foot: { x: 0.12, y: 0.36, z: 0.16 }, lean: 0.4 },
      };
    }
    case "motorcycle": {
      const colour = rng.pick([PAL.bikeBlack, PAL.scooterRed, 0x2f4f8a]);
      p.box(0.5, 0.2, 0.28, 0.1, 0.84, 0, colour, { rz: -0.1 }); // tank
      p.box(0.62, 0.08, 0.26, -0.42, 0.82, 0, PAL.seatDark); // seat
      p.box(0.42, 0.34, 0.24, -0.02, 0.5, 0, PAL.bikeBlack); // engine
      p.strut({ x: 0.3, y: 0.85, z: 0 }, { x: 0.62, y: 0.32, z: 0 }, 0.03, PAL.chrome); // front fork
      p.box(0.08, 0.05, 0.66, 0.34, 1.02, 0, PAL.chrome); // handlebar
      p.cylinder(0.08, 0.08, 0.1, 0.44, 0.92, 0, PAL.chrome, { rz: Math.PI / 2, segments: 10 }); // headlight
      p.strut({ x: -0.2, y: 0.45, z: 0.12 }, { x: -0.72, y: 0.4, z: 0.12 }, 0.035, PAL.chrome); // exhaust
      p.box(0.4, 0.06, 0.2, -0.65, 0.72, 0, colour); // rear mudguard
      p.box(0.02, 0.1, 0.19, -0.84, 0.63, 0, PAL.bikeBlack); // the plate's holder under the mudguard
      p.box(0.34, 0.03, 0.13, 0.64, 0.67, 0, colour, { rz: -0.15 }); // front mudguard, over the front wheel
      p.box(0.02, 0.08, 0.16, 0.8, 0.62, 0, PAL.bikeBlack); // …and the front plate's holder at its tip
      wheel(0.62, 0.31, 0, 0.31, 0.09);
      wheel(-0.65, 0.31, 0, 0.31, 0.09);
      const marks: Mark[] = [
        { what: "plate", x: -0.852, y: 0.63, z: 0, w: 0.17, h: 0.075, facing: "back" },
        { what: "plate", x: 0.812, y: 0.62, z: 0, w: 0.14, h: 0.06, facing: "front" },
        { what: "heroHondo", x: 0.1, y: 0.84, z: 0.142, w: 0.34, h: 0.08, facing: "right", rz: -0.1 },
        { what: "heroHondo", x: 0.1, y: 0.84, z: -0.142, w: 0.34, h: 0.08, facing: "left", rz: -0.1 },
      ];
      return {
        parts: p, size: [1.95, 0.75], wheels, marks,
        ride: { seat: { x: -0.2, y: 0.86 }, grip: { x: 0.32, y: 1.03, z: 0.3 }, foot: { x: -0.02, y: 0.38, z: 0.2 }, lean: 0.4 },
      };
    }
    case "bicycle": {
      // the classic black roadster: frame tubes between the joints, so they always meet
      const hubR = { x: -0.52, y: 0.34, z: 0 }, hubF = { x: 0.52, y: 0.34, z: 0 };
      const crank = { x: -0.02, y: 0.3, z: 0 }, seat = { x: -0.18, y: 0.86, z: 0 }, head = { x: 0.4, y: 0.86, z: 0 };
      const r = 0.018;
      p.strut(crank, seat, r, PAL.bikeBlack);
      p.strut(seat, head, r, PAL.bikeBlack);
      p.strut(crank, head, r, PAL.bikeBlack);
      p.strut(crank, hubR, r, PAL.bikeBlack);
      p.strut(seat, hubR, r, PAL.bikeBlack);
      p.strut(head, hubF, r, PAL.bikeBlack);
      p.strut(head, { x: 0.36, y: 1.02, z: 0 }, r, PAL.bikeBlack);
      p.box(0.06, 0.03, 0.56, 0.34, 1.03, 0, PAL.bikeBlack); // handlebar
      p.box(0.22, 0.06, 0.12, -0.2, 0.9, 0, PAL.seatDark); // saddle
      p.box(0.34, 0.03, 0.2, -0.5, 0.72, 0, PAL.bikeBlack); // carrier over the back wheel
      p.box(0.46, 0.09, 0.008, -0.27, 0.33, 0.065, PAL.bikeBlack); // the chain guard, on its right
      wheel(0.52, 0.34, 0, 0.34, 0.035, true);
      wheel(-0.52, 0.34, 0, 0.34, 0.035, true);
      const marks: Mark[] = [{ what: "heero", x: -0.27, y: 0.33, z: 0.07, w: 0.36, h: 0.07, facing: "right" }];
      return {
        parts: p, size: [1.75, 0.55], wheels, marks,
        ride: { seat: { x: -0.2, y: 0.93 }, grip: { x: 0.33, y: 1.04, z: 0.26 }, foot: { crank: { x: crank.x, y: crank.y }, radius: 0.17, z: 0.12 }, lean: 0.3 },
      };
    }
    case "rickshaw": {
      // front: a bicycle half; back: a two-wheeled seat under a folding hood
      p.strut({ x: 0.95, y: 0.34, z: 0 }, { x: 0.8, y: 0.95, z: 0 }, 0.02, PAL.bikeBlack);
      p.strut({ x: 0.8, y: 0.95, z: 0 }, { x: 0.25, y: 0.9, z: 0 }, 0.02, PAL.bikeBlack);
      p.strut({ x: 0.25, y: 0.9, z: 0 }, { x: 0.1, y: 0.5, z: 0 }, 0.02, PAL.bikeBlack);
      p.box(0.06, 0.03, 0.5, 0.78, 1.06, 0, PAL.bikeBlack);
      p.box(0.2, 0.05, 0.12, 0.25, 0.96, 0, PAL.seatDark);
      p.box(0.9, 0.06, 1.0, -0.4, 0.55, 0, PAL.woodLight); // the carriage floor
      p.box(0.55, 0.12, 0.95, -0.45, 0.85, 0, PAL.seatDark); // passenger seat
      p.box(0.1, 0.5, 0.95, -0.72, 1.05, 0, PAL.seatDark); // backrest
      const hood = new THREE.CylinderGeometry(0.55, 0.55, 1.0, 10, 1, true, 0, Math.PI);
      hood.rotateX(Math.PI / 2);
      hood.rotateZ(Math.PI / 2);
      p.add(hood, -0.62, 1.2, 0, 0x6b2f2f); // folded hood, maroon canvas
      p.box(0.02, 0.12, 0.27, -0.855, 0.43, 0, PAL.woodLight); // the board its number plate is nailed to
      p.box(0.02, 0.09, 0.22, 0.85, 0.8, 0, PAL.woodLight); // …and the one on the front fork, for the front plate
      p.box(0.9, 0.3, 0.04, -0.4, 0.4, 0.5, PAL.scooterBlue); // painted side panels
      p.box(0.9, 0.3, 0.04, -0.4, 0.4, -0.5, PAL.scooterBlue);
      wheel(0.95, 0.34, 0, 0.34, 0.035, true);
      wheel(-0.45, 0.34, 0.55, 0.34, 0.035, true);
      wheel(-0.45, 0.34, -0.55, 0.34, 0.035, true);
      const marks: Mark[] = [
        { what: "jaiMataDi", x: -0.4, y: 0.4, z: 0.522, w: 0.86, h: 0.27, facing: "right" },
        { what: "jaiMataDi", x: -0.4, y: 0.4, z: -0.522, w: 0.86, h: 0.27, facing: "left" },
        // the tin plate, hung low at the back of the carriage (on the backrest, the folded hood hid it)
        { what: "plate", x: -0.868, y: 0.43, z: 0, w: 0.24, h: 0.09, facing: "back" },
        { what: "plate", x: 0.862, y: 0.8, z: 0, w: 0.2, h: 0.075, facing: "front" },
      ];
      return { parts: p, size: [2.0, 1.25], wheels, marks };
    }
    case "auto": {
      // the three-wheeler: black lower body, yellow canvas top
      p.box(1.9, 0.5, 1.2, -0.25, 0.55, 0, PAL.bikeBlack); // body
      p.box(0.5, 0.75, 0.9, 0.85, 0.75, 0, PAL.bikeBlack, { rz: 0.15 }); // front cowl, sloping back
      p.box(0.05, 0.5, 1.0, 0.72, 1.35, 0, PAL.glassPale, { rz: 0.2 }); // windscreen
      p.box(2.1, 0.08, 1.3, -0.2, 1.82, 0, PAL.autoYellow); // roof
      const roof = new THREE.CylinderGeometry(0.65, 0.65, 2.0, 10, 1, false, 0, Math.PI);
      roof.rotateZ(Math.PI / 2);
      roof.scale(1, 0.25, 1);
      p.add(roof, -0.2, 1.82, 0, PAL.autoYellow); // its gently curved canvas top
      for (const x of [0.6, -1.15]) for (const z of [0.6, -0.6]) p.box(0.05, 1.05, 0.05, x, 1.3, z, PAL.bikeBlack); // roof posts
      p.box(0.5, 0.12, 1.1, -0.85, 0.95, 0, PAL.seatDark); // passenger seat
      p.box(0.1, 0.55, 1.1, -1.1, 1.2, 0, PAL.seatDark);
      p.box(0.28, 0.1, 0.5, 0.35, 0.95, 0, PAL.seatDark); // driver's seat
      p.cylinder(0.09, 0.09, 0.06, 1.12, 0.95, 0, PAL.chrome, { rz: Math.PI / 2, segments: 10 }); // headlight
      p.box(0.06, 0.05, 0.7, 0.62, 1.2, 0, PAL.chrome); // handlebar
      p.box(0.05, 0.12, 1.2, 1.0, 0.45, 0, PAL.autoGreen); // a painted stripe low on the front
      wheel(1.0, 0.22, 0, 0.22, 0.12);
      wheel(-0.85, 0.22, 0.58, 0.22, 0.12);
      wheel(-0.85, 0.22, -0.58, 0.22, 0.12);
      const marks: Mark[] = [
        { what: "autoBack", x: -1.202, y: 0.66, z: 0, w: 1.0, h: 0.4, facing: "back" },
        { what: "plate", x: -1.205, y: 0.45, z: 0, w: 0.26, h: 0.1, facing: "back" },
        { what: "plate", x: 1.122, y: 0.64, z: 0, w: 0.2, h: 0.078, facing: "front", rz: 0.15 }, // on the sloping cowl
        { what: "bajaaj", x: 1.078, y: 0.935, z: 0, w: 0.26, h: 0.065, facing: "front", rz: 0.15 },
        { what: "maaKa", x: -0.45, y: 0.62, z: 0.602, w: 0.8, h: 0.14, facing: "right" },
        { what: "maaKa", x: -0.45, y: 0.62, z: -0.602, w: 0.8, h: 0.14, facing: "left" },
      ];
      return {
        parts: p, size: [2.6, 1.35], wheels, marks,
        ride: { seat: { x: 0.33, y: 1.0 }, grip: { x: 0.6, y: 1.21, z: 0.32 }, foot: { x: 0.74, y: 0.86, z: 0.13 }, lean: 0.12 },
      };
    }
  }
}

/** A wheel: a tyre, standing upright, turning about the vehicle's z axis. Thin ones are rings with spokes. */
export function addWheel(p: Parts, w: Wheel, thin = false) {
  if (thin) {
    const ring = new THREE.TorusGeometry(w.radius, w.width, 6, 20); // lies in x/y: already upright
    p.add(ring, w.x, w.y, w.z, PAL.tyre);
    for (let k = 0; k < 4; k++) p.box(w.radius * 2, 0.008, 0.008, w.x, w.y, w.z, PAL.chrome, { rz: (k * Math.PI) / 4 });
  } else {
    p.cylinder(w.radius, w.radius, w.width, w.x, w.y, w.z, PAL.tyre, { rx: Math.PI / 2, segments: 14 });
    p.cylinder(w.radius * 0.5, w.radius * 0.5, w.width + 0.01, w.x, w.y, w.z, PAL.chrome, { rx: Math.PI / 2, segments: 10 });
  }
}
