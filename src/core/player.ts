import * as THREE from "three";
import { type Box, pushOut } from "./colliders";
import { type Patch, groundAt } from "./floors";
import type { Input } from "./input";

/**
 * The first-person walker: a 15–16-year-old boy on foot.
 *
 * Each frame it reads the keys and the mouse, moves, bumps against walls,
 * and puts the camera at his eyes. Simplified from
 * ../sakura-crossing/src/core/player.js (flat ground, no vehicles, no
 * interactions yet).
 *
 * The ground is the flat street, except where a floor patch says otherwise
 * (core/floors.ts): the cafe's staircase and its first floor. His feet ease
 * up and down to the ground's height, so climbing the stairs feels like
 * climbing, not like being lifted.
 */

/** Eye height above the ground, in metres. */
const EYE_HEIGHT = 1.55;
/** Body radius for collisions: how close he can get to a wall. */
const RADIUS = 0.3;
/** Walking and faster-walking speeds, metres per second. */
const WALK_SPEED = 2.0;
// (raised to 10 while building, so the cafe is quick to reach for testing;
// bring it back to about 3.6 for the finished game: see TASKS.md)
const FAST_SPEED = 10;
/**
 * How quickly speed catches up with the keys. Higher is snappier. Stopping is
 * a little quicker than starting, which feels natural on foot.
 */
const ACCELERATION = 10;
const DECELERATION = 14;
/** Mouse sensitivity: radians of turn per pixel of mouse movement. */
const MOUSE_SENSITIVITY = 0.0022;
/** How far he can look down / up, in radians (about 66° / 60°). */
const PITCH_MIN = -1.15;
const PITCH_MAX = 1.05;
/** Head bob: how far the eyes dip per step, and steps per metre walked. */
const BOB_HEIGHT = 0.03;
const BOB_STEPS_PER_METRE = 1.4;
/** Longest single movement step. Bigger moves are split so fast walking can't skip through a thin wall. */
const MAX_SUBSTEP = 0.15;
/** How quickly his feet follow the ground's height (higher: snappier). */
const CLIMB_RATE = 12;

export class Player {
  /** Position of his feet (y: 0 on the street, higher on the stairs and upstairs). */
  readonly pos = new THREE.Vector3();
  /** Direction he faces: yaw turns left/right, pitch looks up/down (radians). */
  yaw = 0;
  pitch = 0;
  /**
   * The height of the floor under him (his feet ease toward it). Steps up
   * are judged from this, not from his feet: running up the stairs, the
   * eased feet trail behind the slope, and judged from them the next step
   * would look too high to climb.
   */
  private ground = 0;
  /** Current velocity, metres per second. */
  private readonly vel = new THREE.Vector3();
  /** Distance walked, used to time the head bob. */
  private walked = 0;

  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    /** Everything the player can bump into (read by dev tools too). */
    readonly colliders: readonly Box[],
    /** Where the ground isn't the street: stairs, upper floors. */
    readonly floors: readonly Patch[] = [],
  ) {
    // Yaw first, then pitch: turn the head sideways, then tilt it. The other
    // order makes the horizon roll when you look up and turn.
    camera.rotation.order = "YXZ";
  }

  /** Put him somewhere, facing a direction, standing still. */
  place(x: number, z: number, yaw: number, pitch = 0, y?: number) {
    // (`y`: which floor, if it's not the street; he's put on the ground below that)
    this.pos.set(x, 0, z);
    this.ground = this.pos.y = groundAt(this.floors, x, z, y ?? 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0, 0);
    this.walked = 0;
    this.applyCamera();
  }

  update(dt: number) {
    const input = this.input;

    // --- look --------------------------------------------------------------
    const { dx, dy } = input.takeMouseMovement();
    this.yaw -= dx * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE_SENSITIVITY, PITCH_MIN, PITCH_MAX);

    // --- which way do the keys ask to go? ------------------------------------
    let ahead = 0;
    let side = 0;
    if (input.locked) {
      if (input.isDown("KeyW", "ArrowUp")) ahead += 1;
      if (input.isDown("KeyS", "ArrowDown")) ahead -= 1;
      if (input.isDown("KeyD", "ArrowRight")) side += 1;
      if (input.isDown("KeyA", "ArrowLeft")) side -= 1;
    }
    const speed = input.isDown("ShiftLeft", "ShiftRight") ? FAST_SPEED : WALK_SPEED;

    // "Forward" and "right" along the ground, from the way he's facing.
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.wish.set(0, 0, 0).addScaledVector(this.forward, ahead).addScaledVector(this.right, side);
    // Normalise so walking diagonally isn't faster than walking straight.
    if (this.wish.lengthSq() > 0) this.wish.normalize().multiplyScalar(speed);

    // --- ease the velocity toward that --------------------------------------
    // Moving a fixed fraction of the way each frame, scaled by time, gives a
    // smooth start and stop that doesn't depend on the frame rate.
    const rate = this.wish.lengthSq() > 0 ? ACCELERATION : DECELERATION;
    const blend = 1 - Math.exp(-rate * dt);
    this.vel.lerp(this.wish, blend);

    // --- move, then bump out of walls ---------------------------------------
    const stepX = this.vel.x * dt;
    const stepZ = this.vel.z * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepZ)) / MAX_SUBSTEP));
    const startX = this.pos.x;
    const startZ = this.pos.z;
    for (let i = 0; i < steps; i++) {
      // One axis at a time: walking diagonally into a wall then slides along
      // it instead of sticking.
      this.pos.x += stepX / steps;
      pushOut(this.pos, RADIUS, this.colliders, this.pos.y);
      this.pos.z += stepZ / steps;
      pushOut(this.pos, RADIUS, this.colliders, this.pos.y);
    }

    // --- up or down to the ground under him ---------------------------------
    this.ground = groundAt(this.floors, this.pos.x, this.pos.z, this.ground);
    this.pos.y += (this.ground - this.pos.y) * (1 - Math.exp(-CLIMB_RATE * dt));

    // Head bob follows the distance actually moved (so pressing into a wall
    // doesn't bob in place).
    this.walked += Math.hypot(this.pos.x - startX, this.pos.z - startZ);
    this.applyCamera();
  }

  private applyCamera() {
    const bob = Math.sin(this.walked * BOB_STEPS_PER_METRE * Math.PI) * BOB_HEIGHT;
    // abs() makes the dip happen once per footstep rather than once per two
    this.camera.position.set(this.pos.x, this.pos.y + EYE_HEIGHT - Math.abs(bob), this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
