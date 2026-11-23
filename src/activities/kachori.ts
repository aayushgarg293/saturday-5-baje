import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import { kachori } from "../people/props";
import type { KachoriCrew } from "../people/sellers";
import { say } from "../ui/caption";
import { StallView, Steam, YourArm, anyOf, dona, edgeTint } from "./atTheStall";

/**
 * A kachori at the first stall in the bazaar: walk up, E, and you're standing
 * at the stove with a dona held out.
 *
 *   1. "Kitni du? Ek ya do?" (1, 2).
 *   2. He lifts a fresh one out of the oil with his jhara, lets it drain, and
 *      tips it into your dona. It's steaming: straight out of the kadhai.
 *   3. E bites it (three bites each). Bite while it's still steaming and you
 *      burn your tongue ("Haaye! Garam!"); F blows on it, and it cools much
 *      faster. Steam shows how hot it still is.
 *   4. "Paanch rupaye." And you step back.
 *
 * Q any time: "bas bhaiya". While you're at the stall, the player can't walk.
 */

type Stage = "off" | "arriving" | "choosing" | "waiting" | "eating" | "paying" | "leaving";

/** Bites in a kachori; what one costs. */
const BITES = 3;
const PRICE = 5;
/** How fast a kachori cools by itself, and how much one blow cools it (heat goes from 1 to 0). */
const COOLS = 0.035;
const BLOW = 0.3;
/** Biting while it's hotter than this burns your tongue. */
const TOO_HOT = 0.45;
/** How far the mouse can turn your head (radians). */
const TURN = { yaw: 0.9, up: 0.5, down: 0.45 };

const LINES = {
  ask: "Kitni du? Ek ya do?",
  chose: { 1: "Ek, bhaiya.", 2: "Do, bhaiya." },
  ok: { 1: "Abhi lo. Garam garam.", 2: "Do. Abhi lo, garam garam." },
  served: "Lo. Chutney daal di hai.",
  burnt: ["Haaye! Garam!", "Ssss… zabaan jal gayi!", "Aah! Garam hai!"],
  warn: "Phoonk ke khao, beta! Abhi kadhai se nikli hai.",
  blow: "Phoo… phoo…",
  tasty: ["Mmm… ekdum khasta.", "Wah, bhaiya!"],
  pay: (n: number) => (n <= 1 ? "Paanch rupaye." : "Das rupaye."),
  bye: "Phir aana!",
  enough: "Bas, bhaiya.",
};

export class KachoriStall {
  stage: Stage = "off";
  private view: StallView;
  private arm: YourArm;
  private steam: Steam;
  private burn = edgeTint("255,90,40");
  private leaf = dona(0.1);
  private chutney: THREE.Mesh;
  private yours = kachori();
  private wanted: 1 | 2 = 1;
  private served = 0; // kachoris he's made you so far
  private clock = -1; // seconds into his serve (−1: he isn't making one)
  private inDona = false;
  private bitesLeft = 0;
  private heat = 0; // how hot the one in your dona is (1 fresh, 0 cool)
  private burnt = 0; // your tongue (fades)
  private warned = false;
  private blew = false;
  private bite: { t: number; from: THREE.Vector3 } | null = null;
  private time = 0;
  private timers: number[] = [];

  constructor(
    camera: THREE.PerspectiveCamera,
    private player: Player,
    input: Input,
    private stall: KachoriCrew,
    scene: THREE.Scene,
  ) {
    this.view = new StallView(camera, input, TURN);
    this.arm = new YourArm(scene);
    this.steam = new Steam(scene);
    // a little pool of chutney at the bottom of the dona, once the kachori's in
    this.chutney = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 12), new THREE.MeshBasicMaterial({ color: 0x6b3a1e }));
    this.chutney.visible = false;
    this.leaf.position.copy(stall.you.held);
    this.chutney.position.copy(stall.you.held).add(new THREE.Vector3(0, -0.012, 0));
    this.yours.scale.setScalar(1.2); // (close to your eyes it would look small otherwise)
    this.yours.visible = false;
    scene.add(this.leaf, this.chutney, this.yours);
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  /** Standing in front of the stove, on the street? */
  canStart(): boolean {
    const p = this.player.pos, s = this.stall.you.stand;
    return this.stage === "off" && !this.player.frozen && p.y < 0.5 && Math.hypot(p.x - s.x, p.z - s.z) < 1.4;
  }

  /** What the hint says when you're near enough to start. */
  offer(): string {
    return `[E] kachori khao (₹${PRICE} ki ek)`;
  }

  start() {
    if (!this.canStart()) return;
    this.stage = "arriving";
    this.served = 0;
    this.warned = this.blew = false;
    this.player.frozen = true;
    this.view.arrive(this.stall.you.stand, this.stall.you.looks);
    this.leaf.visible = true;
    this.arm.place(this.view.eye, this.view.baseYaw, this.stall.you.held.clone().add(new THREE.Vector3(0, -0.06, 0)));
  }

  prompt(): string | null {
    switch (this.stage) {
      case "choosing": return "[1] ek kachori    [2] do kachori";
      case "eating": return this.inDona ? "[E] khao    [F] phoonko    [Q] bas" : "[Q] bas";
      case "waiting": return "[Q] bas";
      default: return null;
    }
  }

  /** A key while you're at the stall. Returns true if it was for this. */
  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "choosing") {
      if (code === "Digit1" || code === "Digit2") this.choose(code === "Digit1" ? 1 : 2);
    } else if (this.stage === "eating" || this.stage === "waiting") {
      if (code === "KeyE") this.eat();
      if (code === "KeyF") this.blow();
      if (code === "KeyQ") this.pay(true);
    }
    return true; // (at the stall, every key is for this: no walking off with a dona in your hand)
  }

  /** A click: a bite. */
  click() {
    if (this.stage === "eating") this.eat();
  }

  update(dt: number) {
    if (!this.active) return;
    this.time += dt;
    this.burnt = Math.max(0, this.burnt - dt * 0.4);
    this.burn.set(this.burnt);
    const chew = this.bite ? Math.sin(this.bite.t * 14) * 0.012 : 0;
    const step = this.view.update(dt, chew);
    if (step === "arrived") {
      this.stage = "choosing";
      say("Bhaiya", LINES.ask, 4);
    }
    if (step === "left") return this.finish();
    if (this.view.easing) return;

    // his serve: the kachori lands in your dona partway through
    if (this.clock >= 0) {
      const before = this.clock;
      this.clock += dt;
      if (before < this.stall.you.lands && this.clock >= this.stall.you.lands) this.lands();
      if (this.clock >= this.stall.you.takes) this.clock = -1;
    }

    // it cools by itself, and steams while it's hot
    if (this.inDona) this.heat = Math.max(0, this.heat - dt * COOLS);
    const top = this.yours.position.clone().add(new THREE.Vector3(0, 0.02, 0));
    this.steam.update(dt, this.time, top, this.inDona && !this.bite ? this.heat : 0);

    // a bite: up to your mouth, a piece gone, and back into the dona (the last one doesn't come back)
    if (this.bite) {
      this.bite.t += dt;
      const t = this.bite.t, mouth = this.view.mouth();
      if (t < 0.3) this.yours.position.lerpVectors(this.bite.from, mouth, (t / 0.3) ** 2);
      else if (this.bitesLeft > 0 && t < 0.65) this.yours.position.lerpVectors(mouth, this.bite.from, (t - 0.3) / 0.35);
      else if (this.bitesLeft > 0) this.yours.position.copy(this.bite.from);
      this.yours.visible = this.bitesLeft > 0 || t < 0.3;
      if (t > 0.9) this.bite = null;
    }
  }

  private choose(n: 1 | 2) {
    this.wanted = n;
    say("You", LINES.chose[n], 2.2);
    this.later(2300, () => say("Bhaiya", LINES.ok[n], 2.2));
    this.stage = "waiting";
    this.later(1200, () => this.serve());
  }

  /** He starts making you one. */
  private serve() {
    if (this.stage !== "waiting") return;
    this.stall.serveYou();
    this.clock = 0;
    this.served++;
  }

  /** It's in your dona, steaming. */
  private lands() {
    if (this.stage === "paying" || this.stage === "leaving") return; // (you said "bas" while he was making it)
    this.inDona = true;
    this.bitesLeft = BITES;
    this.heat = 1;
    this.chutney.visible = true;
    this.yours.visible = true;
    this.yours.scale.setScalar(1.2);
    this.yours.position.copy(this.stall.you.held).add(new THREE.Vector3(0, 0.022, 0));
    this.stage = "eating";
    if (this.served === 1) this.later(600, () => say("Bhaiya", LINES.served, 2.5));
  }

  private eat() {
    if (!this.inDona || this.bite || this.stage !== "eating") return;
    this.bitesLeft--;
    this.bite = { t: 0, from: this.yours.position.clone() };
    this.yours.scale.setScalar(1.2 * (0.45 + 0.55 * (this.bitesLeft / BITES)));
    if (this.heat > TOO_HOT) {
      this.burnt = 0.9;
      this.later(350, () => say("You", anyOf(LINES.burnt), 2.2));
      if (!this.warned) {
        this.warned = true;
        this.later(2500, () => say("Bhaiya", LINES.warn, 3));
      }
    } else if (this.bitesLeft === 0 && this.served === this.wanted) {
      this.later(500, () => say("You", anyOf(LINES.tasty), 2));
    }
    if (this.bitesLeft > 0) return;
    // that one's finished: the next, or that's it
    this.inDona = false;
    if (this.served < this.wanted) {
      this.stage = "waiting";
      this.later(900, () => this.serve());
    } else this.later(1400, () => this.pay(false));
  }

  /** Blow on it: it cools a lot, and the steam blows away from you. */
  private blow() {
    if (!this.inDona || this.bite) return;
    this.heat = Math.max(0, this.heat - BLOW);
    const ahead = new THREE.Vector3(-Math.sin(this.view.baseYaw), 0, -Math.cos(this.view.baseYaw));
    this.steam.blow(ahead);
    this.view.leanIn(true);
    this.later(450, () => this.view.leanIn(false));
    if (!this.blew) {
      this.blew = true;
      say("You", LINES.blow, 1.5);
    }
  }

  /** Done (or "bas", early): he asks for his money; you pay and step back. */
  private pay(early: boolean) {
    if (this.stage === "paying" || this.stage === "leaving") return;
    this.stage = "paying";
    if (early) say("You", LINES.enough, 2);
    const owed = Math.max(1, this.served);
    this.later(early ? 2100 : 300, () => say("Bhaiya", LINES.pay(owed), 3));
    this.later(early ? 5300 : 3500, () => say("Bhaiya", LINES.bye, 2.5));
    this.later(early ? 5600 : 3800, () => {
      this.stage = "leaving";
      this.inDona = false;
      this.clock = -1;
      for (const m of [this.yours, this.leaf, this.chutney]) m.visible = false;
      this.arm.hide();
      this.steam.hide();
      this.view.leave();
    });
  }

  /** Back on your feet, a step back from the stall. */
  private finish() {
    const at = this.view.stepBack();
    this.player.place(at.x, at.z, this.view.baseYaw, -0.1);
    this.player.frozen = false;
    this.stage = "off";
    this.burnt = 0;
    this.burn.set(0);
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  /** Do something in a moment (the lines and the next steps, like pani puri's). */
  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }
}
