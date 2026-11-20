// Turkish makam pitch material after Arel-Ezgi-Uzdilek: the octave is 53 Holdrian
// commas; tanini (T) 9, büyük mücenneb (K) 8, küçük mücenneb (S) 5, bakiye (B) 4,
// artık ikili (A) 12. Positions are commas above Rast.
import { noteName } from './ewdv3t5.js';

export const KOMA_ST = 12 / 53;
export const k2st = (k) => k * KOMA_ST;

const T = 9;
const K = 8;
const S = 5;
const B = 4;
const A = 12;

const PERDE = {
  [-31]: 'Kaba çargah', [-27]: 'Kaba nim hicaz', [-26]: 'Kaba hicaz', [-22]: 'Yegah',
  [-18]: 'Kaba nim hisar', [-17]: 'Kaba hisar', [-13]: 'Hüseyni aşiran', [-9]: 'Acem aşiran',
  [-5]: 'Irak', [-4]: 'Geveşt', 0: 'Rast', 4: 'Nim zirgüle', 5: 'Zirgüle', 8: 'Dik zirgüle',
  9: 'Dügah', 13: 'Kürdi', 14: 'Dik kürdi', 17: 'Segah', 18: 'Buselik', 22: 'Çargah',
  26: 'Nim hicaz', 27: 'Hicaz', 30: 'Dik hicaz', 31: 'Neva', 35: 'Nim hisar', 36: 'Hisar',
  39: 'Dik hisar', 40: 'Hüseyni', 44: 'Acem', 45: 'Dik acem', 48: 'Eviç', 49: 'Mahur',
  52: 'Dik mahur', 53: 'Gerdaniye', 57: 'Nim şehnaz', 58: 'Şehnaz', 61: 'Dik şehnaz',
  62: 'Muhayyer', 66: 'Sünbüle', 67: 'Dik sünbüle', 70: 'Tiz segah', 71: 'Tiz buselik',
  75: 'Tiz çargah', 79: 'Tiz nim hicaz', 80: 'Tiz hicaz', 84: 'Tiz neva',
};
export const perdeName = (k) => (k == null ? 'Karar' : PERDE[k] || '');

const STEP = { 9: 'T', 8: 'K', 5: 'S', 4: 'B', 12: 'A' };
export const ARALIK_NOTE = 'T tanini (9 koma), K büyük mücenneb (8), S küçük mücenneb (5), B bakiye (4), A artık ikili (12)';

/** Çeşniler: base is where the çeşni sits in its own (asıl) position. */
export const CESNI = [
  { id: 'rast', name: 'Rast', base: 0, d4: [T, K, S], d5: [T, K, S, T], n4: 'Rast dörtlüsü', n5: 'Rast beşlisi' },
  { id: 'ussak', name: 'Uşşak', base: 9, d4: [K, S, T], d5: [K, S, T, T], n4: 'Uşşak dörtlüsü', n5: 'Hüseyni beşlisi' },
  { id: 'buselik', name: 'Buselik', base: 9, d4: [T, B, T], d5: [T, B, T, T], n4: 'Buselik dörtlüsü', n5: 'Buselik beşlisi' },
  { id: 'kurdi', name: 'Kürdi', base: 9, d4: [B, T, T], d5: [B, T, T, T], n4: 'Kürdi dörtlüsü', n5: 'Kürdi beşlisi' },
  { id: 'hicaz', name: 'Hicaz', base: 9, d4: [S, A, S], d5: [S, A, S, T], n4: 'Hicaz dörtlüsü', n5: 'Hicaz beşlisi' },
  { id: 'cargah', name: 'Çargah', base: 22, d4: [T, T, B], d5: [T, T, B, T], n4: 'Çargah dörtlüsü', n5: 'Çargah beşlisi' },
];
const cesni = Object.fromEntries(CESNI.map((c) => [c.id, c]));

/** Makam dizileri as two çeşniler joined; guclu is the scale index of the güçlü. */
export const DIZI = [
  { id: 'rast', name: 'Rast', base: 0, parts: [['rast', 5], ['rast', 4]], guclu: 4, down: { 6: -4 }, yapi: 'Rast’ta Rast beşlisi, Neva’da Rast dörtlüsü', note: 'İnerken Eviç yerine Acem basılır.' },
  { id: 'ussak', name: 'Uşşak', base: 9, parts: [['ussak', 4], ['buselik', 5]], guclu: 3, yapi: 'Dügah’ta Uşşak dörtlüsü, Neva’da Buselik beşlisi' },
  { id: 'huseyni', name: 'Hüseyni', base: 9, parts: [['ussak', 5], ['ussak', 4]], guclu: 4, yapi: 'Dügah’ta Hüseyni beşlisi, Hüseyni’de Uşşak dörtlüsü' },
  { id: 'hicaz', name: 'Hicaz', base: 9, parts: [['hicaz', 4], ['rast', 5]], guclu: 3, yapi: 'Dügah’ta Hicaz dörtlüsü, Neva’da Rast beşlisi' },
  { id: 'kurdi', name: 'Kürdi', base: 9, parts: [['kurdi', 4], ['buselik', 5]], guclu: 3, yapi: 'Dügah’ta Kürdi dörtlüsü, Neva’da Buselik beşlisi' },
  { id: 'buselik', name: 'Buselik', base: 9, parts: [['buselik', 5], ['kurdi', 4]], guclu: 4, yapi: 'Dügah’ta Buselik beşlisi, Hüseyni’de Kürdi dörtlüsü' },
  { id: 'nihavent', name: 'Nihavent', base: 0, parts: [['buselik', 5], ['kurdi', 4]], guclu: 4, yapi: 'Rast’ta Buselik beşlisi, Neva’da Kürdi dörtlüsü' },
];
const dizi = Object.fromEntries(DIZI.map((d) => [d.id, d]));

const cumulative = (steps) => steps.reduce((acc, s) => { acc.push(acc[acc.length - 1] + s); return acc; }, [0]);

/** Variant ids per set, in a stable order. */
export const SET_VARIANTS = {
  tek: ['karar'],
  d4: CESNI.map((c) => c.id),
  d5: CESNI.map((c) => c.id),
  dizi: DIZI.map((d) => d.id),
};
/** Rotation pools: d4 and d5 share the çeşni of the day, dizi the makam of the day. */
export const POOL = { d4: 'cesni', d5: 'cesni', dizi: 'makam' };

/**
 * Scale for a set and variant: k are commas above the karar, steps the intervals,
 * down holds descending replacements (scale index -> comma offset change).
 */
export function scaleFor(set, vid) {
  if (set === 'tek') {
    return { set, id: 'karar', label: 'Karar üzerinde dem', short: 'Karar', base: null, steps: [], k: [0], down: null, guclu: 0, octave: false, yapi: '', note: '' };
  }
  if (set === 'dizi') {
    const d = dizi[vid] || DIZI[0];
    const steps = d.parts.flatMap(([id, n]) => cesni[id][`d${n}`]);
    const k = cumulative(steps);
    return {
      set, id: d.id, label: `${d.name} dizisi`, short: d.name, base: d.base, steps, k,
      down: d.down || null, guclu: d.guclu, octave: true, yapi: d.yapi, note: d.note || '',
    };
  }
  const c = cesni[vid] || CESNI[0];
  const n = set === 'd5' ? 5 : 4;
  const steps = c[`d${n}`];
  return {
    set, id: c.id, label: c[`n${n}`], short: c.name, base: c.base, steps,
    k: cumulative(steps), down: null, guclu: n - 1, octave: false, yapi: '', note: '',
  };
}

export const variantLabel = (set, vid) => scaleFor(set, vid).label;
export const stepCode = (steps) => steps.map((s) => STEP[s] || s).join(' ');

/** Comma offset of a 1-based degree (negative = below the karar, octave scales wrap). */
function degK(sc, d, descending) {
  if (!sc.octave) return sc.k[Math.min(Math.max(d, 1), sc.k.length) - 1];
  const below = d < 0;
  const i = Math.abs(d) - 1;
  const idx = i % 7;
  const oct = below ? -1 - Math.floor(i / 7) : Math.floor(i / 7);
  let k = sc.k[idx] + 53 * oct;
  // Below the karar the leading tone (yeden) keeps its own pitch, e.g. Irak in Rast.
  if (descending && !below && sc.down?.[idx] != null) k += sc.down[idx];
  return k;
}

const parseDegs = (str) => str.trim().split(/\s+/).map((t) => parseInt(t, 10));

/**
 * The Turkish-music version of an exercise for one çeşni or makam. Keeps the
 * exercise id; notes become fractional semitone offsets from the karar.
 */
export function tmEx(ex, vid) {
  const spec = ex.tm;
  const sc = scaleFor(spec.set, vid);
  const built = typeof spec.degs === 'function' ? spec.degs(sc) : { degs: parseDegs(spec.degs) };
  const degs = built.degs;
  const komas = degs.map((d, i) => degK(sc, d, i > 0 && degs[i - 1] > d));
  const perde = komas.map((k) => perdeName(sc.base == null ? null : sc.base + k));
  const names = scaleLines(sc, 0, sc.k[sc.k.length - 1]).map((p) => p.name);
  const out = {
    ...ex,
    ...spec,
    title: spec.title || ex.title,
    notes: komas.map(k2st),
    beats: built.beats || spec.beats,
    komas, perde, sc, variant: sc.id, set: spec.set, isTm: true, acc: 'dem',
    kararName: perdeName(sc.base),
    scale: sc.steps.length ? `${sc.label} (${stepCode(sc.steps)}): ${names.join(', ')}` : sc.label,
  };
  delete out.tm;
  delete out.degs;
  return out;
}

/** Perde lines to draw for a TM rep: every scale degree within [kLo, kHi] commas of the karar. */
export function scaleLines(sc, kLo, kHi) {
  const out = [];
  const add = (k) => {
    if (k < kLo || k > kHi || out.some((o) => o.k === k)) return;
    out.push({ k, name: perdeName(sc.base == null ? null : sc.base + k) });
  };
  if (sc.octave) {
    for (let oct = -2; oct <= 2; oct++) {
      sc.k.slice(0, 7).forEach((k, idx) => {
        add(k + 53 * oct);
        if (sc.down?.[idx] != null) add(k + sc.down[idx] + 53 * oct);
      });
    }
  } else {
    sc.k.forEach(add);
  }
  return out.sort((a, b) => a.k - b.k);
}

/** Nearest equal-tempered note and the deviation in cents, for orientation. */
export function approxName(midi) {
  const r = Math.round(midi);
  const c = Math.round((midi - r) * 100);
  if (Math.abs(c) < 3) return noteName(r);
  return `${noteName(r)} ${c > 0 ? '+' : '−'}${Math.abs(c)} sent`;
}
