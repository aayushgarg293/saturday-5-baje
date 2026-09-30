import { fileIcon } from "../apps/basic";
import type { Nav, Page } from "../apps/xplorer";
import { addStyles } from "../css";
import { sizeLabel, type VFile } from "../files";
import { openBox } from "../openBox";
import { Transfer, progressBar } from "../progress";
import { YOU } from "../story";
import { Fields, TypeField } from "../typing";

/**
 * Rediffit Mail (a look-alike, BRIEF.md): sign in, the inbox, reading a
 * mail, writing one with a photo attached (the attachment uploads slowly,
 * as on dial-up), and "Your mail has been sent".
 *
 * Pages:  (sign in)  inbox  read/<n>  compose  sent
 *
 * Mailing Rohan the team photo is a story task ("photoMailed", story.ts).
 */

const SITE = "mail.rediffit.com";
const ADDRESS = `${YOU.id}@rediffitmail.com`;
/** What his fingers type (shown as dots). */
const PASSWORD = "sachin10";
/** Uploading an attachment: KB per second, as the numbers show it (progress.ts: really 10× that). */
const UP_SPEED = 4;

/** The inbox, newest first. */
const MAILS = [
  { from: "rohan_rockstar", subject: "pune pahunch gaya", date: "May 6",
    body: "yaar pune pahunch gaya.\n\nghar bada hai but koi dost nahi hai. school monday se shuru.\nsab ko bolna miss kar raha hu. sunny ko bolna meri position pe mat khele.\n\nsaturday 5 baje yaaho pe. pakka!!!\n\n- rohan" },
  { from: "ankit bhaiya", subject: "Fwd: Fwd: Fwd: FW: send this to 10 ppl or u will get BAD LUCK!!!", date: "May 3",
    body: "THIS IS NOT A JOKE!!! A boy in Delhi did not forward this mail and he failed in his exams.\nSend this to 10 people in 10 minutes and you will get good news tonight!!!\n\n>>>>>>> forwarded by ankit\n>>>>>>> forwarded by rinku\n>>>>>>> forwarded by pappu" },
  { from: "Intl Lottery Dept", subject: "Congratulations!!! You have WON Rs 1,00,00,000", date: "Apr 29",
    body: "Dear Winner,\n\nYour email ID has WON Rs 1,00,00,000 in our international email lottery!!!\nTo claim, send your name, address and Rs 5,000 processing fee.\n\nRegards,\nMr. John Smith\nClaims Officer" },
  { from: "Rediffit Mail Team", subject: "Welcome to Rediffit Mail!", date: "Jan 14",
    body: "Welcome to Rediffit Mail!\n\nYou now have UNLIMITED storage. Never delete a mail again!\n\nThe Rediffit Mail Team" },
];

let signedIn = false;

export function rediffit(path: string, nav: Nav): Page | null {
  addStyles("rediffit", CSS);
  if (!signedIn || path === "") return signedIn ? inbox(nav) : signIn(nav);
  if (path === "inbox") return inbox(nav);
  if (path.startsWith("read/")) return read(nav, Number(path.slice(5)));
  if (path === "compose") return compose(nav);
  if (path === "sent") return sent(nav);
  return null;
}

/** The red header, and (signed in) the folders down the left. */
function frame(inner: HTMLElement, nav: Nav, withFolders = true): HTMLDivElement {
  const body = document.createElement("div");
  body.className = "rf";
  body.innerHTML = `<div class="rf-head"><b>rediffit</b> mail<span></span></div><div class="rf-cols"></div>`;
  if (withFolders) body.querySelector(".rf-head span")!.textContent = ADDRESS;
  const cols = body.querySelector(".rf-cols")!;
  if (withFolders) {
    const side = document.createElement("div");
    side.className = "rf-side";
    const write = document.createElement("div");
    write.className = "rf-compose";
    write.textContent = "Write Mail";
    write.addEventListener("click", () => nav.go(`${SITE}/compose`));
    side.append(write);
    for (const [name, url] of [["Inbox (1)", "inbox"], ["Sent", "inbox"], ["Drafts", "inbox"], ["Spam (212)", "inbox"]]) {
      const f = document.createElement("div");
      f.className = "rf-folder";
      f.textContent = name;
      f.addEventListener("click", () => nav.go(`${SITE}/${url}`));
      side.append(f);
    }
    cols.append(side);
  }
  const main = document.createElement("div");
  main.className = "rf-main";
  main.append(inner);
  cols.append(main);
  return body;
}

function signIn(nav: Nav): Page {
  const box = document.createElement("div");
  box.className = "rf-signin";
  box.innerHTML = `<h3>Sign in to Rediffit Mail</h3><div class="row">Rediffit ID: </div><div class="row">Password: </div>
    <div class="row small"><input type="checkbox" disabled> Remember me (not on a shared computer!)</div>
    <div class="row"><span class="xp-button go">Sign In</span></div>`;
  const id = new TypeField(YOU.id);
  const pw = new TypeField(PASSWORD, true);
  const rows = box.querySelectorAll(".row");
  rows[0].append(id.el);
  rows[1].append(pw.el);
  const fields = new Fields([id, pw]);
  const go = () => {
    if (!fields.complete) return;
    signedIn = true;
    nav.go(`${SITE}/inbox`);
  };
  fields.onEnter = go;
  box.querySelector(".go")!.addEventListener("click", go);
  return { title: "Rediffit Mail: Sign in", body: frame(box, nav, false), keys: (e) => fields.key(e) };
}

function inbox(nav: Nav): Page {
  const list = document.createElement("table");
  list.className = "rf-list";
  list.innerHTML = `<tr><th>From</th><th>Subject</th><th>Date</th></tr>`;
  MAILS.forEach((m, k) => {
    const r = document.createElement("tr");
    r.className = k === 0 ? "unread" : "";
    r.innerHTML = "<td></td><td></td><td></td>";
    const [a, b, c] = r.children;
    a.textContent = m.from;
    b.textContent = m.subject;
    c.textContent = m.date;
    r.addEventListener("click", () => nav.go(`${SITE}/read/${k}`));
    list.append(r);
  });
  return { title: "Rediffit Mail: Inbox", body: frame(list, nav) };
}

function read(nav: Nav, k: number): Page | null {
  const m = MAILS[k];
  if (!m) return null;
  const d = document.createElement("div");
  d.className = "rf-read";
  d.innerHTML = `<div class="meta"><b>From:</b> <span></span><br><b>Subject:</b> <span></span></div><pre></pre>`;
  const [from, subject] = d.querySelectorAll(".meta span");
  from.textContent = m.from;
  subject.textContent = m.subject;
  d.querySelector("pre")!.textContent = m.body;
  return { title: `Rediffit Mail: ${m.subject}`, body: frame(d, nav) };
}

function compose(nav: Nav): Page {
  const kit = nav.kit;
  const d = document.createElement("div");
  d.className = "rf-write";
  d.innerHTML = `<div class="row"><label>To:</label></div><div class="row"><label>Subject:</label></div>
    <div class="row"><label></label><span class="xp-button attach">Attach Files</span><span class="files"></span></div>
    <div class="row body"><label></label></div>
    <div class="row"><label></label><span class="xp-button send">Send</span> <span class="note"></span></div>`;
  const to = new TypeField("rohan_rockstar@rediffitmail.com");
  const subject = new TypeField("team ki photo");
  const message = new TypeField("le bhai. sab tujhe miss karte hai!!");
  const rows = d.querySelectorAll(".row");
  rows[0].append(to.el);
  rows[1].append(subject.el);
  rows[3].append(message.el);
  const fields = new Fields([to, subject, message]);
  const filesEl = d.querySelector<HTMLSpanElement>(".files")!;
  const note = d.querySelector<HTMLSpanElement>(".note")!;

  let attached: VFile | null = null;
  let uploading = false;
  d.querySelector(".attach")!.addEventListener("click", () => {
    if (uploading) return;
    openBox(kit, { title: "Choose File", folder: "pendrive", onPick: (file) => {
      uploading = true;
      attached = null;
      filesEl.innerHTML = "";
      const pic = document.createElement("span");
      pic.className = "thumb";
      pic.style.background = fileIcon(file);
      const bar = progressBar();
      const label = document.createElement("span");
      filesEl.append(pic, bar.el, label);
      const transfer = new Transfer(file.size, UP_SPEED, () => {
        stop();
        uploading = false;
        attached = file;
        bar.el.remove();
        label.textContent = ` ${file.name} (${sizeLabel(file.size)}) ✓`;
      });
      const stop = kit.tick((dt) => {
        transfer.update(dt);
        if (transfer.done) return; // (its last step already wrote "✓")
        bar.set(transfer.fraction);
        label.textContent = ` Attaching ${file.name}... ${Math.floor(transfer.fraction * 100)}% please wait`;
      });
    } });
  });

  const send = () => {
    if (!to.complete) return (note.textContent = "Please enter an email address in the To field.");
    if (uploading) return (note.textContent = "Please wait: your file is still being attached.");
    // the team photo is what Rohan asked for; another photo, he wonders why (story.ts, REACTIONS)
    if (attached) kit.tasks.complete(attached.tag === "teamPhoto" ? "photoMailed" : "wrongPhoto");
    nav.go(`${SITE}/sent`);
  };
  fields.onEnter = send;
  d.querySelector(".send")!.addEventListener("click", send);
  return { title: "Rediffit Mail: Write Mail", body: frame(d, nav), keys: (e) => fields.key(e) };
}

function sent(nav: Nav): Page {
  const d = document.createElement("div");
  d.className = "rf-sent";
  d.innerHTML = `<b>Your mail has been sent.</b><br><br><u>Back to Inbox</u>`;
  d.querySelector("u")!.addEventListener("click", () => nav.go(`${SITE}/inbox`));
  return { title: "Rediffit Mail: Mail sent", body: frame(d, nav) };
}

const CSS = /* css */ `
.rf { font: 12px Arial, sans-serif; color: #222; min-height: 100%; }
.rf-head { display: flex; align-items: baseline; gap: 6px; padding: 8px 14px; color: #fff; font: 20px Georgia, serif;
  background: linear-gradient(#d7443a, #a92a22); }
.rf-head span { margin-left: auto; font: 11px Arial, sans-serif; }
.rf-cols { display: flex; }
.rf-side { width: 120px; padding: 8px; background: #f7efe6; border-right: 1px solid #e6d3bf; min-height: 380px; }
.rf-compose { margin-bottom: 10px; padding: 5px; text-align: center; color: #fff; font-weight: bold; background: #c0392b; border-radius: 3px; }
.rf-folder { padding: 4px 2px; color: #0033cc; }
.rf-folder:hover, .rf-list tr:hover td, .rf-sent u:hover { text-decoration: underline; }
.rf-main { flex: 1; padding: 10px 14px; min-width: 0; }
.rf-signin { width: 300px; margin: 30px auto; padding: 16px; border: 1px solid #e6d3bf; background: #fffaf4; }
.rf-signin h3 { margin: 0 0 12px; color: #a92a22; }
.rf-signin .row { margin-bottom: 10px; }
.rf-signin .xp-field { width: 160px; }
.rf .small { color: #888; font-size: 10px; }
.rf-list { width: 100%; border-collapse: collapse; }
.rf-list th { text-align: left; padding: 4px; background: #f0e2d4; }
.rf-list td { padding: 5px 4px; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.rf-list tr.unread td { font-weight: bold; }
.rf-read .meta { padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #eee; line-height: 1.6; }
.rf-read pre { font: 12px Arial, sans-serif; white-space: pre-wrap; }
.rf-write .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.rf-write label { width: 56px; text-align: right; font-weight: bold; }
.rf-write .xp-field { flex: 1; }
.rf-write .body .xp-field { height: 90px; align-self: stretch; }
.rf-write .files { display: flex; align-items: center; gap: 6px; }
.rf-write .files .xp-progress { width: 120px; }
.rf-write .thumb { width: 40px; height: 30px; border: 1px solid #999; }
.rf-write .note { color: #c0392b; }
.rf-sent { padding: 20px; }
.rf-sent u { color: #0033cc; }
`;
