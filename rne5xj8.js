import { midiToFreq } from './ewdv3t5.js';
import { PIANOS } from './7q63hc9.js';

function wave(ctx, amps) {
  const real = new Float32Array(amps.length + 1);
  const imag = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => { imag[i + 1] = a; });
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/** Sample-based piano with an oscillator fallback while samples load. */
export class Synth {
  constructor(ctx) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(ctx.destination);
    this.pianoWave = wave(ctx, [1, 0.45, 0.3, 0.18, 0.12, 0.08, 0.05, 0.035, 0.02, 0.012]);
    this.organWave = wave(ctx, [1, 0.6, 0.35, 0.22, 0.1, 0.06]);
    this.live = new Set();
    this.droneVoice = null;
    this.inst = null;
    this.buffers = new Map();
    this.loading = null;
    this.loadedId = null;
  }

  setVolume(v) {
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  get ready() { return this.loadedId != null && this.loadedId === this.inst; }

  /** Load one instrument's samples; resolves when ready. onProgress(0..1). */
  load(id, onProgress) {
    if (!PIANOS[id]) id = 'sal';
    if (this.inst === id && (this.ready || this.loading)) return this.loading || Promise.resolve(true);
    this.inst = id;
    const def = PIANOS[id];
    const entries = Object.entries(def.notes);
    let done = 0;
    const map = new Map();
    const p = Promise.all(entries.map(async ([m, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`sample ${url}`);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      map.set(Number(m), buf);
      done++;
      onProgress?.(done / entries.length);
    })).then(() => {
      if (this.inst !== id) return false;
      this.buffers = map;
      this.keys = [...map.keys()].sort((a, b) => a - b);
      this.gain = def.gain;
      this.loadedId = id;
      this.loading = null;
      return true;
    }).catch((err) => {
      this.loading = null;
      throw err;
    });
    this.loading = p;
    return p;
  }

  track(nodes, until) {
    const item = { nodes, until };
    this.live.add(item);
    nodes[0].onended = () => this.live.delete(item);
    return item;
  }

  piano(midi, when, dur, vel = 0.55) {
    return this.ready ? this.sample(midi, when, dur, vel) : this.oscPiano(midi, when, dur, vel);
  }

  sample(midi, when, dur, vel) {
    const { ctx } = this;
    let best = this.keys[0];
    for (const k of this.keys) if (Math.abs(k - midi) < Math.abs(best - midi)) best = k;
    const src = ctx.createBufferSource();
    src.buffer = this.buffers.get(best);
    src.playbackRate.value = 2 ** ((midi - best) / 12);
    const g = ctx.createGain();
    const level = Math.min(1.5, vel * this.gain * 1.6);
    g.gain.setValueAtTime(level, when);
    g.gain.setTargetAtTime(0, when + dur, 0.12);
    src.connect(g).connect(this.out);
    src.start(when);
    src.stop(when + dur + 0.9);
    return this.track([src, g], when + dur + 0.9);
  }

  oscPiano(midi, when, dur, vel) {
    const { ctx } = this;
    const f = midiToFreq(midi);
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.pianoWave);
    osc.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(Math.min(f * 9, 9000), when);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2.5, 400), when + 1.8);
    const g = ctx.createGain();
    const decay = 2.6 - Math.min(1.6, (midi - 36) / 40);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vel, when + 0.006);
    g.gain.setTargetAtTime(vel * 0.25, when + 0.01, decay / 3);
    g.gain.setTargetAtTime(0, when + dur, 0.09);
    osc.connect(lp).connect(g).connect(this.out);
    osc.start(when);
    osc.stop(when + dur + 0.6);
    return this.track([osc, g], when + dur + 0.6);
  }

  chord(midis, when, dur, vel = 0.3, spread = 0.012) {
    midis.forEach((m, i) => this.piano(m, when + i * spread, dur, vel));
  }

  click(when, accent = false) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1760 : 1320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(accent ? 0.3 : 0.18, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(g).connect(this.out);
    osc.start(when);
    osc.stop(when + 0.06);
    return this.track([osc, g], when + 0.06);
  }

  /** Continuous reference tone (dem). */
  drone(midis, level = 0.13) {
    this.stopDrone();
    const { ctx } = this;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(level, now + 0.4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const list = Array.isArray(midis) ? midis : [midis];
    const oscs = list.flatMap((m) => [-3, 3].map((det) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this.organWave);
      o.frequency.value = midiToFreq(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(now);
      return o;
    }));
    lp.connect(g).connect(this.out);
    this.droneVoice = { oscs, g };
  }

  stopDrone() {
    if (!this.droneVoice) return;
    const { oscs, g } = this.droneVoice;
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setTargetAtTime(0, now, 0.08);
    oscs.forEach((o) => o.stop(now + 0.5));
    this.droneVoice = null;
  }

  stopAll() {
    const now = this.ctx.currentTime;
    for (const item of this.live) {
      const [src, g] = item.nodes;
      try {
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, 0.04);
        src.stop(now + 0.25);
      } catch { /* already stopped */ }
    }
    this.live.clear();
  }
}
