import { centsOff, median, VOICES, INTERVALS, noteName } from './ewdv3t5.js';

const beatsOf = (ex, i, n) => {
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

/** All roots for a pattern exercise inside the singer's range, in practice order. */
export function keysFor(ex, s) {
  const minO = Math.min(...ex.notes);
  const maxO = Math.max(...ex.notes);
  const z = ex.zone || {};
  const lo = s.lo + (z.lo || 0);
  const hi = s.hi - (z.hi || 0);
  let rLo = lo - minO;
  const rHi = Math.max(hi - maxO, rLo);
  if (z.topFrom != null) rLo = Math.min(Math.max(rLo, s.hi - z.topFrom - maxO), rHi);
  const step = ex.step || 1;
  const asc = [];
  for (let r = rLo; r <= rHi; r += step) asc.push(r);
  if (ex.dir === 'down') return asc.reverse();
  if (ex.dir === 'updown') return asc.concat(asc.slice(0, -1).reverse());
  return asc;
}

export function repSeconds(ex, s) {
  const beat = 60 / (ex.bpm * s.tempo);
  const pat = patternBeats(ex) * beat;
  const once = (ex.accomp || s.accomp) === 'once';
  return 2 * beat + pat + (once ? pat + beat : 0) + 0.5 * beat;
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

export function triad(root) {
  return [root - 12, root, root + 4, root + 7];
}

/**
 * Timeline for one repetition: what the piano plays (events) and what the singer
 * should sing (targets), in seconds from the rep start.
 */
export function buildRep(ex, root, s) {
  const beat = 60 / (ex.bpm * s.tempo);
  const mode = ex.accomp || s.accomp;
  const events = [{ kind: 'chord', midis: triad(root), t: 0, dur: beat * 1.1, vel: 0.3 }];
  const n = ex.notes.length;
  let t = 2 * beat;
  if (mode === 'once') {
    for (let i = 0; i < n; i++) {
      const d = beatsOf(ex, i, n) * beat;
      const sound = ex.staccato ? d * 0.45 : d * 0.95;
      events.push({ kind: 'note', midi: root + ex.notes[i], t, dur: sound, vel: 0.5 });
      t += d;
    }
    t += beat;
  }
  const singStart = t;
  const targets = [];
  for (let i = 0; i < n; i++) {
    const d = beatsOf(ex, i, n) * beat;
    const sound = ex.staccato ? d * 0.45 : d;
    const midi = root + ex.notes[i];
    targets.push({ midi, t0: t, t1: t + sound, syl: ex.syl ? ex.syl[i] : null });
    if (mode === 'birlikte') events.push({ kind: 'note', midi, t, dur: sound * 0.95, vel: 0.28 });
    t += d;
  }
  if (ex.clicks) {
    for (let c = singStart; c < t - 1e-6; c += beat) events.push({ kind: 'click', t: c, accent: c === singStart });
  }
  return { kind: 'pattern', ex, root, label: noteName(root), events, targets, singStart, singEnd: t, beat, duration: t + 0.5 * beat };
}

export function resolveGlideNote([base, off], s) {
  return (base === 'lo' ? s.lo : s.hi) + off;
}

export function buildGlide(ex, s, repIndex = 0) {
  const g = ex.glide;
  const a = resolveGlideNote(g.from, s);
  const b = resolveGlideNote(g.to, s);
  const lead = 1.2;
  const path = [{ t: lead, midi: a }, { t: lead + g.sec, midi: b }];
  if (g.shape === 'updown') path.push({ t: lead + 2 * g.sec, midi: a });
  const end = path[path.length - 1].t;
  return {
    kind: 'glide', ex, root: a, label: `${repIndex + 1}/${g.reps}`,
    events: [{ kind: 'note', midi: a, t: 0, dur: 0.9, vel: 0.45 }],
    targets: [], path, singStart: lead, singEnd: end, duration: end + 1.0,
  };
}

export function sustainNotes(ex, s) {
  const male = (VOICES[s.voice] || VOICES.tenor).male;
  const notes = male ? ex.male : ex.female;
  const out = [];
  for (const m of notes) for (let r = 0; r < (ex.reps || 1); r++) out.push(m);
  return out;
}

export function buildIntervalTrial(ex, s, rnd = Math.random) {
  const choices = INTERVALS.filter((iv) => ex.intervals.includes(iv.st));
  for (let tries = 0; tries < 50; tries++) {
    const iv = choices[Math.floor(rnd() * choices.length)];
    const dir = rnd() < 0.7 ? 1 : -1;
    const span = s.hi - s.lo - 2;
    const base = s.lo + 1 + Math.floor(rnd() * Math.max(1, span));
    const target = base + dir * iv.st;
    if (target < s.lo || target > s.hi - 1) continue;
    return {
      kind: 'interval', ex, root: base, label: `${noteName(base)} → ${iv.name} ${dir > 0 ? 'yukarı' : 'aşağı'}`,
      interval: iv, dir,
      events: [{ kind: 'note', midi: base, t: 0, dur: 1.0, vel: 0.5 }],
      ref: { midi: base, t0: 0, t1: 1.0 },
      targets: [{ midi: target, t0: 1.4, t1: 3.2 }],
      singStart: 1.4, singEnd: 3.2, duration: 3.6,
    };
  }
  return null;
}

/** Score sung pitch samples against a rep's targets. Samples: {t, midi|null}. */
export function scoreRep(rep, samples, tol) {
  const notes = rep.targets.map((tg) => {
    const d = tg.t1 - tg.t0;
    const lead = rep.kind === 'interval' ? 0.35 : Math.min(0.15, d * 0.3);
    const a = tg.t0 + lead;
    const b = tg.t1 - Math.min(0.05, d * 0.1);
    let total = 0;
    const vals = [];
    for (const sm of samples) {
      if (sm.t < a || sm.t > b) continue;
      total++;
      if (sm.midi != null) vals.push(centsOff(sm.midi, tg.midi));
    }
    if (!total || vals.length / total < 0.4 || vals.length < 2) return { midi: tg.midi, status: 'nodata', dev: null };
    const dev = median(vals);
    const ad = Math.abs(dev);
    const status = ad <= tol ? 'hit' : ad <= tol * 2 ? 'near' : 'miss';
    return { midi: tg.midi, status, dev };
  });
  const withData = notes.filter((n) => n.dev != null);
  const hits = notes.filter((n) => n.status === 'hit').length;
  const meanAbs = withData.length ? withData.reduce((a, n) => a + Math.abs(n.dev), 0) / withData.length : null;
  const meanSigned = withData.length ? withData.reduce((a, n) => a + n.dev, 0) / withData.length : null;
  return { notes, hits, total: notes.length, voiced: withData.length, meanAbs, meanSigned };
}

export function describeScore(sc) {
  if (!sc || !sc.voiced) return 'Ses algılanmadı';
  const parts = [`${sc.hits}/${sc.total} isabet`, `ort. ${Math.round(sc.meanAbs)}¢`];
  if (sc.meanSigned > 12) parts.push('genelde tiz');
  else if (sc.meanSigned < -12) parts.push('genelde pes');
  return parts.join(', ');
}

/** Longest stretch of voiced frames near the target, tolerating short dropouts. */
export function longestPhonation(samples, target, maxGap = 0.25, window = 100) {
  let best = 0;
  let start = null;
  let lastGood = null;
  for (const sm of samples) {
    const good = sm.midi != null && Math.abs(centsOff(sm.midi, target)) <= window;
    if (good) {
      if (start == null || sm.t - lastGood > maxGap) start = sm.t;
      lastGood = sm.t;
      best = Math.max(best, lastGood - start);
    }
  }
  return best;
}

/** Messa di voce: compare loudness shape with a rise-and-fall envelope (0..1, higher is closer). */
export function envelopeMatch(samples, t0, t1) {
  const pts = samples.filter((s) => s.t >= t0 && s.t <= t1 && s.midi != null);
  if (pts.length < 10) return null;
  const dbs = pts.map((p) => p.db);
  const lo = Math.min(...dbs);
  const hi = Math.max(...dbs);
  if (hi - lo < 3) return 0;
  let err = 0;
  for (const p of pts) {
    const x = (p.t - t0) / (t1 - t0);
    const want = 1 - Math.abs(2 * x - 1);
    const got = (p.db - lo) / (hi - lo);
    err += Math.abs(want - got);
  }
  return Math.max(0, 1 - err / pts.length / 0.5);
}
