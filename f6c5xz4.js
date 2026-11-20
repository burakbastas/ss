import { VOICES, INTERVALS, noteName } from './ewdv3t5.js';
import { harmonize, voice, chordName } from './88d542p.js';
import { perdeGrid, k2st } from './392vqcv.js';

/** Time the runner leaves between scheduling and the start of each repetition. */
export const REP_GAP = 0.12;

export const beatsOf = (ex, i, n) => {
  if (Array.isArray(ex.beats)) return ex.beats[i];
  if (i === n - 1 && ex.lastBeats) return ex.lastBeats;
  return ex.beats || 1;
};

export function patternBeats(ex) {
  const n = ex.notes.length;
  let b = 0;
  for (let i = 0; i < n; i++) b += beatsOf(ex, i, n);
  return b;
}

const isFemale = (s) => !(VOICES[s.voice] || VOICES.tenor).male;

/** All roots for a pattern exercise inside the singer's range, in practice order. */
export function keysFor(ex, s) {
  const minO = Math.min(...ex.notes);
  const maxO = Math.max(...ex.notes);
  const z = ex.zone || {};
  const lo = s.lo + (z.lo || 0);
  const hi = s.hi - (z.hi || 0);
  let rLo = Math.ceil(lo - minO - 1e-6);
  const rHi = Math.max(Math.floor(hi - maxO + 1e-6), rLo);
  if (z.topFrom != null) rLo = Math.min(Math.max(rLo, Math.ceil(s.hi - z.topFrom - maxO)), rHi);
  const step = ex.step || 1;
  const asc = [];
  for (let r = rLo; r <= rHi; r += step) asc.push(r);
  if (ex.dir === 'down') return asc.reverse();
  if (ex.dir === 'updown') return asc.concat(asc.slice(0, -1).reverse());
  return asc;
}

/** Length of one repetition as buildRep lays it out, plus the scheduling gap. */
export function repSeconds(ex, s) {
  const beat = 60 / (ex.bpm * s.tempo);
  const pat = patternBeats(ex) * beat;
  const once = s.accomp === 'once' && !ex.noListen;
  return 2 * beat + pat + (once ? pat + beat : 0) + 0.75 * beat + REP_GAP;
}

/** Thin the key list (keeping both ends) so the run fits into maxSec. */
export function fitKeys(keys, perRep, maxSec) {
  if (!maxSec || keys.length * perRep <= maxSec) return keys;
  const n = Math.max(3, Math.floor(maxSec / perRep));
  if (n >= keys.length) return keys;
  const out = [];
  for (let i = 0; i < n; i++) out.push(keys[Math.round((i * (keys.length - 1)) / (n - 1))]);
  return out;
}

export function planKeys(ex, s, maxSec) {
  let keys = keysFor(ex, s);
  const per = repSeconds(ex, s);
  if (!maxSec || keys.length * per <= maxSec) return keys;
  if (ex.dir === 'updown') {
    keys = keysFor({ ...ex, dir: 'up' }, s);
    if (keys.length * per <= maxSec) return keys;
  }
  return fitKeys(keys, per, maxSec);
}

/** Dem pitches under a karar: one and two octaves below, the lower one softer. */
export function demFor(root) {
  return root - 24 >= 33 ? { midis: [root - 12, root - 24], levels: [1, 0.6] } : { midis: [root - 12], levels: [1] };
}

/**
 * Accompaniment for one pass of the pattern starting at t0 (seconds from rep start).
 * Pushes piano events and chord labels. Turkish-music versions get no chords: the dem
 * runs under the whole rep and the melody, when it plays, sounds in two octaves.
 */
function accompany(ex, key, s, t0, beat, events, labels, melody) {
  const mode = ex.mode || 'major';
  const n = ex.notes.length;
  const beatsArr = ex.notes.map((_, i) => beatsOf(ex, i, n));
  const total = beatsArr.reduce((a, b) => a + b, 0);
  const acc = ex.acc || 'pad';
  const female = isFemale(s);

  if (ex.isTm) {
    labels.push({ t: t0, text: `${ex.sc.label}, dem ${ex.kararName}` });
  } else if (acc === 'dem') {
    const dem = [key - 12, key - 5];
    for (let b = 0; b < total - 1e-6; b += 4) {
      const d = Math.min(4, total - b) * beat;
      events.push({ kind: 'chord', midis: dem, t: t0 + b * beat, dur: d * 0.98, vel: 0.24, spread: 0 });
    }
    labels.push({ t: t0, text: `Dem ${noteName(key, false)}` });
  } else {
    const segs = ex.harm || harmonize(ex.notes, beatsArr, mode, ex.segBeats);
    for (const sg of segs) {
      const { bass, rh } = voice(key, mode, sg.sym, female);
      const st = t0 + sg.beat * beat;
      const len = sg.beats * beat;
      labels.push({ t: st, text: chordName(key, mode, sg.sym) });
      if (acc === 'pad') {
        for (let b = 0; b < sg.beats - 1e-6; b += 4) {
          const d = Math.min(4, sg.beats - b) * beat;
          events.push({ kind: 'note', midi: bass, t: st + b * beat, dur: d * 0.98, vel: 0.3 });
          events.push({ kind: 'chord', midis: rh, t: st + b * beat, dur: d * 0.98, vel: 0.2 });
        }
      } else if (acc === 'pulse') {
        events.push({ kind: 'note', midi: bass, t: st, dur: Math.min(len, beat) * 0.9, vel: 0.3 });
        for (let b = 0; b < sg.beats - 1e-6; b += 1) {
          events.push({ kind: 'chord', midis: rh, t: st + b * beat, dur: beat * 0.42, vel: b === 0 ? 0.22 : 0.17, spread: 0.004 });
        }
      } else if (acc === 'broken') {
        events.push({ kind: 'note', midi: bass, t: st, dur: len * 0.98, vel: 0.3 });
        const order = rh.length >= 3 ? [0, 2, 1, 2] : [0, 1];
        let k = 0;
        for (let b = 0; b < sg.beats - 1e-6; b += 0.5) {
          events.push({ kind: 'note', midi: rh[order[k % order.length]], t: st + b * beat, dur: beat * 0.55, vel: 0.17 });
          k++;
        }
      }
    }
  }
  if (melody) {
    let t = t0;
    ex.notes.forEach((off, i) => {
      const d = beatsArr[i] * beat;
      const sound = (ex.staccato ? d * 0.45 : d) * 0.95;
      if (ex.isTm) {
        events.push({ kind: 'note', midi: key + off, t, dur: sound, vel: 0.34 });
        events.push({ kind: 'note', midi: key + off - 12, t: t + 0.004, dur: sound, vel: 0.26 });
      } else {
        events.push({ kind: 'note', midi: key + off, t, dur: sound, vel: 0.36 });
      }
      t += d;
    });
  }
  return total * beat;
}

/**
 * Timeline for one repetition: piano events, chord labels and the notes to sing,
 * in seconds from the rep start.
 */
export function buildRep(ex, root, s, { guide = false } = {}) {
  const beat = 60 / (ex.bpm * s.tempo);
  const mode = ex.mode || 'major';
  const female = isFemale(s);
  const events = [];
  const labels = [];
  const listen = s.accomp === 'once' && !ex.noListen;
  const pat = patternBeats(ex) * beat;
  const duration = 2 * beat + (listen ? pat + beat : 0) + pat + 0.75 * beat;
  // Intro: tonic (or dem) with the first sung note on top, then a breath.
  const first = root + ex.notes[0];
  if (ex.isTm) {
    const dem = demFor(root);
    events.push({ kind: 'drone', midis: dem.midis, levels: dem.levels, t: 0, dur: duration - 0.1, vel: 0.55 });
    events.push({ kind: 'note', midi: root - 12, t: 0, dur: beat * 1.2, vel: 0.3 });
    events.push({ kind: 'note', midi: first - 12, t: 0.024, dur: beat * 1.2, vel: 0.28 });
  } else if (ex.acc === 'dem') {
    events.push({ kind: 'chord', midis: [root - 12, root - 5], t: 0, dur: beat * 1.6, vel: 0.26, spread: 0 });
  } else {
    const { bass, rh } = voice(root, mode, mode === 'minor' ? 'i' : 'I', female);
    events.push({ kind: 'note', midi: bass, t: 0, dur: beat * 1.2, vel: 0.3 });
    events.push({ kind: 'chord', midis: rh, t: 0, dur: beat * 1.2, vel: 0.22 });
  }
  events.push({ kind: 'note', midi: first, t: 0.02, dur: beat * 1.2, vel: 0.42 });

  let t = 2 * beat;
  if (listen) {
    t += accompany(ex, root, s, t, beat, events, [], true);
    t += beat;
  }
  const singStart = t;
  const singLen = accompany(ex, root, s, singStart, beat, events, labels, guide && !listen);
  const targets = [];
  const n = ex.notes.length;
  let tt = singStart;
  for (let i = 0; i < n; i++) {
    const d = beatsOf(ex, i, n) * beat;
    const sound = ex.staccato ? d * 0.45 : d;
    targets.push({ midi: root + ex.notes[i], t0: tt, t1: tt + sound, syl: ex.syl ? ex.syl[i] : null, perde: ex.perde ? ex.perde[i] : null, info: ex.noteInfo ? ex.noteInfo[i] : null });
    tt += d;
  }
  if (ex.clicks) {
    for (let c = singStart; c < singStart + singLen - 1e-6; c += beat) events.push({ kind: 'click', t: c, accent: c === singStart });
  }
  const singEnd = singStart + singLen;
  let perdeLines = null;
  if (ex.isTm) {
    const kMin = Math.min(...ex.komas);
    const kMax = Math.max(...ex.komas);
    perdeLines = perdeGrid(ex.sc, kMin - 7, kMax + 7).map((p) => ({
      ...p, midi: root + k2st(p.k), natMidi: p.sp && p.sp.n ? root + k2st(p.sp.nat - ex.sc.base) : null,
    }));
  }
  return {
    kind: 'pattern', ex, root,
    label: ex.isTm ? `${ex.kararName} = ${noteName(root)}` : noteName(root),
    events, labels, targets, listen, perdeLines,
    singStart, singEnd, beat, duration, guide: guide && !listen,
  };
}

export function resolveGlideNote([base, off], s) {
  return (base === 'lo' ? s.lo : s.hi) + off;
}

/** Seconds for one sweep: wider ranges take longer at the same speed. */
export function glideSweep(ex, s) {
  const g = ex.glide;
  const span = Math.abs(resolveGlideNote(g.to, s) - resolveGlideNote(g.from, s));
  return Math.min(g.max || 8, Math.max(g.min || 2.5, span / (g.rate || 3)));
}

/**
 * One siren: the piano gives the start note, then a soft guide tone slides along the
 * path over a dem on the lowest note, with piano anchors at the turning points.
 */
export function buildGlide(ex, s, repIndex = 0, { guide = true } = {}) {
  const g = ex.glide;
  const a = resolveGlideNote(g.from, s);
  const b = resolveGlideNote(g.to, s);
  const sec = glideSweep(ex, s);
  const lead = 1.6;
  const path = [{ t: lead, midi: a }, { t: lead + sec, midi: b }];
  if (g.shape === 'updown') path.push({ t: lead + 2 * sec, midi: a });
  const end = path[path.length - 1].t;
  const low = Math.min(a, b);
  const events = [
    { kind: 'note', midi: a, t: 0, dur: 0.9, vel: 0.45 },
    { kind: 'note', midi: a - 12, t: 0.01, dur: 0.9, vel: 0.28 },
    { kind: 'drone', midis: [low - 12], levels: [1], t: 0.05, dur: end + 0.5, vel: 0.36 },
  ];
  path.forEach((q, i) => {
    if (i === 0) return;
    events.push({ kind: 'note', midi: q.midi, t: q.t, dur: 0.8, vel: 0.24 });
  });
  if (guide) events.push({ kind: 'glide', points: path, t: 0, vel: 0.5 });
  return {
    kind: 'glide', ex, root: a, label: `${repIndex + 1}/${g.reps}`, guide,
    events, labels: [], targets: [], path, sweep: sec, singStart: lead, singEnd: end, duration: end + 1.0,
  };
}

export const glideSeconds = (ex, s) => ex.glide.reps * (buildGlide(ex, s).duration + REP_GAP);

export function sustainNotes(ex, s) {
  const notes = isFemale(s) ? ex.female : ex.male;
  const out = [];
  for (const m of notes) for (let r = 0; r < (ex.reps || 1); r++) out.push(m);
  return out;
}

/** A held note on one breath: cue, inhale, the hold itself (grows with practice), a short rest. */
export const SUSTAIN_SEC = 26;

const IV_SING = [1.4, 3.9];
export const INTERVAL_SEC = IV_SING[1] + 2.4 + REP_GAP;

/** Interval trial: base note, a window to sing, then the piano plays the answer. */
export function buildIntervalTrial(ex, s, rnd = Math.random) {
  const choices = INTERVALS.filter((iv) => ex.intervals.includes(iv.st));
  for (let tries = 0; tries < 50; tries++) {
    const iv = choices[Math.floor(rnd() * choices.length)];
    const dir = rnd() < 0.7 ? 1 : -1;
    const span = s.hi - s.lo - 2;
    const base = s.lo + 1 + Math.floor(rnd() * Math.max(1, span));
    const target = base + dir * iv.st;
    if (target < s.lo || target > s.hi - 1) continue;
    const [singStart, singEnd] = IV_SING;
    return {
      kind: 'interval', ex, root: base, label: `${noteName(base)} → ${iv.name} ${dir > 0 ? 'yukarı' : 'aşağı'}`,
      interval: iv, dir,
      events: [
        { kind: 'note', midi: base, t: 0, dur: 1.0, vel: 0.5 },
        { kind: 'note', midi: target, t: singEnd + 0.1, dur: 1.1, vel: 0.5 },
      ],
      labels: [],
      ref: { midi: base, t0: 0, t1: 1.0 },
      targets: [{ midi: target, t0: singStart, t1: singEnd }],
      answerAt: singEnd + 0.1,
      singStart, singEnd, duration: singEnd + 2.4,
    };
  }
  return null;
}
