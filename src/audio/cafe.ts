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
