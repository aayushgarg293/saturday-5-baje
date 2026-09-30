/**
 * The desktop wallpaper everyone had: a rolling green hill under a blue sky
 * with soft clouds (a look-alike, painted in code). Shared by the 3D monitor
 * (world/cafe/yourScreen.ts) and the full-screen desktop (desktop.ts), so
 * leaning in, the picture doesn't change.
 */

/** Paint the wallpaper filling a `w` × `h` canvas. */
export function paintWallpaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, "#2f6fd6");
  sky.addColorStop(1, "#9cc8f0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // soft clouds: overlapping pale circles (placed for a 512-wide picture, scaled)
  const k = w / 512;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const [x, y, r] of [[120, 70, 30], [150, 60, 38], [190, 72, 28], [360, 50, 26], [390, 44, 32]]) {
    ctx.beginPath();
    ctx.arc(x * k, y * k * (h / w) * (512 / 384), r * k, 0, Math.PI * 2);
    ctx.fill();
  }
  const hill = ctx.createLinearGradient(0, h * 0.45, 0, h);
  hill.addColorStop(0, "#6fbf3a");
  hill.addColorStop(1, "#3f8a1c");
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.quadraticCurveTo(w * 0.35, h * 0.38, w * 0.7, h * 0.55);
  ctx.quadraticCurveTo(w * 0.88, h * 0.62, w, h * 0.58);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

/** The wallpaper as an image (for the desktop's background), `w` × `h`. */
export function wallpaperImage(w: number, h: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paintWallpaper(canvas.getContext("2d")!, w, h);
  return canvas.toDataURL("image/png");
}
