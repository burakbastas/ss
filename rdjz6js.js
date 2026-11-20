import { EXERCISES, byId, CATS, TECH_CATS } from './d8hbkej.js';
import { planKeys, repSeconds, sustainNotes, buildGlide } from './f6c5xz4.js';

const TEMPLATES = {
  15: [['isinma', 180], ['mix', 420, 2], ['aralik', 120], ['serbest', 0], ['sogu', 120]],
  30: [['isinma', 240], ['mix', 600, 3], ['messa', 180], ['aralik', 180], ['serbest', 0], ['sogu', 120]],
  45: [['isinma', 300], ['mix', 720, 3, ['gecis']], ['gecis', 300], ['vfe', 300], ['messa', 180], ['aralik', 240], ['serbest', 0], ['sogu', 150]],
};

const LIGHT_SKIP = new Set(['messa', 'vfe', 'gecis']);
const STEP_OVERHEAD = 15;

export function historyIndex(results) {
  const idx = {};
  for (const r of results) {
    const h = idx[r.exId] || (idx[r.exId] = { count: 0, last: 0 });
    h.count++;
    h.last = Math.max(h.last, r.at || 0);
  }
  return idx;
}

function leastRecent(list, hist, rnd) {
  const scored = list.map((e) => ({ e, last: hist[e.id]?.last || 0, r: rnd() }));
  scored.sort((a, b) => a.last - b.last || a.r - b.r);
  return scored.map((x) => x.e);
}

function catLast(cat, hist) {
  return Math.max(0, ...EXERCISES.filter((e) => e.cat === cat).map((e) => hist[e.id]?.last || 0));
}

/** One runnable step for a single exercise, trimmed to roughly maxSec. */
export function stepFor(ex, s, maxSec) {
  const base = { exId: ex.id, title: ex.title, cat: ex.cat };
  if (ex.type === 'pattern') {
    const keys = planKeys(ex, s, maxSec);
    return { ...base, kind: 'queue', queue: keys.map((root) => ({ exId: ex.id, root })), estSec: keys.length * repSeconds(ex, s) };
  }
  if (ex.type === 'glide') {
    const one = buildGlide(ex, s);
    return { ...base, kind: 'glide', reps: ex.glide.reps, estSec: ex.glide.reps * one.duration };
  }
  if (ex.type === 'sustain') {
    const notes = sustainNotes(ex, s);
    return { ...base, kind: 'sustain', notes, estSec: notes.length * 18 };
  }
  if (ex.type === 'interval') {
    const trials = Math.max(6, Math.min(16, Math.floor((maxSec || 45) / 3.8)));
    return { ...base, kind: 'interval', trials, estSec: trials * 3.8 };
  }
  const minutes = maxSec ? Math.max(3, Math.round(maxSec / 60)) : ex.minutes;
  return { ...base, kind: 'free', minutes, estSec: minutes * 60 };
}

/**
 * Interleaved technique block. Exercises practiced fewer than 3 times run first as a
 * block (acquisition), the rest alternate every few keys (contextual interference).
 */
export function mixedStep(exs, s, maxSec, hist, chunk = 3) {
  const per = maxSec / exs.length;
  const plans = exs.map((ex) => ({ ex, keys: planKeys(ex, s, per) }));
  const fresh = plans.filter((p) => (hist[p.ex.id]?.count || 0) < 3);
  const known = plans.filter((p) => (hist[p.ex.id]?.count || 0) >= 3);
  const queue = [];
  for (const p of fresh) for (const root of p.keys) queue.push({ exId: p.ex.id, root });
  const cursors = known.map(() => 0);
  let left = true;
  while (left) {
    left = false;
    known.forEach((p, i) => {
      const slice = p.keys.slice(cursors[i], cursors[i] + chunk);
      cursors[i] += chunk;
      if (slice.length) left = true;
      for (const root of slice) queue.push({ exId: p.ex.id, root });
    });
  }
  const estSec = plans.reduce((a, p) => a + p.keys.length * repSeconds(p.ex, s), 0);
  return {
    kind: 'queue', cat: 'mix', title: 'Teknik blok', exIds: exs.map((e) => e.id), queue, estSec,
    interleaved: known.length > 1, blockedIds: fresh.map((p) => p.ex.id),
  };
}

export function needsLightDay(sessions, now = Date.now()) {
  const recent = sessions.filter((x) => x.finishedAt && now - x.finishedAt < 48 * 3600e3);
  return recent.some((x) => (x.post?.fatigue || 0) >= 4);
}

export function generatePlan({ minutes, settings, results, sessions, energy, rnd = Math.random }) {
  const hist = historyIndex(results);
  const heavy = needsLightDay(sessions);
  const light = energy === 'yorgun' || heavy;
  const s = light ? { ...settings, hi: settings.hi - 2 } : settings;
  const tpl = TEMPLATES[minutes] || TEMPLATES[30];
  const steps = [];
  const pick = (cat) => leastRecent(EXERCISES.filter((e) => e.cat === cat), hist, rnd);

  for (const [slot, sec, count, exclude] of tpl) {
    if (light && LIGHT_SKIP.has(slot)) continue;
    if (slot === 'isinma') {
      const siren = byId['pipet-siren'];
      const st = stepFor(siren, s);
      steps.push(st);
      const pat = pick('isinma').find((e) => e.type === 'pattern');
      steps.push(stepFor(pat, s, Math.max(60, sec - st.estSec)));
    } else if (slot === 'sogu') {
      const siren = stepFor(byId['sogu-siren'], s);
      steps.push(siren);
      steps.push(stepFor(byId['sogu-mirildan'], s, Math.max(45, sec - siren.estSec)));
    } else if (slot === 'mix') {
      const n = light ? 2 : count;
      const cats = TECH_CATS.filter((c) => !(exclude || []).includes(c))
        .map((c) => ({ c, last: catLast(c, hist), r: rnd() }))
        .sort((a, b) => a.last - b.last || a.r - b.r)
        .slice(0, n)
        .map((x) => x.c);
      const exs = cats.map((c) => pick(c)[0]);
      steps.push(mixedStep(exs, s, light ? sec * 0.8 : sec, hist));
    } else if (slot === 'serbest') {
      steps.push({ placeholder: true });
    } else if (slot === 'vfe') {
      for (const id of ['vfe-1', 'vfe-2', 'vfe-3', 'vfe-4']) steps.push(stepFor(byId[id], s));
    } else {
      steps.push(stepFor(pick(slot)[0], s, sec));
    }
  }
  // Repertoire absorbs whatever time the technical work leaves.
  const used = steps.reduce((a, st) => a + (st.estSec || 0) + STEP_OVERHEAD, 0);
  const freeMin = Math.min(Math.round(minutes / 2), Math.max(3, Math.round((minutes * 60 - used) / 60)));
  const hole = steps.findIndex((st) => st.placeholder);
  if (hole >= 0) steps[hole] = stepFor(byId.repertuvar, s, freeMin * 60);
  const reason = energy === 'yorgun'
    ? 'Sesin yorgun olduğu için hafif plan: zor bloklar çıkarıldı, üst sınır iki yarım ses düşürüldü.'
    : heavy
      ? 'Son 48 saatte yorgunluk notun yüksekti; ses yükü etkisi 1–3 gün sürebildiği için bugün hafif plan.'
      : null;
  return {
    minutes, light, reason, createdAt: Date.now(), steps,
    estSec: steps.reduce((a, st) => a + st.estSec + STEP_OVERHEAD, 0),
  };
}

export function stepLabel(step) {
  if (step.cat === 'mix') return step.exIds.map((id) => byId[id].title).join(' + ');
  return step.title;
}

export function stepCatLabel(step) {
  if (step.cat === 'mix') return step.interleaved ? 'Teknik, karışık sıra' : 'Teknik';
  return CATS[step.cat]?.short || '';
}
