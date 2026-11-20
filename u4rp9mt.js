import { PitchDetector } from './ydsa43m.js';
import { freqToMidi } from './ewdv3t5.js';

export class PitchTracker {
  constructor(ctx, source, size = 2048) {
    this.ctx = ctx;
    this.size = size;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = size;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(this.analyser);
    this.buf = new Float32Array(size);
    this.detector = PitchDetector.forFloat32Array(size);
    this.detector.clarityThreshold = 0.8;
    this.gateDb = -52;
    this.clarityMin = 0.86;
    this.recent = [];
  }

  /** Returns { t, db, midi|null, clarity } for the newest analysis window. */
  read() {
    const { ctx, buf } = this;
    this.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i];
      sum += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sum / buf.length);
    const db = 20 * Math.log10(rms + 1e-9);
    const t = ctx.currentTime - this.size / (2 * ctx.sampleRate);
    if (db < this.gateDb) {
      this.recent.length = 0;
      return { t, db, peak, midi: null, clarity: 0 };
    }
    const [freq, clarity] = this.detector.findPitch(buf, ctx.sampleRate);
    if (!(clarity >= this.clarityMin) || freq < 55 || freq > 1500) {
      this.recent.length = 0;
      return { t, db, peak, midi: null, clarity };
    }
    let midi = freqToMidi(freq);
    // Short median filter against single-frame octave slips.
    this.recent.push(midi);
    if (this.recent.length > 3) this.recent.shift();
    if (this.recent.length === 3) {
      const [a, b, c] = this.recent;
      midi = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
    return { t, db, peak, midi, clarity };
  }
}
