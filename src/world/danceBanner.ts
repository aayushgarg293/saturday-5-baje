/**
 * Aditi Dance Academy's flex banner (world/places/danceAcademy.ts): the
 * printed vinyl kind that every academy and coaching class had by 2007, made
 * in a photo shop with every effect it had. A hot pink-to-orange gradient,
 * rays and sparkles, dancers in silhouette, the name in chunky gold with a
 * glow, the classes in a box with stars for bullets, a "SUMMER CAMP!" burst,
 * an "ADMISSION OPEN" ribbon, the timings and the number along the bottom,
 * an eyelet in each corner.
 *
 * Painted onto a canvas by world/signs.ts (kind "danceBanner"). No random
 * numbers: it's a printed thing, the same every time.
 *
 * And its blade board (`paintDanceBlade`, kind "danceBlade"): the tall board
 * sticking out from the wall, the same on both faces, read from down the
 * road either way, in the banner's colours.
 */

const HINDI = '"Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';
const CHUNKY = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const PLAIN = '"Helvetica Neue", Arial, sans-serif';
const SCRIPT = '"Brush Script MT", "Snell Roundhand", "Apple Chancery", cursive';

type Ctx = CanvasRenderingContext2D;

export function paintDanceBanner(ctx: Ctx, w: number, h: number) {
  // --- the ground: pink to orange, a glow behind the name, rays out from it --------------------------
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, "#c2136b");
  sky.addColorStop(0.5, "#e8344e");
  sky.addColorStop(1, "#f7a12a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const cx = w * 0.5, cy = h * 0.24;
  ctx.save();
  ctx.translate(cx, cy);
  for (let k = 0; k < 24; k++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.fillStyle = k % 2 ? "rgba(255, 236, 150, 0.16)" : "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, -w * 0.065);
    ctx.lineTo(w, w * 0.065);
    ctx.fill();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.42);
  glow.addColorStop(0, "rgba(255, 244, 180, 0.75)");
  glow.addColorStop(1, "rgba(255, 244, 180, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // --- sparkles, big and small (placed by hand: a printed pattern) --------------------------------------
  const sparkles: [number, number, number][] = [
    [0.06, 0.1, 1], [0.94, 0.12, 0.8], [0.2, 0.4, 0.5], [0.8, 0.44, 0.6], [0.13, 0.7, 0.7], [0.9, 0.72, 0.5],
    [0.33, 0.08, 0.4], [0.68, 0.06, 0.45], [0.04, 0.5, 0.4], [0.97, 0.56, 0.4], [0.27, 0.86, 0.35], [0.74, 0.9, 0.35],
  ];
  for (const [x, y, s] of sparkles) sparkle(ctx, x * w, y * h, h * 0.055 * s);

  // --- the dancers, in silhouette, either side ---------------------------------------------------------
  // (standing on the bottom strip, below the ribbon and the burst)
  twirlingGirl(ctx, w * 0.12, h * 0.845, h * 0.44);
  filmiBoy(ctx, w * 0.885, h * 0.845, h * 0.44);

  // --- the name ---------------------------------------------------------------------------------------
  fit(ctx, "॥ श्री गणेशाय नमः ॥", w * 0.5, h * 0.045, w * 0.3, h * 0.045, { fill: "#fff3c4", family: HINDI });
  fit(ctx, "अदिति डांस एकेडमी", w * 0.5, h * 0.155, w * 0.5, h * 0.15, { fill: "#ffe14a", stroke: "#7a0d3a", family: HINDI, weight: "bold", shadow: "rgba(60, 0, 30, 0.6)" });
  fit(ctx, "ADITI DANCE ACADEMY", w * 0.5, h * 0.3, w * 0.54, h * 0.13, { fill: "#ffffff", stroke: "#5a1a8a", family: CHUNKY, shadow: "rgba(40, 0, 60, 0.7)" });
  fit(ctx, "Dance with Style!", w * 0.5, h * 0.4, w * 0.3, h * 0.07, { fill: "#fff3c4", family: SCRIPT, style: "italic" });

  // --- the classes: a deep purple box, stars for bullets --------------------------------------------------
  const box = { x: w * 0.25, y: h * 0.455, w: w * 0.5, h: h * 0.37 };
  ctx.fillStyle = "rgba(70, 14, 110, 0.82)";
  rounded(ctx, box.x, box.y, box.w, box.h, h * 0.03);
  ctx.fill();
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = h * 0.008;
  rounded(ctx, box.x + h * 0.012, box.y + h * 0.012, box.w - h * 0.024, box.h - h * 0.024, h * 0.022);
  ctx.stroke();
  const classes = ["Bollywood Dance", "Sangeet & Wedding Choreography", "Kids Batch (5–12 yrs)", "Ladies & Adults Batch", "Classical • Western • Bhangra"];
  classes.forEach((line, k) => {
    const y = box.y + box.h * (0.13 + k * 0.185);
    star(ctx, box.x + box.w * 0.075, y, h * 0.024, "#ffd94a");
    fit(ctx, line, box.x + box.w * 0.54, y, box.w * 0.8, h * 0.058, { fill: k % 2 ? "#ffe9a8" : "#ffffff", family: PLAIN, weight: "bold" });
  });

  // --- the burst: SUMMER CAMP! ----------------------------------------------------------------------------
  ctx.save();
  ctx.translate(w * 0.885, h * 0.19);
  ctx.rotate(0.2);
  burst(ctx, h * 0.15, 16, "#ffe53a", "#e0261c");
  fit(ctx, "SUMMER", 0, -h * 0.045, h * 0.21, h * 0.055, { fill: "#c0131a", family: CHUNKY });
  fit(ctx, "CAMP!", 0, h * 0.012, h * 0.21, h * 0.062, { fill: "#c0131a", family: CHUNKY });
  fit(ctx, "June 2007", 0, h * 0.068, h * 0.17, h * 0.036, { fill: "#3a1060", family: PLAIN, weight: "bold" });
  ctx.restore();

  // --- the ribbon: ADMISSION OPEN ------------------------------------------------------------------------
  ctx.save();
  ctx.translate(w * 0.115, h * 0.17);
  ctx.rotate(-0.22);
  ctx.fillStyle = "#1c7a3a";
  ctx.beginPath();
  const rw = w * 0.185, rh = h * 0.085;
  ctx.moveTo(-rw / 2, -rh / 2); ctx.lineTo(rw / 2, -rh / 2); ctx.lineTo(rw / 2 - rh * 0.4, 0); ctx.lineTo(rw / 2, rh / 2);
  ctx.lineTo(-rw / 2, rh / 2); ctx.lineTo(-rw / 2 + rh * 0.4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff3c4";
  ctx.lineWidth = h * 0.006;
  ctx.stroke();
  fit(ctx, "ADMISSION OPEN", 0, 0, rw * 0.74, rh * 0.6, { fill: "#ffffff", family: CHUNKY });
  ctx.restore();

  // --- along the bottom: timings, the number, who to ask for -------------------------------------------------
  ctx.fillStyle = "rgba(50, 8, 70, 0.9)";
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  ctx.fillStyle = "#ffd94a";
  ctx.fillRect(0, h * 0.86, w, h * 0.008);
  fit(ctx, "Timings: Morning 7–9  •  Evening 5–8      ☎ 98290 41627", w * 0.5, h * 0.905, w * 0.9, h * 0.05, { fill: "#ffffff", family: PLAIN, weight: "bold" });
  fit(ctx, "पहली मंज़िल (1st Floor)  •  Contact: Aditi Ma'am  •  पुराने बैच चालू हैं", w * 0.5, h * 0.96, w * 0.86, h * 0.04, { fill: "#ffe9a8", family: HINDI });

  // --- the eyelets it's tied by, a little dust along one edge -------------------------------------------------
  for (const [x, y] of [[0.02, 0.035], [0.98, 0.035], [0.02, 0.965], [0.98, 0.965], [0.5, 0.03]]) {
    ctx.fillStyle = "#b9b4ac";
    ctx.beginPath();
    ctx.arc(x * w, y * h, h * 0.014, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a3634";
    ctx.beginPath();
    ctx.arc(x * w, y * h, h * 0.007, 0, Math.PI * 2);
    ctx.fill();
  }
  const dust = ctx.createLinearGradient(0, h * 0.75, 0, h);
  dust.addColorStop(0, "rgba(150, 120, 90, 0)");
  dust.addColorStop(1, "rgba(150, 120, 90, 0.2)");
  ctx.fillStyle = dust;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
}

/** The blade board: the name stacked down it, the twirling girl, "1st FLOOR" at the foot. */
export function paintDanceBlade(ctx: Ctx, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#c2136b");
  sky.addColorStop(0.62, "#6a1a8a");
  sky.addColorStop(1, "#4a1070");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = w * 0.035;
  ctx.strokeRect(w * 0.045, w * 0.045, w * 0.91, h - w * 0.09);
  for (const [x, y, s] of [[0.16, 0.06, 0.7], [0.86, 0.3, 0.6], [0.14, 0.47, 0.5], [0.88, 0.62, 0.45]]) sparkle(ctx, x * w, y * h, w * 0.1 * s);
  fit(ctx, "अदिति", w * 0.5, h * 0.105, w * 0.74, h * 0.13, { fill: "#ffe14a", stroke: "#7a0d3a", family: HINDI, weight: "bold" });
  fit(ctx, "DANCE", w * 0.5, h * 0.235, w * 0.78, h * 0.1, { fill: "#ffffff", stroke: "#5a1a8a", family: CHUNKY });
  fit(ctx, "ACADEMY", w * 0.5, h * 0.335, w * 0.78, h * 0.085, { fill: "#ffffff", stroke: "#5a1a8a", family: CHUNKY });
  twirlingGirl(ctx, w * 0.5, h * 0.72, h * 0.3);
  // the foot: a yellow panel, as on the cafe's
  ctx.fillStyle = "#ffe14a";
  ctx.fillRect(w * 0.08, h * 0.775, w * 0.84, h * 0.18);
  fit(ctx, "डांस क्लास", w * 0.5, h * 0.825, w * 0.74, h * 0.075, { fill: "#4a1070", family: HINDI, weight: "bold" });
  fit(ctx, "1st FLOOR ↑", w * 0.5, h * 0.908, w * 0.74, h * 0.055, { fill: "#c0131a", family: CHUNKY });
}

// --- the pieces ---------------------------------------------------------------------------------------------

type Look = { fill: string; stroke?: string; family: string; weight?: string; style?: string; shadow?: string };

/** One line centred at (x, y), as big as fits in maxW × maxH; an outline and a drop shadow if asked. */
function fit(ctx: Ctx, s: string, x: number, y: number, maxW: number, maxH: number, look: Look) {
  let size = maxH;
  const font = (px: number) => `${look.style ?? ""} ${look.weight ?? ""} ${px}px ${look.family}`;
  ctx.font = font(size);
  const wide = ctx.measureText(s).width;
  if (wide > maxW) size *= maxW / wide;
  ctx.font = font(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (look.shadow) {
    ctx.fillStyle = look.shadow;
    ctx.fillText(s, x + size * 0.06, y + size * 0.08);
  }
  if (look.stroke) {
    ctx.strokeStyle = look.stroke;
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = look.fill;
  ctx.fillText(s, x, y);
}

function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A four-pointed sparkle with a soft glow. */
function sparkle(ctx: Ctx, x: number, y: number, r: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
  g.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, rr = k % 2 ? r * 0.16 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** A five-pointed star. */
function star(ctx: Ctx, x: number, y: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** A spiky "offer" burst, at the origin. */
function burst(ctx: Ctx, r: number, points: number, fill: string, edge: string) {
  ctx.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const a = (k * Math.PI) / points, rr = k % 2 ? r * 0.8 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
}

/** A soft white edge round whatever's drawn next (the cut-out look), then the dark figure itself. */
function silhouette(ctx: Ctx, draw: () => void) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#3a0a4a";
  ctx.strokeStyle = "#3a0a4a";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw();
  ctx.restore();
}

/** A girl mid-twirl: her lehenga flared wide, one arm up, the other out, a plait flying, her dupatta trailing. */
function twirlingGirl(ctx: Ctx, x: number, feet: number, tall: number) {
  const u = tall / 10; // (a tenth of her height)
  silhouette(ctx, () => {
    // the lehenga: a wide bell from her waist, its hem a wave
    ctx.beginPath();
    ctx.moveTo(x - u * 0.55, feet - u * 5.6);
    ctx.quadraticCurveTo(x - u * 3.6, feet - u * 2.2, x - u * 3.9, feet - u * 0.5);
    ctx.quadraticCurveTo(x - u * 2, feet + u * 0.25, x, feet - u * 0.35);
    ctx.quadraticCurveTo(x + u * 2, feet + u * 0.3, x + u * 3.7, feet - u * 0.9);
    ctx.quadraticCurveTo(x + u * 3.2, feet - u * 2.6, x + u * 0.55, feet - u * 5.6);
    ctx.closePath();
    ctx.fill();
    // her body, leaning into the turn; her head
    ctx.lineWidth = u * 1.15;
    ctx.beginPath();
    ctx.moveTo(x, feet - u * 5.5);
    ctx.lineTo(x + u * 0.25, feet - u * 7.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + u * 0.35, feet - u * 8.75, u * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // arms: one curved up over her head, one out to the side, the hand turned up
    ctx.lineWidth = u * 0.42;
    ctx.beginPath();
    ctx.moveTo(x + u * 0.3, feet - u * 7.5);
    ctx.quadraticCurveTo(x + u * 2.3, feet - u * 8.6, x + u * 1.2, feet - u * 10.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + u * 0.1, feet - u * 7.4);
    ctx.quadraticCurveTo(x - u * 1.6, feet - u * 7.9, x - u * 2.7, feet - u * 6.6);
    ctx.stroke();
    // her plait, flying out behind
    ctx.lineWidth = u * 0.32;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.2, feet - u * 8.7);
    ctx.quadraticCurveTo(x - u * 1.6, feet - u * 9.3, x - u * 2.3, feet - u * 8.3);
    ctx.stroke();
  });
  // her dupatta, a pale ribbon of cloth trailing round her
  ctx.save();
  ctx.strokeStyle = "rgba(255, 233, 150, 0.9)";
  ctx.lineWidth = u * 0.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + u * 1.2, feet - u * 10);
  ctx.bezierCurveTo(x + u * 3.8, feet - u * 8, x - u * 3.6, feet - u * 6.4, x - u * 3.9, feet - u * 3.6);
  ctx.stroke();
  ctx.restore();
}

/** A boy in the filmi pose: one arm pointing up and away, a hand on his hip, a knee kicked out. */
function filmiBoy(ctx: Ctx, x: number, feet: number, tall: number) {
  const u = tall / 10;
  silhouette(ctx, () => {
    // legs: one straight, one bent out
    ctx.lineWidth = u * 0.75;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.2, feet - u * 5);
    ctx.lineTo(x - u * 1.5, feet - u * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + u * 0.2, feet - u * 5);
    ctx.lineTo(x + u * 1.9, feet - u * 3.1);
    ctx.lineTo(x + u * 1.3, feet - u * 0.3);
    ctx.stroke();
    // body and head
    ctx.lineWidth = u * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, feet - u * 5);
    ctx.lineTo(x - u * 0.2, feet - u * 7.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - u * 0.35, feet - u * 8.8, u * 0.75, 0, Math.PI * 2);
    ctx.fill();
    // the pointing arm, up and away; the other hand on the hip
    ctx.lineWidth = u * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - u * 0.3, feet - u * 7.6);
    ctx.lineTo(x - u * 2.9, feet - u * 10.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, feet - u * 7.5);
    ctx.lineTo(x + u * 1.9, feet - u * 6.4);
    ctx.lineTo(x + u * 0.5, feet - u * 5.3);
    ctx.stroke();
  });
}
