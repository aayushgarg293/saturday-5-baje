import { messageBox } from "../apps/basic";
import type { Nav, Page } from "../apps/xplorer";
import { addStyles } from "../css";
import { download } from "../download";
import type { VFile } from "../files";
import { TypeField } from "../typing";

/**
 * SongzPK (a look-alike of the era's favourite mp3 site): loud colours,
 * blinking "NEW!!", ads down the side, and every film's songs to download.
 *
 * Pages:  (home)  search  album/jab-we-mate  album/<anything else>
 *
 * All song titles are made up (BRIEF.md: look-alikes only).
 */

const SITE = "www.songzpk.com";

/** Jab We Mate's songs: the one Priya wants is "the train song" (any of these will do). */
const TRACKS: [string, number][] = [
  ["01 - Rail Gaadi Dil Waali", 3480],
  ["02 - Ratlam Ki Raat", 4020],
  ["03 - Barsaat Ke Din", 3710],
  ["04 - Tumse Mile To", 4390],
  ["05 - Punjab Da Dhol (Remix)", 3120],
  ["06 - Rail Gaadi Dil Waali (Sad)", 2950],
];

/** The other albums on the front page (these pages are "busy"). */
const ALBUMS = ["Jab We Mate", "Dhoom Dhaam 2", "Rock Onn!!", "Gollmaal", "Rang De Basant", "Jaane Tu Ya Jaane Main"];

/** The "you are our 1,000,000th visitor" pop-up comes once. */
let welcomed = false;

export function songz(path: string, nav: Nav): Page | null {
  addStyles("songz", CSS);
  if (path === "") return home(nav);
  if (path === "search") return results(nav);
  if (path === "album/jab-we-mate") return album(nav);
  if (path.startsWith("album/")) return busy();
  return null;
}

/** The page's frame: the header, the scrolling news line, the ads down the side. */
function frame(title: string, main: HTMLElement): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "sz";
  body.innerHTML = `
    <div class="sz-head"><span class="logo">Songz<b>PK</b></span><span class="tag">Download Latest Indian Songs FREE!!!</span></div>
    <marquee class="sz-news" scrollamount="3">*** NEW: Jab We Mate full album uploaded!!! *** Dhoom Dhaam 2 remixes *** Request songs in our guestbook ***</marquee>
    <div class="sz-cols"><div class="sz-main"><h2></h2></div>
      <div class="sz-ads">
        <div class="ad a1">Download FREE Ringtones!!!<br><b>SMS SONG to 56767</b></div>
        <div class="ad a2">Earn Rs 50,000/month<br>from HOME!!!<br><u>click here</u></div>
        <div class="ad a3">Your PC may be SLOW!!<br>Scan now FREE</div>
      </div></div>
    <div class="sz-foot">Best viewed in 800x600 · Visitors: <b>0 9 8 4 6 1 2</b></div>`;
  body.querySelector("h2")!.textContent = title;
  body.querySelector(".sz-main")!.append(main);
  return body;
}

function home(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<div class="sz-search">Search: </div><div class="sz-grid"></div>`;
  const field = new TypeField("jab we mate");
  const go = () => nav.go(`${SITE}/search`);
  field.onEnter = go;
  const button = document.createElement("span");
  button.className = "xp-button";
  button.textContent = "Search";
  button.addEventListener("click", () => field.complete && go());
  main.querySelector(".sz-search")!.append(field.el, " ", button);
  const grid = main.querySelector(".sz-grid")!;
  ALBUMS.forEach((name, k) => {
    const a = document.createElement("div");
    a.className = "sz-album";
    a.innerHTML = `<div class="poster p${k % 4}"></div><u></u>${k < 2 ? ' <span class="new">NEW!!</span>' : ""}`;
    a.querySelector("u")!.textContent = name;
    a.addEventListener("click", () => nav.go(`${SITE}/album/${slug(name)}`));
    grid.append(a);
  });
  if (!welcomed) {
    welcomed = true;
    setTimeout(() => messageBox(nav.kit.wm, "songz-popup", "Congratulations!!!",
      "You are our 1,000,000th visitor!!! Click OK to claim your FREE mobile phone!!!"), 3500);
  }
  return { title: "SongzPK.com: Download Free Indian Songs", body: frame("Latest Albums", main), keys: (e) => field.key(e) };
}

function results(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<p>Results for <b>"jab we mate"</b>:</p>`;
  for (const [name, url] of [
    ["Jab We Mate (2007) - All Songs", `${SITE}/album/jab-we-mate`],
    ["Jab We Mate - DJ Remix Collection", `${SITE}/album/jab-we-mate-remix`],
    ["jab we mate songs.zip", `${SITE}/album/zip`],
  ]) {
    const r = document.createElement("div");
    r.className = "sz-result";
    r.textContent = name;
    r.addEventListener("click", () => nav.go(url));
    main.append(r);
  }
  return { title: "SongzPK.com: Search", body: frame("Search Results", main) };
}

function album(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<div class="sz-film"><div class="poster p0 big"></div><div>
      <b>Film:</b> Jab We Mate (2007)<br><b>Quality:</b> 128 Kbps<br><b>Uploaded by:</b> DJ_Sunny_786<br>
      <span class="new">NEW!!</span></div></div><table class="sz-tracks"></table>
      <p class="small">Right click → "Save Target As" if the download does not start.</p>`;
  const table = main.querySelector("table")!;
  for (const [name, size] of TRACKS) {
    const file: VFile = { name: `${name}.mp3`, folder: "music", size, kind: "mp3", tag: "jabWeMate" };
    const row = document.createElement("tr");
    row.innerHTML = `<td></td><td>${(size / 1024).toFixed(1)} MB</td><td><u>Download</u></td>`;
    row.querySelector("td")!.textContent = name;
    row.querySelector("u")!.addEventListener("click", () => download(nav.kit, file, SITE));
    table.append(row);
  }
  return { title: "Jab We Mate (2007) Songs - SongzPK.com", body: frame("Jab We Mate (2007)", main) };
}

/** Every other album: the server's too busy (it usually was). */
function busy(): Page {
  const main = document.createElement("div");
  main.innerHTML = `<p class="sz-busy">Server is BUSY!!! Too many users downloading.<br>Please try again after some time.</p>`;
  return { title: "SongzPK.com", body: frame("Sorry!!", main) };
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
}

const CSS = /* css */ `
.sz { font: 12px Verdana, sans-serif; color: #fff; background: #1b1b3a; min-height: 100%; }
.sz-head { display: flex; align-items: baseline; gap: 14px; padding: 8px 12px; background: linear-gradient(90deg, #ff7a00, #ffcc00); }
.sz-head .logo { font: bold 26px Impact, "Arial Black", sans-serif; color: #1b1b3a; }
.sz-head .logo b { color: #d10000; }
.sz-head .tag { color: #1b1b3a; font-weight: bold; }
.sz-news { display: block; padding: 3px 0; color: #ffff66; background: #000; font-weight: bold; }
.sz-cols { display: flex; gap: 10px; padding: 10px; }
.sz-main { flex: 1; }
.sz h2 { margin: 0 0 8px; color: #ffcc00; font-size: 15px; border-bottom: 1px dashed #ffcc00; }
.sz-search { margin-bottom: 10px; }
.sz-search .xp-field { display: inline-block; min-width: 180px; color: #000; }
.sz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.sz-album { text-align: center; }
.sz-album u, .sz-tracks u, .sz-result { color: #66ccff; }
.sz-album:hover u, .sz-tracks u:hover, .sz-result:hover { color: #fff; }
.poster { height: 70px; margin-bottom: 4px; border: 2px solid #fff; }
.poster.big { width: 80px; height: 110px; flex: none; }
.p0 { background: linear-gradient(160deg, #f7c6d0 30%, #d94f70 30% 60%, #6b2140 60%); }
.p1 { background: linear-gradient(20deg, #111 40%, #d10000 40% 55%, #333 55%); }
.p2 { background: linear-gradient(90deg, #2b2b2b, #7a5cff 50%, #2b2b2b); }
.p3 { background: linear-gradient(200deg, #ffd23f 35%, #3aa655 35% 70%, #1d5e30 70%); }
.new { color: #ff3333; font-weight: bold; animation: sz-blink 0.8s steps(1) infinite; }
@keyframes sz-blink { 50% { opacity: 0; } }
.sz-film { display: flex; gap: 12px; margin-bottom: 10px; line-height: 1.7; }
.sz-tracks { width: 100%; border-collapse: collapse; }
.sz-tracks td { padding: 4px 6px; border-bottom: 1px solid #33335a; }
.sz-result { padding: 5px 0; text-decoration: underline; }
.sz-busy { color: #ff6666; font-weight: bold; line-height: 1.6; }
.sz .small { color: #999; font-size: 10px; }
.sz-ads { width: 150px; display: flex; flex-direction: column; gap: 8px; }
.sz-ads .ad { padding: 8px; text-align: center; color: #000; border: 2px dashed #000; }
.sz-ads .a1 { background: #66ff66; }
.sz-ads .a2 { background: #ffff66; }
.sz-ads .a3 { background: #ff9999; animation: sz-blink 1.2s steps(1) infinite; }
.sz-foot { padding: 8px; text-align: center; color: #999; font-size: 10px; }
.sz-foot b { color: #0f0; background: #000; padding: 0 4px; letter-spacing: 2px; }
`;
