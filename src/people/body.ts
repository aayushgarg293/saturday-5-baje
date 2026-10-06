import * as THREE from "three";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import { type HairStyle, type Kit, type Outfit, coverage, dress, hair } from "./clothes";
import { type Face, type FaceRecipe, faceMesh } from "./face";
import { type Build, J, type JointName, makeBones, restPosition } from "./skeleton";

/**
 * Builds a person from a recipe: body, head, hair and clothes, each part
 * following a joint of the skeleton, all merged into ONE skinned mesh
 * (one draw call), plus the painted face on its own thin shell.
 *
 * Bodies are simple rounded shapes, smoothly cel-shaded: stylised the way
 * background characters in a Ghibli film are, readable at a few metres.
 * Clothing is in clothes.ts. Frame: facing +z, +x is the person's left,
 * origin on the ground.
 */

export type { Outfit };

export type PersonRecipe = {
  /** Shapes the body: a woman's is narrower at the shoulders, wider at the hips; a child's head is bigger for its size. */
  body: "man" | "woman" | "child";
  build: Build;
  skin: number;
  hair: HairStyle;
  hairColour: number;
  face: FaceRecipe;
  outfit: Outfit;
};

export type Person = {
  /** The person: add this to the scene and move/turn it to place them. */
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  bones: THREE.Bone[];
  /** A bone by name, for posing. */
  bone(name: JointName): THREE.Bone;
  /** Change the face's expression. */
  face: Face;
  /** Height scale (1 = an adult man of about 1.68 m). */
  scale: number;
};

const HEAD_R = 0.122; // a touch large, for the stylised look

export function buildPerson(r: PersonRecipe): Person {
  const { scale: k, girth: g } = r.build;
  const bones = makeBones(r.build);
  const at = (j: JointName) => restPosition(bones, j);
  const p = new Parts();
  const skin = r.skin;
  const cover = coverage(r.outfit, skin);
  const woman = r.body === "woman";
  const headSize = r.body === "child" ? 1.2 : 1;

  const limb: Kit["limb"] = (from, to, rTop, rBottom, colour, fraction = 1) => {
    p.setJoint(J[from]);
    const a = at(from), b = at(to);
    const end = a.clone().lerp(b, fraction);
    const len = a.distanceTo(end);
    p.add(new THREE.CylinderGeometry(rTop * k, rBottom * k, len, 12), (a.x + end.x) / 2, (a.y + end.y) / 2, (a.z + end.z) / 2, colour);
  };
  const blob: Kit["blob"] = (j, r0, x, y, z, sx, sy, sz, colour) => {
    p.setJoint(J[j]);
    p.add(new THREE.SphereGeometry(r0 * k, 14, 10).scale(sx, sy, sz), x, y, z, colour);
  };

  const hips = at("hips"), spine = at("spine"), chest = at("chest");

  // --- torso ---------------------------------------------------------------------
  blob("hips", 0.15, 0, hips.y - 0.01 * k, 0, (woman ? 1.22 : 1.1) * g, 0.82, 0.84, cover.hips);
  p.setJoint(J.spine);
  p.add(new THREE.CylinderGeometry((woman ? 0.125 : 0.14) * k * g, (woman ? 0.16 : 0.15) * k * g, spine.distanceTo(chest) + 0.04, 14).scale(1, 1, 0.74),
    0, (spine.y + chest.y) / 2, 0, cover.midriff);
  // the chest widens toward the shoulders, and its top is rounded off, not a flat lid
  p.setJoint(J.chest);
  p.add(new THREE.CylinderGeometry(0.175 * k * g, 0.14 * k * g, 0.24 * k, 16).scale(1, 1, 0.66), 0, chest.y + 0.09 * k, 0, cover.chest);
  p.add(new THREE.SphereGeometry(0.175 * k * g, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.34, 0.66), 0, chest.y + 0.21 * k, 0, cover.yoke);
  if (woman) blob("chest", 0.1, 0, chest.y + 0.1 * k, 0.07 * k, 1.35 * g, 0.75, 0.6, cover.chest); // the bust, gently
  if (r.outfit.top === "vest") blob("chest", 0.08, 0, chest.y + 0.19 * k, 0.07 * k, 1.4 * g, 0.55, 0.5, skin); // vest neckline
  if (r.outfit.top === "choli") blob("chest", 0.07, 0, chest.y + 0.2 * k, 0.07 * k, 1.5 * g, 0.5, 0.5, skin); // choli neckline
  for (const side of ["L", "R"] as const) {
    const s = at(`shoulder${side}`);
    blob("chest", 0.058, s.x * 0.96, s.y - 0.02 * k, 0, 1, 0.9, 0.95, cover.sleeve === "none" ? skin : cover.sleeveColour);
  }

  // --- neck and head --------------------------------------------------------------------
  limb("neck", "head", 0.05, 0.055, skin);
  const headR = HEAD_R * k * headSize;
  const headCentre = at("head").add(new THREE.Vector3(0, 0.1 * k * headSize, 0.005));
  const headScale = new THREE.Vector3(woman ? 0.87 : 0.9, 1.06, 0.97);
  p.setJoint(J.head);
  p.add(new THREE.SphereGeometry(headR, 20, 16).scale(headScale.x, headScale.y, headScale.z), headCentre.x, headCentre.y, headCentre.z, skin);
  p.add(new THREE.SphereGeometry(0.022 * k * headSize, 8, 6).scale(0.8, 1.1, 1.3), 0, headCentre.y - 0.02 * k, headCentre.z + headR * 0.95, skin); // nose
  for (const s of [-1, 1]) {
    p.add(new THREE.SphereGeometry(0.026 * k * headSize, 8, 6).scale(0.5, 1.2, 0.9), s * headR * 0.9, headCentre.y - 0.01 * k, -0.005, skin); // ears
  }

  const kit: Kit = { p, k, g, skin, at, limb, blob, head: { centre: headCentre, scale: headScale, radius: headR } };
  hair(kit, r.hair, r.hairColour);

  // --- arms ---------------------------------------------------------------------------------
  for (const side of ["L", "R"] as const) {
    const sl = cover.sleeve, cloth = cover.sleeveColour;
    // upper arm: covered to the sleeve's length, bare below it
    const covered = sl === "none" ? 0 : sl === "short" ? 0.35 : sl === "half" ? 0.75 : 1;
    if (covered > 0) limb(`shoulder${side}`, `elbow${side}`, 0.054, 0.049, cloth, covered);
    limb(`shoulder${side}`, `elbow${side}`, 0.048, 0.042, skin);
    if (sl === "rolled") {
      const e = at(`elbow${side}`);
      blob(`shoulder${side}`, 0.052, e.x, e.y + 0.05 * k, e.z, 1, 0.6, 1, cloth); // the roll just above the elbow
    }
    const forearm = sl === "full" ? cloth : skin;
    limb(`elbow${side}`, `hand${side}`, sl === "full" ? 0.046 : 0.042, sl === "full" ? 0.04 : 0.034, forearm);
    blob(`elbow${side}`, 0.043, at(`elbow${side}`).x, at(`elbow${side}`).y, 0, 1, 1, 1, forearm);
    const h = at(`hand${side}`);
    blob(`hand${side}`, 0.045, h.x, h.y - 0.055 * k, 0.005, 0.72, 1.25, 0.5, skin);
  }

  // --- legs and feet ---------------------------------------------------------------------------
  for (const side of ["L", "R"] as const) {
    const loose = cover.loose;
    limb(`hip${side}`, `knee${side}`, 0.072 * loose, 0.06 * loose, cover.thighs);
    limb(`knee${side}`, `foot${side}`, 0.058 * loose, 0.048 * loose, cover.shins);
    blob(`knee${side}`, 0.06 * loose, at(`knee${side}`).x, at(`knee${side}`).y, 0, 1, 1, 1, cover.knees);
    const f = at(`foot${side}`);
    blob(`foot${side}`, 0.046, f.x, f.y - 0.035 * k, 0.05 * k, 0.9, 0.6, 2.1, cover.feet);
    if (r.outfit.feet === "chappals") {
      p.setJoint(J[`foot${side}`]);
      p.box(0.09 * k, 0.018, 0.25 * k, f.x, 0.01, 0.045 * k, PAL.chappal);
    }
  }

  dress(kit, r.outfit);

  // --- merge into one skinned mesh ----------------------------------------------------------------
  const material = toon({ color: 0xffffff, vertexColors: true, flatShading: false });
  const mesh = new THREE.SkinnedMesh(p.geometry(), material);
  mesh.name = "person";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  // What the renderer checks to skip people out of view: a sphere round them. Three.js would
  // work it out once, from whatever pose the body happens to be in at that moment, and never
  // again: if that was a bad moment, the body was skipped when it was in view and only the
  // face (a separate mesh, with its own sphere) was drawn: a walking head. So: a fixed sphere,
  // big enough for any pose (standing, sitting up high, arms raised, bent over).
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95 * k, 0), 1.35 * k);

  // the face shell rides on the head joint
  const face = faceMesh(r.face, headR);
  face.mesh.scale.copy(headScale);
  face.mesh.position.copy(bones[J.head].worldToLocal(headCentre.clone()));
  bones[J.head].add(face.mesh);

  const root = new THREE.Group();
  root.add(mesh);
  return { root, mesh, bones, bone: (name) => bones[J[name]], face, scale: k };
}
