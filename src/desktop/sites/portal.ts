import { addStyles } from "../css";
import type { Nav, Page } from "../apps/xplorer";
import { MATCH } from "../cricket";
import { HOROSCOPE, POLL, STORIES } from "./news";

/**
 * Rediffit.com, the cafe's home page: the news portal every cafe PC opened
 * on. The day's stories (each opens; they're in news.ts), the live cricket
 * score (it updates by itself, ball by ball: cricket.ts), today's
 * horoscope, a poll, and links to the places people actually went.
 *
 * Pages:  (front page)  news/<id>  cricket
 */

const SITE = "www.rediffit.com";

export function portal(path: string, nav: Nav): Page | null {
  addStyles("portal", CSS);
  if (path === "") return front(nav);
  if (path === "cricket") return cricket(nav);
  if (path.startsWith("news/")) return story(nav, path.slice(5));
  return null;
}

/** The red header, the section bar, then the page. */
function frame(nav: Nav, inner: HTMLElement): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "rd";
  body.innerHTML = `<div class="rd-head"><b>rediffit</b>.com <span>India, online</span></div>
    <div class="rd-bar"></div><div class="rd-page"></div>
    <div class="rd-foot">© 2007 Rediffit.com India Ltd. All rights reserved. &nbsp; Best viewed in 800×600</div>`;
  const bar = body.querySelector(".rd-bar")!;
  for (const [name, url] of [["Home", ""], ["News", ""], ["Cricket", "cricket"], ["Movies", "news/jabwemate"], ["Business", "news/sensex"]]) {
    bar.append(link(name, () => nav.go(url ? `${SITE}/${url}` : SITE)));
  }
  body.querySelector(".rd-page")!.append(inner);
  return body;
}

function front(nav: Nav): Page {
  const inner = document.createElement("div");
  inner.className = "rd-cols";
  inner.innerHTML = `<div class="rd-news"><h3>Top stories</h3></div><div class="rd-side"></div>`;
  const news = inner.querySelector(".rd-news")!;
  STORIES.forEach((s, k) => {
    const p = document.createElement("p");
    p.innerHTML = `<small></small><br><b></b><br><span></span>`;
    p.querySelector("small")!.textContent = s.section.toUpperCase();
    p.querySelector("b")!.textContent = s.headline;
    p.querySelector("span")!.textContent = s.dek;
    if (k === 0) p.classList.add("lead");
    p.addEventListener("click", () => nav.go(`${SITE}/news/${s.id}`));
    news.append(p);
  });

  const side = inner.querySelector(".rd-side")!;
  side.append(scoreBox(nav));
  // the horoscope: every sign gets good news
  const stars = document.createElement("div");
  stars.className = "rd-box";
  stars.innerHTML = `<h3>Today's stars</h3>`;
  for (const [sign, line] of HOROSCOPE) {
    const d = document.createElement("div");
    d.className = "rd-star";
    d.innerHTML = "<b></b> <span></span>";
    d.querySelector("b")!.textContent = sign;
    d.querySelector("span")!.textContent = line;
    stars.append(d);
  }
  side.append(stars, poll(), goTo(nav));
  return { title: "Rediffit.com: India, online", body: frame(nav, inner) };
}

/** The live score box: it redraws itself after every ball (while it's on screen). */
function scoreBox(nav: Nav): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "rd-box rd-score";
  const draw = () => {
    const s = MATCH.score;
    const last = MATCH.recent(1)[0];
    box.innerHTML = `<h3>● LIVE: India v Australia</h3>
      <div class="big">IND ${s.runs}/${s.wickets} <small>(${s.over} ov)</small></div>
      <div>AUS 263/7 (50 ov)</div>
      <div class="need"></div><div class="ball"></div><u>Full scorecard »</u>`;
    box.querySelector(".need")!.textContent = s.result ?? `India need ${s.need} runs from ${s.left} balls`;
    box.querySelector(".ball")!.textContent = last ? `${last.over}: ${last.text}` : "";
    box.querySelector("u")!.addEventListener("click", () => nav.go(`${SITE}/cricket`));
  };
  draw();
  const redraw = () => (box.isConnected ? draw() : MATCH.onBall.delete(redraw));
  MATCH.onBall.add(redraw);
  return box;
}

/** The poll: vote, and see how everyone else voted (yours counted in). */
function poll(): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "rd-box";
  box.innerHTML = `<h3>Poll</h3><div class="q"></div>`;
  box.querySelector(".q")!.textContent = POLL.question;
  for (const [name] of POLL.options) {
    const row = document.createElement("div");
    row.className = "rd-option";
    row.textContent = `○ ${name}`;
    row.addEventListener("click", () => {
      // the results: each option's share, yours added
      const total = POLL.options.reduce((n, [, v]) => n + v, 0) + 1;
      box.innerHTML = `<h3>Poll results</h3>`;
      for (const [other, votes] of POLL.options) {
        const pc = Math.round(((votes + (other === name ? 1 : 0)) / total) * 100);
        const r = document.createElement("div");
        r.className = "rd-result";
        r.innerHTML = `<span></span><div style="width:${pc}%"></div><small>${pc}%</small>`;
        r.querySelector("span")!.textContent = other;
        box.append(r);
      }
      const thanks = document.createElement("small");
      thanks.textContent = "Thank you for voting! (4,812 votes)";
      box.append(thanks);
    });
    box.append(row);
  }
  return box;
}

/** The links to everywhere else. */
function goTo(nav: Nav): HTMLDivElement {
  const box = document.createElement("div");
  box.className = "rd-box";
  box.innerHTML = "<h3>Go to</h3>";
  for (const [name, url, note] of [
    ["SongzPK", "www.songzpk.com", "Latest Bollywood mp3s"],
    ["Rediffit Mail", "mail.rediffit.com", "Unlimited storage!"],
    ["Yorkut", "www.yorkut.com", "Your friends are here"],
    ["MeToob", "www.metoob.com", "Watch videos"],
  ]) {
    const a = document.createElement("div");
    a.className = "rd-link";
    a.innerHTML = "<u></u><br><small></small>";
    a.querySelector("u")!.textContent = name;
    a.querySelector("small")!.textContent = note;
    a.addEventListener("click", () => nav.go(url));
    box.append(a);
  }
  return box;
}

function story(nav: Nav, id: string): Page | null {
  const s = STORIES.find((x) => x.id === id);
  if (!s) return null;
  const inner = document.createElement("div");
  inner.className = "rd-cols";
  inner.innerHTML = `<div class="rd-article"><small></small><h1></h1><div class="dek"></div><div class="by">Rediffit News Bureau | Saturday</div></div><div class="rd-side"></div>`;
  inner.querySelector("small")!.textContent = s.section.toUpperCase();
  inner.querySelector("h1")!.textContent = s.headline;
  inner.querySelector(".dek")!.textContent = s.dek;
  const article = inner.querySelector(".rd-article")!;
  for (const para of s.body) {
    const p = document.createElement("p");
    p.textContent = para;
    article.append(p);
  }
  // more stories, and the way back
  const more = document.createElement("div");
  more.className = "rd-more";
  more.innerHTML = "<b>Also read:</b>";
  for (const other of STORIES.filter((x) => x.id !== id).slice(0, 3)) more.append(link(other.headline, () => nav.go(`${SITE}/news/${other.id}`)));
  article.append(more, link("« Back to Rediffit.com", () => nav.go(SITE)));
  inner.querySelector(".rd-side")!.append(scoreBox(nav));
  return { title: `${s.headline} - Rediffit.com`, body: frame(nav, inner) };
}

/** The full scorecard: the score, the chase, and the commentary, newest ball first. */
function cricket(nav: Nav): Page {
  const inner = document.createElement("div");
  inner.className = "rd-cricket";
  const draw = () => {
    const s = MATCH.score;
    inner.innerHTML = `<h1>India v Australia, 5th ODI</h1><div class="small">Live scorecard. This page updates automatically.</div>
      <table><tr><td>Australia</td><td>263/7</td><td>(50 ov)</td></tr><tr class="us"><td>India</td><td>${s.runs}/${s.wickets}</td><td>(${s.over} ov)</td></tr></table>
      <div class="state"></div><h3>Commentary</h3><div class="balls"></div>`;
    inner.querySelector(".state")!.textContent = s.result ?? `India need ${s.need} runs from ${s.left} balls. Required rate ${((s.need / Math.max(1, s.left)) * 6).toFixed(2)}`;
    const balls = inner.querySelector(".balls")!;
    const recent = MATCH.recent(14);
    if (!recent.length) balls.textContent = "Players are coming out after the drinks break...";
    for (const b of recent) {
      const d = document.createElement("div");
      d.className = b.out ? "out" : b.runs >= 4 ? "boundary" : "";
      d.innerHTML = "<b></b> <span></span>";
      d.querySelector("b")!.textContent = b.over;
      d.querySelector("span")!.textContent = b.text;
      balls.append(d);
    }
    inner.append(link("« Back to Rediffit.com", () => nav.go(SITE)));
  };
  draw();
  const redraw = () => (inner.isConnected ? draw() : MATCH.onBall.delete(redraw));
  MATCH.onBall.add(redraw);
  return { title: "Live Cricket Score - Rediffit.com", body: frame(nav, inner) };
}

function link(text: string, go: () => void): HTMLSpanElement {
  const a = document.createElement("span");
  a.className = "rd-a";
  a.textContent = text;
  a.addEventListener("click", go);
  return a;
}

const CSS = /* css */ `
.rd { font: 12px Arial, sans-serif; color: #222; }
.rd-head { padding: 10px 14px; color: #fff; font: 22px Georgia, serif; background: linear-gradient(#d7443a, #a92a22); }
.rd-head span { font: italic 12px Arial, sans-serif; opacity: 0.85; margin-left: 8px; }
.rd-bar { display: flex; gap: 16px; padding: 4px 14px; background: #f3e1d0; border-bottom: 1px solid #e3c9b0; }
.rd-bar .rd-a { color: #6a1a14; font-weight: bold; text-decoration: none; }
.rd-cols { display: flex; gap: 16px; padding: 10px 14px; }
.rd-news, .rd-article { flex: 1; min-width: 0; }
.rd h3 { margin: 0 0 8px; color: #a92a22; font-size: 13px; border-bottom: 1px solid #e3c9c6; }
.rd-news p { margin: 0 0 10px; line-height: 1.4; }
.rd-news p small { color: #a92a22; font-size: 9px; letter-spacing: 1px; }
.rd-news b { color: #1a3f8f; text-decoration: underline; }
.rd-news p.lead b { font-size: 15px; }
.rd-news p:hover b { color: #c0392b; }
.rd-side { width: 190px; flex: none; }
.rd-box { padding: 6px 8px; margin-bottom: 8px; background: #fff8f0; border: 1px solid #f0d2b0; }
.rd-score h3 { color: #c0392b; }
.rd-score .big { font: bold 16px Arial, sans-serif; color: #1a3f8f; }
.rd-score .need { margin-top: 4px; font-weight: bold; color: #2a6a2a; }
.rd-score .ball { margin: 4px 0; color: #555; font-size: 10px; }
.rd-score u, .rd-a { color: #0033cc; text-decoration: underline; }
.rd-star { margin-bottom: 4px; font-size: 11px; }
.rd-star b { color: #6a1a14; }
.rd-option { padding: 2px 0; color: #1a3f8f; }
.rd-option:hover { text-decoration: underline; }
.rd-result { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; font-size: 10px; }
.rd-result span { width: 80px; flex: none; }
.rd-result div { height: 8px; background: #d7443a; }
.rd-link { padding: 4px 6px; margin-bottom: 5px; background: #fff4e8; border: 1px solid #f0d2b0; }
.rd-link u { color: #0033cc; font-weight: bold; }
.rd-article small { color: #a92a22; letter-spacing: 1px; font-size: 10px; }
.rd-article h1 { margin: 4px 0; font: bold 20px Georgia, serif; color: #1a1a1a; }
.rd-article .dek { font: italic 13px Georgia, serif; color: #555; }
.rd-article .by { margin: 6px 0 10px; color: #888; font-size: 10px; }
.rd-article p { line-height: 1.55; margin: 0 0 10px; }
.rd-more { margin: 14px 0 8px; padding-top: 8px; border-top: 1px solid #eee; }
.rd-more .rd-a { display: block; margin-top: 4px; }
.rd-cricket { padding: 10px 14px; }
.rd-cricket h1 { margin: 0; font: bold 18px Georgia, serif; }
.rd-cricket .small { color: #888; font-size: 10px; margin-bottom: 8px; }
.rd-cricket table { border-collapse: collapse; margin-bottom: 6px; }
.rd-cricket td { padding: 3px 12px 3px 0; font-size: 13px; }
.rd-cricket tr.us td { font-weight: bold; color: #1a3f8f; }
.rd-cricket .state { font-weight: bold; color: #2a6a2a; margin-bottom: 10px; }
.rd-cricket .balls div { padding: 3px 0; border-bottom: 1px solid #f2f2f2; }
.rd-cricket .balls b { display: inline-block; width: 34px; color: #888; }
.rd-cricket .balls .out span { color: #c0392b; font-weight: bold; }
.rd-cricket .balls .boundary span { color: #2a6a2a; font-weight: bold; }
.rd-cricket > .rd-a { display: inline-block; margin-top: 10px; }
.rd-foot { padding: 8px 14px; color: #888; font-size: 10px; border-top: 1px solid #eee; }
`;
