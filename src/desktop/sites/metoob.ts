import type { Nav, Page } from "../apps/xplorer";
import { addStyles } from "../css";
import { photoUrl } from "../photos";

/**
 * MeToob (a look-alike of the video site), on dial-up: the video plays a few
 * seconds, stops, spins "Loading…", creeps on a second, stops again. The grey
 * "downloaded so far" bar crawls ahead of the red one and then barely moves.
 * Everyone who had dial-up remembers.
 *
 * Pages:  (home)  watch/<n>
 */

const SITE = "www.metoob.com";

/** The videos (made-up titles): name, length in seconds, the picture for its frame, views. */
const VIDEOS: { title: string; length: number; picture: string; views: string }[] = [
  { title: "INDIA WINS!!! T20 final last over (full)", length: 412, picture: "stadium", views: "2,104,332" },
  { title: "Dhoom Dhaam 2 title song HQ", length: 262, picture: "friends", views: "894,110" },
  { title: "tuition sir so gaye lol", length: 48, picture: "school", views: "12,408" },
  { title: "diwali patakhe fail compilation", length: 187, picture: "diwali", views: "301,776" },
];

/** How fast the video arrives: fractions of it per second (a 4-minute video takes an age). */
const ARRIVE = 0.004;
/** It arrives in a rush at first, then the line chokes: after this much, it barely moves. */
const CHOKE = [0.07, 0.13];

export function metoob(path: string, nav: Nav): Page | null {
  addStyles("metoob", CSS);
  if (path === "") return home(nav);
  if (path.startsWith("watch/")) return watch(nav, Number(path.slice(6)));
  return null;
}

function top(nav: Nav): HTMLDivElement {
  const d = document.createElement("div");
  d.className = "mt-top";
  d.innerHTML = `<span class="logo">Me<b>Toob</b></span><span class="tag">Broadcast Yourself</span>`;
  d.querySelector(".logo")!.addEventListener("click", () => nav.go(SITE));
  return d;
}

function home(nav: Nav): Page {
  const body = document.createElement("div");
  body.className = "mt";
  body.append(top(nav));
  const list = document.createElement("div");
  list.className = "mt-list";
  list.innerHTML = "<h3>Videos being watched right now...</h3>";
  VIDEOS.forEach((v, k) => list.append(entry(v, () => nav.go(`${SITE}/watch/${k}`))));
  body.append(list);
  return { title: "MeToob - Broadcast Yourself.", body };
}

function entry(v: (typeof VIDEOS)[number], go: () => void): HTMLDivElement {
  const e = document.createElement("div");
  e.className = "mt-entry";
  e.innerHTML = `<img><div><u></u><br><small></small></div>`;
  e.querySelector("img")!.src = photoUrl(v.picture);
  e.querySelector("u")!.textContent = v.title;
  e.querySelector("small")!.textContent = `${time(v.length)} · ${v.views} views`;
  e.addEventListener("click", go);
  return e;
}

function watch(nav: Nav, k: number): Page | null {
  const v = VIDEOS[k];
  if (!v) return null;
  const body = document.createElement("div");
  body.className = "mt";
  body.append(top(nav));
  const main = document.createElement("div");
  main.className = "mt-watch";
  main.innerHTML = `<h2></h2><div class="player"><div class="frame"><img></div><div class="spin">Loading...</div>
      <div class="controls"><span class="play">❚❚</span><div class="track"><div class="got"></div><div class="seen"></div></div><span class="clock"></span></div></div>
    <div class="meta"><small></small></div><h3>Comments</h3>
    <div class="comment"><u>rahul_4ever</u>: first!!!</div>
    <div class="comment"><u>desi_boy_22</u>: nyc video</div>
    <div class="comment"><u>xXsachinfanXx</u>: sachin is god</div>`;
  main.querySelector("h2")!.textContent = v.title;
  main.querySelector(".meta small")!.textContent = `${v.views} views`;
  main.querySelector("img")!.src = photoUrl(v.picture);
  body.append(main);

  const img = main.querySelector("img")!;
  const spin = main.querySelector<HTMLDivElement>(".spin")!;
  const got = main.querySelector<HTMLDivElement>(".got")!;
  const seen = main.querySelector<HTMLDivElement>(".seen")!;
  const clock = main.querySelector<HTMLSpanElement>(".clock")!;
  let arrived = 0, played = 0;
  const choke = CHOKE[0] + Math.random() * (CHOKE[1] - CHOKE[0]);
  const stop = nav.kit.tick((dt) => {
    if (!body.isConnected) return stop(); // (you've gone to another page)
    arrived = Math.min(1, arrived + dt * (arrived < choke ? ARRIVE : ARRIVE / 12));
    // it plays only while there's enough ahead of it; otherwise it waits
    const stalled = played >= arrived - 0.01;
    if (!stalled) played += dt / v.length;
    spin.hidden = !stalled;
    got.style.width = `${arrived * 100}%`;
    seen.style.width = `${played * 100}%`;
    clock.textContent = `${time(played * v.length)} / ${time(v.length)}`;
    // (the frame drifts a little while it plays, so it looks like a video)
    img.style.transform = `scale(1.08) translateX(${Math.sin(played * v.length * 0.5) * 6}px)`;
  });
  return { title: `MeToob - ${v.title}`, body };
}

/** 3:42 */
function time(s: number): string {
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

const CSS = /* css */ `
.mt { font: 12px Arial, sans-serif; color: #222; min-height: 100%; background: #fff; }
.mt-top { display: flex; align-items: baseline; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #ddd; }
.mt-top .logo { font: bold 24px Arial, sans-serif; color: #222; }
.mt-top .logo b { margin-left: 2px; padding: 0 5px; color: #fff; background: #d4221c; border-radius: 6px; }
.mt-top .tag { color: #888; font-size: 11px; }
.mt-list { padding: 10px 14px; }
.mt-list h3, .mt-watch h3 { margin: 8px 0; font-size: 13px; color: #333; }
.mt-entry { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #eee; }
.mt-entry img { width: 96px; height: 72px; object-fit: cover; border: 1px solid #999; }
.mt-entry u { color: #03c; font-weight: bold; }
.mt-entry small, .mt-watch small { color: #888; }
.mt-watch { padding: 10px 14px; }
.mt-watch h2 { margin: 0 0 8px; font-size: 15px; }
.mt-watch .player { position: relative; width: 400px; background: #000; }
.mt-watch .frame { width: 400px; height: 280px; overflow: hidden; }
.mt-watch .frame img { width: 100%; height: 100%; object-fit: cover; }
.mt-watch .spin { position: absolute; left: 0; right: 0; top: 120px; text-align: center; color: #fff; font-weight: bold;
  text-shadow: 0 0 4px #000; }
.mt-watch .spin::before { content: ""; display: block; width: 24px; height: 24px; margin: 0 auto 6px; border-radius: 50%;
  border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: mt-spin 0.9s linear infinite; }
@keyframes mt-spin { to { transform: rotate(360deg); } }
.mt-watch .controls { display: flex; align-items: center; gap: 8px; padding: 4px 6px; color: #fff; background: #333; }
.mt-watch .track { position: relative; flex: 1; height: 6px; background: #555; }
.mt-watch .got { position: absolute; left: 0; top: 0; bottom: 0; background: #aaa; }
.mt-watch .seen { position: absolute; left: 0; top: 0; bottom: 0; background: #d4221c; }
.mt-watch .clock { font-size: 11px; }
.mt-watch .meta { margin: 6px 0; }
.mt-watch .comment { padding: 4px 0; border-bottom: 1px solid #eee; }
.mt-watch .comment u { color: #03c; }
`;
