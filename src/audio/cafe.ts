import * as THREE from "three";
import { type Cue, onCue } from "../core/cues";
import { FANS, HALL } from "../world/cafe/plan";
import type { AudioEngine } from "./engine";
import { type Ctx, filter, gain, noiseSource, rand } from "./synth";

/**
 * The cafe's own sounds, on the `inside` bus (it comes up as you climb the
 * stairs, while the street's fade away: AudioEngine.setIndoors):
 *
 *   the ceiling fans   a soft whoosh swelling as each blade passes, the faint
 *                      tick an old fan makes once a turn, its motor's hum
 *   keys and mice      clicks from whoever's typing (cues from
 *                      people/cafePeople.ts), at their own pace
 *   the modem          your computer dialling up when you sit down: the
 *                      dial tone, the number, the answering whistle, the
 *                      screech and the long hiss (about 12 s)
 *
 * Everything carries only a few metres (a hard edge: `reach`), so you hear
 * the fan above you and the booth beside you, not the whole room at once.
 */

/** How fast the fans turn (world/cafe/room.ts turns them at this speed too), turns per second. */
const FAN_TURNS = 1.6;

export class CafeSounds {
  readonly dispose: () => void;

  constructor(private engine: AudioEngine, private ctx: Ctx, frame: THREE.Matrix4) {
    for (const f of FANS) {
      const at = new THREE.Vector3(f.x, HALL.ceiling - 0.6, f.z).applyMatrix4(frame);
      this.fan(engine.place("inside", at.x, at.y, at.z, 2.5, 0, 7));
    }
    this.dispose = onCue((name, where) => this.play(name, where));
  }

  update(_dt: number, _player: THREE.Vector3) {}

  private play(name: Cue, where: THREE.Vector3) {
    if (name === "modem") return modem(this.ctx, this.engine.place("inside", where.x, where.y, where.z, 1.5, 0, 12), this.ctx.currentTime + 0.05);
    if (name !== "keyClick" && name !== "mouseClick") return;
    const t = this.ctx.currentTime + 0.005;
    const out = this.engine.place("inside", where.x, where.y, where.z, 1, 0, 8);
    if (name === "keyClick") click(this.ctx, out, t, rand(2200, 3200), 0.16, 0.02, true);
    else click(this.ctx, out, t, rand(4200, 5000), 0.12, 0.008, false);
  }

  /** One ceiling fan: the whoosh of its blades, its tick, its hum. */
  private fan(out: AudioNode) {
    const ctx = this.ctx, now = ctx.currentTime;
    // the air: soft noise, swelling three times a turn (three blades)
    const air = noiseSource(ctx, "pink");
    const swell = gain(ctx, 0.03);
    air.connect(filter(ctx, "bandpass", 340, 0.7)).connect(swell).connect(out);
    const blades = ctx.createOscillator();
    blades.frequency.value = FAN_TURNS * 3;
    const depth = gain(ctx, 0.012); // (swinging the volume 0.018 → 0.042)
    blades.connect(depth).connect(swell.gain);
    // the motor's hum: 100 Hz, from the 50 Hz mains
    const hum = ctx.createOscillator();
    hum.frequency.value = 100;
    hum.connect(gain(ctx, 0.006)).connect(out);
    // the tick, once a turn: a loop one turn long with a tiny click at its start
    const turn = ctx.createBufferSource();
    turn.buffer = tickBuffer(ctx, 1 / FAN_TURNS);
    turn.loop = true;
    turn.connect(filter(ctx, "bandpass", 1800, 2)).connect(gain(ctx, 0.25)).connect(out);
    air.start(now, rand(0, 3));
    blades.start(now);
    hum.start(now);
    turn.start(now + rand(0, 0.6));
  }
}

/**
 * A click: a tiny burst of noise through a band-pass at `f` (plastic), and
 * for a key, a soft low thock of the key hitting bottom.
 */
function click(ctx: Ctx, out: AudioNode, t: number, f: number, level: number, length: number, thock: boolean) {
  const n = noiseSource(ctx, "white");
  const g = gain(ctx, 0);
  n.connect(filter(ctx, "bandpass", f, 1.5)).connect(g).connect(out);
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + length);
  n.start(t, rand(0, 3));
  n.stop(t + length + 0.02);
  if (thock) {
    const o = ctx.createOscillator();
    o.frequency.value = rand(180, 240);
    const og = gain(ctx, 0);
    o.connect(og).connect(out);
    og.gain.setValueAtTime(level * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.0005, t + 0.03);
    o.start(t);
    o.stop(t + 0.05);
  }
}

/** A loop `seconds` long, silent but for a faint click at its start. */
function tickBuffer(ctx: Ctx, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const clickLen = Math.floor(ctx.sampleRate * 0.004);
  for (let i = 0; i < clickLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / clickLen) * 0.3;
  return buffer;
}

/**
 * A dial-up modem connecting, about twelve seconds, through its own little
 * speaker (no bass, no top):
 *
 *   0.0  the dial tone                  1.1  the number: 1 7 2 2 3 3
 *   2.8  the answering modem's whistle  4.3  the two modems' "bong-bong"
 *   5.0  the screech                     6.6  the long hiss, settling on a speed
 *  11.6  silence: connected
 */
function modem(ctx: Ctx, out: AudioNode, t0: number) {
  const speaker = gain(ctx, 0.5);
  speaker.connect(filter(ctx, "highpass", 300)).connect(filter(ctx, "lowpass", 4000)).connect(out);
  // a steady tone (or two) from `start` for `length` seconds
  const tone = (freqs: number[], start: number, length: number, level: number) => {
    const g = gain(ctx, 0);
    g.connect(speaker);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level, start + 0.01);
    g.gain.setValueAtTime(level, start + length - 0.01);
    g.gain.linearRampToValueAtTime(0, start + length);
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(g);
      o.start(start);
      o.stop(start + length + 0.02);
    }
    return g;
  };
  // the dial tone, then the number, digit by digit (each digit is two tones at once)
  tone([350, 440], t0, 1.0, 0.18);
  const DIGITS: Record<string, [number, number]> = { "1": [697, 1209], "7": [852, 1209], "2": [697, 1336], "3": [697, 1477] };
  [..."172233"].forEach((d, k) => tone(DIGITS[d], t0 + 1.1 + k * 0.22, 0.13, 0.2));
  // the answer: a high whistle, with the little breaks in it
  const answer = tone([2100], t0 + 2.8, 1.5, 0.14);
  for (let k = 1; k < 4; k++) {
    answer.gain.setValueAtTime(0.02, t0 + 2.8 + k * 0.45);
    answer.gain.setValueAtTime(0.14, t0 + 2.84 + k * 0.45);
  }
  // "bong-bong": the two modems greeting each other
  for (let k = 0; k < 4; k++) tone([k % 2 ? 2002 : 1375], t0 + 4.3 + k * 0.17, 0.14, 0.14);
  // the screech: a steady tone under a fast warble between two notes
  tone([1650], t0 + 5.0, 1.6, 0.08);
  const warble = ctx.createOscillator();
  warble.frequency.value = 1080;
  const flip = ctx.createOscillator();
  flip.type = "square";
  flip.frequency.value = 150;
  const flipDepth = gain(ctx, 100); // ±100 Hz: 980 ↔ 1180
  flip.connect(flipDepth).connect(warble.frequency);
  const wg = gain(ctx, 0);
  warble.connect(wg).connect(speaker);
  wg.gain.setValueAtTime(0.12, t0 + 5.0);
  wg.gain.setValueAtTime(0, t0 + 6.6);
  warble.start(t0 + 5.0);
  flip.start(t0 + 5.0);
  warble.stop(t0 + 6.7);
  flip.stop(t0 + 6.7);
  // the hiss: noise that flutters, loudest at the end, then stops dead
  const hiss = noiseSource(ctx, "white");
  const hg = gain(ctx, 0);
  hiss.connect(filter(ctx, "bandpass", 1800, 0.6)).connect(hg).connect(speaker);
  hg.gain.setValueAtTime(0, t0 + 6.6);
  hg.gain.linearRampToValueAtTime(0.3, t0 + 7.0);
  for (let t = t0 + 7.2; t < t0 + 9.5; t += 0.18) hg.gain.setValueAtTime(rand(0.15, 0.36), t);
  hg.gain.linearRampToValueAtTime(0.55, t0 + 11.4);
  hg.gain.setValueAtTime(0, t0 + 11.6);
  hiss.start(t0 + 6.6, rand(0, 3));
  hiss.stop(t0 + 11.7);
}
