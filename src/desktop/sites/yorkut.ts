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
 * Your friends' profiles and scrapbooks (write them a scrap: pick one, type
 * it out), your communities and their forums (the Dil Mil Gaye Yaar fans
 * arguing about last night's episode; you can join in), and who visited
 * your profile (Priya, once you've talked). Send her the song, and she
 * leaves you a scrap.
 *
 * Pages:  (sign in)  home  scrapbook  profile/<friend>  scrap/<friend>
 *         album/rohan  testimonial/priya  communities  community/<id>
 *         topic/<id>
 * Anything else: Yorkut's famous error page.
 */

const SITE = "www.yorkut.com";

// --- what's on it (edit freely) ---------------------------------------------------

/** Your scrapbook, newest first. Rohan's is from before he left. */
const YOUR_SCRAPS: { from: string; when: string; text: string }[] = [
  { from: "Sunny", when: "3 days ago", text: "oye sunday ko match hai 7 baje. late mat aana!!!" },
  { from: "Rohan ★ rockstar", when: "2 weeks ago", text: "miss u yaar, cricket nahi khela koi. yahan sab football khelte hai :(" },
  { from: "Neha ~*~", when: "3 months ago", text: "~*~*~ HaPpY hOlI!!! ~*~*~ may ur life b full of colours!!! :) :)" },
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

/** Priya's scrap, once she has the song (the "songSent" task, story.ts). */
const PRIYA_SCRAP = { from: "~*~ Priya ~*~", when: "just now", text: "thanks for the song!!! :) :) repeat pe chal raha hai. tuition me milte hai" };

/**
 * Your other friends' profiles: their status, a line about them, their
 * scrapbook (newest first), their communities, and what you might scrap
 * them (pick one, type it out). Rohan and Priya have pages of their own.
 */
type Friend = { name: string; photo: string; city: string; status: string; about: string; scraps: [string, string][]; communities: string[]; drafts: string[] };
const FRIENDS: Record<string, Friend> = {
  rohan: {
    name: "Rohan ★ rockstar", photo: "pune", city: "Pune, Maharashtra, India", status: "new city new life :)",
    about: "city: Pune · hometown: Ajmer · school: (new!!)",
    scraps: [["Karan M.", "dude kal cricket? oh wait tum log football :P"], ["Sunny", "oye pune wale!! team ki yaad aati hai ki nahi"], ["Neha ~*~", "~*~ miss u in tuition ~*~"]],
    communities: ["I ♥ Ajmer", "Sachin is God", "Prison Brake fans", "Pune Rockers"],
    drafts: ["saturday 5 baje. yaad hai na!!!", "pune wale bhool mat jaana humein :P", "team abhi bhi teri position khaali rakhti hai"],
  },
  sunny: {
    name: "Sunny ☆ 4 Six", photo: "stadium", city: "Ajmer, Rajasthan, India", status: "India jeetega!!",
    about: "cricket. cricket. cricket. aur kuch nahi. (captain, colony XI)",
    scraps: [["Vicky", "oye kal ka match??? 7 baje"], ["Rohan ★ rockstar", "captain ban gaya?? lol team gayi"], ["Ankit", "bhai mera bat wapas kar"]],
    communities: ["Sachin is God", "Colony Cricket Club Ajmer", "I Hate Mondays", "T20 World Champions!!!"],
    drafts: ["captain sahab, kal ka match kitne baje?", "score dekha?? rediffit pe live aa raha hai", "mera bat kab wapas karega"],
  },
  neha: {
    name: "Neha ~*~", photo: "diwali", city: "Ajmer, Rajasthan, India", status: "~*~ smile always ~*~",
    about: "i luv my frndz, my family n chocolates ~*~ never trust boys :P",
    scraps: [["Priya", "neha!!! kal tuition ke baad gol gappe??"], ["Ankit", "send this scrap to 15 frnds n c the magic!!!"], ["Sunny", "happy bday neha!!! party???"]],
    communities: ["Chocolate Lovers", "Dil Mil Gaye Yaar fans", "I ♥ my Mom", "Girls Rule!!!"],
    drafts: ["hi neha! kya haal?", "happy belated bday!!! :)", "tuition ke notes de dena plz"],
  },
  vicky: {
    name: "Vicky the Rocker \\m/", photo: "blurry", city: "Ajmer, Rajasthan, India", status: "Rodies audition next month!!",
    about: "rock music \\m/ bike. gym. Rodies here i come!!!",
    scraps: [["Ankit", "bhai gym me milna"], ["Sunny", "rodies me select ho gaya to party!!!"], ["Neha ~*~", "lol all the best vicky"]],
    communities: ["Rodies Fan Club", "I Love My Pulsarr", "Rock On!!!", "Gym Freaks Ajmer"],
    drafts: ["all the best for rodies bhai!!", "gym ka kya scene hai", "\\m/ rock on \\m/"],
  },
  ankit: {
    name: "Ankit Bhaiya", photo: "farewell", city: "Jaipur, Rajasthan, India", status: "Prison Brake S3 anyone??",
    about: "engineering 2nd year. jaipur. sleep is my hobby.",
    scraps: [["Vicky", "bhaiya prison brake ki cd bhejo"], ["Rohan ★ rockstar", "bhaiya pune aao kabhi"], ["Neha ~*~", "bhaiya forward mat bheja karo plz :P"]],
    communities: ["Engineers do it better", "Prison Brake fans", "I Hate Mondays", "Sleep is my hobby"],
    drafts: ["bhaiya prison brake ki cd de do", "bhaiya forward mail mat bhejo plz :P", "jaipur kab aa rahe ho"],
  },
};

/** Your communities (the ones that open: COMMUNITIES), and how many members each had. */
const YOUR_COMMUNITIES: [string, string, string][] = [
  ["dmgy", "Dil Mil Gaye Yaar fans", "48,233"],
  ["ajmer", "I ♥ Ajmer", "12,870"],
  ["sachin", "Sachin is God", "2,31,442"],
  ["maths", "I Hate Maths!!!", "3,02,118"],
  ["mondays", "I Hate Mondays", "4,12,920"],
  ["tuition", "Tuition Bunkers Club", "9,371"],
];

/** A community's forum: its topics. Each topic: its posts, and what you could add (drafts). */
type Topic = { id: string; title: string; posts: [string, string][]; drafts: string[] };
const COMMUNITIES: Record<string, { about: string; topics: Topic[] }> = {
  dmgy: {
    about: "for all the fans of the best show on TV!!! no spoilers in topic names plz. mods: armaan_fan_no1, riddhima_rox",
    topics: [
      { id: "episode", title: "kal ka episode!!! (SPOILERS)", posts: [
        ["armaan_fan_no1", "omg kal ka episode!!! armaan ne finally bol diya!!!"],
        ["riddhima_rox", "i cried. sach me. mummy ne poocha kya hua"],
        ["sid_the_kid", "overacting. sab overacting hai"],
        ["armaan_fan_no1", "@sid then why r u in this community??? -_-"],
        ["pinky_4u", "next week ka promo dekha??? kuch bada hone wala hai"],
      ], drafts: ["kal ka episode best tha!!!", "mujhe to doctor wala track pasand hai", "spoiler mat do yaar, dekhna baaki hai"] },
      { id: "best", title: "best couple of the show? VOTE", posts: [
        ["riddhima_rox", "ARMAAN-RIDDHIMA. no competition"],
        ["sweet_sona", "atul-anjali!!! cute"],
        ["sid_the_kid", "koi nahi"],
      ], drafts: ["armaan-riddhima obviously", "atul-anjali for me", "sab acche hai yaar"] },
    ],
  },
  ajmer: {
    about: "for everyone from Ajmer and those who love it. dargah, ana saagar, kachori, and our gali cricket!!!",
    topics: [
      { id: "kachori", title: "sabse best kachori kahan milti hai??", posts: [
        ["ajmer_ka_raja", "station road wali. no discussion"],
        ["pushkar_boy", "naya bazaar ke corner wala thela!! uske board pe likha hai '1 kachori 2 samosa, is jeevan ka kya bharosa' lol"],
        ["sweet_sona", "LOL wo board!!! kachori bhi mast hai uski"],
        ["chirag_007", "aap log kabhi jodhpur aao. phir baat karna"],
      ], drafts: ["naya bazaar wala thela best hai!!", "ghar ki kachori sabse best :P", "jalebi ka bhi topic banao"] },
      { id: "pushkar", title: "pushkar mela kaun kaun ja raha hai?", posts: [
        ["pushkar_boy", "hum to har saal jaate hai. camel ride must!!"],
        ["chirag_007", "moochh competition dekhne jaana hai lol"],
      ], drafts: ["main jaunga!! papa le jaayenge", "is baar nahi, exams hai", "camel ride free hai kya :P"] },
    ],
  },
  sachin: { about: "cricket is our religion and sachin is our god. no fights about who is better. sachin.", topics: [
    { id: "t20", title: "T20 WORLD CHAMPIONS!!! celebrate here", posts: [
      ["cricket_crazy", "INDIA INDIA INDIA!!! goosebumps abhi bhi"],
      ["sunny_4_six", "last over!!! mera dil band ho gaya tha"],
      ["sid_the_kid", "sachin nahi khela phir bhi jeet gaye. just saying"],
      ["cricket_crazy", "@sid community se bahar jao"],
    ], drafts: ["INDIA INDIA!!!", "aaj ka match bhi jeetenge, score dekho", "sachin hota to aur maza aata"] },
  ] },
  maths: { about: "for all those who believe maths is a conspiracy.", topics: [
    { id: "why", title: "why do we need trigonometry in life??", posts: [
      ["tuition_bunker", "sabzi lene me sin cos nahi lagta"],
      ["neha_sweetu", "SAME. sir ko bolo"],
      ["topper_99", "actually trigonometry is used in engineering, astronomy..."],
      ["tuition_bunker", "@topper nikal"],
    ], drafts: ["chapter 5 ke sums kisi ne kiye?", "sin cos tan, sab bekaar", "board exam me kya aayega yaar"] },
  ] },
  mondays: { about: "garfield was right.", topics: [
    { id: "sunday", title: "sunday shaam 6 baje wala feeling", posts: [["sleepy_head", "homework yaad aata hai"], ["neha_sweetu", "relatable"]], drafts: ["sach me yaar", "aaj to saturday hai :D", "monday ko school band hona chahiye"] },
  ] },
  tuition: { about: "members: ? (secret). rule 1: do not talk about this community in tuition.", topics: [
    { id: "excuses", title: "best excuse to bunk tuition?", posts: [["bunker_no1", "light chali gayi thi"], ["tuition_bunker", "cycle puncture. classic"], ["sid_the_kid", "cyber cafe me project ka kaam tha :P"]], drafts: ["cycle puncture. hamesha kaam karta hai", "mummy ne kaam bola tha", "main to kabhi bunk nahi karta :P"] },
  ] },
};

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
    case "communities": return communities(nav);
  }
  const [kind, id] = path.split("/");
  if (kind === "profile" && FRIENDS[id]) return friend(nav, id);
  if (kind === "scrap" && FRIENDS[id]) return writeScrap(nav, id);
  if (kind === "community" && COMMUNITIES[id]) return community(nav, id);
  if (kind === "topic") {
    const [cid, tid] = id ? id.split(":") : [];
    const t = COMMUNITIES[cid]?.topics.find((x) => x.id === tid);
    if (t) return topic(nav, cid, t);
  }
  return badServer();
}

/** The frame: the logo, the top links, then `left` (the person) and `main`. */
function frame(left: HTMLElement | null, main: HTMLElement, nav: Nav): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "yk";
  body.innerHTML = `<div class="yk-top"><span class="logo">yorkut</span><span class="links"></span><span class="me">${YOU.id}@rediffitmail.com</span></div><div class="yk-cols"></div>`;
  const links = body.querySelector(".links")!;
  for (const [name, url] of [["Home", "home"], ["Scrapbook", "scrapbook"], ["Friends", "home"], ["Communities", "communities"]]) {
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
  const tasks = nav.kit.tasks;
  const main = document.createElement("div");
  main.innerHTML = `<h2>Cricket King ★</h2><div class="note"></div>
    <div class="box">"sachin is god. rest are players." <small>(your status)</small></div>
    <div class="counts"></div><div class="visitors"></div><h3>friends (87)</h3><div class="friends"></div>`;
  // what's new: Priya's scrap once she has the song; before that, her friend request
  main.querySelector(".note")!.textContent = tasks.isDone("songSent")
    ? "you have 1 new scrap from ~*~ Priya ~*~ !!!"
    : "priya_cute_angel added you as a friend (yesterday)";
  main.querySelector(".counts")!.append(
    link(`scrapbook (${scraps(nav).length})`, () => nav.go(`${SITE}/scrapbook`)), " · photos (2) · fans (3) · ",
    link("communities (23)", () => nav.go(`${SITE}/communities`)));
  // who's looked at your profile: Priya too, once you've been talking a while (the song moment)
  const visitors = ["Sunny (today)", "Neha (yesterday)", "Ankit (3 days ago)"];
  if (tasks.isDone("songMoment")) visitors.unshift("~*~ Priya ~*~ (just now)");
  main.querySelector(".visitors")!.textContent = `recent profile visitors: ${visitors.join(", ")}`;
  const friends = main.querySelector(".friends")!;
  for (const [name, photo, url] of [["Rohan", "pune", "profile/rohan"], ["Priya", "flowers", "profile/priya"], ["Sunny", "stadium", "profile/sunny"],
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

/** Your scrapbook as it is now: Priya's scrap on top once she has the song. */
function scraps(nav: Nav) {
  return nav.kit.tasks.isDone("songSent") ? [PRIYA_SCRAP, ...YOUR_SCRAPS] : YOUR_SCRAPS;
}

function scrapbook(nav: Nav): Page {
  const main = document.createElement("div");
  const list = scraps(nav);
  main.innerHTML = `<h2>scrapbook (${list.length})</h2>`;
  for (const s of list) {
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
  main.append(scrapList(FRIENDS.rohan), link("write a scrap for Rohan", () => nav.go(`${SITE}/scrap/rohan`)));
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

/** A friend's scrapbook, as shown on their profile. */
function scrapList(f: Friend): HTMLDivElement {
  const d = document.createElement("div");
  d.innerHTML = `<h3>scrapbook (${f.scraps.length})</h3>`;
  for (const [from, text] of f.scraps) {
    const sc = document.createElement("div");
    sc.className = "scrap";
    sc.innerHTML = "<b></b><div></div>";
    sc.querySelector("b")!.textContent = `${from}:`;
    sc.querySelector("div")!.textContent = text;
    d.append(sc);
  }
  return d;
}

/** One of your friends' profiles: status, about, communities, scrapbook, and a scrap to write. */
function friend(nav: Nav, id: string): Page {
  const f = FRIENDS[id];
  const main = document.createElement("div");
  main.innerHTML = `<h2></h2><div class="box"><span></span> <small>(status)</small></div><p class="about"></p><h3>communities</h3><div class="communities"></div>`;
  main.querySelector("h2")!.textContent = f.name;
  main.querySelector(".box span")!.textContent = `"${f.status}"`;
  main.querySelector(".about")!.textContent = f.about;
  const cs = main.querySelector(".communities")!;
  for (const c of f.communities) {
    const d = document.createElement("div");
    d.className = "community";
    d.textContent = c;
    cs.append(d);
  }
  main.append(scrapList(f), link(`write a scrap for ${f.name.split(" ")[0]}`, () => nav.go(`${SITE}/scrap/${id}`)));
  return { title: `yorkut.com - ${f.name}`, body: frame(person(f.photo, f.name, f.city), main, nav) };
}

/** Writing a scrap: pick one, type it out, Enter to post. (The story hears of it: "scrap:<friend>".) */
function writeScrap(nav: Nav, id: string): Page {
  const f = FRIENDS[id];
  const main = document.createElement("div");
  main.innerHTML = `<h2></h2><p class="small">Pick what to write, type it out, and Enter to post it.</p>`;
  main.querySelector("h2")!.textContent = `scrap ${f.name}`;
  const box = new ReplyBox();
  box.offer(f.drafts);
  box.onSend = (_k, text) => {
    nav.kit.tasks.complete(`scrap:${id}`);
    f.scraps.unshift([`Cricket King ★`, text]); // (it's on their scrapbook now)
    nav.go(`${SITE}/profile/${id}`);
  };
  main.append(box.el, link("cancel", () => nav.go(`${SITE}/profile/${id}`)));
  return { title: "yorkut.com - Scrap", body: frame(person(f.photo, f.name, f.city), main, nav), keys: (e) => box.key(e) };
}

/** Your communities. */
function communities(nav: Nav): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2>communities (23)</h2><p class="small">showing 6 of 23</p>`;
  for (const [id, name, members] of YOUR_COMMUNITIES) {
    const d = document.createElement("div");
    d.className = "scrap";
    d.innerHTML = "<u></u> <small></small>";
    d.querySelector("u")!.textContent = name;
    d.querySelector("small")!.textContent = `(${members} members)`;
    d.addEventListener("click", () => nav.go(`${SITE}/community/${id}`));
    main.append(d);
  }
  return { title: "yorkut.com - Communities", body: frame(person("team", "Cricket King ★", "Ajmer, Rajasthan, India"), main, nav) };
}

/** A community: what it's about, and its forum's topics. */
function community(nav: Nav, id: string): Page {
  const c = COMMUNITIES[id];
  const name = YOUR_COMMUNITIES.find(([cid]) => cid === id)?.[1] ?? id;
  const main = document.createElement("div");
  main.innerHTML = `<h2></h2><div class="box about"></div><h3>forum</h3>`;
  main.querySelector("h2")!.textContent = name;
  main.querySelector(".about")!.textContent = c.about;
  for (const t of c.topics) {
    const d = document.createElement("div");
    d.className = "scrap";
    d.innerHTML = "<u></u> <small></small>";
    d.querySelector("u")!.textContent = t.title;
    d.querySelector("small")!.textContent = `(${t.posts.length} posts)`;
    d.addEventListener("click", () => nav.go(`${SITE}/topic/${id}:${t.id}`));
    main.append(d);
  }
  main.append(link("« communities", () => nav.go(`${SITE}/communities`)));
  return { title: `yorkut.com - ${name}`, body: frame(null, main, nav) };
}

/** A forum topic: everyone's posts, and yours to add (pick one, type it out). */
function topic(nav: Nav, cid: string, t: Topic): Page {
  const main = document.createElement("div");
  main.innerHTML = `<h2></h2>`;
  main.querySelector("h2")!.textContent = t.title;
  for (const [who, text] of t.posts) {
    const d = document.createElement("div");
    d.className = "scrap";
    d.innerHTML = "<b></b><div></div>";
    d.querySelector("b")!.textContent = who;
    d.querySelector("div")!.textContent = text;
    main.append(d);
  }
  const head = document.createElement("h3");
  head.textContent = "reply";
  const box = new ReplyBox();
  box.offer(t.drafts);
  box.onSend = (_k, text) => {
    t.posts.push([YOU.id, text]);
    nav.kit.tasks.complete(`post:${cid}`);
    nav.go(`${SITE}/topic/${cid}:${t.id}`);
  };
  main.append(head, box.el, link("« back to the community", () => nav.go(`${SITE}/community/${cid}`)));
  return { title: `yorkut.com - ${t.title}`, body: frame(null, main, nav), keys: (e) => box.key(e) };
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
