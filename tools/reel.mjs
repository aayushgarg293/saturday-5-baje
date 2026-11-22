/**
 * Turns the recorder's clips (src/dev/recorder.ts saves them in `.clips/`) into videos ready to post:
 *
 *   npm run reel                          every clip not done yet
 *   npm run reel -- clip_2026-11-03_….mp4 just that one
 *   npm run reel -- --from 4 --to 22      only seconds 4 to 22 (of each clip given)
 *   npm run reel -- --crop                upright version cut from the middle, instead of the whole picture
 *
 * For each clip it writes two files to `.clips/done/`:
 *   <name>-wide.mp4  the clip as it was (16:9), for YouTube, X and LinkedIn
 *   <name>-reel.mp4  upright, 1080×1920, for Instagram Reels and Shorts. By default the whole picture sits
 *                    in the middle on a blurred, darkened copy of itself, so the cafe computer's screen is
 *                    never cut off. `--crop` fills the frame with the middle of the picture instead: bigger,
 *                    but the sides are lost (good for walking through the bazaar, bad for the computer).
 *
 * Both are H.264 video with AAC sound at 30 frames a second, the format Instagram and YouTube expect. Uses
 * ffmpeg (installed with Homebrew: `brew install ffmpeg`); no npm packages.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLIPS = path.resolve(".clips");
const DONE = path.join(CLIPS, "done");

// What was asked for: file names, and the options.
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const from = option("--from");
const to = option("--to");
const crop = args.includes("--crop") ? (args.splice(args.indexOf("--crop"), 1), true) : false;

if (!fs.existsSync(CLIPS)) {
  console.log("No .clips folder yet: record a clip first (press ` in the game).");
  process.exit(0);
}
fs.mkdirSync(DONE, { recursive: true });

const isClip = (f) => /\.(mp4|webm)$/.test(f);
const done = (f) => fs.existsSync(path.join(DONE, `${path.parse(f).name}-reel.mp4`));
// Named clips are always (re)made; with no names, only the ones not done yet.
const todo = args.length ? args.map((f) => path.basename(f)) : fs.readdirSync(CLIPS).filter((f) => isClip(f) && !done(f));
if (!todo.length) console.log("Nothing new in .clips/ (every clip is already in .clips/done/).");

// The upright picture. "fit": the whole frame over a blurred copy of itself. "crop": the middle of the frame.
const UPRIGHT = crop
  ? "scale=-2:1920,crop=1080:1920"
  : "split[a][b];" +
    "[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.08[bg];" +
    "[b]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2";

for (const file of todo) {
  const input = path.join(CLIPS, file);
  if (!fs.existsSync(input)) {
    console.log(`Not found: .clips/${file}`);
    continue;
  }
  const name = path.parse(file).name;
  const trim = [...(from ? ["-ss", from] : []), ...(to ? ["-to", to] : [])];
  const common = [
    // 30 steady frames a second (a browser recording's frames come at uneven times)
    "-r", "30", "-fps_mode", "cfr",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    // (the sound track is optional: a clip recorded with sound off still works)
    "-map", "0:v:0", "-map", "0:a?",
    // lets the video start playing before it has fully downloaded
    "-movflags", "+faststart",
  ];
  const run = (filter, out) =>
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...trim, "-i", input, "-vf", filter, ...common, out], { stdio: "inherit" });

  console.log(`${file}:`);
  run("scale=-2:'min(1080,ih)'", path.join(DONE, `${name}-wide.mp4`));
  console.log(`  .clips/done/${name}-wide.mp4`);
  run(UPRIGHT, path.join(DONE, `${name}-reel.mp4`));
  console.log(`  .clips/done/${name}-reel.mp4${crop ? " (cut from the middle)" : ""}`);
}
