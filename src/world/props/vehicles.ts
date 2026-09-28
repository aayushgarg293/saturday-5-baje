import * as THREE from "three";
import type { Rng } from "../../core/rng";
import { PAL } from "../../render/palette";
import { Parts } from "../kit";

/**
 * The street's vehicles, from the period: a Chetak-style scooter, a
 * commuter motorcycle, a black roadster bicycle, a cycle-rickshaw and an
 * auto-rickshaw. Stylised from simple parts, like everything else.
 *
 * Frame: +x is forward (the nose), y up, +z the vehicle's left, origin on
 * the ground under the middle.
 *
 * Parked vehicles have their wheels merged in; moving ones (world/traffic.ts)
 * get their wheels back as a list, so they can be separate meshes that spin.
 */

export type Wheel = { x: number; y: number; z: number; radius: number; width: number };

export type Vehicle = {
  parts: Parts;
  /** Footprint for colliders: length (x) and width (z). */
  size: [number, number];
  /** Wheels not merged into `parts` (only when asked for). */
  wheels: Wheel[];
  /** Where a rider's (or driver's) seat is, for the placeholder figure. */
  seat: { x: number; y: number };
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
      return { parts: p, size: [1.5, 0.7], wheels, seat: { x: -0.3, y: 0.95 } };
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
      wheel(0.62, 0.31, 0, 0.31, 0.09);
      wheel(-0.65, 0.31, 0, 0.31, 0.09);
      return { parts: p, size: [1.95, 0.75], wheels, seat: { x: -0.4, y: 0.86 } };
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
      wheel(0.52, 0.34, 0, 0.34, 0.035, true);
      wheel(-0.52, 0.34, 0, 0.34, 0.035, true);
      return { parts: p, size: [1.75, 0.55], wheels, seat: { x: -0.2, y: 0.92 } };
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
      p.box(0.9, 0.3, 0.04, -0.4, 0.4, 0.5, PAL.scooterBlue); // painted side panels
      p.box(0.9, 0.3, 0.04, -0.4, 0.4, -0.5, PAL.scooterBlue);
      wheel(0.95, 0.34, 0, 0.34, 0.035, true);
      wheel(-0.45, 0.34, 0.55, 0.34, 0.035, true);
      wheel(-0.45, 0.34, -0.55, 0.34, 0.035, true);
      return { parts: p, size: [2.0, 1.25], wheels, seat: { x: 0.25, y: 1.0 } };
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
      return { parts: p, size: [2.6, 1.35], wheels, seat: { x: 0.35, y: 1.0 } };
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

/**
 * A placeholder rider: a body and a head, sitting on the seat. Phase 5
 * replaces these with the proper stylised people.
 */
export function addRider(p: Parts, seat: { x: number; y: number }, rng: Rng) {
  const shirt = rng.pick([0xe9e2d0, 0x6f8fb3, 0xc9563f, 0x8c9a6a]);
  p.box(0.28, 0.55, 0.36, seat.x, seat.y + 0.32, 0, shirt);
  p.add(new THREE.SphereGeometry(0.12, 10, 8), seat.x + 0.02, seat.y + 0.72, 0, 0x8a5a3c);
  p.strut({ x: seat.x + 0.05, y: seat.y + 0.5, z: 0.16 }, { x: seat.x + 0.55, y: seat.y + 0.1, z: 0.22 }, 0.045, shirt); // arms to the bars
  p.strut({ x: seat.x + 0.05, y: seat.y + 0.5, z: -0.16 }, { x: seat.x + 0.55, y: seat.y + 0.1, z: -0.22 }, 0.045, shirt);
  p.strut({ x: seat.x, y: seat.y + 0.05, z: 0.12 }, { x: seat.x + 0.3, y: 0.25, z: 0.14 }, 0.06, 0x4a4540); // legs
  p.strut({ x: seat.x, y: seat.y + 0.05, z: -0.12 }, { x: seat.x + 0.3, y: 0.25, z: -0.14 }, 0.06, 0x4a4540);
}
