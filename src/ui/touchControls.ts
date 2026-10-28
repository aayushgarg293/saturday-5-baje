import { toPage, touchFirst } from "../core/device";
import type { Input } from "../core/input";

/**
 * The controls on a phone or tablet (only there: core/device.ts), laid over
 * the game while you play:
 *
 *   left thumb    a joystick, wherever you put your thumb down on the left
 *                 part of the screen: push to walk; pull your thumb well
 *                 past its ring to walk fast
 *   right thumb   drag anywhere else to look around; a quick tap there is a
 *                 click (lean in to the computer, swing the bat, eat)
 *   top left      pause, Mummy's chit, sound on/off
 *   paused        a look-speed slider (thumbs differ), remembered
 *
 * The things you can do where you stand ("sit down", "Mathur ji ke kapde?")
 * are buttons too: the prompt at the bottom (ui/prompt.ts).
 *
 * Everything feeds the same Input as the keyboard and mouse do, so the rest
 * of the game doesn't know the difference.
 */

/** The left part of the screen that's for the joystick (the rest is for looking). */
const STICK_SIDE = 0.4;
/** How far the knob can go from where your thumb came down, px. */
const STICK_REACH = 55;
/** Your thumb this far from where it came down (× the reach) walks you fast: on purpose, not by accident. */
const FAST_PULL = 1.8;
/** Where the look speed is kept in the browser. */
const LOOK_KEY = "saturday-5-baje:lookSpeed";
/** A touch that moves less than this (px) and lifts within this long (ms) is a tap. */
const TAP_MOVE = 12, TAP_TIME = 300;
/**
 * Looking: a slow drag turns you gently (to aim), a quick flick turns you further (to look down another
 * road). How much further: the drag's speed, px per ms, times this; at most LOOK_FLICK_MAX times more.
 */
const LOOK_FLICK = 0.8, LOOK_FLICK_MAX = 1.5;

export type TouchControls = {
  /** Show them while you're playing (not paused, not on the computer, not at the end). */
  setVisible(on: boolean): void;
};

export function buildTouchControls(input: Input, onTap: () => void): TouchControls {
  if (!touchFirst) return { setVisible() {} };

  const layer = document.createElement("div");
  layer.id = "touch";
  layer.innerHTML = `
    <div class="corner">
      <button data-do="pause" aria-label="Pause">❚❚</button>
      <button data-do="chit" aria-label="Mummy's chit">📝</button>
      <button data-do="mute" aria-label="Sound on or off">🔊</button>
    </div>
    <div class="stick" hidden><div class="knob"></div></div>`;
  document.body.append(layer);
  const stick = layer.querySelector<HTMLDivElement>(".stick")!;
  const knob = layer.querySelector<HTMLDivElement>(".knob")!;

  // --- the look speed, on the pause screen: kept in the browser for next time -------------------------------
  const slider = document.querySelector<HTMLInputElement>("#start .look input");
  if (slider) {
    try {
      slider.value = localStorage.getItem(LOOK_KEY) ?? slider.value;
    } catch {}
    input.lookSpeed = Number(slider.value);
    slider.addEventListener("input", () => {
      input.lookSpeed = Number(slider.value);
      try {
        localStorage.setItem(LOOK_KEY, slider.value);
      } catch {}
    });
    // (moving it mustn't count as the tap that starts the game again)
    for (const type of ["click", "touchstart", "pointerdown"]) slider.closest("label")!.addEventListener(type, (e) => e.stopPropagation());
  }

  // --- the corner buttons ----------------------------------------------------------------------------
  let muted = false;
  for (const b of layer.querySelectorAll<HTMLButtonElement>(".corner button")) {
    b.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true }); // (not a look or a stick)
    b.addEventListener("click", () => {
      if (b.dataset.do === "pause") input.unlock();
      if (b.dataset.do === "chit") input.press("Tab");
      if (b.dataset.do === "mute") {
        input.press("KeyM");
        muted = !muted;
        b.textContent = muted ? "🔇" : "🔊";
      }
    });
  }

  // --- thumbs: one may be on the stick while the other looks round --------------------------------------
  type Thumb = { kind: "stick" | "look"; x0: number; y0: number; x: number; y: number; at: number; last: number; moved: number };
  const thumbs = new Map<number, Thumb>();

  layer.addEventListener("touchstart", (e) => {
    e.preventDefault(); // (no scrolling, no zooming, no pretend mouse clicks after)
    for (const t of e.changedTouches) {
      const p = toPage(t.clientX, t.clientY);
      const width = document.documentElement.classList.contains("sideways") ? window.innerHeight : window.innerWidth;
      const onStickSide = p.x < width * STICK_SIDE && ![...thumbs.values()].some((h) => h.kind === "stick");
      thumbs.set(t.identifier, { kind: onStickSide ? "stick" : "look", x0: p.x, y0: p.y, x: p.x, y: p.y, at: performance.now(), last: performance.now(), moved: 0 });
      if (onStickSide) {
        stick.hidden = false;
        stick.style.left = `${p.x}px`;
        stick.style.top = `${p.y}px`;
        knob.style.transform = "translate(-50%, -50%)";
      }
    }
  }, { passive: false });

  layer.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const h = thumbs.get(t.identifier);
      if (!h) continue;
      const p = toPage(t.clientX, t.clientY);
      const now = performance.now();
      if (h.kind === "look") {
        const dx = p.x - h.x, dy = p.y - h.y;
        const speed = Math.hypot(dx, dy) / Math.max(8, now - h.last);
        const gain = 1 + Math.min(LOOK_FLICK_MAX, speed * LOOK_FLICK);
        input.look(dx * gain, dy * gain);
      }
      h.last = now;
      h.moved += Math.hypot(p.x - h.x, p.y - h.y);
      h.x = p.x;
      h.y = p.y;
      if (h.kind === "stick") {
        // the knob follows your thumb, as far as its reach; how far it's pushed is how fast you go
        let dx = p.x - h.x0, dy = p.y - h.y0;
        const d = Math.hypot(dx, dy);
        input.stick.fast = d > STICK_REACH * FAST_PULL;
        if (d > STICK_REACH) {
          dx *= STICK_REACH / d;
          dy *= STICK_REACH / d;
        }
        input.stick.x = dx / STICK_REACH;
        input.stick.y = dy / STICK_REACH;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    }
  }, { passive: false });

  const lift = (e: TouchEvent) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const h = thumbs.get(t.identifier);
      if (!h) continue;
      thumbs.delete(t.identifier);
      if (h.kind === "stick") {
        input.stick.x = input.stick.y = 0;
        input.stick.fast = false;
        stick.hidden = true;
      } else if (h.moved < TAP_MOVE && performance.now() - h.at < TAP_TIME) onTap();
    }
  };
  layer.addEventListener("touchend", lift, { passive: false });
  layer.addEventListener("touchcancel", lift, { passive: false });

  return {
    setVisible(on) {
      if (layer.hidden === !on) return;
      layer.hidden = !on;
      if (!on) {
        // (let go of everything: a thumb held down as the game pauses mustn't keep you walking)
        thumbs.clear();
        input.stick.x = input.stick.y = 0;
        input.stick.fast = false;
        stick.hidden = true;
      }
    },
  };
}
