import * as THREE from "three";
import type { Person } from "./body";

/**
 * Posing a person.
 *
 * - `reach`: put a hand at a point. This is "inverse kinematics" (IK): instead
 *   of setting the shoulder and elbow angles by hand, you say where the hand
 *   should be and the angles are worked out, the way your own arm does it.
 *   With two bones (upper arm, forearm) there's an exact answer; the "pole"
 *   says which way the elbow points (down and out, like a real elbow).
 * - `plant`: the same for a leg: put an ankle on a spot (sitting, walking).
 * - `lookAt`: turn the head (and a little of the neck) toward a point, within
 *   comfortable limits.
 *
 * Points are in world coordinates. Call these after moving the person, each
 * frame, in the order: body lean → arms → head.
 *
 * Each joint is solved from the joints above it only, never from its own last
 * pose, and a result that isn't a number is thrown away (the joint goes back
 * to rest for that frame). Once, a single bad frame left a walker's arms, legs
 * and head unsolvable for good: only the shirt and the trousers' top, sliding
 * along, a ghost (the owner saw it). Now a bad frame is gone by the next.
 */

const DOWN = new THREE.Vector3(0, -1, 0); // limbs point along their joint's -y

const _s = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3();
const _aim = new THREE.Vector3(), _dir = new THREE.Vector3(), _pole = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();

/**
 * Put `side`'s hand at `target`. `pole` is a world direction the elbow should
 * point toward (it's projected onto the plane of the arm).
 */
export function reach(p: Person, side: "L" | "R", target: THREE.Vector3, pole: THREE.Vector3) {
  if (!finite(target) || !finite(pole)) return;
  twoBone(p.bone(`shoulder${side}`), p.bone(`elbow${side}`), p.bone(`hand${side}`), target, pole);
}

const _up = new THREE.Quaternion();

/**
 * Put `side`'s ankle at `target` (the same IK as an arm: hip, knee, ankle).
 * `pole` is where the knee points: forward, for sitting or walking. The foot
 * is then turned level with the ground (facing the way `root` faces), or it
 * would tilt with the shin.
 */
export function plant(p: Person, side: "L" | "R", target: THREE.Vector3, pole: THREE.Vector3) {
  if (!finite(target) || !finite(pole)) return;
  const foot = p.bone(`foot${side}`);
  twoBone(p.bone(`hip${side}`), p.bone(`knee${side}`), foot, target, pole);
  p.root.getWorldQuaternion(_up);
  foot.parent!.getWorldQuaternion(_pq);
  foot.quaternion.copy(_pq.invert().multiply(_up));
  settle(foot);
}

/**
 * The two-bone IK itself: turn `upper` (shoulder or hip) and `lower` (elbow or
 * knee) so that `end` (hand or ankle) lands on `target`.
 */
function twoBone(upperBone: THREE.Bone, lowerBone: THREE.Bone, endBone: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3) {
  upperBone.parent!.updateWorldMatrix(true, false);
  // (where the joint is, and how big the person is, both from the joint above it: never from its own last
  // pose, so a bad one can't carry over)
  _s.setFromMatrixPosition(upperBone.parent!.matrixWorld.clone().multiply(_local4.makeTranslation(upperBone.position)));
  const size = worldScale(upperBone.parent!);
  const upper = lowerBone.position.length() * size;
  const lower = endBone.position.length() * size;

  // how far away the target is, clamped to what the limb can reach
  _dir.subVectors(target, _s);
  const d = THREE.MathUtils.clamp(_dir.length(), Math.abs(upper - lower) + 1e-3, upper + lower - 1e-3);
  _dir.normalize();
  // the law of cosines gives how far along, and how far out, the elbow sits
  const cosA = (upper * upper + d * d - lower * lower) / (2 * upper * d);
  const along = upper * cosA;
  const out = upper * Math.sqrt(Math.max(0, 1 - cosA * cosA));
  _pole.copy(pole).addScaledVector(_dir, -pole.dot(_dir)).normalize();
  _e.copy(_s).addScaledVector(_dir, along).addScaledVector(_pole, out);
  _t.copy(_s).addScaledVector(_dir, d);

  // aim the upper bone at the elbow point, then the lower bone at the end point
  aimBone(upperBone, _s, _e);
  aimBone(lowerBone, _e, _t);
}

/** Turn `bone` so its -y axis points from `from` to `to` (both world points). */
function aimBone(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3) {
  _q.setFromUnitVectors(DOWN, _aim.copy(to).sub(from).normalize()); // wanted world rotation
  bone.parent!.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q)); // as a rotation relative to its parent
  settle(bone);
}

/** Keep a solved joint only if it's a real rotation; otherwise back to rest (this frame only). */
function settle(bone: THREE.Bone) {
  const q = bone.quaternion;
  if (!Number.isFinite(q.x + q.y + q.z + q.w)) q.identity();
  bone.updateWorldMatrix(false, true);
}

const finite = (v: THREE.Vector3) => Number.isFinite(v.x + v.y + v.z);
const _local4 = new THREE.Matrix4();

function worldScale(bone: THREE.Object3D): number {
  return new THREE.Vector3().setFromMatrixScale(bone.matrixWorld).x;
}

const _headPos = new THREE.Vector3(), _local = new THREE.Vector3(), _inv = new THREE.Matrix4();

/**
 * Turn the head toward `target` (world), `amount` of the way (0–1, for
 * easing in and out). Yaw is limited to ±70°, pitch to ±30°.
 */
export function lookAt(p: Person, target: THREE.Vector3, amount: number) {
  const neck = p.bone("neck"), head = p.bone("head");
  if (!finite(target)) return;
  neck.parent!.updateWorldMatrix(true, false);
  // (from the neck's base: where it is depends only on the chest, not on the neck's own last turn)
  _headPos.setFromMatrixPosition(neck.parent!.matrixWorld.clone().multiply(_local4.makeTranslation(neck.position)));
  // the target in the chest's own frame: which way is it, from where the head is?
  _inv.copy(neck.parent!.matrixWorld).invert();
  _local.copy(target).applyMatrix4(_inv).sub(_headPos.applyMatrix4(_inv));
  const yaw = THREE.MathUtils.clamp(Math.atan2(_local.x, _local.z), -1.2, 1.2) * amount;
  const pitch = THREE.MathUtils.clamp(-Math.atan2(_local.y, Math.hypot(_local.x, _local.z)), -0.5, 0.5) * amount;
  if (!Number.isFinite(yaw + pitch)) {
    neck.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    return;
  }
  neck.rotation.set(pitch * 0.35, yaw * 0.35, 0, "YXZ");
  head.rotation.set(pitch * 0.65, yaw * 0.65, 0, "YXZ");
}
