import type { Errand } from "../core/errands";
import type { Actor } from "./actor";

/** Who hands over each of Mummy's errands (activities/handOver.ts): each is put here where they're built. */
export const givers = new Map<Errand, Actor>();
