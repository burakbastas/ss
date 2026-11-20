import { pitchClass } from './ewdv3t5.js';

// Chord tones as semitones above the key's tonic.
const CHORDS = {
  major: { I: [0, 4, 7], V7: [7, 11, 2, 5], IV: [5, 9, 0], ii: [2, 5, 9], vi: [9, 0, 4] },
  minor: { i: [0, 3, 7], V7: [7, 11, 2, 5], iv: [5, 8, 0], VI: [8, 0, 3], VII: [10, 2, 5] },
};
const PREF = { major: ['I', 'V7', 'IV', 'ii', 'vi'], minor: ['i', 'V7', 'iv', 'VI', 'VII'] };
const TONIC = { major: 'I', minor: 'i' };
const QUALITY = { I: '', IV: '', V7: '7', ii: 'm', vi: 'm', i: 'm', iv: 'm', VI: '', VII: '' };

export const chordTones = (mode, sym) => CHORDS[mode][sym];

/** Name of a chord in the current key, e.g. Sol7 or La m. */
export function chordName(key, mode, sym) {
  const root = key + CHORDS[mode][sym][0];
  const q = QUALITY[sym];
  return pitchClass(root) + (q === 'm' ? ' m' : q);
}

/**
 * Picks I / IV / V7 (or minor equivalents) for each segment of the melody so that
 * the chord holds most of the sounding notes, strong beats weighing more.
 * notes: semitone offsets, beats: duration of each note in beats.
 * Returns [{ beat, beats, sym }].
 */
export function harmonize(notes, beats, mode = 'major', segBeats = null) {
  const total = beats.reduce((a, b) => a + b, 0);
  const shortest = Math.min(...beats);
  const seg = segBeats || (shortest <= 0.5 ? 1 : 2);
  const starts = [];
  let t = 0;
  notes.forEach((n, i) => { starts.push(t); t += beats[i]; });
  const segs = [];
  for (let s = 0; s < total - 1e-6; s += seg) {
    const e = Math.min(total, s + seg);
    const weights = new Map();
    notes.forEach((n, i) => {
      const a = Math.max(s, starts[i]);
      const b = Math.min(e, starts[i] + beats[i]);
      if (b <= a) return;
      const strong = Math.abs(starts[i] - s) < 1e-6 ? 1.5 : 1;
      const pc = ((n % 12) + 12) % 12;
      weights.set(pc, (weights.get(pc) || 0) + (b - a) * strong);
    });
    let best = TONIC[mode];
    let bestScore = -1;
    for (const sym of PREF[mode]) {
      let score = 0;
      for (const [pc, w] of weights) if (CHORDS[mode][sym].includes(pc)) score += w;
      if (score > bestScore + 1e-9) { best = sym; bestScore = score; }
    }
    segs.push({ beat: s, beats: e - s, sym: best });
  }
  // End on the tonic; a dominant just before the end makes a cadence.
  const last = segs[segs.length - 1];
  if (last) last.sym = TONIC[mode];
  const merged = [];
  for (const sg of segs) {
    const prev = merged[merged.length - 1];
    if (prev && prev.sym === sg.sym) prev.beats += sg.beats;
    else merged.push({ ...sg });
  }
  return merged;
}

function placeIn(pc, lo) {
  let m = lo + ((((pc - lo) % 12) + 12) % 12);
  return m;
}

/** Left-hand bass and right-hand chord notes for a chord in a key. */
export function voice(key, mode, sym, female = false) {
  const tones = CHORDS[mode][sym].map((x) => key + x);
  const bassLo = Math.max(31, Math.min(female ? 45 : 38, key - 17));
  const bass = placeIn(tones[0] % 12, bassLo);
  const rhLo = key - 3;
  const rh = tones.map((m) => placeIn(m % 12, rhLo)).sort((a, b) => a - b);
  return { bass, rh };
}
