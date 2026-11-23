import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import type { Chaiwala } from "../people/chaiwala";
import { PAL } from "../render/palette";
import { toon } from "../render/toon";
import { say } from "../ui/caption";
import { StallView, Steam, YourArm, anyOf } from "./atTheStall";

/**
 * A glass of chai at the tapri: walk up to the counter, E.
 *
 *   1. "Cutting ya full?" (1, 2). A cutting is half a glass.
 *   2. He lifts the pan off the stove and pours into your glass on the counter.
 *   3. You pick it up. It's hot: steam off the top.
 *   4. E takes a sip. In between, look around: you can turn right round to
 *      watch the street go by, with his radio playing behind you. This is the
 *      slow one, the one for standing about.
 *   5. You put the glass down: "Do rupaye." And you step back.
 *
 * Q any time: "bas bhaiya". While you're at the counter, the player can't walk.
 */

type Stage = "off" | "arriving" | "choosing" | "pouring" | "picking" | "sipping" | "putting" | "paying" | "leaving";

/** Sips in a cutting and in a full glass; how full each glass is; what each costs. */
const SIPS = { cutting: 3, full: 5 };
const FILL = { cutting: 0.55, full: 1 };
const PRICE = { cutting: 2, full: 4 };
/**
 * How far the mouse can turn your head: much further than at the other stalls,
 * right round to the street behind you. Standing with a chai is for looking about.
 */
const TURN = { yaw: 2.4, up: 0.6, down: 0.6 };
/** Seconds to pick the glass up, or put it down; a sip, there and back. */
const REACH = 0.6;
const SIP = 1.3;

type Size = keyof typeof SIPS;

const LINES = {
  ask: "Cutting ya full?",
  chose: { cutting: "Ek cutting, bhaiya.", full: "Full, bhaiya." },
  ok: { cutting: "Abhi lo.", full: "Haan ji." },
  served: "Lo. Garam hai, dhyaan se.",
  first: "Sssp… aah.",
  chat: ["Aaj garmi bahut hai, phir bhi chai sabko chahiye.", "Radio pe naya gaana aaya hai, suna?", "Cutting mein hi asli maza hai."],
  pay: (size: Size) => (size === "cutting" ? "Do rupaye." : "Chaar rupaye."),
  bye: "Phir aana!",
  enough: "Bas, bhaiya.",
};

export class ChaiTapri {
  stage: Stage = "off";
  private view: StallView;
  private arm: YourArm;
  private steam: Steam;
  private glass = new THREE.Group();
  private chai: THREE.Mesh; // the top of the chai in your glass
  private size: Size = "cutting";
  private level = 0; // how full your glass is (0–1)
  private sipsLeft = 0;
  private heat = 0;
  private clock = -1; // seconds into his pour (−1: he isn't pouring)
  private move: { t: number; from: THREE.Vector3; to: THREE.Vector3; then: () => void } | null = null;
  private sip: { t: number } | null = null;
  private time = 0;
  private timers: number[] = [];

  constructor(
    camera: THREE.PerspectiveCamera,
    private player: Player,
    input: Input,
    private tapri: Chaiwala,
    scene: THREE.Scene,
  ) {
    this.view = new StallView(camera, input, TURN);
    this.arm = new YourArm(scene);
    this.steam = new Steam(scene, 4);
    // your glass: a small ribbed tumbler (held at its middle), and the chai's surface inside it
    // (open at the top, so you can see the chai inside; its floor is a separate disc)
    const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.08, 10, 1, true), toon({ color: PAL.glassPale }));
    (tumbler.material as THREE.Material).side = THREE.DoubleSide;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.024, 10).rotateX(-Math.PI / 2).translate(0, -0.039, 0), toon({ color: PAL.glassPale }));
    this.chai = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.004, 10), toon({ color: 0xc88f5a }));
    this.glass.add(tumbler, floor, this.chai);
    this.glass.visible = false;
    scene.add(this.glass);
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  /** Standing at the counter, on the street? */
  canStart(): boolean {
    const p = this.player.pos, s = this.tapri.you.stand;
    return this.stage === "off" && !this.player.frozen && p.y < 0.5 && Math.hypot(p.x - s.x, p.z - s.z) < 1.3;
  }

  offer(): string {
    return `[E] chai piyo (cutting ₹${PRICE.cutting})`;
  }

  start() {
    if (!this.canStart()) return;
    this.stage = "arriving";
    this.player.frozen = true;
    this.view.arrive(this.tapri.you.stand, this.tapri.you.looks);
    this.level = 0;
    this.showLevel();
    this.glass.position.copy(this.tapri.you.glass);
    this.glass.rotation.set(0, 0, 0);
    this.glass.visible = true; // (an empty glass, already on the counter for you)
  }

  prompt(): string | null {
    switch (this.stage) {
      case "choosing": return "[1] cutting    [2] full";
      case "sipping": return this.sip ? "[Q] bas" : "[E] chuski lo    [Q] bas";
      case "pouring": return "[Q] bas";
      default: return null;
    }
  }

  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "choosing") {
      if (code === "Digit1" || code === "Digit2") this.choose(code === "Digit1" ? "cutting" : "full");
    } else if (this.stage === "sipping") {
      if (code === "KeyE") this.takeSip();
      if (code === "KeyQ") this.putDown(true);
    } else if (this.stage === "pouring" && code === "KeyQ") this.pay(true);
    return true;
  }

  click() {
    if (this.stage === "sipping") this.takeSip();
  }

  update(dt: number) {
    if (!this.active) return;
    this.time += dt;
    const step = this.view.update(dt, 0);
    if (step === "arrived") {
      this.stage = "choosing";
      say("Bhaiya", LINES.ask, 3.5);
    }
    if (step === "left") return this.finish();
    if (this.view.easing) return;

    // his pour: the chai rises in your glass while it runs in
    if (this.clock >= 0) {
      this.clock += dt;
      const { from, to } = this.tapri.you.pours;
      this.level = FILL[this.size] * THREE.MathUtils.clamp((this.clock - from) / (to - from), 0, 1);
      this.showLevel();
      if (this.clock >= this.tapri.you.takes) {
        this.clock = -1;
        if (this.stage === "pouring") this.pickUp();
      }
    }

    // your hand bringing the glass up from the counter, or putting it back
    if (this.move) {
      this.move.t += dt;
      const k = Math.min(1, this.move.t / REACH);
      this.glass.position.lerpVectors(this.move.from, this.move.to, k * k * (3 - 2 * k));
      this.reachTo(this.glass.position);
      if (k >= 1) {
        const then = this.move.then;
        this.move = null;
        then();
      }
    } else if (this.stage === "sipping") {
      // held in front of you; on a sip, up to your mouth and tipped, and back
      const rest = this.held();
      if (this.sip) {
        this.sip.t += dt;
        const k = Math.sin(Math.min(1, this.sip.t / SIP) * Math.PI); // 0 → 1 → 0
        this.glass.position.lerpVectors(rest, this.view.mouth(), k);
        this.glass.rotation.set(k * 0.7, this.view.baseYaw, 0, "YXZ");
        if (this.sip.t >= SIP) this.sip = null;
      } else {
        this.glass.position.copy(rest);
        this.glass.rotation.set(0, this.view.baseYaw, 0);
      }
      this.reachTo(this.glass.position);
    }

    this.heat = Math.max(0, this.heat - dt * 0.012);
    const top = this.glass.position.clone().add(new THREE.Vector3(0, 0.04, 0));
    this.steam.update(dt, this.time, top, this.level > 0.05 && !this.sip ? this.heat : 0);
  }

  private choose(size: Size) {
    this.size = size;
    this.sipsLeft = SIPS[size];
    say("You", LINES.chose[size], 2.2);
    this.later(2300, () => say("Bhaiya", LINES.ok[size], 1.8));
    this.stage = "pouring";
    this.later(900, () => {
      if (this.stage !== "pouring") return;
      this.tapri.serveYou();
      this.clock = 0;
      this.heat = 0.8;
    });
  }

  /** Your hand goes to the glass on the counter and brings it up in front of you. */
  private pickUp() {
    this.stage = "picking";
    say("Bhaiya", LINES.served, 2.5);
    this.move = { t: 0, from: this.glass.position.clone(), to: this.held(), then: () => (this.stage = "sipping") };
  }

  private takeSip() {
    if (this.sip || this.sipsLeft <= 0) return;
    this.sip = { t: 0 };
    const sips = SIPS[this.size];
    this.sipsLeft--;
    this.later(SIP * 500, () => {
      this.level = FILL[this.size] * (this.sipsLeft / sips);
      this.showLevel();
    });
    if (this.sipsLeft === sips - 1) this.later(700, () => say("You", LINES.first, 1.8));
    if (this.sipsLeft === sips - 2) this.later(2200, () => say("Bhaiya", anyOf(LINES.chat), 3.5));
    if (this.sipsLeft === 0) this.later(SIP * 1000 + 600, () => this.putDown(false));
  }

  /** Back on the counter, and pay. */
  private putDown(early: boolean) {
    if (this.stage !== "sipping") return;
    this.stage = "putting";
    if (early) say("You", LINES.enough, 2);
    this.sip = null;
    this.glass.rotation.set(0, 0, 0);
    this.move = { t: 0, from: this.glass.position.clone(), to: this.tapri.you.glass.clone(), then: () => this.pay(false) };
  }

  private pay(early: boolean) {
    if (this.stage === "paying" || this.stage === "leaving") return;
    this.stage = "paying";
    this.arm.hide();
    if (early) say("You", LINES.enough, 2);
    this.later(early ? 2100 : 300, () => say("Bhaiya", LINES.pay(this.size), 2.5));
    this.later(early ? 4800 : 3000, () => say("Bhaiya", LINES.bye, 2.5));
    this.later(early ? 5100 : 3300, () => {
      this.stage = "leaving";
      this.glass.visible = false;
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
    this.move = this.sip = null;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  /** Where you hold the glass: in front of you, a little right and down. */
  private held(): THREE.Vector3 {
    const yaw = this.view.baseYaw;
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const ahead = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    return this.view.eye.clone().addScaledVector(right, 0.13).addScaledVector(ahead, 0.4).add(new THREE.Vector3(0, -0.27, 0));
  }

  /** Your hand around the glass, a little below its middle. */
  private reachTo(at: THREE.Vector3) {
    this.arm.place(this.view.eye, this.view.baseYaw, at.clone().add(new THREE.Vector3(0, -0.025, 0)));
  }

  /** The chai's surface: risen to `level` inside the glass, which is narrower at the bottom. */
  private showLevel() {
    this.chai.visible = this.level > 0.02;
    const r = 0.024 + 0.0055 * this.level;
    this.chai.scale.set(r, 1, r);
    this.chai.position.y = -0.038 + 0.074 * this.level;
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }
}
