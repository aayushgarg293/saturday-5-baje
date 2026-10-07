import * as THREE from "three";
import type { RailwaySound } from "../world/railway";
import { type AudioEngine, setPosition } from "./engine";
import { type Ctx, envelope, filter, gain, noiseSource, rand, stopAt } from "./synth";

/**
 * The trains and the crossing, heard (world/railway.ts says what's
 * happening, every frame):
 *
 *   the bell     the crossing's electric bell by the gateman's hut, a fast
 *                metallic ringing while the barriers come down
 *   the horn     the diesel's two-tone horn: as it nears the crossing, and
 *                two short toots as the passenger pulls out
 *   the engine   its deep growl, throbbing; louder when it's pulling, a
 *                low idle while it stands
 *   the wheels   "ka-tak ka-tak": the owner's own recording of a train
 *                going by (public/sounds/train wheels sound.mp3), looped,
 *                coming from the part of the train nearest you: full with
 *                the express, softer as the passenger slows. The loudest
 *                thing near the line: it's what a train sounds like
 *
 * The rest are made in code, at fixed pitches (no sliding tones: the owner
 * doesn't like the "pew"). Away from the station only the horn reaches you.
 */

/** The recording: where it is (next to the page, in the built game too), and the steady part of it to loop (s). */
const WHEELS_FILE = `${import.meta.env.BASE_URL}sounds/${encodeURIComponent("train wheels sound.mp3")}`;
const WHEELS_LOOP = { from: 1.3, to: 12.4, blend: 0.35 };

/**
 * How far each carries (m). Away from the station only the horn reaches you, faintly, as it would; the
 * engine, the wheels and the bell are for when you're there.
 */
const HEAR_WHEELS = 40, HEAR_ENGINE = 50, HEAR_BELL = 40, HEAR_HORN = 700;

type Loop = { level: GainNode; panner: PannerNode; stop: () => void };

export class TrainSounds {
  private bellPanner: PannerNode | null = null;
  private bellNext = 0;
  private engine: Loop | null = null;
  private horn: Loop | null = null;
  private wheels: Loop | null = null;
  /** The recording's steady part, made into a seamless loop (null until it's loaded). */
  private wheelsLoop: AudioBuffer | null = null;

  constructor(private audio: AudioEngine, private ctx: Ctx) {
    void fetch(WHEELS_FILE)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => (this.wheelsLoop = seamlessLoop(ctx, buffer, WHEELS_LOOP)))
      .catch(() => {}); // (no recording: the trains simply run without their wheels' sound)
  }

  update(listener: THREE.Vector3, s: RailwaySound) {
    const ctx = this.ctx, now = ctx.currentTime;

    // --- the crossing bell ---------------------------------------------------------------------------
    if (s.bell && listener.distanceTo(s.bellAt) < HEAR_BELL) {
      this.bellPanner ??= this.audio.place("street", s.bellAt.x, s.bellAt.y, s.bellAt.z, 4, 0.3, HEAR_BELL);
      // nine strikes a second, scheduled a little ahead
      if (this.bellNext < now) this.bellNext = now + 0.02;
      while (this.bellNext < now + 0.12) {
        bellStrike(ctx, this.bellPanner, this.bellNext);
        this.bellNext += 1 / 9;
      }
    }

    const train = s.train;
    // --- the engine's growl, and the horn: following the engine ------------------------------------------
    const engineFar = !train || listener.distanceTo(train.engine) > HEAR_ENGINE;
    if (!engineFar && train) {
      this.engine ??= this.makeEngine();
      setPosition(this.engine.panner, train.engine.x, train.engine.y, train.engine.z);
      // (idling at the platform, pulling hard as it moves)
      const pull = train.speed > 0.1 ? 0.3 + 0.35 * Math.min(1, train.speed / 14) : 0.22;
      // (slowly: it comes up out of the distance, and settles as it stops)
      this.engine.level.gain.setTargetAtTime(pull, now, 1.0);
    } else if (this.engine) {
      this.engine.stop();
      this.engine = null;
    }
    const hornFar = !train || listener.distanceTo(train.engine) > HEAR_HORN;
    if (!hornFar && train) {
      this.horn ??= this.makeHorn();
      setPosition(this.horn.panner, train.engine.x, train.engine.y + 2, train.engine.z);
      this.horn.level.gain.setTargetAtTime(train.horn ? 0.8 : 0, now, train.horn ? 0.03 : 0.08);
    } else if (this.horn) {
      this.horn.stop();
      this.horn = null;
    }

    // --- the wheels: the recording, from the stretch of train nearest you, while it moves -------------------
    if (train && this.wheelsLoop && train.speed > 0.2) {
      const head = Math.min(...train.axleZ), tail = Math.max(...train.axleZ);
      const z = Math.min(tail, Math.max(head, listener.z));
      const near = Math.hypot(listener.x - s.trackX, listener.z - z) < HEAR_WHEELS + 5;
      if (near) {
        this.wheels ??= this.makeWheels(this.wheelsLoop);
        setPosition(this.wheels.panner, s.trackX, 0.6, z);
        this.wheels.level.gain.setTargetAtTime(Math.min(1, 0.25 + train.speed / 14), now, 0.25);
      } else if (this.wheels) {
        this.wheels.stop();
        this.wheels = null;
      }
    } else if (this.wheels) {
      this.wheels.stop();
      this.wheels = null;
    }
  }

  /** The wheels' recording, looping, from a point by the line (moved along with the train). */
  private makeWheels(loop: AudioBuffer): Loop {
    const ctx = this.ctx;
    const panner = this.audio.place("street", 0, 0, 0, 10, 0.2, HEAR_WHEELS);
    const level = gain(ctx, 0);
    level.connect(panner);
    const src = ctx.createBufferSource();
    src.buffer = loop;
    src.loop = true;
    src.connect(level);
    src.start(ctx.currentTime, Math.random() * loop.duration);
    return { level, panner, stop: () => fadeAndStop(ctx, level, [src]) };
  }

  /** The diesel's growl: a low buzz throbbing at its firing beat, and rumbling noise under it. */
  private makeEngine(): Loop {
    const ctx = this.ctx, t = ctx.currentTime;
    const panner = this.audio.place("street", 0, 0, 0, 8, 0.15, HEAR_ENGINE);
    const level = gain(ctx, 0);
    level.connect(panner);
    const buzz = ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 43;
    const throb = gain(ctx, 0.5);
    const beat = ctx.createOscillator(); // (the throb: its cylinders firing)
    beat.frequency.value = 7.5;
    const depth = gain(ctx, 0.35);
    beat.connect(depth).connect(throb.gain);
    buzz.connect(filter(ctx, "lowpass", 240)).connect(throb).connect(level);
    const rumble = noiseSource(ctx, "brown");
    rumble.connect(filter(ctx, "lowpass", 180)).connect(gain(ctx, 0.8)).connect(level);
    for (const s of [buzz, beat, rumble]) s.start(t);
    return { level, panner, stop: () => fadeAndStop(ctx, level, [buzz, beat, rumble]) };
  }

  /** The two-tone horn: two reedy notes a little apart, together, rough at the edges. */
  private makeHorn(): Loop {
    const ctx = this.ctx, t = ctx.currentTime;
    const panner = this.audio.place("street", 0, 0, 0, 10, 0.45);
    const level = gain(ctx, 0);
    const tone = filter(ctx, "lowpass", 1700);
    tone.connect(filter(ctx, "highpass", 180)).connect(level).connect(panner);
    const oscs = [278, 352, 556, 704].map((f, k) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = rand(-6, 6);
      o.connect(gain(ctx, k < 2 ? 0.32 : 0.08)).connect(tone);
      o.start(t);
      return o;
    });
    return { level, panner, stop: () => fadeAndStop(ctx, level, oscs) };
  }
}

/** One strike of the crossing bell's clapper: a bright, quick metallic ring. */
function bellStrike(ctx: Ctx, out: AudioNode, t: number) {
  for (const [f, amp, decay] of [[1240, 0.45, 0.22], [3110, 0.2, 0.12], [4480, 0.1, 0.08]] as const) {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = gain(ctx, 0);
    o.connect(g).connect(out);
    o.start(t);
    stopAt(envelope(g.gain, t, amp, 0.002, 0, decay), o);
  }
}

/**
 * The steady stretch of a recording (`from`..`to` seconds), in one channel (it's placed by the line: one
 * point), made to loop without a seam: its last `blend` seconds fade into its first, so the end runs
 * straight back into the start.
 */
function seamlessLoop(ctx: Ctx, rec: AudioBuffer, { from, to, blend }: { from: number; to: number; blend: number }): AudioBuffer {
  const rate = rec.sampleRate;
  const a = Math.floor(from * rate), b = Math.min(rec.length, Math.floor(to * rate)), x = Math.floor(blend * rate);
  const n = b - a - x;
  const out = ctx.createBuffer(1, n, rate);
  const data = out.getChannelData(0);
  const channels = Array.from({ length: rec.numberOfChannels }, (_, c) => rec.getChannelData(c));
  const mono = (i: number) => channels.reduce((sum, ch) => sum + ch[i], 0) / channels.length;
  for (let i = 0; i < n; i++) {
    if (i < x) {
      // the start, fading in over the end of the stretch fading out (equal power: no dip in the middle)
      const w = i / x;
      data[i] = mono(a + i) * Math.sin((w * Math.PI) / 2) + mono(b - x + i) * Math.cos((w * Math.PI) / 2);
    } else data[i] = mono(a + i);
  }
  return out;
}

/** Fade a loop out over a moment, then stop its sources. */
function fadeAndStop(ctx: Ctx, level: GainNode, sources: AudioScheduledSourceNode[]) {
  const t = ctx.currentTime;
  level.gain.setTargetAtTime(0, t, 0.25);
  for (const s of sources) s.stop(t + 1.5);
}
