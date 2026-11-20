import { EXERCISES, byId, CATS, TECH_CATS, resolveEx } from './d8hbkej.js';
import { planKeys, repSeconds, sustainNotes, glideSeconds, SUSTAIN_SEC, INTERVAL_SEC } from './f6c5xz4.js';
import { SET_VARIANTS, POOL, scaleFor } from './392vqcv.js';
import { dayKey } from './nyxk7bs.js';

// [slot, seconds, count, excluded cats]. 'tm' is the Turkish-music block: a straw, water
// or lip-trill version first, then çeşni and makam dizisi on an open vowel and (from 30
// minutes) süsleme, all in the çeşni and makam of the day.
const TEMPLATES = {
  15: [['sovt', 180], ['mix', 180, 2], ['tm', 260, 3], ['serbest', 0], ['sogu', 70]],
  30: [['sovt', 330], ['mix', 390, 2], ['tm', 480, 4], ['messa', 100], ['aralik', 90], ['serbest', 0], ['sogu', 110]],
  45: [['sovt', 390], ['mix', 510, 3, ['gecis']], ['gecis', 200], ['tm', 660, 4], ['vfe', 300], ['messa', 110], ['aralik', 120], ['serbest', 0], ['sogu', 140]],
};
const TM_PARTS = ['tm-sovt', 'tm-cesni', 'tm-dizi', 'tm-sus'];
const TM_SHARE = { 'tm-sovt': 0.22, 'tm-cesni': 0.26, 'tm-dizi': 0.28, 'tm-sus': 0.24 };
// Resistance order for the warm-up, after the review by Hijleh and Pinto (2021).
const RES_ORDER = ['orta', 'yuksek', 'dusuk', 'aktarim'];

const LIGHT_SKIP = new Set(['messa', 'vfe', 'gecis']);
export const STEP_OVERHEAD = 15;

export function historyIndex(results) {
  const idx = {};
  for (const r of results) {
    if (!r.exId) continue;
    const h = idx[r.exId] || (idx[r.exId] = { count: 0, last: 0, sec: 0, lastSec: 0 });
    h.count++;
    h.sec += r.sec || 0;
    if ((r.at || 0) >= h.last) { h.last = r.at || 0; h.lastSec = r.sec || 0; }
  }
  return idx;
}

/** When each çeşni and makam was last practised. */
export function variantHistory(results) {
  const out = { cesni: {}, makam: {} };
  for (const r of results) {
    if (!r.tm || !POOL[r.set]) continue;
    const pool = out[POOL[r.set]];
    pool[r.tm] = Math.max(pool[r.tm] || 0, r.at || 0);
  }
  return out;
}

/** The least recently practised çeşni ('cesni') or makam ('makam'). */
export function pickVariant(pool, vh, rnd = Math.random) {
  const ids = pool === 'makam' ? SET_VARIANTS.dizi : SET_VARIANTS.d5;
  return ids.map((id) => ({ id, last: vh[pool]?.[id] || 0, r: rnd() }))
    .sort((a, b) => a.last - b.last || a.r - b.r)[0].id;
}

/** Small seeded generator so ties break the same way all day. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Çeşni and makam of the day: least recently practised before today, so they stay the
 * same for the whole day and move on tomorrow.
 */
export function variantsOfDay(results, now = Date.now()) {
  const today = dayKey(now);
  const vh = variantHistory(results.filter((r) => r.at && dayKey(r.at) !== today));
  const rnd = seeded(Math.floor(now / 864e5));
  return { cesni: pickVariant('cesni', vh, rnd), makam: pickVariant('makam', vh, rnd) };
}

export const variantFor = (ex, ofDay) => (ex.tm ? (POOL[ex.tm.set] === 'makam' ? ofDay.makam : ofDay.cesni) : null);

function leastRecent(list, hist, rnd) {
  const scored = list.map((e) => ({ e, last: hist[e.id]?.last || 0, r: rnd() }));
  scored.sort((a, b) => a.last - b.last || a.r - b.r);
  return scored.map((x) => x.e);
}

function catLast(cat, hist) {
  return Math.max(0, ...EXERCISES.filter((e) => e.cat === cat).map((e) => hist[e.id]?.last || 0));
}

/** One runnable step for a single exercise (Turkish version when variant is given), trimmed to roughly maxSec. */
export function stepFor(ex, s, maxSec, variant = null) {
  const rex = resolveEx(ex, variant);
  const tm = rex.isTm ? rex.variant : null;
  const base = {
    exId: ex.id, cat: ex.cat, tm,
    title: rex.isTm && rex.set !== 'tek' ? `${rex.title}: ${rex.sc.label}` : rex.title,
  };
  if (ex.type === 'pattern') {
    const keys = planKeys(rex, s, maxSec);
    return {
      ...base, kind: 'queue',
      queue: keys.map((root) => (tm ? { exId: ex.id, root, tm } : { exId: ex.id, root })),
      estSec: keys.length * repSeconds(rex, s),
    };
  }
  if (ex.type === 'glide') return { ...base, kind: 'glide', reps: ex.glide.reps, estSec: glideSeconds(ex, s) };
  if (ex.type === 'sustain') {
    const notes = sustainNotes(ex, s);
    return { ...base, kind: 'sustain', notes, estSec: notes.length * SUSTAIN_SEC };
  }
  if (ex.type === 'interval') {
    const trials = maxSec ? Math.max(6, Math.min(14, Math.floor(maxSec / INTERVAL_SEC))) : ex.trials;
    return { ...base, kind: 'interval', trials, estSec: trials * INTERVAL_SEC };
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

export function generatePlan({ minutes, settings, results, sessions, energy, rnd = Math.random, now = Date.now() }) {
  const hist = historyIndex(results);
  const ofDay = variantsOfDay(results, now);
  // Alternate which tradition opens the warm-up, day by day.
  const tmFirst = Math.floor(now / 864e5) % 2 === 0;
  const heavy = needsLightDay(sessions, now);
  const light = energy === 'yorgun' || heavy;
  const s = light ? { ...settings, hi: settings.hi - 2 } : settings;
  const tpl = TEMPLATES[minutes] || TEMPLATES[30];
  const steps = [];
  const pick = (cat) => leastRecent(EXERCISES.filter((e) => e.cat === cat), hist, rnd);

  for (const [slot, sec, count, exclude] of tpl) {
    if (light && LIGHT_SKIP.has(slot)) continue;
    if (slot === 'sovt') {
      // Glide first, then one pattern per resistance level: medium, high, low, then
      // transfer, alternating Western and Turkish material.
      const budget = light ? sec * 1.3 : sec;
      const glide = pick('sovt').find((e) => e.type === 'glide');
      const g = stepFor(glide, s);
      steps.push(g);
      let left = budget - g.estSec;
      const groups = RES_ORDER.map((r) => pick('sovt').find((e) => e.type === 'pattern' && e.res === r && e.dyn !== 'mdv')).filter(Boolean);
      groups.forEach((ex, i) => {
        if (left < 40) return;
        const useTm = ex.tm && ((i % 2 === 0) === tmFirst);
        const st = stepFor(ex, s, left / (groups.length - i), useTm ? variantFor(ex, ofDay) : null);
        steps.push(st);
        left -= st.estSec;
      });
    } else if (slot === 'tm') {
      const parts = TM_PARTS.slice(0, light ? Math.min(3, count) : count);
      const shareSum = parts.reduce((a, c) => a + TM_SHARE[c], 0);
      for (const part of parts) {
        const pool = part === 'tm-sovt'
          ? EXERCISES.filter((e) => ['tm-cesni', 'tm-dizi'].includes(e.cat) && e.res)
          : EXERCISES.filter((e) => e.cat === part && (part === 'tm-sus' || !e.res));
        const ex = leastRecent(pool, hist, rnd)[0];
        steps.push(stepFor(ex, s, (sec * (light ? 1.15 : 1) * TM_SHARE[part]) / shareSum, variantFor(ex, ofDay)));
      }
    } else if (slot === 'sogu') {
      const glide = leastRecent([byId['sogu-siren'], byId['sogu-su']], hist, rnd)[0];
      const g = stepFor(glide, s);
      steps.push(g);
      const mir = byId['sogu-mirildan'];
      steps.push(stepFor(mir, s, Math.max(45, sec - g.estSec), tmFirst ? null : variantFor(mir, ofDay)));
    } else if (slot === 'messa') {
      steps.push(stepFor(leastRecent([byId['messa-di-voce'], byId['pipet-messa']], hist, rnd)[0], s, sec));
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
    ? 'Sesin yorgun olduğu için hafif plan: zor bloklar çıkarıldı, yarı kapalı ses yolu çalışması uzatıldı, üst sınır iki yarım ses düşürüldü.'
    : heavy
      ? 'Son 48 saatte yorgunluk notun yüksekti; ses yükünün etkisi 1–3 gün sürebildiği için bugün hafif plan ve daha uzun yarı kapalı ses yolu çalışması.'
      : null;
  return {
    minutes, light, reason, createdAt: now, steps, ofDay,
    estSec: steps.reduce((a, st) => a + st.estSec + STEP_OVERHEAD, 0),
  };
}

export const ofDayText = (ofDay) => `Günün çeşnisi ${scaleFor('d5', ofDay.cesni).short}, günün makamı ${scaleFor('dizi', ofDay.makam).short}.`;

export function stepLabel(step) {
  if (step.cat === 'mix') return step.exIds.map((id) => byId[id].title).join(' + ');
  return step.title;
}

export function stepCatLabel(step) {
  if (step.cat === 'mix') return step.interleaved ? 'Batı, teknik, karışık sıra' : 'Batı, teknik';
  const c = CATS[step.cat];
  if (!c) return '';
  if (step.tm) return c.trad === 'tm' ? `Türk müziği, ${c.short}` : `${c.short}, Türk müziği`;
  if (c.trad === 'bati') return `Batı, ${c.short}`;
  return c.short;
}
