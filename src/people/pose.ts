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
 * - `lookAt`: turn the head (and a little of the neck) toward a point, within
 *   comfortable limits.
 *
 * Points are in world coordinates. Call these after moving the person, each
 * frame, in the order: body lean → arms → head.
 */

const DOWN = new THREE.Vector3(0, -1, 0); // limbs point along their joint's -y

const _s = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3();
const _aim = new THREE.Vector3(), _dir = new THREE.Vector3(), _pole = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();

/**
 * Put `side`'s hand at `target`. `pole` is a world direction the elbow should
 * point toward (it's projected onto the plane of the arm).
 */
export function reach(p: Person, side: "L" | "R", target: THREE.Vector3, pole: THREE.Vector3) {
  const shoulder = p.bone(`shoulder${side}`), elbow = p.bone(`elbow${side}`), hand = p.bone(`hand${side}`);
  shoulder.parent!.updateWorldMatrix(true, false);
  shoulder.getWorldPosition(_s);
  const upper = elbow.position.length() * worldScale(shoulder);
  const lower = hand.position.length() * worldScale(shoulder);

  // how far away the target is, clamped to what the arm can reach
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

  // aim the upper arm at the elbow point, then the forearm at the hand point
  aimBone(shoulder, _s, _e);
  aimBone(elbow, _e, _t);
}

/** Turn `bone` so its -y axis points from `from` to `to` (both world points). */
function aimBone(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3) {
  _q.setFromUnitVectors(DOWN, _aim.copy(to).sub(from).normalize()); // wanted world rotation
  bone.parent!.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q)); // as a rotation relative to its parent
  bone.updateWorldMatrix(false, true);
}

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
  neck.parent!.updateWorldMatrix(true, false);
  head.getWorldPosition(_headPos);
  // the target in the chest's own frame: which way is it, from where the head is?
  _inv.copy(neck.parent!.matrixWorld).invert();
  _local.copy(target).applyMatrix4(_inv).sub(_headPos.applyMatrix4(_inv));
  const yaw = THREE.MathUtils.clamp(Math.atan2(_local.x, _local.z), -1.2, 1.2) * amount;
  const pitch = THREE.MathUtils.clamp(-Math.atan2(_local.y, Math.hypot(_local.x, _local.z)), -0.5, 0.5) * amount;
  neck.rotation.set(pitch * 0.35, yaw * 0.35, 0, "YXZ");
  head.rotation.set(pitch * 0.65, yaw * 0.65, 0, "YXZ");
}
