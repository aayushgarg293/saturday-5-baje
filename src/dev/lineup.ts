import type * as THREE from "three";
import { makeRng } from "../core/rng";
import { buildPerson } from "../people/body";
import { type Role, recipeFor } from "../people/recipes";
import { centreAt, pointAt } from "../world/layout";

/**
 * A dev-only line-up of people across the street, to judge clothes, faces and
 * variety before they're placed for real. Open the game with `?lineup` at the
 * end of the address (http://127.0.0.1:5180/?lineup) and walk forward.
 * They just stand there: no animation, no colliders.
 */

const ROLES: Role[] = ["uncle", "villageWoman", "shopkeeper", "woman", "schoolboy", "youngMan", "uncle", "kid", "halwai"];

export function addLineup(scene: THREE.Scene, s = 30) {
  const rng = makeRng(5);
  const heading = centreAt(s).heading;
  ROLES.forEach((role, i) => {
    const person = buildPerson(recipeFor(role, rng));
    const at = pointAt(s, -2.4 + i * 0.6);
    person.root.position.set(at.x, 0, at.z);
    person.root.rotation.y = -heading; // face back down the street, toward the player
    scene.add(person.root);
  });
}
