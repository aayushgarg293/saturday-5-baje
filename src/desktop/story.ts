import type { Thread } from "./thread";

/**
 * THE STORY ON THE COMPUTER, as data (BRIEF.md: "The story on the computer").
 * Edit freely: the words, the pauses, the times. The engine that plays it
 * is `thread.ts`; what each kind of step does is explained there.
 *
 * A quick guide to the steps:
 *   { they: "hiii" }          they type for a moment ("typing…"), then it arrives
 *   { you: [...] }            your turn: pick one reply, type it out, Enter sends.
 *                             A reply's `then` plays only if you picked it.
 *   { wait: 5 }               nothing for 5 seconds (real seconds)
 *   { hesitate: 4 }           they start typing… then stop, and say nothing
 *   { time: "5:05" }          the clock moves on to 5:05 pm
 *   { status: "offline" }     they go offline / idle / online
 *   { buzz: true }            BUZZ! (the window shakes)
 *   { mark: "rohanBrb" }      note a moment, so another conversation can wait
 *                             for it (a `waitFor`, or a thread's `start.when`)
 *   { waitFor: "songSent", … } wait until you've done a task (Priya has the
 *                             song), with nudges meanwhile, then `done` plays;
 *                             or after `giveUpAfter` seconds, `notDone`
 *
 * The tasks: "songSent" (a Jab We Mate song sent to Priya with Yaaho!'s
 * Send File; the songs come from SongzPK in Internet Xplorer), and
 * "photoMailed" (the team photo from the pen drive, mailed to Rohan with
 * Rediffit Mail).
 *
 * The two conversations take turns around each other: Rohan comes online
 * once the song moment is over; Priya's later lines wait for Rohan's "brb"
 * and his return, so the two windows are busy at the same time.
 *
 * Chat style, as people typed then: lowercase, Hinglish in Roman letters,
 * "kk", "brb", "gtg", "lol", ":P", "hiii", too many "!!!".
 */

/** Your Yaaho! ID. */
export const YOU = { id: "cricket_king_07", status: "Available" };

export type Presence = "online" | "idle" | "offline";
export type Buddy = { id: string; presence: Presence; message: string };

/** The friends list, in order. */
export const BUDDIES: Buddy[] = [
  { id: "priya_cute_angel", presence: "online", message: "exams khatam!!! :D" },
  { id: "sunny_4_six", presence: "online", message: "India jeetega!!" },
  { id: "vicky_the_rocker", presence: "idle", message: "Rodies audition next month!!" },
  { id: "rohan_rockstar", presence: "offline", message: "PUNE :)" },
  { id: "neha_sweetu", presence: "offline", message: "~*~ smile always ~*~" },
  { id: "ankit_bhaiya", presence: "offline", message: "Prison Brake S3 anyone??" },
];

/** Priya from tuition: they've never really talked. She's online "till 6". */
const priya: Thread = {
  buddy: "priya_cute_angel",
  start: { after: 20 }, // seconds after you're on the desktop
  steps: [
    { time: "4:48" },
    { they: "hiii" },
    { you: [
      { say: "hi" },
      { say: "hiii :)" },
      { say: "hello!!", then: [{ they: "lol hello" }] },
    ] },
    { hesitate: 3 },
    { wait: 2 },
    { they: "tuition ka homework kiya?" },
    { you: [
      { say: "nahi yaar :(", then: [{ they: "same :P" }] },
      { say: "haan, bas sum 14 nahi hua", then: [{ they: "mera bhi nahi hua!!" }, { they: "sir pakka daantenge" }] },
      { say: "kaunsa homework?? :P", then: [{ they: "lol" }, { they: "chapter 5 ke 20 sums the" }] },
    ] },
    { time: "4:55" },
    { wait: 4 },
    { they: "tum yaaho pe kabhi dikhte nahi" },
    { you: [
      { say: "ghar pe net nahi hai, cafe aana padta hai", then: [{ they: "same, mere ghar pe bhi nahi :(" }] },
      { say: "saturday ko aata hu bas", then: [{ they: "acha" }] },
      { say: "ab dikhunga :)", then: [{ they: ":)" }] },
    ] },
    { wait: 5 },
    { they: "tumne Jab We Mate dekhi?" },
    { you: [
      { say: "haan!! 2 baar", then: [{ they: "me 3 baar :D" }] },
      { say: "nahi abhi tak", then: [{ they: "dekhna!! bahut acchi hai" }] },
      { say: "haan, train wala scene best hai", then: [{ they: "haan!!! same" }] },
    ] },
    { time: "5:05" },
    { hesitate: 4 },
    { they: "uske gaane bhi mast hai" },
    { you: [
      { say: "haan" },
      { say: "mere paas mp3 hai, pen drive me de dunga", then: [{ they: "sachii?? thanks!!" }] },
      { say: "tumhe kaunsa pasand hai?", then: [{ they: "sab :P" }] },
    ] },
    { wait: 4 },
    // the song: he has to find it, download it, and send it (a task: see the top)
    { they: "wo train wala gaana hai tumhare paas?" },
    { they: "yaaho pe bhej do na plzzz" },
    { you: [
      { say: "haan abhi bhejta hu" },
      { say: "ruk, dhundhta hu" },
      { say: "rail gaadi wala? haan", then: [{ they: "haan wahi!!" }] },
    ] },
    { they: "songzpk pe sab milta hai" },
    { waitFor: "songSent", nudges: ["??", "mila?", "hello"], giveUpAfter: 300,
      done: [{ they: "mil gaya!!! thanks :D" }, { they: "repeat pe sun rahi hu" }],
      notDone: [{ they: "koi nahi, tuition me pen drive me de dena :)" }] },
    { mark: "songMoment" }, // (Rohan comes online soon after this)
    { wait: 6 },
    { they: "acha sunn" },
    { hesitate: 5 },
    { they: "kuch nahi :P" },
    { you: [
      { say: "bolo na", then: [{ hesitate: 3 }, { they: "baad me bataungi" }] },
      { say: "?", then: [{ they: "kuch nahi sach me :P" }] },
      { say: "ok :P" },
    ] },
    { time: "5:15" },
    { wait: 5 },
    { they: "6 baje tak hi online hu, fir tuition ka kaam" },
    // (quiet while you catch up with Rohan; back when he goes brb)
    { waitFor: "rohanBrb", giveUpAfter: 400 },
    { time: "5:40" },
    { they: "Dil Mil Gaye Yaar dekhte ho?" },
    { you: [
      { say: "haan kabhi kabhi", then: [{ they: "kal wala episode!!! omg" }] },
      { say: "didi dekhti hai, to thoda sa", then: [{ they: "lol" }] },
      { say: "nahi, cricket dekhta hu", then: [{ they: "boring :P" }] },
    ] },
    { waitFor: "rohanBack", giveUpAfter: 120 },
    { wait: 10 },
    { time: "6:00" },
    { they: "arre 6 baj gaye" },
    { they: "gtg... see u in tuition :)" },
    { you: [
      { say: "bye :)" },
      { say: "bye!! tuition me milte hai" },
      { say: "ok... bye" },
    ] },
    { they: "byee" },
    { status: "offline" },
    { mark: "priyaGone" },
  ],
};

/**
 * Rohan, the best friend who moved to Pune (the spine of the story). Their
 * promise: every Saturday, 5 pm, here. Today is the first Saturday, and
 * he's late too.
 */
const rohan: Thread = {
  buddy: "rohan_rockstar",
  start: { when: "songMoment", after: 12 },
  steps: [
    { time: "5:25" },
    { status: "online" },
    { wait: 3 },
    { they: "oyeeee" },
    { they: "sorry late ho gaya, yahan cafe me light chali gayi thi" },
    { you: [
      { say: "kab se wait kar raha tha!!", then: [{ they: "sorry bhai :(" }] },
      { say: "koi nahi yaar" },
      { say: "aa gaya finally :P", then: [{ they: "lol" }] },
    ] },
    { they: "kaisa hai?" },
    { you: [
      { say: "theek hu. tu bata, pune kaisa hai?" },
      { say: "bore ho raha hu tere bina", then: [{ they: "same yaar" }] },
      { say: "mast. tu bata" },
    ] },
    { hesitate: 3 },
    { they: "pune bada hai yaar. sab english me baat karte hai school me" },
    { they: "koi dost nahi bana abhi tak" },
    { you: [
      { say: "ban jayenge, tension mat le" },
      { say: "wahan bhi cricket khel", then: [{ they: "yahan sab football khelte hai lol" }] },
      { say: "wapas aaja :P", then: [{ they: "kaash" }] },
    ] },
    { wait: 3 },
    { they: "prison brake ka season 3 dekha?" },
    { you: [
      { say: "haan!!! wo tattoo wala scene", then: [{ they: "bhai kya dimaag hai uska" }] },
      { say: "nahi, ghar pe cable nahi aata", then: [{ they: "cd le le, yahan sab ke paas hai" }] },
      { say: "spoiler mat dena!!", then: [{ they: "lol ok" }] },
    ] },
    { they: "yorkut pe pune ki photos daali hai, dekhi?" },
    { you: [
      { say: "haan dekhi", then: [{ they: "school wali mast hai na" }] },
      { say: "abhi dekhta hu" },
      { say: "wo sab kaun hai photo me?", then: [{ they: "school ke log" }] },
    ] },
    { time: "5:35" },
    { they: "aur team kaisi hai mere bina? :P" },
    { you: [
      { say: "bekaar, har match haar rahe hai", then: [{ they: "hahaha obviously" }] },
      { say: "tu hota to jeet jaate", then: [{ they: ":)" }] },
      { say: "sunny captain ban gaya lol", then: [{ they: "sunny??? lol team gayi" }] },
    ] },
    // the photo: from the pen drive, by Rediffit Mail (a task: see the top)
    { they: "acha sun, wo team wali photo mail kar na" },
    { they: "yahan sab ko dikhani hai apni team" },
    { they: "rediffit pe, rohan_rockstar@rediffitmail.com" },
    { you: [
      { say: "haan pen drive me hai, abhi bhejta hu" },
      { say: "ruk bhejta hu" },
      { say: "pehle ye bata school kaisa hai", then: [{ they: "bekaar. pehle photo :P" }] },
    ] },
    { waitFor: "photoMailed", nudges: ["bheja?", "oye", "photo???"], giveUpAfter: 300,
      done: [{ they: "aa gaya!!!" }, { they: "sab kitne bade lag rahe hai" }, { they: "sunny ka haircut dekh lol" }],
      notDone: [{ they: "chal koi nahi, baad me bhej dena" }] },
    { wait: 3 },
    { they: "kiske saath chat kar raha hai?? :P" },
    { they: "reply late de raha hai" },
    { you: [
      { say: "kisi ke saath nahi yaar", then: [{ they: "haan haan :P" }] },
      { say: "tuition wali ek ladki...", then: [{ they: "oyeeee!!! :P :P" }, { they: "naam bata" }] },
      { say: "tu nahi jaanta usko", then: [{ they: "matlab koi hai!!! :P" }] },
    ] },
    { wait: 3 },
    { they: "brb, papa ko computer chahiye 5 min" },
    { status: "idle" },
    { mark: "rohanBrb" }, // (Priya's turn meanwhile)
    { wait: 45 },
    { status: "online" },
    { buzz: true },
    { they: "aa gaya" },
    { mark: "rohanBack" },
    { they: "metoob pe T20 final ka last over dekh, abhi bhi goosebumps" },
    { you: [
      { say: "dekh raha hu... load ho raha hai", then: [{ they: "lol cafe ka net" }] },
      { say: "100 baar dekh chuka hu" },
      { say: "cafe me nahi chalta, bahut slow hai", then: [{ they: "yahan bhi same :(" }] },
    ] },
    { they: "diwali pe ajmer aaunga shayad!!" },
    { you: [
      { say: "sachii??? pakka aana", then: [{ they: "papa se baat karunga" }] },
      { say: "phir match rakhte hai colony me", then: [{ they: "haan!!! purani team" }] },
      { say: "patakhe le aana pune se :P", then: [{ they: "lol" }] },
    ] },
    { waitFor: "priyaGone", giveUpAfter: 90 },
    { wait: 6 },
    { time: "6:10" },
    { they: "ok mummy bula rahi, khana ready hai" },
    { they: "next saturday pakka?" },
    { you: [
      { say: "pakka!!" },
      { say: "pakka. 5 baje. late mat hona", then: [{ they: "tu bhi :P" }] },
      { say: "haan bhai pakka" },
    ] },
    { they: "bye :)" },
    { status: "offline" },
  ],
};

/** Sunny, from the colony team: busy with the match. Only if you message him. */
const sunny: Thread = {
  buddy: "sunny_4_six",
  start: "whenYouOpenTheChat",
  steps: [
    { you: [{ say: "hi" }, { say: "kya kar raha hai" }, { say: "oye sunny" }] },
    { they: "match dekh raha hu" },
    { they: "baad me baat karte" },
    { status: "idle" },
  ],
};

export const THREADS: Thread[] = [priya, rohan, sunny];

/** Quick reactions to things you do (not part of a conversation): who says what. */
export const REACTIONS: Record<string, { buddy: string; says: string }> = {
  "wrongFile:priya_cute_angel": { buddy: "priya_cute_angel", says: "ye kaunsa gaana hai?? :P" },
  "wrongFile:sunny_4_six": { buddy: "sunny_4_six", says: "ye kya bheja?" },
  wrongPhoto: { buddy: "rohan_rockstar", says: "ye kaunsi photo hai lol. team wali bhej na" },
  testimonial: { buddy: "priya_cute_angel", says: "testimonial?!?! :) :) thanks!!!" },
};
