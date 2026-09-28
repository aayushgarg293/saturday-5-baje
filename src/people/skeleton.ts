import * as THREE from "three";

/**
 * A person's skeleton: the joints, and where they sit when standing straight.
 *
 * Every body part follows one joint (see `Parts.setJoint`); turning a joint
 * turns everything below it, like a real limb. Frame: the person faces +z,
 * y is up, +x is their LEFT (seen from the front, it's on your right), and
 * the origin is on the ground between their feet.
 *
 *              head
 *              neck
 *   shoulderR ─chest─ shoulderL
 *     elbowR   spine   elbowL
 *     handR    hips    handL
 *          hipR   hipL
 *          kneeR  kneeL
 *          footR  footL
 *
 * Arms hang straight down at rest, and each limb points along its joint's -y.
 */

export const JOINTS = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "elbowL", "handL",
  "shoulderR", "elbowR", "handR",
  "hipL", "kneeL", "footL",
  "hipR", "kneeR", "footR",
] as const;
export type JointName = (typeof JOINTS)[number];
export const J = Object.fromEntries(JOINTS.map((n, i) => [n, i])) as Record<JointName, number>;

/** Body measurements, metres. Scaled per person (`scale`). */
export type Build = {
  /** Overall height multiplier: 1 = about 1.68 m. */
  scale: number;
  /** Width multiplier for the torso (lean 0.9, stocky 1.15). */
  girth: number;
};

/** Each joint's parent, and its position relative to that parent (for scale 1). */
const REST: Record<JointName, { parent: JointName | null; at: [number, number, number] }> = {
  hips: { parent: null, at: [0, 0.94, 0] },
  spine: { parent: "hips", at: [0, 0.12, 0] },
  chest: { parent: "spine", at: [0, 0.2, 0] },
  neck: { parent: "chest", at: [0, 0.2, 0] },
  head: { parent: "neck", at: [0, 0.09, 0.01] },
  shoulderL: { parent: "chest", at: [0.19, 0.13, 0] },
  elbowL: { parent: "shoulderL", at: [0, -0.28, 0] },
  handL: { parent: "elbowL", at: [0, -0.25, 0] },
  shoulderR: { parent: "chest", at: [-0.19, 0.13, 0] },
  elbowR: { parent: "shoulderR", at: [0, -0.28, 0] },
  handR: { parent: "elbowR", at: [0, -0.25, 0] },
  hipL: { parent: "hips", at: [0.095, -0.04, 0] },
  kneeL: { parent: "hipL", at: [0, -0.42, 0] },
  footL: { parent: "kneeL", at: [0, -0.42, 0] },
  hipR: { parent: "hips", at: [-0.095, -0.04, 0] },
  kneeR: { parent: "hipR", at: [0, -0.42, 0] },
  footR: { parent: "kneeR", at: [0, -0.42, 0] },
};

/** Make the bones for a person of this build. The first bone (hips) is the root. */
export function makeBones(build: Build): THREE.Bone[] {
  const bones = JOINTS.map((name) => {
    const b = new THREE.Bone();
    b.name = name;
    const [x, y, z] = REST[name].at;
    // shoulders sit wider on a stockier torso; everything scales with height
    const wide = name.startsWith("shoulder") ? build.girth : 1;
    b.position.set(x * build.scale * wide, y * build.scale, z * build.scale);
    return b;
  });
  JOINTS.forEach((name, i) => {
    const parent = REST[name].parent;
    if (parent) bones[J[parent]].add(bones[i]);
  });
  bones[0].updateMatrixWorld(true);
  return bones;
}

/** Where a joint is when standing straight (its rest position in the body's frame). */
export function restPosition(bones: THREE.Bone[], joint: JointName): THREE.Vector3 {
  return bones[J[joint]].getWorldPosition(new THREE.Vector3());
}
