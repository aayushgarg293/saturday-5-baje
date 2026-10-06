import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import { puri } from "../people/props";
import type { GolgappaCrew } from "../people/sellers";
import { toon } from "../render/toon";
import { say } from "../ui/caption";

/**
 * Eating pani puri at the golgappa cart: walk up, E, and you're standing at
 * the cart, shoulder to shoulder with the woman already there, a leaf bowl
 * in your hand.
 *
 *   1. "Kaisa banaun?" Meetha, medium or teekha (1, 2, 3).
 *   2. Six puris, one at a time: he picks one, cracks it with his thumb, fills
 *      it, dips it in the matka, and puts it in your bowl. E (or a click)
 *      eats it. Too slow, and the next one lands on it: the old one's gone
 *      soggy ("gal gaya!"). The teekha ones make your eyes water.
 *   3. The sukha puri at the end, free (E for yes, Q for no).
 *   4. "Das rupaye." And you step back.
 *
 * Q any time: "bas bhaiya". While you're at the cart, the player can't walk:
 * this moves the camera (you can look around a little), as core/seat.ts does
 * at the computer.
 */

type Spice = "meetha" | "medium" | "teekha";
type Stage = "off" | "arriving" | "choosing" | "eating" | "sukha" | "paying" | "leaving";

/** How many in a plate, and what a plate costs. */
const PLATE = { puris: 6, rupees: 10 };
/**
 * Seconds he pauses between puris (after you've eaten one; and before the
 * first). He doesn't wait longer than that: if the last one's still in your
 * bowl when the next one lands, the last one's gone soggy.
 */
const PAUSE = { first: 2.6, between: 0.7, idle: 1.0 };
/** How close to the cart's front you must be to start, metres. */
const REACH = 1.4;
/** Easing in and out, seconds; how far the mouse can turn your head (radians). */
const EASE = 0.8;
const TURN = { yaw: 0.9, up: 0.5, down: 0.45 };
const MOUSE = 0.0022;
/** How much your eyes water after one of each (0–1, it fades). */
const HEAT: Record<Spice, number> = { meetha: 0, medium: 0.3, teekha: 0.65 };

const LINES = {
  ask: "Kaisa banaun? Meetha, medium, ya teekha?",
  chose: { meetha: "Bhaiya, meetha wala.", medium: "Medium, bhaiya.", teekha: "Ekdum teekha, bhaiya!" } as Record<Spice, string>,
  ok: { meetha: "Haan ji.", medium: "Theek hai.", teekha: "Teekha? Pakka? …Chalo." } as Record<Spice, string>,
  soggy: ["Arre, gal gaya! Jaldi khao.", "Jaldi jaldi, beta!", "Ek toot gaya… koi baat nahi."],
  hot: ["Ssss… paani!", "Ssssss… bhaiya, thoda meetha daalo!"],
  sukha: "Sukha puri? Masala wali?",
  pay: "Das rupaye.",
  bye: "Phir aana!",
  enough: "Bas bhaiya.",
};

export class PaniPuri {
  stage: Stage = "off";
  private spice: Spice = "medium";
  private served = 0; // puris put in your bowl so far (of the six)
  private eaten = 0;
  private wasted = 0;
  private clock = -1; // seconds into the current serve (−1: he's not making one)
  private pause = 0; // seconds before he starts the next one
  private sukhaGiven = false;
  private inBowl = false;
  private heat = 0;
  private ease: { from: THREE.Vector3; fromLook: [number, number]; t: number; back: boolean } | null = null;
  private yaw = 0;
  private pitch = 0;
  private baseYaw = 0;
  private basePitch = 0;
  private eye = new THREE.Vector3();
  private leaf: THREE.Mesh;
  /** Your arm, holding the bowl out (a sleeve and a forearm, from the bottom right of the view). */
  private arm = new THREE.Group();
  private ball: THREE.Object3D;
  private bite: { t: number; from: THREE.Vector3 } | null = null;
  private tears: HTMLDivElement;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private player: Player,
    private input: Input,
    private cart: GolgappaCrew,
    scene: THREE.Scene,
  ) {
    // your leaf bowl (a dona), and the puri in it
    this.leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.035, 12, 1, true), toon({ color: 0x5f7f3a }));
    (this.leaf.material as THREE.Material).side = THREE.DoubleSide;
    this.leaf.position.copy(cart.you.bowl);
    this.leaf.visible = false;
    this.ball = puri();
    this.ball.scale.setScalar(1.3); // (close to your eyes it would look tiny otherwise)
    this.ball.visible = false;
    // your arm: a shirt sleeve to the elbow, then the forearm and a cupped hand under the bowl
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 1, 8).translate(0, 0.5, 0), toon({ color: 0x3b6fb6 }));
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 1, 8).translate(0, 0.5, 0), toon({ color: 0x9a6644 }));
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6).scale(1, 0.45, 1.1), toon({ color: 0x9a6644 }));
    sleeve.name = "sleeve";
    forearm.name = "forearm";
    palm.name = "palm";
    this.arm.add(sleeve, forearm, palm);
    this.arm.visible = false;
    scene.add(this.leaf, this.ball, this.arm);
    // watering eyes: a soft, warm blur at the edges of the view
    this.tears = document.createElement("div");
    Object.assign(this.tears.style, {
      position: "fixed", inset: "0", pointerEvents: "none", opacity: "0", zIndex: "5",
      background: "radial-gradient(ellipse at center, transparent 45%, rgba(255,120,90,0.35) 100%)",
      backdropFilter: "blur(1.5px)",
    });
    document.body.append(this.tears);
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  /** Standing at the cart's front, on the street? */
  canStart(): boolean {
    const p = this.player.pos, s = this.cart.you.stand;
    return this.stage === "off" && !this.player.frozen && p.y < 0.5 && Math.hypot(p.x - s.x, p.z - s.z) < REACH;
  }

  start() {
    if (!this.canStart()) return;
    this.stage = "arriving";
    this.served = this.eaten = this.wasted = 0;
    this.sukhaGiven = false;
    this.player.frozen = true;
    this.eye.copy(this.cart.you.stand).setY(this.cart.you.stand.y + 1.55);
    [this.baseYaw, this.basePitch] = look(this.eye, this.cart.you.hands);
    this.yaw = this.baseYaw;
    this.pitch = this.basePitch;
    this.ease = { from: this.camera.position.clone(), fromLook: [this.camera.rotation.y, this.camera.rotation.x], t: 0, back: false };
    this.leaf.visible = true;
    this.placeArm();
  }

  /** Your arm, from below and right of your eyes out to the bowl. */
  private placeArm() {
    const bowl = this.cart.you.bowl;
    const right = new THREE.Vector3(Math.cos(this.baseYaw), 0, -Math.sin(this.baseYaw));
    const ahead = new THREE.Vector3(-Math.sin(this.baseYaw), 0, -Math.cos(this.baseYaw));
    const shoulder = this.eye.clone().addScaledVector(right, 0.2).add(new THREE.Vector3(0, -0.3, 0));
    const elbow = this.eye.clone().addScaledVector(right, 0.24).addScaledVector(ahead, 0.18).add(new THREE.Vector3(0, -0.62, 0));
    const hand = bowl.clone().add(new THREE.Vector3(0, -0.035, 0));
    const span = (name: string, from: THREE.Vector3, to: THREE.Vector3) => {
      const m = this.arm.getObjectByName(name)!;
      m.position.copy(from);
      m.scale.set(1, from.distanceTo(to), 1);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    };
    span("sleeve", shoulder, elbow);
    span("forearm", elbow, hand);
    this.arm.getObjectByName("palm")!.position.copy(hand);
    this.arm.visible = true;
  }

  /** What the hint at the bottom of the screen says. */
  prompt(): string | null {
    switch (this.stage) {
      case "choosing": return "[1] meetha    [2] medium    [3] teekha";
      case "eating": return this.inBowl ? "[E] or [Click] khao!    [Q] bas" : "[Q] bas";
      case "sukha": return "[E] haan    [Q] nahi";
      default: return null;
    }
  }

  /** A key while you're at the cart. Returns true if it was for this. */
  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "choosing") {
      const pick = ({ Digit1: "meetha", Digit2: "medium", Digit3: "teekha" } as Record<string, Spice>)[code];
      if (pick) this.choose(pick);
    } else if (this.stage === "eating") {
      if (code === "KeyE") this.eat();
      if (code === "KeyQ") this.pay(true);
    } else if (this.stage === "sukha") {
      if (code === "KeyE" && !this.sukhaGiven) {
        this.sukhaGiven = true;
        say("Bhaiya", "Ye lo.", 2);
        this.serve();
      } else if (code === "KeyE") this.eat();
      if (code === "KeyQ") this.pay(false);
    }
    return true; // (at the cart, every key is for this: no walking off with a bowl in your hand)
  }

  /** A click: eat what's in the bowl. */
  click() {
    if (this.stage === "eating" || this.stage === "sukha") this.eat();
  }

  update(dt: number) {
    if (!this.active) return;
    this.heat = Math.max(0, this.heat - dt * 0.12);
    this.tears.style.opacity = String(this.heat);

    // easing up to the cart, or back from it
    if (this.ease) {
      const e = this.ease;
      e.t = Math.min(1, e.t + dt / EASE);
      const k = e.t * e.t * (3 - 2 * e.t);
      const to = e.back ? this.cart.you.stand.clone().setY(1.55).add(back(this.baseYaw, 0.5)) : this.eye;
      this.camera.position.lerpVectors(e.from, to, k);
      this.camera.rotation.set(THREE.MathUtils.lerp(e.fromLook[1], e.back ? -0.1 : this.basePitch, k), lerpAngle(e.fromLook[0], this.baseYaw, k), 0);
      if (e.t >= 1) {
        this.ease = null;
        if (e.back) this.finish();
        else {
          this.stage = "choosing";
          say("Bhaiya", LINES.ask, 4);
        }
      }
      return;
    }

    // the view: the mouse turns your head a little
    const { dx, dy } = this.input.takeMouseMovement();
    this.yaw = this.baseYaw + THREE.MathUtils.clamp(angleDiff(this.yaw - dx * MOUSE, this.baseYaw), -TURN.yaw, TURN.yaw);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE, this.basePitch - TURN.down, this.basePitch + TURN.up);
    const chew = this.bite ? Math.sin(this.bite.t * 14) * 0.012 : 0;
    this.camera.position.copy(this.eye).setY(this.eye.y + chew);
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    // a bite: the puri comes up to your mouth, and it's gone
    if (this.bite) {
      this.bite.t += dt;
      const k = Math.min(1, this.bite.t / 0.35);
      const mouth = this.camera.position.clone().add(new THREE.Vector3(0, -0.12, -0.15).applyEuler(this.camera.rotation));
      this.ball.position.lerpVectors(this.bite.from, mouth, k * k);
      this.ball.visible = k < 1;
      if (this.bite.t > 0.9) this.bite = null;
    }

    // his serve: the puri lands in your bowl partway through
    if (this.clock >= 0) {
      const before = this.clock;
      this.clock += dt;
      if (before < this.cart.you.lands && this.clock >= this.cart.you.lands) this.lands();
      if (this.clock >= this.cart.you.takes) {
        this.clock = -1;
        this.pause = PAUSE.idle;
      }
    }
    // the next one: a moment after you've eaten it, or (if you haven't) once he's done anyway
    if (this.pause > 0) this.pause -= dt;
    if (this.stage === "eating" && this.clock < 0 && this.pause <= 0 && this.served < PLATE.puris && !this.bite) {
      this.serve();
    }
    if (this.stage === "eating" && this.served >= PLATE.puris && !this.inBowl && this.clock < 0 && !this.bite) {
      this.stage = "sukha";
      say("Bhaiya", LINES.sukha, 3);
    }
  }

  private choose(spice: Spice) {
    this.spice = spice;
    say("You", LINES.chose[spice], 2.2);
    setTimeout(() => say("Bhaiya", LINES.ok[spice], 2.2), 2300);
    this.stage = "eating";
    this.pause = PAUSE.first; // (a moment before he starts)
  }

  /** He starts making one. */
  private serve() {
    this.cart.serveYou();
    this.clock = 0;
    if (this.stage === "eating") this.served++;
  }

  /** It's in your bowl. If the last one was still there, it's gone soggy. */
  private lands() {
    if (this.inBowl) {
      this.wasted++;
      say("Bhaiya", LINES.soggy[(this.wasted - 1) % LINES.soggy.length], 2.5);
    }
    this.inBowl = true;
    this.ball.visible = true;
    this.ball.position.copy(this.cart.you.bowl).setY(this.cart.you.bowl.y + 0.03);
  }

  private eat() {
    if (!this.inBowl || this.bite) return;
    this.inBowl = false;
    this.eaten++;
    this.bite = { t: 0, from: this.ball.position.clone() };
    if (this.clock < 0) this.pause = Math.min(this.pause, PAUSE.between);
    const sukha = this.stage === "sukha";
    if (!sukha) {
      this.heat = Math.min(0.9, this.heat + HEAT[this.spice]);
      if (this.spice === "teekha" && this.eaten === 3) setTimeout(() => say("You", LINES.hot[0], 2.5), 700);
      if (this.spice === "teekha" && this.eaten === 5) setTimeout(() => say("You", LINES.hot[1], 2.5), 700);
    } else setTimeout(() => this.pay(false), 1500); // (the sukha puri: that's the plate done)
  }

  /** Done (or "bas", early): he asks for his money; you pay and step back. */
  private pay(early: boolean) {
    if (this.stage === "paying" || this.stage === "leaving") return;
    this.stage = "paying";
    if (early) say("You", LINES.enough, 2);
    const total = `${LINES.pay}${this.wasted ? ` (${this.eaten} khaye, ${this.wasted} gal gaye.)` : ""}`;
    setTimeout(() => say("Bhaiya", total, 3), early ? 2100 : 300);
    setTimeout(() => say("Bhaiya", LINES.bye, 2.5), early ? 5300 : 3500);
    setTimeout(() => {
      this.stage = "leaving";
      this.ball.visible = false;
      this.leaf.visible = false;
      this.arm.visible = false;
      this.inBowl = false;
      this.ease = { from: this.camera.position.clone(), fromLook: [this.camera.rotation.y, this.camera.rotation.x], t: 0, back: true };
    }, early ? 5600 : 3800);
  }

  /** Back on your feet, a step back from the cart. */
  private finish() {
    const at = this.cart.you.stand.clone().add(back(this.baseYaw, 0.5));
    this.player.place(at.x, at.z, this.baseYaw, -0.1);
    this.player.frozen = false;
    this.stage = "off";
    this.clock = -1;
    this.heat = 0;
    this.tears.style.opacity = "0";
  }
}

/** A step backward from the way you're facing (yaw), `d` metres. */
function back(yaw: number, d: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(yaw) * d, 0, Math.cos(yaw) * d);
}

/** The yaw and pitch that look from `from` to `to` (the camera looks down −z). */
function look(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const d = to.clone().sub(from);
  return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))];
}

function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function lerpAngle(a: number, b: number, k: number): number {
  return a + angleDiff(b, a) * k;
}
