import { PitchDetector } from './ydsa43m.js';
import { freqToMidi } from './ewdv3t5.js';
import { ensureAudio } from './qpy3wmh.js';
import { settings } from './f36qmgd.js';

/** Pitch track of an audio file: [{t, midi|null}] every ~50 ms, plus duration. */
export async function analyzeFile(file, onProgress) {
  const ctx = ensureAudio();
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  const data = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const size = 2048;
  const hop = Math.round(sr * 0.025);
  const det = PitchDetector.forFloat32Array(size);
  det.clarityThreshold = 0.8;
  const frame = new Float32Array(size);
  const raw = [];
  const total = Math.max(0, Math.floor((data.length - size) / hop));
  for (let k = 0; k <= total; k++) {
    const start = k * hop;
    frame.set(data.subarray(start, start + size));
    let sum = 0;
    for (let i = 0; i < size; i++) sum += frame[i] * frame[i];
    const db = 20 * Math.log10(Math.sqrt(sum / size) + 1e-9);
    let midi = null;
    if (db >= settings.gateDb) {
      const [f, clarity] = det.findPitch(frame, sr);
      if (clarity >= 0.86 && f > 55 && f < 1500) midi = freqToMidi(f);
    }
    raw.push({ t: (start + size / 2) / sr, midi });
    if (k % 400 === 0) {
      onProgress?.(k / total);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  // 3-point median against octave slips, then thin to ~20 points per second.
  const track = [];
  let next = 0;
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    let midi = s.midi;
    if (midi != null && raw[i - 1]?.midi != null && raw[i + 1]?.midi != null) {
      const v = [raw[i - 1].midi, midi, raw[i + 1].midi].sort((a, b) => a - b);
      midi = v[1];
    }
    if (s.t >= next) {
      track.push({ t: +s.t.toFixed(2), midi: midi == null ? null : +midi.toFixed(2) });
      next = s.t + 0.05;
    }
  }
  return { track, dur: buf.duration };
}

/** Lowest and highest sung note (3rd and 97th percentile) and voiced seconds. */
export function trackStats(track) {
  const v = track.filter((s) => s.midi != null).map((s) => s.midi).sort((a, b) => a - b);
  if (v.length < 10) return null;
  return {
    lo: v[Math.floor(v.length * 0.03)],
    hi: v[Math.floor(v.length * 0.97)],
    voicedSec: v.length * 0.05,
  };
}
