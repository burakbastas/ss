// Practice statistics derived from saved results. Pure functions, no DOM.
import { byId, CATS, resolveEx } from './d8hbkej.js';
import { POOL } from './392vqcv.js';
import { dayKey } from './nyxk7bs.js';

export const RES_ORDER = ['orta', 'yuksek', 'dusuk', 'aktarim'];
export const TRAD_LABEL = { bati: 'Batı', tm: 'Türk müziği', ortak: 'Ortak (SOVT, VFE, soğuma, repertuvar)' };

/** Category of a result: stored on new rows, looked up from the exercise for older ones. */
export const catOf = (r) => r.cat || byId[r.exId]?.cat || 'diger';
export const catLabel = (cat) => CATS[cat]?.short || 'Diğer';
export const tradOf = (r) => (r.tm ? 'tm' : CATS[catOf(r)]?.trad || 'ortak');
export const resOf = (r) => r.res || byId[r.exId]?.res || null;

/** Rows that stand for practice time (self-ratings are kept apart). */
export const isWork = (r) => r && r.kind !== 'rating' && !!r.exId && !!r.at;

/** Title and variant line of a result, e.g. "Pipetle beşli" / "Hicaz beşlisi". */
export function titleOf(r) {
  const ex = byId[r.exId];
  if (!ex) return { title: 'Silinmiş egzersiz', sub: '' };
  if (!r.tm || !ex.tm) return { title: ex.title, sub: '' };
  const rex = resolveEx(ex, r.tm);
  return { title: rex.title, sub: rex.set === 'tek' ? '' : rex.sc.label };
}

/** Practice rows per local day: { key: { sec, rows } }. */
export function byDay(results) {
  const out = {};
  for (const r of results) {
    if (!isWork(r)) continue;
    const d = (out[dayKey(r.at)] ||= { sec: 0, rows: [] });
    d.sec += r.sec || 0;
    d.rows.push(r);
  }
  return out;
}

const sorted = (obj) => Object.entries(obj).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

/**
 * Where the time went: per category, per tradition, per SOVT resistance (across every
 * category, since straw and trill versions also live in the Turkish-music groups) and per
 * çeşni and makam.
 */
export function breakdown(rows) {
  const cats = {};
  const trads = { bati: 0, tm: 0, ortak: 0 };
  const res = {};
  const cesni = {};
  const makam = {};
  const days = new Set();
  const resDays = new Set();
  let total = 0;
  for (const r of rows) {
    if (!isWork(r)) continue;
    const s = r.sec || 0;
    total += s;
    days.add(dayKey(r.at));
    const c = catOf(r);
    cats[c] = (cats[c] || 0) + s;
    trads[tradOf(r)] += s;
    const rs = resOf(r);
    if (rs) { res[rs] = (res[rs] || 0) + s; resDays.add(dayKey(r.at)); }
    const pool = POOL[r.set];
    if (r.tm && pool) {
      const bucket = pool === 'makam' ? makam : cesni;
      bucket[r.tm] = (bucket[r.tm] || 0) + s;
    }
  }
  const resSec = Object.values(res).reduce((a, b) => a + b, 0);
  return {
    total, days: days.size, trads, resSec, resDays: resDays.size,
    cats: sorted(cats), res: RES_ORDER.filter((k) => res[k]).map((k) => [k, res[k]]),
    cesni: sorted(cesni), makam: sorted(makam),
  };
}

/** One line per exercise (and çeşni or makam) in the order first practised. */
export function exerciseLines(rows) {
  const by = new Map();
  for (const r of [...rows].sort((a, b) => a.at - b.at)) {
    if (!isWork(r)) continue;
    const key = `${r.exId}|${r.tm || ''}`;
    const line = by.get(key) || { ...titleOf(r), cat: catOf(r), sec: 0, n: 0, first: r.at, open: false };
    line.sec += r.sec || 0;
    line.n++;
    if (r.kind === 'time') line.open = true;
    by.set(key, line);
  }
  return [...by.values()];
}

/** Results in the last `days` days, counting today (null = all). */
export function lastDays(results, days, now = Date.now()) {
  if (!days) return results;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  const from = d.getTime();
  return results.filter((r) => r.at >= from);
}
