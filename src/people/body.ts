import * as THREE from "three";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { Parts } from "../world/kit";
import { type Face, type FaceRecipe, faceMesh } from "./face";
import { type Build, J, type JointName, makeBones, restPosition } from "./skeleton";

/**
 * Builds a person from a recipe: body, head, hair and clothes, each part
 * following a joint of the skeleton, all merged into ONE skinned mesh
 * (one draw call), plus the painted face on its own thin shell.
 *
 * Bodies are simple rounded shapes, smoothly cel-shaded: stylised the way
 * background characters in a Ghibli film are, readable at a few metres.
 * Frame: facing +z, +x is the person's left, origin on the ground.
 */

export type Outfit = {
  /** Upper body: a sleeveless vest (baniyan), a shirt with rolled sleeves, a long kurta. */
  top: "vest" | "shirt" | "kurta";
  topColour: number;
  /** Lower body: a loose dhoti, pyjama, or trousers. */
  bottom: "dhoti" | "pyjama" | "trousers";
  bottomColour: number;
  /** A checked towel over the left shoulder. */
  gamchha?: boolean;
  feet: "chappals" | "shoes";
};

export type PersonRecipe = {
  build: Build;
  skin: number;
  hair: "short" | "receding";
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
};

const HEAD_R = 0.122; // a touch large, for the stylised look

export function buildPerson(r: PersonRecipe): Person {
  const { scale: k, girth: g } = r.build;
  const bones = makeBones(r.build);
  const at = (j: JointName) => restPosition(bones, j);
  const p = new Parts();
  const skin = r.skin;
  const o = r.outfit;

  /** A tapering limb segment from joint `from` to joint `to`, on joint `from`. */
  const limb = (from: JointName, to: JointName, rTop: number, rBottom: number, colour: number) => {
    p.setJoint(J[from]);
    const a = at(from), b = at(to);
    const len = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(rTop * k, rBottom * k, len, 12);
    p.add(geo, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, colour);
  };
  /** A rounded lump (a joint, a hand, a hip) on joint `j`. */
  const blob = (j: JointName, r0: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, colour: number) => {
    p.setJoint(J[j]);
    p.add(new THREE.SphereGeometry(r0 * k, 14, 10).scale(sx, sy, sz), x, y, z, colour);
  };

  const hips = at("hips"), spine = at("spine"), chest = at("chest");
  const top = o.topColour, bottom = o.bottomColour;
  const armColour = o.top === "vest" ? skin : top;

  // --- torso ---------------------------------------------------------------------
  blob("hips", 0.15, 0, hips.y - 0.01 * k, 0, 1.1 * g, 0.8, 0.82, o.top === "kurta" ? top : bottom);
  p.setJoint(J.spine);
  p.add(new THREE.CylinderGeometry(0.14 * k * g, 0.15 * k * g, spine.distanceTo(chest) + 0.04, 14).scale(1, 1, 0.74),
    0, (spine.y + chest.y) / 2, 0, top);
  // the chest widens toward the shoulders, and its top is rounded off, not a flat lid
  p.setJoint(J.chest);
  p.add(new THREE.CylinderGeometry(0.175 * k * g, 0.14 * k * g, 0.24 * k, 16).scale(1, 1, 0.66), 0, chest.y + 0.09 * k, 0, top);
  // (a sleeveless vest leaves the top of the shoulders and chest bare: skin there)
  const yoke = o.top === "vest" ? skin : top;
  p.add(new THREE.SphereGeometry(0.175 * k * g, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.34, 0.66), 0, chest.y + 0.21 * k, 0, yoke);
  // a sleeveless vest leaves the upper chest and shoulders bare
  if (o.top === "vest") {
    // the vest's scooped neckline (straps over the shoulders were tried: at
    // this size they floated above the body like two white slivers)
    blob("chest", 0.08, 0, chest.y + 0.19 * k, 0.07 * k, 1.4 * g, 0.55, 0.5, skin);
  }
  for (const side of ["L", "R"] as const) {
    const s = at(`shoulder${side}`);
    blob("chest", 0.068, s.x, s.y - 0.015 * k, 0, 1, 0.95, 1, armColour); // the shoulder's round
  }
  if (o.top === "kurta") {
    // the kurta hangs to the knees, loose over the hips
    p.setJoint(J.hips);
    p.add(new THREE.CylinderGeometry(0.165 * k * g, 0.2 * k * g, 0.42 * k, 14).scale(1, 1, 0.78), 0, hips.y - 0.2 * k, 0, top);
  }

  // --- neck and head --------------------------------------------------------------------
  limb("neck", "head", 0.05, 0.055, skin);
  const headCentre = at("head").add(new THREE.Vector3(0, 0.1 * k, 0.005));
  const headScale = new THREE.Vector3(0.9, 1.06, 0.97);
  p.setJoint(J.head);
  p.add(new THREE.SphereGeometry(HEAD_R * k, 20, 16).scale(headScale.x, headScale.y, headScale.z), headCentre.x, headCentre.y, headCentre.z, skin);
  p.add(new THREE.SphereGeometry(0.022 * k, 8, 6).scale(0.8, 1.1, 1.3), 0, headCentre.y - 0.02 * k, headCentre.z + HEAD_R * k * 0.95, skin); // nose
  for (const s of [-1, 1]) {
    p.add(new THREE.SphereGeometry(0.026 * k, 8, 6).scale(0.5, 1.2, 0.9), s * HEAD_R * k * 0.9, headCentre.y - 0.01 * k, -0.005, skin); // ears
  }
  hair(p, r, headCentre, headScale, k);

  // --- arms ---------------------------------------------------------------------------------
  for (const side of ["L", "R"] as const) {
    const sleeve = o.top === "vest" ? skin : top;
    limb(`shoulder${side}`, `elbow${side}`, 0.05, 0.043, sleeve);
    if (o.top === "shirt") {
      // rolled-up sleeves: the cuff of the roll just above the elbow
      const e = at(`elbow${side}`);
      blob(`shoulder${side}`, 0.052, e.x, e.y + 0.05 * k, e.z, 1, 0.6, 1, top);
    }
    const forearm = o.top === "kurta" ? top : skin;
    limb(`elbow${side}`, `hand${side}`, 0.042, 0.034, forearm);
    blob(`elbow${side}`, 0.043, at(`elbow${side}`).x, at(`elbow${side}`).y, 0, 1, 1, 1, forearm);
    const h = at(`hand${side}`);
    blob(`hand${side}`, 0.045, h.x, h.y - 0.055 * k, 0.005, 0.72, 1.25, 0.5, skin);
  }

  // --- legs and feet ---------------------------------------------------------------------------
  for (const side of ["L", "R"] as const) {
    const loose = o.bottom === "dhoti" ? 1.45 : o.bottom === "pyjama" ? 1.25 : 1.05;
    limb(`hip${side}`, `knee${side}`, 0.072 * loose, 0.06 * loose, bottom);
    limb(`knee${side}`, `foot${side}`, 0.058 * loose, 0.048 * loose, bottom);
    blob(`knee${side}`, 0.06 * loose, at(`knee${side}`).x, at(`knee${side}`).y, 0, 1, 1, 1, bottom);
    const f = at(`foot${side}`);
    blob(`foot${side}`, 0.046, f.x, f.y - 0.035 * k, 0.05 * k, 0.9, 0.6, 2.1, o.feet === "chappals" ? skin : PAL.chappal);
    if (o.feet === "chappals") {
      p.setJoint(J[`foot${side}`]);
      p.box(0.09 * k, 0.018, 0.25 * k, f.x, 0.01, 0.045 * k, PAL.chappal);
    }
  }
  if (o.bottom === "dhoti") {
    // the dhoti's folds: a wrap round the waist and a loose drape between the legs
    blob("hips", 0.16, 0, hips.y - 0.12 * k, 0.02, 1.15 * g, 0.9, 0.9, bottom);
  }

  // --- the gamchha over the left shoulder: red and white stripes, front and back ----------------
  if (o.gamchha) {
    const sh = at("shoulderL");
    const x0 = sh.x * 0.55; // over the collarbone, between neck and shoulder
    p.setJoint(J.chest);
    for (let i = 0; i < 4; i++) {
      const x = x0 - 0.05 * k + i * 0.033 * k;
      const colour = i % 2 ? PAL.boardWhite : PAL.gamchhaRed;
      p.box(0.033 * k, 0.32 * k, 0.012, x, sh.y - 0.13 * k, 0.118 * k * g, colour, { rx: -0.12 }); // down the front
      p.box(0.033 * k, 0.28 * k, 0.012, x, sh.y - 0.11 * k, -0.118 * k * g, colour, { rx: 0.12 }); // down the back
    }
    p.add(new THREE.CylinderGeometry(0.075 * k, 0.075 * k, 0.14 * k, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2),
      x0, sh.y + 0.02 * k, 0, PAL.gamchhaRed); // folded over the top
  }

  // --- merge into one skinned mesh ----------------------------------------------------------------
  const material = toon({ color: 0xffffff, vertexColors: true, flatShading: false });
  const mesh = new THREE.SkinnedMesh(p.geometry(), material);
  mesh.name = "person";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));

  // the face shell rides on the head joint
  const face = faceMesh(r.face, HEAD_R * k);
  face.mesh.scale.copy(headScale);
  face.mesh.position.copy(bones[J.head].worldToLocal(headCentre.clone()));
  bones[J.head].add(face.mesh);

  const root = new THREE.Group();
  root.add(mesh);
  return { root, mesh, bones, bone: (name) => bones[J[name]], face };
}

/** Short, oiled, side-parted hair: a cap over the top and back, and a fringe of it at the nape. */
function hair(p: Parts, r: PersonRecipe, centre: THREE.Vector3, sc: THREE.Vector3, k: number) {
  p.setJoint(J.head);
  const rad = HEAD_R * k * 1.05;
  // over the top: from the crown down to the hairline (lower at the back than the front)
  const cap = new THREE.SphereGeometry(rad, 22, 12, 0, Math.PI * 2, 0, r.hair === "receding" ? 0.95 : 1.2);
  cap.scale(sc.x, sc.y, sc.z);
  cap.rotateX(-0.25); // tipped back: the hairline sits higher at the forehead
  p.add(cap, centre.x, centre.y + 0.005, centre.z, r.hairColour);
  // the back of the head, down to the nape
  const back = new THREE.SphereGeometry(rad * 0.99, 16, 10, Math.PI * 1.15, Math.PI * 0.7, 1.0, 0.95);
  back.scale(sc.x, sc.y, sc.z);
  p.add(back, centre.x, centre.y, centre.z, r.hairColour);
  // (no grey patches at the temples: from the street they read as headphones)
}
