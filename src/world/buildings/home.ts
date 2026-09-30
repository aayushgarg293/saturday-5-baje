import { PAL } from "../../render/palette";
import type { BuildContext, BuildResult } from "./common";
import { buildHouse } from "./house";

/**
 * His home: the house across the street's south end, right behind where the
 * walk begins. It's built exactly as the plain house it is (the same random
 * choices, so nothing else on the street changes), plus what makes it home
 * in the evening: a bulb over the door, a window that's always lit, and the
 * small painted blessing above the door that homes have.
 */
export function buildHome(c: BuildContext): BuildResult {
  const windowsBefore = c.lamps.length;
  const platesBefore = c.plates.length;
  const result = buildHouse(c);
  // (his home has its own blessing, below: none of a plain house's plates)
  c.plates.length = platesBefore;
  const door = c.people.find((s) => s.kind === "door")!;
  // someone's home: its windows light up for sure
  for (const lamp of c.lamps.slice(windowsBefore)) lamp.always = true;
  // the bulb over the door, on a little bracket
  c.parts.box(0.06, 0.06, 0.18, door.x, 2.78, door.z + 0.09, PAL.metal);
  c.lamps.push({ kind: "bulb", x: door.x, y: 2.72, z: door.z + 0.2, ground: 0.3, always: true });
  // the blessing above the door
  c.parts.box(0.9, 0.2, 0.03, door.x, 2.98, door.z + 0.015, PAL.wood);
  result.signs.push({ kind: "stallSign", label: "॥ श्री गणेशाय नमः ॥", x: door.x, y: 2.98, z: door.z + 0.035, w: 0.84, h: 0.16 });
  return result;
}
