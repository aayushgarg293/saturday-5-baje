/**
 * The clip recorder, for making reels and the trailer. Never part of the game players get: it's switched on
 * under `npm run dev`, or in the built game only with `?record` on the address (main.ts).
 *
 * Press ` (the key left of 1) to start, and again to stop. It records the whole browser tab, not only the
 * game's picture: the cafe computer (Yaaho, Yorkut, MeToob) is a web page laid over the game, and a recording
 * of the game's canvas alone would miss it. The tab's sound comes with it.
 *
 * Chrome asks the first time whether to share this tab: click Allow, then click the game to take the mouse
 * again. While it's recording, the tab's title starts with ● (the title isn't in the picture, so the clip
 * stays clean).
 *
 * The finished clip goes to the dev server, which saves it in `.clips/` (vite.config.ts). If there's no server
 * to take it (the live site), the browser downloads it instead. `npm run reel` then turns clips into mp4s and
 * upright 9:16 versions for reels (tools/reel.mjs).
 */
export function installRecorder(onRecording: (recording: boolean) => void = () => {}) {
  let recorder: MediaRecorder | null = null;

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Backquote" || e.repeat) return;
    e.preventDefault();
    if (recorder) recorder.stop();
    else void start();
  });

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true,
        // (Chrome: offer this tab straight away, instead of a list of every window and screen)
        preferCurrentTab: true,
      } as DisplayMediaStreamOptions);
    } catch (err) {
      console.warn("recorder: not started (sharing was cancelled or isn't allowed here)", err);
      return;
    }

    // mp4 if this browser can record it (recent Chrome can), otherwise webm; `npm run reel` handles both.
    const mimeType = ["video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    );
    // A high bitrate: Instagram compresses again, and it's kinder to start from a clean picture.
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder = null;
      setTitle(false);
      onRecording(false);
      void save(new Blob(chunks, { type: rec.mimeType }));
    };
    // Chrome's own "Stop sharing" button ends the stream: treat that as stopping too.
    stream.getVideoTracks()[0].addEventListener("ended", () => rec.state !== "inactive" && rec.stop());

    recorder = rec;
    rec.start(1000); // (hand over the recording every second, so a long clip isn't one huge piece at the end)
    setTitle(true);
    onRecording(true);
  }
}

/** Send the clip to the dev server; if there isn't one, download it. */
async function save(clip: Blob) {
  const ext = clip.type.includes("mp4") ? "mp4" : "webm";
  const stamp = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
  const name = `clip_${stamp}.${ext}`;
  try {
    const res = await fetch(`/__clip?name=${encodeURIComponent(name)}`, { method: "POST", body: clip });
    if (!res.ok) throw new Error(`the server said ${res.status}`);
    console.info(`recorder: saved .clips/${name} (${(clip.size / 1e6).toFixed(1)} MB)`);
  } catch {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(clip);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }
}

function setTitle(recording: boolean) {
  document.title = recording ? `● ${document.title}` : document.title.replace(/^● /, "");
}
