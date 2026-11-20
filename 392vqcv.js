// Turkish makam pitch material after Arel-Ezgi-Uzdilek: the octave is 53 Holdrian
// commas; tanini (T) 9, büyük mücenneb (K) 8, küçük mücenneb (S) 5, bakiye (B) 4,
// artık ikili (A) 12. Positions are commas above Rast. Makam data (dizi, güçlü, yeden,
// ascending/descending perdeler) after the TDV İslâm Ansiklopedisi makam entries.
import { noteName } from './ewdv3t5.js';

export const KOMA_ST = 12 / 53;
export const k2st = (k) => k * KOMA_ST;

const T = 9;
const K = 8;
const S = 5;
const B = 4;
const A = 12;

const PERDE = {
  [-35]: 'Kaba buselik', [-31]: 'Kaba çargah', [-27]: 'Kaba nim hicaz', [-26]: 'Kaba hicaz', [-22]: 'Yegah',
  [-18]: 'Kaba nim hisar', [-17]: 'Kaba hisar', [-14]: 'Kaba dik hisar', [-13]: 'Hüseyni aşiran', [-9]: 'Acem aşiran',
  [-8]: 'Dik acem aşiran', [-5]: 'Irak', [-4]: 'Geveşt', [-1]: 'Dik geveşt', 0: 'Rast', 4: 'Nim zirgüle', 5: 'Zirgüle',
  8: 'Dik zirgüle', 9: 'Dügah', 13: 'Kürdi', 14: 'Dik kürdi', 17: 'Segah', 18: 'Buselik', 22: 'Çargah',
  26: 'Nim hicaz', 27: 'Hicaz', 30: 'Dik hicaz', 31: 'Neva', 35: 'Nim hisar', 36: 'Hisar',
  39: 'Dik hisar', 40: 'Hüseyni', 44: 'Acem', 45: 'Dik acem', 48: 'Eviç', 49: 'Mahur',
  52: 'Dik mahur', 53: 'Gerdaniye', 57: 'Nim şehnaz', 58: 'Şehnaz', 61: 'Dik şehnaz',
  62: 'Muhayyer', 66: 'Sünbüle', 67: 'Dik sünbüle', 70: 'Tiz segah', 71: 'Tiz buselik',
  75: 'Tiz çargah', 79: 'Tiz nim hicaz', 80: 'Tiz hicaz', 83: 'Tiz dik hicaz', 84: 'Tiz neva',
};
export const perdeName = (k) => (k == null ? 'Karar' : PERDE[k] || '');

const STEP = { 9: 'T', 8: 'K', 5: 'S', 4: 'B', 12: 'A', 13: 'A13' };
export const stepCode = (steps) => steps.map((s) => STEP[s] || s).join(' ');

/* ---------- naturals and accidentals ---------- */

// Unaltered perdeler by letter (Do..Si), commas above Rast in the octave Çargah–Buselik.
export const LETTERS = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const NAT = [22, 31, 40, 44, 0, 9, 18];
const ACC = { 1: 'koma', 4: 'bakiye', 5: 'küçük mücenneb', 8: 'büyük mücenneb' };

const letterAt = (k) => NAT.findIndex((n) => ((k - n) % 53 + 53) % 53 === 0);
/** Natural position of a letter nearest to k. */
const natNear = (letter, k) => NAT[letter] + 53 * Math.round((k - NAT[letter]) / 53);

/** Turkish ablative suffix after an apostrophe: Buselik’ten, Neva’dan. */
export function ablative(word) {
  const w = word.toLocaleLowerCase('tr');
  const vowels = [...w].filter((c) => 'aeıioöuü'.includes(c));
  const back = 'aıou'.includes(vowels[vowels.length - 1] || 'a');
  const hard = 'çfhkpsşt'.includes(w[w.length - 1]);
  return `${word}’${hard ? 't' : 'd'}${back ? 'an' : 'en'}`;
}

/**
 * Spelling of a notated perde for a letter: the natural it alters and the accidental
 * in commas (negative = bemol), e.g. Kürdi = Si, Buselik −5 (küçük mücenneb bemolü).
 */
export function spell(kAbs, letter) {
  const nat = natNear(letter, kAbs);
  const n = kAbs - nat;
  const name = ACC[Math.abs(n)];
  return {
    letter: LETTERS[letter], nat, natName: perdeName(nat), n,
    sym: n === 0 ? '' : `${n > 0 ? '♯' : '♭'}${Math.abs(n)}`,
    accName: n === 0 ? '' : `${name || `${Math.abs(n)} koma`} ${n > 0 ? 'diyezi' : 'bemolü'}`,
  };
}

/* ---------- çeşniler ---------- */

/** yeden: commas below the karar (as in the makams built on the çeşni); down: changes when descending. */
export const CESNI = [
  { id: 'rast', name: 'Rast', base: 0, d4: [T, K, S], d5: [T, K, S, T], n4: 'Rast dörtlüsü', n5: 'Rast beşlisi', yeden: -5 },
  { id: 'ussak', name: 'Uşşak', base: 9, d4: [K, S, T], d5: [K, S, T, T], n4: 'Uşşak dörtlüsü', n5: 'Hüseyni beşlisi', yeden: -9, down4: { 1: { dk: -1.5, note: 'inerken 1–2 koma pest' } } },
  { id: 'buselik', name: 'Buselik', base: 9, d4: [T, B, T], d5: [T, B, T, T], n4: 'Buselik dörtlüsü', n5: 'Buselik beşlisi', yeden: -5 },
  { id: 'kurdi', name: 'Kürdi', base: 9, d4: [B, T, T], d5: [B, T, T, T], n4: 'Kürdi dörtlüsü', n5: 'Kürdi beşlisi', yeden: -9 },
  { id: 'hicaz', name: 'Hicaz', base: 9, d4: [S, A, S], d5: [S, A, S, T], n4: 'Hicaz dörtlüsü', n5: 'Hicaz beşlisi', yeden: -9 },
  { id: 'cargah', name: 'Çargah', base: 22, d4: [T, T, B], d5: [T, T, B, T], n4: 'Çargah dörtlüsü', n5: 'Çargah beşlisi', yeden: -4 },
];
const cesni = Object.fromEntries(CESNI.map((c) => [c.id, c]));

/* ---------- makam dizileri ---------- */

// p: the eight perdeler (commas above Rast) from karar to tiz durak; guclu: scale index;
// yeden: perde below the karar; down: descending replacements by scale index (k: other
// perde, dk: pressed lower or higher than written); perf: how the perde is pressed.
export const DIZI = [
  { id: 'rast', name: 'Rast', p: [0, 9, 17, 22, 31, 40, 48, 53], guclu: 4, yeden: -5, down: { 6: { k: 44 } }, seyir: 'çıkıcı', yapi: 'Rast’ta Rast beşlisi, Neva’da Rast dörtlüsü', note: 'İnerken Eviç yerine Acem basılır (Neva’da Buselik dörtlüsü).' },
  { id: 'ussak', name: 'Uşşak', p: [9, 17, 22, 31, 40, 44, 53, 62], guclu: 3, yeden: 0, down: { 1: { dk: -1.5, note: 'inerken 1–2 koma pest' } }, seyir: 'çıkıcı', yapi: 'Dügah’ta Uşşak dörtlüsü, Neva’da Buselik beşlisi', note: 'İnerken Segah 1–2 koma daha pest basılır.' },
  { id: 'neva', name: 'Neva', p: [9, 17, 22, 31, 40, 48, 53, 62], guclu: 3, yeden: 0, down: { 5: { k: 44 } }, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Uşşak dörtlüsü, Neva’da Rast beşlisi', note: 'Neva’dan inerken Eviç yerine Acem kullanılabilir.' },
  { id: 'huseyni', name: 'Hüseyni', p: [9, 17, 22, 31, 40, 48, 53, 62], guclu: 4, yeden: 0, down: { 5: { k: 44 } }, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Hüseyni beşlisi, Hüseyni’de Uşşak dörtlüsü', note: 'İnerken Eviç yerine Acem (acemli Hüseyni dizisi).' },
  { id: 'karcigar', name: 'Karcığar', p: [9, 17, 22, 31, 36, 48, 53, 62], guclu: 3, yeden: 0, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Uşşak dörtlüsü, Neva’da Hicaz beşlisi' },
  { id: 'hicaz', name: 'Hicaz', p: [9, 14, 26, 31, 40, 48, 53, 62], guclu: 3, yeden: 0, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Hicaz dörtlüsü, Neva’da Rast beşlisi' },
  { id: 'humayun', name: 'Hümayun', p: [9, 14, 26, 31, 40, 44, 53, 62], guclu: 3, yeden: 0, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Hicaz dörtlüsü, Neva’da Buselik beşlisi' },
  { id: 'uzzal', name: 'Uzzal', p: [9, 14, 26, 31, 40, 48, 53, 62], guclu: 4, yeden: 0, down: { 5: { k: 44 } }, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Hicaz beşlisi, Hüseyni’de Uşşak dörtlüsü', note: 'İnerken Eviç yerine Acem.' },
  { id: 'zirguleli-hicaz', name: 'Zirgüleli Hicaz', p: [9, 14, 26, 31, 40, 45, 57, 62], guclu: 4, yeden: 4, seyir: 'inici-çıkıcı', yapi: 'Dügah’ta Hicaz beşlisi, Hüseyni’de Hicaz dörtlüsü' },
  { id: 'kurdi', name: 'Kürdi', p: [9, 13, 22, 31, 40, 44, 53, 62], guclu: 3, yeden: 0, seyir: 'çıkıcı', yapi: 'Dügah’ta Kürdi dörtlüsü, Neva’da Buselik beşlisi' },
  { id: 'buselik', name: 'Buselik', p: [9, 18, 22, 31, 40, 44, 53, 62], guclu: 4, yeden: 4, seyir: 'çıkıcı', yapi: 'Dügah’ta Buselik beşlisi, Hüseyni’de Kürdi dörtlüsü' },
  { id: 'nihavent', name: 'Nihavent', p: [0, 9, 13, 22, 31, 35, 44, 53], guclu: 4, yeden: -5, seyir: 'inici-çıkıcı', yapi: 'Rast’ta Buselik beşlisi, Neva’da Kürdi dörtlüsü' },
  { id: 'suzinak', name: 'Suzinak', p: [0, 9, 17, 22, 31, 36, 48, 53], guclu: 4, yeden: -5, seyir: 'inici-çıkıcı', yapi: 'Rast’ta Rast beşlisi, Neva’da Hicaz dörtlüsü' },
  { id: 'kurdilihicazkar', name: 'Kürdilihicazkar', p: [0, 4, 13, 22, 31, 35, 44, 53], guclu: 7, yeden: -9, seyir: 'inici', yapi: 'Rast’ta Kürdi dörtlüsü, Çargah’ta Buselik beşlisi' },
  { id: 'mahur', name: 'Mahur', p: [0, 9, 18, 22, 31, 40, 49, 53], guclu: 7, yeden: -4, seyir: 'inici', yapi: 'Rast’ta Çargah beşlisi, Neva’da Çargah dörtlüsü' },
  { id: 'cargah', name: 'Çargah', p: [22, 31, 40, 44, 53, 62, 71, 75], guclu: 4, yeden: 18, seyir: 'çıkıcı', yapi: 'Çargah’ta Çargah beşlisi, Gerdaniye’de Çargah dörtlüsü' },
  { id: 'acemasiran', name: 'Acemaşiran', p: [-9, 0, 9, 13, 22, 31, 40, 44], guclu: 7, yeden: -13, seyir: 'inici', yapi: 'Acem aşiran’da Çargah beşlisi, Çargah’ta Çargah dörtlüsü (Çargah şeddi)' },
  { id: 'saba', name: 'Saba', p: [9, 17, 22, 27, 39, 44, 53, 58], guclu: 2, yeden: 0, perf: { 3: { dk: 2, note: 'icrada 2–2,5 koma tiz' } }, seyir: 'çıkıcı', yapi: 'Dügah’ta Saba dörtlüsü, Çargah’ta Hicaz dörtlüsü; tiz durak Şehnaz', note: 'Hicaz perdesi yazılandan 2–2,5 koma tiz basılır.' },
];
const dizi = Object.fromEntries(DIZI.map((d) => [d.id, d]));

/*
 * Mixed practice: interleaving confusable categories sharpens discrimination
 * (Kornell & Bjork 2008; Carvalho & Goldstone 2014), so a mixed run moves through the
 * makamlar closest to the chosen one, where the same perde is pressed a few commas
 * apart. Each makam has one home family.
 */
export const FAMILIES = {
  ussak: { name: 'Dügah’ta Uşşak ailesi', ids: ['ussak', 'neva', 'huseyni', 'karcigar', 'saba'] },
  hicaz: { name: 'Hicaz ailesi', ids: ['hicaz', 'humayun', 'uzzal', 'zirguleli-hicaz'] },
  ikinci: { name: 'Dügah’ta ikinci derece', ids: ['kurdi', 'hicaz', 'ussak', 'buselik'] },
  rast: { name: 'Rast kararlı makamlar', ids: ['rast', 'suzinak', 'mahur', 'nihavent', 'kurdilihicazkar'] },
  cargah: { name: 'Çargah dizisi ve şedleri', ids: ['cargah', 'mahur', 'acemasiran'] },
};
const HOME = {
  ussak: 'ussak', neva: 'ussak', huseyni: 'ussak', karcigar: 'ussak', saba: 'ussak',
  hicaz: 'hicaz', humayun: 'hicaz', uzzal: 'hicaz', 'zirguleli-hicaz': 'hicaz',
  kurdi: 'ikinci', buselik: 'ikinci',
  rast: 'rast', suzinak: 'rast', nihavent: 'rast', kurdilihicazkar: 'rast',
  mahur: 'cargah', cargah: 'cargah', acemasiran: 'cargah',
};
// Çeşniler on the same karar first, ordered by their second degree (4, 5, 8, 9 commas).
const CESNI_MIX = ['kurdi', 'hicaz', 'ussak', 'buselik', 'rast', 'cargah'];

/**
 * The rotation for a mixed run starting from vid: its family (makam) or all çeşniler,
 * optionally limited to `allowed`. chunk = keys per variant before moving on.
 */
export function mixFor(set, vid, allowed = null) {
  if (!SET_VARIANTS[set] || SET_VARIANTS[set].length < 2) return null;
  const ok = (id) => id === vid || !allowed || allowed.includes(id);
  if (set === 'dizi') {
    const fam = FAMILIES[HOME[vid]] || FAMILIES.ussak;
    const variants = [vid, ...fam.ids.filter((id) => id !== vid && ok(id))];
    return variants.length > 1 ? { label: fam.name, variants, chunk: 2 } : null;
  }
  const variants = [vid, ...CESNI_MIX.filter((id) => id !== vid && ok(id))];
  return variants.length > 1 ? { label: set === 'd5' ? 'beşliler' : 'dörtlüler', variants, chunk: 3 } : null;
}
export const mixNames = (set, mix) => mix.variants.map((v) => scaleFor(set, v).short).join(', ');

const cumulative = (steps) => steps.reduce((acc, s) => { acc.push(acc[acc.length - 1] + s); return acc; }, [0]);
const diffs = (k) => k.slice(1).map((x, i) => x - k[i]);

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
 * Scale for a set and variant. k: written commas above the karar (index 0 = karar),
 * yeden: commas (negative) of the perde below the karar.
 */
export function scaleFor(set, vid) {
  if (set === 'tek') {
    return { set, id: 'karar', label: 'Karar üzerinde dem', short: 'Karar', base: null, steps: [], k: [0], yeden: null, down: null, perf: null, guclu: 0, octave: false, letter: null, yapi: '', note: '' };
  }
  if (set === 'dizi') {
    const d = dizi[vid] || DIZI[0];
    const k = d.p.map((x) => x - d.p[0]);
    return {
      set, id: d.id, label: `${d.name} dizisi`, short: d.name, base: d.p[0], steps: diffs(k), k,
      yeden: d.yeden - d.p[0], down: d.down || null, perf: d.perf || null, guclu: d.guclu, octave: true,
      letter: letterAt(d.p[0]), seyir: d.seyir, yapi: d.yapi, note: d.note || '',
    };
  }
  const c = cesni[vid] || CESNI[0];
  const n = set === 'd5' ? 5 : 4;
  const steps = c[`d${n}`];
  return {
    set, id: c.id, label: c[`n${n}`], short: c.name, base: c.base, steps, k: cumulative(steps),
    yeden: c.yeden, down: n === 4 ? c.down4 || null : null, perf: null, guclu: n - 1, octave: false,
    letter: letterAt(c.base), yapi: '', note: c.down4 && n === 4 ? 'İnerken Segah 1–2 koma daha pest basılır.' : '',
  };
}

export const variantLabel = (set, vid) => scaleFor(set, vid).label;

/**
 * One degree of a scale: d is 1-based (8 = tiz durak, beyond wraps by octave),
 * negative = that degree an octave below, 'y' = yeden. Returns the written comma
 * offset, the sounding one, and the letter step from the karar for spelling.
 */
export function degree(sc, d, descending = false) {
  let idx;
  let kw;
  let step;
  if (d === 'y') {
    idx = -1;
    kw = sc.yeden ?? 0;
    step = -1;
  } else if (d > 0) {
    const i = d - 1;
    if (i < sc.k.length) { idx = i; kw = sc.k[i]; } else if (sc.octave) {
      idx = i % 7;
      kw = sc.k[idx] + 53 * Math.floor(i / 7);
    } else { idx = sc.k.length - 1; kw = sc.k[idx]; }
    step = i;
  } else {
    const i = -d - 1;
    idx = sc.octave ? i % 7 : 0;
    kw = sc.octave ? sc.k[idx] - 53 * (1 + Math.floor(i / 7)) : 0;
    step = i - 7;
  }
  let dk = 0;
  let note = '';
  const firstOctave = d !== 'y' && d > 0 && d - 1 < 8;
  if (descending && firstOctave && sc.down?.[idx]) {
    const ch = sc.down[idx];
    if (ch.k != null) kw = ch.k - sc.base;
    if (ch.dk) { dk = ch.dk; note = ch.note || ''; }
  }
  if (sc.perf?.[idx] && d !== 'y') { dk += sc.perf[idx].dk; note = sc.perf[idx].note; }
  return { idx, kw, k: kw + dk, step, note, d };
}

/** Name and spelling of a degree. */
export function describe(sc, deg) {
  if (sc.base == null) return { name: 'Karar', sp: null, note: '' };
  const abs = sc.base + deg.kw;
  const letter = ((sc.letter + deg.step) % 7 + 7) % 7;
  return { name: perdeName(abs), sp: spell(abs, letter), note: deg.note };
}

const parseDegs = (str) => str.trim().split(/\s+/).map((t) => (t === 'y' ? 'y' : parseInt(t, 10)));
const rank = (d) => (d === 'y' ? 0.5 : d < 0 ? d + 0.5 : d);

/**
 * The Turkish-music version of an exercise for one çeşni or makam. Keeps the
 * exercise id; notes become fractional semitone offsets from the karar.
 */
export function tmEx(ex, vid) {
  const spec = ex.tm;
  const sc = scaleFor(spec.set, vid);
  const built = typeof spec.degs === 'function' ? spec.degs(sc) : { degs: parseDegs(spec.degs) };
  const degs = built.degs;
  const infos = degs.map((d, i) => degree(sc, d, i > 0 && rank(degs[i - 1]) > rank(d)));
  const named = infos.map((g) => describe(sc, g));
  const out = {
    ...ex,
    ...spec,
    title: spec.title || ex.title,
    notes: infos.map((g) => k2st(g.k)),
    beats: built.beats || spec.beats,
    komas: infos.map((g) => g.k),
    perde: named.map((x) => x.name),
    noteInfo: named,
    sc, variant: sc.id, set: spec.set, isTm: true, acc: 'dem',
    kararName: perdeName(sc.base),
    ...scaleText(sc),
  };
  delete out.tm;
  delete out.degs;
  return out;
}

/** Text lines for a scale: degrees with interval codes, structure, alterations. */
export function scaleText(sc) {
  if (sc.base == null) return { scale: sc.label, scaleInfo: '', arizalar: '' };
  const degs = sc.k.map((_, i) => i + 1);
  const up = degs.map((d) => describe(sc, degree(sc, d)));
  const extra = [];
  if (sc.down) {
    for (const [idx, ch] of Object.entries(sc.down)) {
      if (ch.k != null) extra.push(describe(sc, degree(sc, Number(idx) + 1, true)).name);
    }
  }
  const yeden = sc.yeden != null ? describe(sc, degree(sc, 'y')).name : null;
  const scale = `${sc.label} (${stepCode(sc.steps)}): ${up.map((u) => u.name).join(', ')}${extra.length ? `; inerken ${extra.join(', ')}` : ''}`;
  const info = [
    sc.yapi ? `${sc.yapi}.` : null,
    `Güçlü ${up[sc.guclu]?.name}${yeden ? `, yeden ${yeden}` : ''}${sc.seyir ? `, seyir ${sc.seyir}` : ''}.`,
    sc.note || null,
  ].filter(Boolean).join(' ');
  const alt = [];
  const seen = new Set();
  const all = [...degs.map((d) => describe(sc, degree(sc, d))), ...(sc.down ? Object.keys(sc.down).map((i) => describe(sc, degree(sc, Number(i) + 1, true))) : []), ...(yeden ? [describe(sc, degree(sc, 'y'))] : [])];
  for (const x of all) {
    if (!x.sp || x.sp.n === 0 || seen.has(x.name)) continue;
    seen.add(x.name);
    alt.push(`${x.name} ${x.sp.letter} ${x.sp.sym}`);
  }
  return { scale, scaleInfo: info, arizalar: alt.length ? `Arızalar: ${alt.join(', ')} (koma)` : 'Arıza yok' };
}

/**
 * Lines to draw for a TM rep between kLo and kHi commas of the karar: every perde the
 * scale can use (yeden, descending and pressed variants included) and the unaltered
 * perdeler around them, so alterations can be read against their naturals.
 */
export function perdeGrid(sc, kLo, kHi) {
  const lines = [];
  const add = (deg) => {
    const k = deg.k;
    if (k < kLo || k > kHi || lines.some((l) => Math.abs(l.k - k) < 1e-6)) return;
    const x = describe(sc, deg);
    lines.push({ k, kw: deg.kw, name: x.name, sp: x.sp, note: x.note, karar: Math.abs(deg.kw % 53) < 1e-6, kind: 'scale' });
  };
  if (sc.base == null) {
    add(degree(sc, 1));
    return lines;
  }
  const n = sc.octave ? 22 : sc.k.length;
  for (let d = 1; d <= n; d++) { add(degree(sc, d)); add(degree(sc, d, true)); }
  if (sc.octave) for (let d = -1; d >= -14; d--) add(degree(sc, d));
  if (sc.yeden != null) add(degree(sc, 'y'));
  // Naturals not already used by the scale.
  for (let letter = 0; letter < 7; letter++) {
    for (let m = -2; m <= 3; m++) {
      const abs = NAT[letter] + 53 * m;
      const k = abs - sc.base;
      if (k < kLo || k > kHi || lines.some((l) => l.kind === 'scale' && Math.abs(l.kw - k) < 1e-6)) continue;
      lines.push({ k, kw: k, name: perdeName(abs), sp: null, kind: 'natural', letter: LETTERS[letter] });
    }
  }
  return lines.sort((a, b) => a.k - b.k);
}

/** Nearest equal-tempered note and the deviation in cents, for orientation. */
export function approxName(midi) {
  const r = Math.round(midi);
  const c = Math.round((midi - r) * 100);
  if (Math.abs(c) < 3) return noteName(r);
  return `${noteName(r)} ${c > 0 ? '+' : '−'}${Math.abs(c)} sent`;
}

/** Short reading of where an altered perde sits against its natural. */
export function offsetText(info) {
  const sp = info?.sp;
  if (!sp || sp.n === 0) return '';
  const dir = sp.n > 0 ? 'tiz' : 'pest';
  return `${ablative(sp.natName)} ${Math.abs(sp.n)} koma ${dir} (${sp.letter} ${sp.accName})`;
}
