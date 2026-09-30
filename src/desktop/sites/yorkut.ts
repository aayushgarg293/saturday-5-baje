import type { Nav, Page } from "../apps/xplorer";
import { addStyles } from "../css";
import { photoUrl } from "../photos";
import { YOU } from "../story";
import { Fields, ReplyBox, TypeField } from "../typing";

/**
 * Yorkut (a look-alike of the era's social network): your profile and
 * scrapbook, Rohan's "new city new life :)" album full of comments from
 * people you've never met, and Priya's profile, where you can write her a
 * testimonial (pick a draft, type it out… or think better of it).
 *
 * Pages:  (sign in)  home  scrapbook  profile/rohan  album/rohan
 *         profile/priya  testimonial/priya
 * Anything else: Yorkut's famous error page.
 */

const SITE = "www.yorkut.com";

// --- what's on it (edit freely) ---------------------------------------------------

/** Your scrapbook, newest first. Rohan's is from before he left. */
const YOUR_SCRAPS: { from: string; when: string; text: string }[] = [
  { from: "Sunny", when: "3 days ago", text: "oye sunday ko match hai 7 baje. late mat aana!!!" },
  { from: "Rohan ★ rockstar", when: "2 weeks ago", text: "miss u yaar, cricket nahi khela koi. yahan sab football khelte hai :(" },
  { from: "Neha ~*~", when: "3 weeks ago", text: "~*~*~ HaPpY hOlI!!! ~*~*~ may ur life b full of colours!!! :) :)" },
  { from: "Ankit", when: "1 month ago", text: "send this scrap to 15 frnds n c the magic on ur screen!!!" },
];

/** Rohan's album "new city new life :)": each photo, its caption, and comments from his new friends. */
const ROHAN_ALBUM: { photo: string; caption: string; comments: [string, string][] }[] = [
  { photo: "pune", caption: "mera naya ghar", comments: [["Aditya", "nice view dude"], ["Sneha D", "welcome to pune!!"]] },
  { photo: "school", caption: "new school", comments: [["Karan M.", "wassup rohan!! class me milte"], ["Aditya", "lol uniform"]] },
  { photo: "friends", caption: "with new friends :)", comments: [["Karan M.", "party kab hai??"], ["Varun", "rockstar!!!"], ["Aditya", "yo"]] },
];

/** Priya's communities. */
const PRIYA_COMMUNITIES = ["I ♥ Jab We Mate", "Dil Mil Gaye Yaar fans", "I Hate Maths!!!", "Tuition Bunkers Club", "I ♥ my Mom", "Chocolate Lovers"];

/** The testimonial drafts: pick one, type it out, and Submit (or Cancel). */
const DRAFTS = [
  "priya is a very sweet girl. best in tuition. always smiling :)",
  "she is my tuition friend. very intelligent. Jab We Mate fan no. 1!!!",
  "kya likhu... tum bahut acchi ho. bas.",
];

// --- the pages -----------------------------------------------------------------------

let signedIn = false;

export function yorkut(path: string, nav: Nav): Page | null {
  addStyles("yorkut", CSS);
  if (!signedIn) return signIn(nav);
  switch (path) {
    case "":
    case "home": return home(nav);
    case "scrapbook": return scrapbook(nav);
    case "profile/rohan": return rohan(nav);
    case "album/rohan": return album(nav);
    case "profile/priya": return priya(nav);
    case "testimonial/priya": return testimonial(nav);
  }
  return badServer();
}

/** The frame: the logo, the top links, then `left` (the person) and `main`. */
function frame(left: HTMLElement | null, main: HTMLElement, nav: Nav): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "yk";
  body.innerHTML = `<div class="yk-top"><span class="logo">yorkut</span><span class="links"></span><span class="me">${YOU.id}@rediffitmail.com</span></div><div class="yk-cols"></div>`;
  const links = body.querySelector(".links")!;
  for (const [name, url] of [["Home", "home"], ["Scrapbook", "scrapbook"], ["Friends", "home"], ["Communities", "home"]]) {
    links.append(link(name, () => nav.go(`${SITE}/${url}`)));
  }
  const cols = body.querySelector(".yk-cols")!;
  if (left) cols.append(left);
  main.classList.add("yk-main");
  cols.append(main);
  return body;
}

/** A person's left column: their picture, name, and a line about them. */
function person(photo: string, name: string, about: string): HTMLDivElement {
  const d = document.createElement("div");
  d.className = "yk-left";
  d.innerHTML = `<img><b></b><small></small><div class="karma">trusty ☺☺☺ &nbsp; cool ❄❄ &nbsp; sexy ♥</div>`;
  d.querySelector("img")!.src = photoUrl(photo);
  d.querySelector("b")!.textContent = name;
  d.querySelector("small")!.textContent = about;
  return d;
}

function signIn(nav: Nav): Page {
  const box = document.createElement("div");
  box.className = "yk-signin";
  box.innerHTML = `<span class="logo">yorkut</span><p>Connect with friends and family using scraps and instant messaging.<br>
    Discover new people through friends of friends and communities.</p>
    <div class="form"><div class="row">Email: </div><div class="row">Password: </div><div class="row"><span class="xp-button go">Sign in</span></div></div>`;
  const email = new TypeField(`${YOU.id}@rediffitmail.com`);
  const pw = new TypeField("sachin10", true);
  const rows = box.querySelectorAll(".row");
  rows[0].append(email.el);
  rows[1].append(pw.el);
  const fields = new Fields([email, pw]);
  const go = () => {
    if (!fields.complete) return;
    signedIn = true;
    nav.go(`${SITE}/home`);
  };
  fields.onEnter = go;
  box.querySelector(".go")!.addEventListener("click", go);
  return { title: "yorkut.com", body: box, keys: (e) => fields.key(e) };
}

function home(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>Cricket King ★</h2><div class="note">priya_cute_angel added you as a friend (yesterday)</div>
    <div class="box">"sachin is god. rest are players." <small>(your status)</small></div>
    <div class="counts"></div><h3>friends (87)</h3><div class="friends"></div>`;
  main.querySelector(".counts")!.append(
    link("scrapbook (4)", () => nav.go(`${SITE}/scrapbook`)), " · photos (2) · fans (3) · communities (23)");
  const friends = main.querySelector(".friends")!;
  for (const [name, photo, url] of [["Rohan", "pune", "profile/rohan"], ["Priya", "flowers", "profile/priya"], ["Sunny", "team", "profile/sunny"],
    ["Neha", "diwali", "profile/neha"], ["Vicky", "blurry", "profile/vicky"], ["Ankit", "farewell", "profile/ankit"]]) {
    const f = document.createElement("div");
    f.className = "friend";
    f.innerHTML = `<img><u></u>`;
    f.querySelector("img")!.src = photoUrl(photo);
    f.querySelector("u")!.textContent = name;
    f.addEventListener("click", () => nav.go(`${SITE}/${url}`));
    friends.append(f);
  }
  return { title: "yorkut.com - Home", body: frame(person("team", "Cricket King ★", "Ajmer, Rajasthan, India"), main, nav) };
}

function scrapbook(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>scrapbook (${YOUR_SCRAPS.length})</h2>`;
  for (const s of YOUR_SCRAPS) {
    const d = document.createElement("div");
    d.className = "scrap";
    d.innerHTML = `<b></b> <small></small><div></div>`;
    d.querySelector("b")!.textContent = `${s.from}:`;
    d.querySelector("small")!.textContent = s.when;
    d.querySelector("div")!.textContent = s.text;
    main.append(d);
  }
  return { title: "yorkut.com - Scrapbook", body: frame(person("team", "Cricket King ★", "Ajmer, Rajasthan, India"), main, nav) };
}

function rohan(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>Rohan ★ rockstar</h2><div class="box">"new city new life :)" <small>(status)</small></div>
    <p>city: Pune, Maharashtra · hometown: Ajmer · school: (new!!)</p><h3>albums</h3>`;
  const a = document.createElement("div");
  a.className = "album-link";
  a.innerHTML = `<img><u>new city new life :)</u> <small>(${ROHAN_ALBUM.length} photos)</small>`;
  a.querySelector("img")!.src = photoUrl(ROHAN_ALBUM[0].photo);
  a.addEventListener("click", () => nav.go(`${SITE}/album/rohan`));
  main.append(a);
  return { title: "yorkut.com - Rohan", body: frame(person("pune", "Rohan ★ rockstar", "Pune, Maharashtra, India"), main, nav) };
}

function album(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>new city new life :)</h2>`;
  for (const p of ROHAN_ALBUM) {
    const d = document.createElement("div");
    d.className = "photo";
    d.innerHTML = `<img><div><b></b><div class="comments"></div></div>`;
    d.querySelector("img")!.src = photoUrl(p.photo);
    d.querySelector("b")!.textContent = p.caption;
    const c = d.querySelector(".comments")!;
    for (const [who, text] of p.comments) {
      const line = document.createElement("div");
      line.innerHTML = "<u></u>: <span></span>";
      line.querySelector("u")!.textContent = who;
      line.querySelector("span")!.textContent = text;
      c.append(line);
    }
    main.append(d);
  }
  main.append(link("« back to Rohan", () => nav.go(`${SITE}/profile/rohan`)));
  return { title: "yorkut.com - new city new life :)", body: frame(null, main, nav) };
}

function priya(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>~*~ Priya ~*~</h2><div class="box">"exams khatam!!! :D" <small>(status)</small></div>
    <p>about me: i ♥ my family n frnds. fav film: Jab We Mate!!! fav colour: pink. hate: maths :P</p>
    <h3>communities (${PRIYA_COMMUNITIES.length})</h3><div class="communities"></div><h3>testimonials (0)</h3>`;
  const cs = main.querySelector(".communities")!;
  for (const c of PRIYA_COMMUNITIES) {
    const d = document.createElement("div");
    d.className = "community";
    d.textContent = c;
    cs.append(d);
  }
  main.append(link("write a testimonial for Priya", () => nav.go(`${SITE}/testimonial/priya`)));
  return { title: "yorkut.com - Priya", body: frame(person("flowers", "~*~ Priya ~*~", "Ajmer, Rajasthan, India"), main, nav) };
}

function testimonial(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>write a testimonial for Priya</h2><p class="small">Pick what to write, type it out, and Enter to submit. Or cancel, and nobody will know.</p>`;
  const box = new ReplyBox();
  box.offer(DRAFTS);
  box.onSend = () => {
    nav.kit.tasks.complete("testimonial");
    main.innerHTML = `<h2>testimonial sent</h2><p>Your testimonial will appear on Priya's profile once she accepts it.</p>`;
    main.append(link("« back to Priya", () => nav.go(`${SITE}/profile/priya`)));
  };
  main.append(box.el, link("cancel", () => nav.go(`${SITE}/profile/priya`)));
  return { title: "yorkut.com - Testimonial", body: frame(person("flowers", "~*~ Priya ~*~", "Ajmer, Rajasthan, India"), main, nav), keys: (e) => box.key(e) };
}

/** Yorkut's own error page (every regular saw it). */
function badServer(): Page {
  const body = document.createElement("div");
  body.className = "yk-bad";
  body.innerHTML = `<span class="logo">yorkut</span><h2>Bad, bad server. No donut for you.</h2><p>Please try again in a few minutes.</p>`;
  return { title: "yorkut.com", body };
}

function link(text: string, go: () => void): HTMLSpanElement {
  const a = document.createElement("span");
  a.className = "yk-link";
  a.textContent = text;
  a.addEventListener("click", go);
  return a;
}

const CSS = /* css */ `
.yk { font: 12px Verdana, sans-serif; color: #222; background: #bfd0ea; min-height: 100%; }
.yk .logo, .yk-signin .logo, .yk-bad .logo { font: bold italic 26px "Trebuchet MS", sans-serif; color: #d4145a; }
.yk-top { display: flex; align-items: baseline; gap: 16px; padding: 6px 12px; background: #fff; border-bottom: 3px solid #a8bfe3; }
.yk-top .links { display: flex; gap: 12px; }
.yk-top .me { margin-left: auto; color: #666; font-size: 10px; }
.yk-cols { display: flex; gap: 10px; padding: 10px; align-items: flex-start; }
.yk-left { width: 130px; flex: none; padding: 8px; background: #fff; border-radius: 6px; text-align: center; }
.yk-left img { width: 110px; height: 90px; object-fit: cover; display: block; margin: 0 auto 6px; }
.yk-left b { display: block; }
.yk-left small { color: #666; }
.yk-left .karma { margin-top: 6px; font-size: 10px; color: #3b6fb6; }
.yk-main { flex: 1; min-width: 0; padding: 10px 12px; background: #fff; border-radius: 6px; }
.yk h2 { margin: 0 0 6px; font-size: 16px; color: #1c3f7a; }
.yk h3 { margin: 12px 0 6px; font-size: 12px; color: #1c3f7a; border-bottom: 1px solid #d6e0f0; }
.yk .box { padding: 6px 8px; margin: 6px 0; background: #e8eefa; border-radius: 4px; }
.yk .note { padding: 5px 8px; background: #fff7cc; border: 1px solid #f0dc80; }
.yk small, .yk .small { color: #777; font-size: 10px; }
.yk-link, .yk u { color: #1f5fbf; cursor: default; text-decoration: underline; }
.yk-link { display: inline-block; margin-top: 8px; }
.yk .friends { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.yk .friend { text-align: center; }
.yk .friend img { width: 70px; height: 55px; object-fit: cover; display: block; margin: 0 auto 3px; }
.yk .scrap { padding: 8px; margin-bottom: 6px; background: #f3f6fc; border-radius: 4px; }
.yk .scrap div { margin-top: 3px; }
.yk .album-link img { width: 90px; height: 68px; object-fit: cover; vertical-align: middle; margin-right: 8px; }
.yk .photo { display: flex; gap: 10px; margin-bottom: 12px; }
.yk .photo img { width: 170px; height: 128px; flex: none; }
.yk .photo .comments { margin-top: 6px; line-height: 1.6; }
.yk .communities { display: flex; flex-wrap: wrap; gap: 6px; }
.yk .community { padding: 3px 7px; background: #fde4ec; border-radius: 10px; color: #a0144a; }
.yk .ym-reply { margin: 8px 0; }
.yk-signin { padding: 40px; text-align: center; font: 12px Verdana, sans-serif; background: #fff; min-height: 100%; box-sizing: border-box; }
.yk-signin .form { display: inline-block; margin-top: 10px; padding: 14px 20px; text-align: left; background: #e8eefa; border-radius: 6px; }
.yk-signin .row { margin-bottom: 8px; }
.yk-signin .xp-field { width: 200px; }
.yk-bad { padding: 40px; text-align: center; font: 12px Verdana, sans-serif; }
.yk-bad h2 { color: #1c3f7a; }
`;
