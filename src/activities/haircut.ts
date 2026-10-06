import * as THREE from "three";
import type { Input } from "../core/input";
import type { Player } from "../core/player";
import type { HairStyle } from "../people/clothes";
import type { SaloonChair } from "../people/saloon";
import { say } from "../ui/caption";

/**
 * A haircut at Bombay Hair Cutting Saloon: stand on the street in front of
 * it, E. "Bas ho gaya iska… aao, baitho." A moment later you're in the red
 * chair in the white cape, looking at yourself in the mirror (overgrown, due
 * for a cut).
 *
 *   1. "Kaisa katna hai?" Short at the sides, just a trim, or long like the
 *      cricket captain's (1, 2, 3).
 *   2. He gets to work: snipping at the top, round the ears, checking the line
 *      in the mirror. He makes conversation (which class are you in? 1, 2).
 *      Halfway through, the mirror shows the new you.
 *   3. "Champi karun? Das rupaye extra." E for yes: his hands drum on your
 *      head (the view shakes with it). Q for no.
 *   4. "Dekho! Hero lag rahe ho." Bees rupaye (tees with the champi). Out
 *      onto the street again.
 *
 * Like the pani puri (paniPuri.ts), this moves the camera while it lasts: you
 * see through your own eyes in the chair, and can look around a little.
 */

type Stage = "off" | "fadingIn" | "choosing" | "cutting" | "talking" | "champi" | "done" | "fadingOut";
type Cut = Extract<HairStyle, "crop" | "short" | "long">; // (the cuts on offer: hair styles in people/clothes.ts)

const CUTS: Record<string, { cut: Cut; you: string; him: string }> = {
  Digit1: { cut: "crop", you: "Side se chhota kar do, upar thoda rehne do.", him: "Haan, garmi bhi hai. Theek hai." },
  Digit2: { cut: "short", you: "Bas thoda sa trim, bhaiya.", him: "Thik hai, halka sa." },
  Digit3: { cut: "long", you: "Dhony jaisa, lamba rakhna!", him: "Hero banna hai? Haha… chalo, try karte hai." },
};
/** Seconds: the cut (talk in the middle), when the mirror shows the new hair, the champi. */
const TIME = { cut: 26, talkAt: 7, newHairAt: 16, champi: 8 };
const PRICE = { cut: 20, champi: 10 };
const TURN = { yaw: 0.8, up: 0.4, down: 0.4 };
const MOUSE = 0.0022;

export class Haircut {
  stage: Stage = "off";
  /** You've had it cut today (once is enough). */
  done = false;
  private cut: Cut = "short";
  private clock = 0;
  private yaw = 0;
  private pitch = 0;
  private fade: HTMLDivElement;
  private eye = new THREE.Vector3();
  private champied = false;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private player: Player,
    private input: Input,
    private chair: SaloonChair,
  ) {
    // the fade to black between the street and the chair
    this.fade = document.createElement("div");
    Object.assign(this.fade.style, { position: "fixed", inset: "0", background: "#000", opacity: "0", pointerEvents: "none", transition: "opacity 0.6s", zIndex: "6" });
    document.body.append(this.fade);
  }

  get active(): boolean {
    return this.stage !== "off";
  }

  canStart(): boolean {
    const p = this.player.pos, f = this.chair.front;
    return !this.active && !this.done && !this.player.frozen && p.y < 0.5 && Math.hypot(p.x - f.x, p.z - f.z) < 1.6;
  }

  prompt(): string | null {
    if (this.canStart()) return "[E] haircut (₹20)";
    switch (this.stage) {
      case "choosing": return "[1] side se chhota    [2] bas trim    [3] lamba, hero jaisa";
      case "talking": return "[1] 10th mein    [2] 11th mein";
      case "champi": return this.champied ? null : "[E] haan, champi    [Q] nahi";
      default: return null;
    }
  }

  start() {
    if (!this.canStart()) return;
    this.player.frozen = true;
    this.stage = "fadingIn";
    say("Barber", "Bas ho gaya iska… aao, baitho.", 3);
    this.blackout(() => {
      this.chair.sit("shaggy");
      this.clock = 0;
      this.yaw = 0;
      this.pitch = 0;
      setTimeout(() => {
        this.stage = "choosing";
        say("Barber", "Kaisa katna hai?", 3);
      }, 900);
    });
  }

  key(code: string): boolean {
    if (!this.active) return false;
    if (this.stage === "choosing" && CUTS[code]) {
      const c = CUTS[code];
      this.cut = c.cut;
      say("You", c.you, 2.6);
      setTimeout(() => say("Barber", c.him, 2.8), 2700);
      this.stage = "cutting";
      this.clock = 0;
    } else if (this.stage === "talking" && (code === "Digit1" || code === "Digit2")) {
      say("You", code === "Digit1" ? "10th mein." : "11th mein.", 2);
      setTimeout(() => say("Barber", code === "Digit1" ? "Board hai! Padhai karo, cyber cafe kam jaao. Haha." : "Science ya commerce? …Papa ne bola hoga science.", 3.5), 2100);
      this.stage = "cutting";
    } else if (this.stage === "champi" && !this.champied) {
      if (code === "KeyE") {
        this.champied = true;
        this.chair.champi(TIME.champi);
        this.clock = 0;
        say("You", "Haan, kar do.", 2);
      } else if (code === "KeyQ") this.finish();
    }
    return true; // (in the chair, no walking off in the cape)
  }

  update(dt: number) {
    if (!this.active || this.stage === "fadingIn" || this.stage === "fadingOut") {
      if (this.active) this.input.takeMouseMovement();
      return;
    }
    this.clock += dt;

    // through your own eyes, in the chair, looking at the mirror (the mouse turns your head a little)
    const { dx, dy } = this.input.takeMouseMovement();
    this.yaw = THREE.MathUtils.clamp(this.yaw - dx * MOUSE, -TURN.yaw, TURN.yaw);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * MOUSE, -TURN.down, TURN.up);
    this.chair.eye(this.eye);
    // (straight ahead at your own reflection: the mirror, at the height of your eyes)
    const [baseYaw, basePitch] = look(this.eye, this.chair.mirror.clone().setY(this.eye.y - 0.06));
    // the champi shakes the view as his hands come down
    const shake = this.stage === "champi" && this.champied && this.clock < TIME.champi ? Math.max(0, Math.sin(this.clock * 18)) * 0.012 : 0;
    this.camera.position.copy(this.eye).setY(this.eye.y - shake);
    this.camera.rotation.set(basePitch + this.pitch, baseYaw + this.yaw, 0, "YXZ");

    if (this.stage === "cutting") {
      if (this.clock >= TIME.talkAt && this.clock - dt < TIME.talkAt) {
        this.stage = "talking";
        say("Barber", "Kaunsi class mein ho?", 3);
      }
      if (this.clock >= TIME.newHairAt && this.clock - dt < TIME.newHairAt) this.chair.setHair(this.cut);
      if (this.clock >= TIME.cut) {
        this.stage = "champi";
        this.champied = false;
        say("Barber", "Champi karun? Das rupaye extra.", 3);
      }
    } else if (this.stage === "talking") {
      if (this.clock >= TIME.newHairAt && this.clock - dt < TIME.newHairAt) this.chair.setHair(this.cut);
      // (no answer: he carries on anyway)
      if (this.clock >= TIME.talkAt + 9) this.stage = "cutting";
    } else if (this.stage === "champi" && this.champied) {
      if (this.clock > 2 && this.clock - dt <= 2) say("You", "Aahh…", 2.5);
      if (this.clock >= TIME.champi) this.finish();
    }
  }

  /** "Dekho! Hero lag rahe ho." Pay, and out onto the street. */
  private finish() {
    if (this.stage === "done") return;
    this.stage = "done";
    const rupees = PRICE.cut + (this.champied ? PRICE.champi : 0);
    say("Barber", this.cut === "long" ? "Dekho! Ekdum Dhony lag rahe ho." : "Dekho! Hero lag rahe ho.", 3);
    setTimeout(() => say("Barber", `${rupees === 30 ? "Tees" : "Bees"} rupaye.`, 2.5), 3200);
    setTimeout(() => {
      this.stage = "fadingOut";
      this.blackout(() => {
        this.chair.getUp();
        const f = this.chair.front;
        const [yaw] = look(new THREE.Vector3(f.x, 1.55, f.z), this.chair.mirror);
        this.player.place(f.x, f.z, yaw + Math.PI, -0.05); // (facing back out to the street)
        this.player.frozen = false;
        this.stage = "off";
        this.done = true;
      });
    }, 6000);
  }

  /** Fade to black, do `then` while it's dark, and fade back. */
  private blackout(then: () => void) {
    this.fade.style.opacity = "1";
    setTimeout(() => {
      then();
      this.fade.style.opacity = "0";
    }, 700);
  }
}

/** The yaw and pitch that look from `from` to `to` (the camera looks down −z). */
function look(from: THREE.Vector3, to: THREE.Vector3): [number, number] {
  const d = to.clone().sub(from);
  return [Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))];
}
