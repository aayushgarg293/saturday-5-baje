import type * as THREE from "three";
import { touchFirst } from "../core/device";
import { CHIT, type Errand, errands } from "../core/errands";
import { LANE_ROAD, SCHOOL_TAIL } from "../world/homeLane";
import { BAZAAR, pointAt } from "../world/layout";
import { MOHALLA_LANES, SQUARE_AXIS, SQUARE_EDGES } from "../world/mohalla";
import type { Road } from "../world/roads";
import { CRICKET_LANE, PARK_SOUTH, PARK_WEST, SCHOOL_ROAD } from "../world/schoolRoad";
import { STATION_LANE } from "../world/station";
import { BUS_STAND_EDGES, CHOWK_EDGES, CHOWK_MIDDLE, COURT_ROAD } from "../world/town";
import { HAND } from "./chit";

/**
 * Mummy's sketch of the town: drawn on another scrap of the chit's paper, in
 * the same blue ballpoint, shown beside the chit whenever the chit is out. It
 * doesn't turn: the town stays put and the little red arrow (you) turns. Each
 * thing still to do is ringed in red with its number on the chit, so 3 here
 * is line 3. Nothing on the screen while you walk but the small clock.
 */

/** The canvas's own size, px (it's shown at half this, or less on a phone). */
const SIZE = 680;
/** Paper left clear round the town, canvas px. */
const MARGIN = 58;
/** Redrawn this often, seconds, while it's out: only the arrow moves. */
const REDRAW = 1 / 10;
/** How the town sits on the paper, radians. */
const TURN = 0;

const INK = "#1f3a8a", RED = "#c23426", PAPER = "#fbf7ea";

const MAIN_ROADS: Road[] = [BAZAAR, COURT_ROAD, SCHOOL_ROAD, SCHOOL_TAIL, ...Object.values(CHOWK_EDGES), ...Object.values(BUS_STAND_EDGES)];
const LANES: Road[] = [
  LANE_ROAD, CRICKET_LANE, PARK_WEST, PARK_SOUTH, STATION_LANE, SQUARE_AXIS,
  ...Object.values(MOHALLA_LANES), ...Object.values(SQUARE_EDGES),
];

type Spot = { x: number; z: number };

function middleOf(roads: Road[]): Spot {
  const points = roads.map((r) => r.centreAt(r.length / 2));
  return { x: points.reduce((a, p) => a + p.x, 0) / points.length, z: points.reduce((a, p) => a + p.z, 0) / points.length };
}

/** Her landmarks; `dx`, `dy`: where the word sits from the spot, canvas px. */
const LANDMARKS: { word: string; at: Spot; dx: number; dy: number }[] = [
  { word: "mandir", at: pointAt(96, -3.4), dx: -72, dy: 8 },
  { word: "chowk", at: CHOWK_MIDDLE, dx: -66, dy: 6 },
  { word: "court", at: COURT_ROAD.centreAt(36), dx: -24, dy: 44 },
  { word: "bus stand", at: middleOf(Object.values(BUS_STAND_EDGES)), dx: -74, dy: 46 },
  { word: "school", at: SCHOOL_ROAD.centreAt(46), dx: -58, dy: 0 },
  { word: "park", at: SCHOOL_ROAD.centreAt(106), dx: -92, dy: 44 },
  { word: "station", at: STATION_LANE.centreAt(STATION_LANE.length), dx: 10, dy: -22 },
];

type Place = { errand: Errand; at: { x: number; z: number } };

export type TownMap = {
  /** Every frame. `walking`: you're out on foot, so the clock may be seen; `sketch`: the chit is out, so the sketch may be. */
  update(dt: number, walking: boolean, sketch: boolean, pos: THREE.Vector3, yaw: number, time: string): void;
};

/** `places`: the errands' stops; `home`: your door. */
export function buildTownMap(places: Place[], home: { x: number; z: number }): TownMap {
  const cafe = pointAt(179, 5.5);
  const marks: (Place & { number: number })[] = [{ errand: "cafe" as Errand, at: cafe }, ...places].map((p) => ({
    ...p, number: CHIT.findIndex((c) => c.errand === p.errand) + 1,
  }));

  const clock = document.createElement("div");
  Object.assign(clock.style, {
    position: "fixed", top: "10px", right: "12px", zIndex: "5", padding: "0 9px", borderRadius: "3px", background: PAPER, color: INK,
    font: `${touchFirst ? 14 : 16}px ${HAND}`, transform: "rotate(1.5deg)", boxShadow: "1px 2px 4px rgba(30, 20, 10, 0.35)",
    pointerEvents: "none", transition: "opacity 0.3s", opacity: "0",
  } satisfies Partial<CSSStyleDeclaration>);

  const box = document.createElement("div");
  Object.assign(box.style, {
    // (just left of the chit, and as much smaller on a phone: ui/chit.ts)
    position: "fixed", zIndex: "6", top: "4%", right: `calc(3% + min(340px, 40cqw) * ${touchFirst ? 0.72 : 1} + 8px)`,
    width: touchFirst ? "min(280px, 70cqh)" : "min(340px, 34cqw)", aspectRatio: "1", transform: "rotate(1.8deg)",
    filter: "drop-shadow(2px 4px 5px rgba(30, 20, 10, 0.35))", pointerEvents: "none", transition: "opacity 0.35s", opacity: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  Object.assign(canvas.style, {
    width: "100%", height: "100%", display: "block",
    // the torn bottom edge, as the chit's
    clipPath: "polygon(0 0, 100% 0, 100% 96%, 90% 98%, 78% 95%, 66% 99%, 53% 96%, 40% 99%, 27% 95%, 14% 98%, 0 96%)",
  });
  box.append(canvas);
  document.body.append(clock, box);

  const turned = (x: number, z: number) => ({ x: x * Math.cos(TURN) - z * Math.sin(TURN), y: x * Math.sin(TURN) + z * Math.cos(TURN) });
  const roadPoints = (road: Road) => {
    const points = [];
    for (let s = 0; s < road.length; s += 6) points.push(road.centreAt(s));
    points.push(road.centreAt(road.length));
    return points;
  };

  // fit the whole town on the paper
  const all = [...MAIN_ROADS, ...LANES].flatMap(roadPoints).map((p) => turned(p.x, p.z));
  const x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x));
  const y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const fit = (SIZE - MARGIN * 2) / Math.max(x1 - x0, y1 - y0);
  const place = (x: number, z: number) => {
    const p = turned(x, z);
    return { x: SIZE / 2 + (p.x - (x0 + x1) / 2) * fit, y: SIZE / 2 + (p.y - (y0 + y1) / 2) * fit };
  };

  /** The paper and all that never changes, drawn once. */
  const paper = document.createElement("canvas");
  paper.width = paper.height = SIZE;
  const p = paper.getContext("2d")!;
  p.fillStyle = PAPER;
  p.fillRect(0, 0, SIZE, SIZE);
  p.strokeStyle = "rgba(90, 130, 190, 0.3)";
  p.lineWidth = 2;
  p.beginPath();
  for (let y = 26; y < SIZE; y += 52) {
    p.moveTo(0, y);
    p.lineTo(SIZE, y);
  }
  p.stroke();

  // the roads, with a hand's small waver in them
  p.strokeStyle = INK;
  p.lineJoin = p.lineCap = "round";
  const penned = (roads: Road[], width: number) => {
    p.lineWidth = width;
    p.beginPath();
    roads.forEach((road, k) => {
      roadPoints(road).forEach((point, n) => {
        const at = place(point.x, point.z);
        const x = at.x + Math.sin(n * 0.7 + k) * 1.6, y = at.y + Math.cos(n * 0.9 + k * 2) * 1.6;
        if (n === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      });
    });
    p.stroke();
  };
  penned(MAIN_ROADS, 7);
  penned(LANES, 3.5);

  p.font = `30px ${HAND}`;
  p.textAlign = "center";
  p.textBaseline = "middle";
  p.fillStyle = INK;
  for (const { word, at, dx, dy } of LANDMARKS) {
    const spot = place(at.x, at.z);
    p.fillText(word, spot.x + dx, spot.y + dy);
  }

  // home: a small house, and the word
  const door = place(home.x, home.z);
  p.beginPath();
  p.moveTo(door.x, door.y - 16);
  p.lineTo(door.x + 16, door.y);
  p.lineTo(door.x + 11, door.y);
  p.lineTo(door.x + 11, door.y + 13);
  p.lineTo(door.x - 11, door.y + 13);
  p.lineTo(door.x - 11, door.y);
  p.lineTo(door.x - 16, door.y);
  p.closePath();
  p.fill();
  p.fillText("ghar", door.x, door.y + 34);

  const g = canvas.getContext("2d")!;

  function draw(pos: THREE.Vector3, yaw: number) {
    g.drawImage(paper, 0, 0);

    // what's still to do: ringed in red, with its number on the chit
    g.font = '700 28px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const m of marks) {
      if (errands.isDone(m.errand)) continue;
      const at = place(m.at.x, m.at.z);
      g.beginPath();
      g.arc(at.x, at.y, 20, 0, Math.PI * 2);
      g.fillStyle = PAPER;
      g.fill();
      g.strokeStyle = RED;
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = RED;
      g.fillText(String(m.number), at.x, at.y + 1);
    }

    // you
    const you = place(pos.x, pos.z);
    g.save();
    g.translate(you.x, you.y);
    g.rotate(TURN - yaw);
    g.beginPath();
    g.moveTo(0, -19);
    g.lineTo(13, 13);
    g.lineTo(0, 6);
    g.lineTo(-13, 13);
    g.closePath();
    g.fillStyle = RED;
    g.fill();
    g.strokeStyle = PAPER;
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }

  let wait = 0, clockSeen = false, sketchSeen = false;
  return {
    update(dt, walking, sketch, pos, yaw, time) {
      if (walking !== clockSeen) {
        clockSeen = walking;
        clock.style.opacity = walking ? "1" : "0";
      }
      if (walking && clock.textContent !== time) clock.textContent = time;
      if (sketch !== sketchSeen) {
        sketchSeen = sketch;
        box.style.opacity = sketch ? "1" : "0";
        wait = 0;
      }
      if (!sketch) return;
      wait -= dt;
      if (wait > 0) return;
      wait = REDRAW;
      draw(pos, yaw);
    },
  };
}
