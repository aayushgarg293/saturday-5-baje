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
    { wait: 25 },
    { time: "5:40" },
    { they: "Dil Mil Gaye Yaar dekhte ho?" },
    { you: [
      { say: "haan kabhi kabhi", then: [{ they: "kal wala episode!!! omg" }] },
      { say: "didi dekhti hai, to thoda sa", then: [{ they: "lol" }] },
      { say: "nahi, cricket dekhta hu", then: [{ they: "boring :P" }] },
    ] },
    { wait: 15 },
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

export const THREADS: Thread[] = [priya, sunny];
