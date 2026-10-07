import type * as THREE from "three";

/**
 * Everyone moving about who isn't one of the town's walkers
 * (people/townWalkers.ts), but whom the town's traffic should stop for too
 * (world/townTraffic.ts): the tuition kids going home, the 6:30's
 * passengers. Each place registers a function giving where its people are,
 * in world terms.
 */

const sources: (() => readonly THREE.Vector3[])[] = [];

export const passersby = {
  register: (where: () => readonly THREE.Vector3[]) => sources.push(where),
  all: (): THREE.Vector3[] => sources.flatMap((f) => f()),
};
