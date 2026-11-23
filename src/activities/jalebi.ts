import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import { jalebi } from "../people/props";
import type { JalebiCrew } from "../people/sellers";
import { toon } from "../render/toon";
import { say } from "../ui/caption";
import { StallView, Steam, YourArm } from "./atTheStall";

/**
 * Hot jalebis at the jalebi stall: walk up, E, and hold out your hand for a
 * square of newspaper.
 *
 *   1. "Kitni? Sau gram ya dhai sau?" (1, 2).
 *   2. He puts down his batter cloth, takes his tarazu (a little hand scale)
 *      off its hook, lifts fresh jalebis out of the oil and drops them in its
 *      pan: the pan swings down, level with the weight. "Poora sau gram."
 *   3. He tips them onto your paper, hot and dripping.
 *   4. E eats one at a time. At the end your fingers are sticky.
 *   5. "Aath rupaye." And you step back.
 *
 * Q any time: "bas bhaiya". While you're at the stall, the player can't walk.
 */

type Stage = "off" | "arriving" | "choosing" | "weighing" | "eating" | "paying" | "leaving";
type Grams = 100 | 250;

/** How many jalebis each weight is (the halwai's scale shows the same), and what it costs. */
const PIECES: Record<Grams, number> = { 100: 3, 250: 6 };
const PRICE: Record<Grams, number> = { 100: 8, 250: 20 };
const TURN = { yaw: 0.9, up: 0.5, down: 0.45 };

const LINES = {
  ask: "Kitni du? Sau gram ya dhai sau?",
  chose: { 100: "Sau gram, bhaiya.", 250: "Dhai sau gram, bhaiya." } as Record<Grams, string>,
  ok: "Abhi lo, ekdum garam.",
  weighed: { 100: "Poora sau gram.", 250: "Dhai sau, poora." } as Record<Grams, string>,
  served: "Lo. Garam garam.",
  first: "Kurkuri… aur chashni wali!",
  sticky: "Ungliyan chipak gayi…",
  wash: "Ungliyan chaat lo, beta. Koi nahi dekh raha!",
  pay: (g: Grams) => (g === 100 ? "Aath rupaye." : "Bees rupaye."),
  bye: "Phir aana!",
  enough: "Bas, bhaiya.",
};

export class JalebiStall {
  stage: Stage = "off";
  private view: StallView;
  private arm: YourArm;
  private steam: Steam;
  private paper: THREE.Mesh;
  private coils: THREE.Mesh[] = [];
  private grams: Grams = 100;
  private left = 0; // jalebis still on your paper
  private clock = -1; // seconds into his weighing (−1: he isn't)
  private heat = 0;
  private bite: { t: number; coil: THREE.Mesh; from: THREE.Vector3 } | null = null;
  private time = 0;
  private timers: number[] = [];

  constructor(
    camera: THREE.PerspectiveCamera,
    private player: Player,
    input: Input,
    private stall: JalebiCrew,
    scene: THREE.Scene,
  ) {
    this.view = new StallView(camera, input, TURN);
    this.arm = new YourArm(scene);
    this.steam = new Steam(scene, 4);
    // a square of old newspaper, a little turned
    this.paper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.003, 0.15), toon({ color: 0xd8d0bc }));
    this.paper.position.copy(stall.you.held);
    this.paper.rotation.y = 0.35;
    this.paper.visible = false;
    scene.add(this.paper);
    for (let i = 0; i < PIECES[250]; i++) {
      const c = jalebi();
      c.scale.setScalar(1.15);
      c.visible = false;
      scene.add(c);
      this.coils.push(c);
    }
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  canStart(): boolean {
    const p = this.player.pos, s = this.stall.you.stand;
    return this.stage === "off" && !this.player.frozen && p.y < 0.5 && Math.hypot(p.x - s.x, p.z - s.z) < 1.4;
  }

  offer(): string {
    return `[E] garam jalebi (₹${PRICE[100]} ki sau gram)`;
  }

  start() {
    if (!this.canStart()) return;
    this.stage = "arriving";
    this.player.frozen = true;
    this.view.arrive(this.stall.you.stand, this.stall.you.looks);
    this.paper.visible = true;
    this.arm.place(this.view.eye, this.view.baseYaw, this.stall.you.held.clone().add(new THREE.Vector3(0, -0.035, 0)));
  }

  prompt(): string | null {
    switch (this.stage) {
      case "choosing": return "[1] sau gram    [2] dhai sau gram";
      case "eating": return this.left > 0 && !this.bite ? "[E] khao    [Q] bas" : "[Q] bas";
      case "weighing": return "[Q] bas";
      default: return null;
    }
  }

  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "choosing") {
      if (code === "Digit1" || code === "Digit2") this.choose(code === "Digit1" ? 100 : 250);
    } else if (this.stage === "eating" || this.stage === "weighing") {
      if (code === "KeyE") this.eat();
      if (code === "KeyQ") this.pay(true);
    }
    return true;
  }

  click() {
    if (this.stage === "eating") this.eat();
  }

  update(dt: number) {
    if (!this.active) return;
    this.time += dt;
    const chew = this.bite ? Math.sin(this.bite.t * 14) * 0.012 : 0;
    const step = this.view.update(dt, chew);
    if (step === "arrived") {
      this.stage = "choosing";
      say("Bhaiya", LINES.ask, 4);
    }
    if (step === "left") return this.finish();
    if (this.view.easing) return;

    if (this.clock >= 0) {
      const before = this.clock;
      this.clock += dt;
      if (before < this.stall.you.lands && this.clock >= this.stall.you.lands) this.lands();
      if (this.clock >= this.stall.you.takes) this.clock = -1;
    }

    // a bite: the jalebi to your mouth, and gone
    if (this.bite) {
      this.bite.t += dt;
      const k = Math.min(1, this.bite.t / 0.35);
      this.bite.coil.position.lerpVectors(this.bite.from, this.view.mouth(), k * k);
      this.bite.coil.visible = k < 1;
      if (this.bite.t > 0.9) this.bite = null;
    }

    this.heat = Math.max(0, this.heat - dt * 0.03);
    this.steam.update(dt, this.time, this.stall.you.held.clone().add(new THREE.Vector3(0, 0.02, 0)), this.left > 0 ? this.heat : 0);
  }

  private choose(g: Grams) {
    this.grams = g;
    say("You", LINES.chose[g], 2.2);
    this.later(2300, () => say("Bhaiya", LINES.ok, 2));
    this.stage = "weighing";
    this.later(1000, () => {
      if (this.stage !== "weighing") return;
      this.stall.serveYou(g);
      this.clock = 0;
      // (his line as the pan comes level, a little after the jalebis drop in)
      this.later(4600, () => this.stage === "weighing" && say("Bhaiya", LINES.weighed[g], 2));
    });
  }

  /** On your paper: a little heap, steaming. */
  private lands() {
    if (this.stage !== "weighing") return;
    const n = PIECES[this.grams];
    this.left = n;
    this.heat = 0.6;
    this.coils.forEach((c, i) => {
      c.visible = i < n;
      c.position.copy(this.stall.you.held).add(new THREE.Vector3(((i % 3) - 1) * 0.035, 0.012 + Math.floor(i / 3) * 0.014, ((i * 2) % 3 - 1) * 0.025));
    });
    this.stage = "eating";
    this.later(500, () => say("Bhaiya", LINES.served, 2));
  }

  private eat() {
    if (this.stage !== "eating" || this.left <= 0 || this.bite) return;
    this.left--;
    const coil = this.coils[this.left]; // (from the top of the heap)
    this.bite = { t: 0, coil, from: coil.position.clone() };
    if (this.left === PIECES[this.grams] - 1) this.later(600, () => say("You", LINES.first, 2.2));
    if (this.left === 0) {
      this.later(1100, () => say("You", LINES.sticky, 2.2));
      this.later(3500, () => say("Bhaiya", LINES.wash, 2.8));
      this.later(4000, () => this.pay(false));
    }
  }

  private pay(early: boolean) {
    if (this.stage === "paying" || this.stage === "leaving") return;
    this.stage = "paying";
    if (early) say("You", LINES.enough, 2);
    this.later(early ? 2100 : 2600, () => say("Bhaiya", LINES.pay(this.grams), 2.5));
    this.later(early ? 4800 : 5300, () => say("Bhaiya", LINES.bye, 2.5));
    this.later(early ? 5100 : 5600, () => {
      this.stage = "leaving";
      this.left = 0;
      this.paper.visible = false;
      for (const c of this.coils) c.visible = false;
      this.arm.hide();
      this.steam.hide();
      this.view.leave();
    });
  }

  private finish() {
    const at = this.view.stepBack();
    this.player.place(at.x, at.z, this.view.baseYaw, -0.1);
    this.player.frozen = false;
    this.stage = "off";
    this.clock = -1;
    this.bite = null;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }
}
