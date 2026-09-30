import { addStyles } from "../css";
import type { Nav, Page } from "../apps/xplorer";

/**
 * Rediffit.com, the cafe's home page: the news portal every cafe PC opened
 * on. Headlines of the day, and links to the places people actually went.
 */
export function portal(path: string, nav: Nav): Page | null {
  if (path !== "") return null;
  addStyles("portal", CSS);
  const body = document.createElement("div");
  body.className = "rd";
  body.innerHTML = `
    <div class="rd-head"><b>rediffit</b>.com <span>India, online</span></div>
    <div class="rd-cols">
      <div class="rd-news"><h3>Top stories</h3>
        <p><b>Sensex crosses 19,000 for the first time</b><br>Markets cheer as foreign money pours in</p>
        <p><b>Team India's young guns return home as heroes</b><br>Open-top bus parade in Mumbai draws lakhs</p>
        <p><b>Monsoon leaves Rajasthan; dry spell ahead</b><br>Farmers in Ajmer, Bhilwara worried</p>
        <p><b>Diwali shopping: mobile phones with camera are this year's hot gift</b></p>
      </div>
      <div class="rd-side"><h3>Go to</h3></div>
    </div>
    <div class="rd-foot">© 2007 Rediffit.com India Ltd. All rights reserved.</div>`;
  const side = body.querySelector(".rd-side")!;
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
    side.append(a);
  }
  return { title: "Rediffit.com: India, online", body };
}

const CSS = /* css */ `
.rd { font: 12px Arial, sans-serif; color: #222; }
.rd-head { padding: 10px 14px; color: #fff; font: 22px Georgia, serif; background: linear-gradient(#d7443a, #a92a22); }
.rd-head span { font: italic 12px Arial, sans-serif; opacity: 0.85; margin-left: 8px; }
.rd-cols { display: flex; gap: 16px; padding: 10px 14px; }
.rd-news { flex: 1; }
.rd h3 { margin: 0 0 8px; color: #a92a22; font-size: 13px; border-bottom: 1px solid #e3c9c6; }
.rd-news p { margin: 0 0 10px; line-height: 1.4; }
.rd-news b { color: #1a3f8f; }
.rd-side { width: 170px; }
.rd-link { padding: 6px 8px; margin-bottom: 6px; background: #fff4e8; border: 1px solid #f0d2b0; }
.rd-link u { color: #0033cc; font-weight: bold; }
.rd-link:hover { background: #ffe8cc; }
.rd-foot { padding: 8px 14px; color: #888; font-size: 10px; border-top: 1px solid #eee; }
`;
