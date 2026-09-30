/**
 * The photos on his pen drive, painted in code: small, grainy, the colours
 * a little off, and the orange date stamp in the corner that those
 * cameras printed on every picture.
 *
 * `photoUrl(key)` gives a picture to use as an image's src (painted once,
 * then kept).
 */

const W = 320, H = 240;
const cache = new Map<string, string>();

type Painter = (ctx: CanvasRenderingContext2D) => void;

const PAINTERS: Record<string, Painter> = {
  /** The colony cricket team, in two rows in front of a wall, with their little trophy. */
  team(ctx) {
    ctx.fillStyle = "#d9c9a3"; // the wall
    ctx.fillRect(0, 0, W, H * 0.62);
    ctx.fillStyle = "#b7a47c";
    for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 2, H * 0.62); // its plaster lines
    ctx.fillStyle = "#8b8a5a"; // dusty ground
    ctx.fillRect(0, H * 0.62, W, H);
    const shirts = ["#f4f4f4", "#2f5fae", "#f4f4f4", "#c43d2c", "#f4f4f4", "#e0b43a", "#3b8f4d", "#f4f4f4"];
    // back row standing, front row crouching
    for (let k = 0; k < 5; k++) boy(ctx, 58 + k * 52, 150, 1, shirts[k], k === 2);
    for (let k = 0; k < 4; k++) boy(ctx, 84 + k * 52, 196, 0.85, shirts[5 + (k % 3)], false);
    ctx.fillStyle = "#e8c24a"; // the trophy in the middle
    ctx.fillRect(154, 196, 12, 22);
    ctx.beginPath();
    ctx.arc(160, 192, 10, 0, Math.PI);
    ctx.fill();
  },
  /** Diwali night: sparks against the dark. */
  diwali(ctx) {
    ctx.fillStyle = "#0e1230";
    ctx.fillRect(0, 0, W, H);
    for (const [cx, cy, c] of [[90, 90, "#ffcf4a"], [220, 70, "#ff6b6b"], [170, 150, "#9cf"]] as const) {
      ctx.strokeStyle = c;
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * Math.PI * 2, r = 30 + (a % 3) * 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(t) * 6, cy + Math.sin(t) * 6);
        ctx.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#3a2a1a"; // a rooftop's edge
    ctx.fillRect(0, H - 40, W, 40);
  },
  /** A blurry mobile photo of someone's thumb and a ceiling fan. */
  blurry(ctx) {
    ctx.fillStyle = "#c9c2b0";
    ctx.fillRect(0, 0, W, H);
    ctx.filter = "blur(10px)";
    ctx.fillStyle = "#6d6a63";
    ctx.fillRect(120, 60, 90, 14);
    ctx.fillStyle = "#d9a07a";
    ctx.beginPath();
    ctx.ellipse(60, 200, 70, 50, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = "none";
  },
  /** Rohan's farewell: a cake on a table, balloons. */
  farewell(ctx) {
    ctx.fillStyle = "#e9d8b8";
    ctx.fillRect(0, 0, W, H);
    for (const [x, c] of [[40, "#e74c3c"], [80, "#3498db"], [270, "#f1c40f"]] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, 50, 18, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#7a4b2a"; // the table
    ctx.fillRect(40, 170, 240, 70);
    ctx.fillStyle = "#fff4f0"; // the cake
    ctx.fillRect(120, 130, 80, 40);
    ctx.fillStyle = "#e86a8a";
    ctx.fillRect(120, 130, 80, 8);
    boy(ctx, 250, 180, 1, "#2f5fae", false);
  },
  /** Rohan's album: his new building in Pune, tall, under a grey monsoon sky. */
  pune(ctx) {
    ctx.fillStyle = "#9aa3ad";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8e2d6"; // the tower
    ctx.fillRect(100, 20, 130, 220);
    ctx.fillStyle = "#6f8aa8";
    for (let y = 34; y < 230; y += 26) for (let x = 112; x < 220; x += 28) ctx.fillRect(x, y, 16, 14);
    ctx.fillStyle = "#4f7a3a"; // trees
    ctx.beginPath();
    ctx.arc(50, 220, 50, 0, Math.PI * 2);
    ctx.arc(280, 225, 45, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Rohan's album: the new school, and boys in its uniform. */
  school(ctx) {
    ctx.fillStyle = "#cfe0ee";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9785a"; // red-brick building
    ctx.fillRect(0, 40, W, 130);
    ctx.fillStyle = "#f1ece0";
    for (let x = 16; x < W; x += 40) ctx.fillRect(x, 60, 22, 30);
    ctx.fillStyle = "#b9b09a";
    ctx.fillRect(0, 170, W, 70);
    for (let k = 0; k < 4; k++) boy(ctx, 70 + k * 60, 225, 0.9, "#dfe8f5", false);
  },
  /** Rohan's album: "with new friends": boys he never mentions, at a mall. */
  friends(ctx) {
    ctx.fillStyle = "#e9e4f0";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#b8a0d0"; // shop signs behind
    ctx.fillRect(0, 30, W, 40);
    ctx.fillStyle = "#d8d0c0";
    ctx.fillRect(0, 170, W, 70);
    const shirts = ["#222", "#c43d2c", "#2f5fae", "#f4f4f4"];
    for (let k = 0; k < 4; k++) boy(ctx, 70 + k * 60, 200, 1, shirts[k], false);
  },
  /** A cricket ground on TV (a MeToob video's frame): the green field, the crowd, the pitch. */
  stadium(ctx) {
    ctx.fillStyle = "#26324a"; // the stands, full of people (dots)
    ctx.fillRect(0, 0, W, 90);
    for (let k = 0; k < 900; k++) {
      ctx.fillStyle = ["#e0c0a0", "#3b6fb6", "#f4f4f4", "#e0b43a"][k % 4];
      ctx.fillRect((k * 37) % W, 10 + ((k * 13) % 76), 2, 2);
    }
    ctx.fillStyle = "#3f8f3a";
    ctx.fillRect(0, 90, W, H);
    ctx.fillStyle = "#c9b27a"; // the pitch
    ctx.beginPath();
    ctx.moveTo(145, 110);
    ctx.lineTo(175, 110);
    ctx.lineTo(200, 240);
    ctx.lineTo(120, 240);
    ctx.fill();
    boy(ctx, 160, 200, 0.8, "#2f5fae", true);
  },
  /** Priya's profile picture: pink flowers (few girls put up their own photo). */
  flowers(ctx) {
    ctx.fillStyle = "#fde4ec";
    ctx.fillRect(0, 0, W, H);
    for (const [x, y, r] of [[90, 100, 40], [200, 80, 50], [230, 180, 34], [110, 190, 30]] as const) {
      ctx.fillStyle = "#e86a9a";
      for (let a = 0; a < 5; a++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(a * 1.26) * r * 0.55, y + Math.sin(a * 1.26) * r * 0.55, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd84a";
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

/** One boy: a head and a shirt (`bat`: holding one). */
function boy(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shirt: string, bat: boolean) {
  ctx.fillStyle = "#7a4e32";
  ctx.beginPath();
  ctx.arc(x, y - 44 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1410"; // hair
  ctx.fillRect(x - 9 * s, y - 54 * s, 18 * s, 6 * s);
  ctx.fillStyle = shirt;
  ctx.fillRect(x - 13 * s, y - 34 * s, 26 * s, 30 * s);
  if (bat) {
    ctx.fillStyle = "#d8b06a";
    ctx.save();
    ctx.translate(x + 16 * s, y - 20 * s);
    ctx.rotate(-0.3);
    ctx.fillRect(0, 0, 6 * s, 40 * s);
    ctx.restore();
  }
}

/** The painted photo as an image address. */
export function photoUrl(key: string): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  (PAINTERS[key] ?? PAINTERS.blurry)(ctx);
  // the camera: grain, warm colours, and the date stamp
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n + 6;
    img.data[i + 1] += n;
    img.data[i + 2] += n - 8;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = "#ff8a1c";
  ctx.font = "bold 13px monospace";
  ctx.fillText("'07 05 13", W - 78, H - 10);
  const url = canvas.toDataURL("image/jpeg", 0.8);
  cache.set(key, url);
  return url;
}
