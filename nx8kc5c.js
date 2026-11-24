import { h, clear, segmented, fmtDuration, fmtMins, fmtDate, dayKey, logoMark } from './nyxk7bs.js';
import { db, settings, saveSettings } from './f36qmgd.js';
import { lineChart } from './zvga6p5.js';
import { RES } from './d8hbkej.js';
import { scaleFor } from './392vqcv.js';
import { byDay, breakdown, exerciseLines, lastDays, catLabel } from './rbixnvg.js';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const WEEKS = 5;
// Minute thresholds of the calendar shades.
const LEVELS = [10, 20, 40];
const TRADS = { bati: 'Batı', tm: 'Türk müziği', ortak: 'Ortak' };
const PERIODS = [[7, '7 gün'], [30, '30 gün'], [0, 'Tümü']];

export async function renderToday(main) {
  let results = [];
  try { results = await db.all('results'); } catch { /* private mode */ }
  const now = Date.now();
  const days = byDay(results);
  const todayKey = dayKey(now);
  let selected = todayKey;
  let period = PERIODS.some(([v]) => v === settings.statDays) ? settings.statDays : 7;

  const detail = h('section', { class: 'day-detail', 'aria-live': 'polite' });
  const cal = h('div', { class: 'cal-grid', role: 'group', 'aria-label': `Son ${WEEKS} haftanın günlük çalışma dakikaları` });
  const spread = h('div', { class: 'spread-body' });

  const drawCalendar = () => clear(cal, calendarCells(days, selected, now, (key) => {
    selected = key;
    drawCalendar();
    renderDay(detail, key, days[key], results, now);
  }));
  const drawSpread = () => renderSpread(spread, breakdown(lastDays(results, period, now)), period);

  const sum = (n) => breakdown(lastDays(results, n, now));
  const w = sum(7);
  const m = sum(30);
  const t = days[todayKey] ? breakdown(days[todayKey].rows) : null;
  const tile = (label, sec, sub) => h('div', { class: 'tile' },
    h('span', { class: 'tile-label' }, label),
    h('span', { class: 'tile-num', 'aria-label': fmtMins(sec) }, String(Math.round(sec / 60)), h('small', null, 'dk')),
    h('span', { class: 'tile-sub' }, sub));

  clear(main,
    h('section', { class: 'today-head' },
      h('div', { class: 'brand-inline', 'aria-hidden': 'true' }, logoMark(), 'VocUp'),
      h('p', { class: 'muted' }, fmtDate(now)),
      h('h1', null, 'İlerleme')),
    h('div', { class: 'tiles' },
      tile('Bugün', t?.total || 0, t?.cats.length ? `en çok ${catLabel(t.cats[0][0])}` : 'henüz yok'),
      tile('Son 7 gün', w.total, `${w.days} gün çalıştın`),
      tile('Son 30 gün', m.total, `${m.days} gün çalıştın`)),
    results.some((r) => r.exId)
      ? null
      : h('p', { class: 'note' }, 'Henüz kayıt yok. ', h('a', { href: '#egzersiz' }, 'Egzersizler'), ' sayfasından bir egzersiz başlattığında süreler burada birikir.'),
    h('section', { class: 'block' },
      h('h2', null, 'Günlük dakika'),
      h('div', { class: 'cal-wrap' },
        h('div', { class: 'cal-head' }, WEEKDAYS.map((d) => h('span', null, d))),
        cal,
        h('div', { class: 'cal-legend' },
          h('span', null, 'Kutudaki sayı o günün dakikası; bir güne dokun.'),
          h('span', { class: 'cal-scale', 'aria-hidden': 'true' }, 'az', [1, 2, 3, 4].map((l) => h('i', { class: `cal-key l${l}` })), 'çok')))),
    detail,
    h('section', { class: 'block' },
      h('div', { class: 'row spread' },
        h('h2', null, 'Neye ağırlık verdin'),
        segmented(PERIODS, period, (v) => { period = v; saveSettings({ statDays: v }); drawSpread(); }, 'Dönem')),
      spread),
    h('section', { class: 'block' },
      h('h2', null, 'Kendi notların'),
      notesCharts(results)));
  drawCalendar();
  renderDay(detail, selected, days[selected], results, now);
  drawSpread();
}

/* ---------- calendar ---------- */

function calendarCells(days, selected, now, onPick) {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const todayKey = dayKey(now);
  const cells = [];
  for (let k = 0; k < WEEKS * 7; k++) {
    const d = new Date(start);
    d.setDate(start.getDate() + k);
    const key = dayKey(d.getTime());
    const day = days[key];
    const sec = day?.sec || 0;
    const mins = Math.round(sec / 60);
    const future = key > todayKey;
    const level = !day ? 0 : mins < LEVELS[0] ? 1 : mins < LEVELS[1] ? 2 : mins < LEVELS[2] ? 3 : 4;
    const text = !day ? '' : sec >= 30 ? String(mins) : sec > 0 ? '<1' : '•';
    const date = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    cells.push(h('button', {
      type: 'button',
      class: `cal l${level}${future ? ' future' : ''}${key === todayKey ? ' today' : ''}${key === selected ? ' sel' : ''}`,
      disabled: future,
      'aria-pressed': String(key === selected),
      'aria-label': `${date}: ${day ? (sec ? fmtDuration(sec) : 'süre kaydı yok') : 'çalışma yok'}`,
      title: `${date}: ${day ? (sec ? fmtDuration(sec) : 'süre kaydı yok') : 'çalışma yok'}`,
      onclick: () => onPick(key),
    }, h('span', { class: 'cal-d' }, d.getDate() === 1 ? h('b', null, `1 ${d.toLocaleDateString('tr-TR', { month: 'short' })}`) : d.getDate()), h('span', { class: 'cal-m' }, text)));
  }
  return cells;
}

/* ---------- one day ---------- */

function dayTitle(key, now) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === dayKey(now)) return 'Bugün';
  if (key === dayKey(y.getTime())) return 'Dün';
  const [yy, mm, dd] = key.split('-').map(Number);
  return fmtDate(new Date(yy, mm - 1, dd, 12).getTime());
}

function renderDay(box, key, day, results, now) {
  const title = dayTitle(key, now);
  if (!day) {
    clear(box, h('div', { class: 'day-top' }, h('h2', null, title)), h('p', { class: 'muted' }, 'Bu gün çalışma kaydı yok.'));
    return;
  }
  const b = breakdown(day.rows);
  const lines = exerciseLines(day.rows);
  const ratings = results.filter((r) => r.kind === 'rating' && r.at && dayKey(r.at) === key);
  const avgOf = (f) => {
    const v = ratings.map((r) => r[f]).filter((x) => x != null);
    return v.length ? (v.reduce((a, x) => a + x, 0) / v.length).toFixed(1).replace('.', ',') : null;
  };
  const ease = avgOf('ease');
  const tune = avgOf('tune');
  clear(box,
    h('div', { class: 'day-top' }, h('h2', null, title), h('span', { class: 'day-total' }, b.total ? fmtDuration(b.total) : 'süre kaydı yok')),
    b.total ? bars(b.cats, b.total, catLabel) : null,
    b.resSec ? h('p', { class: 'muted small' }, resText(b, false)) : null,
    ease || tune ? h('p', { class: 'muted small' }, [ease ? `Rahatlık ${ease}` : null, tune ? `entonasyon ${tune}` : null].filter(Boolean).join(', ') + ' (kendi notun, 1–5).') : null,
    h('ul', { class: 'ex-lines' }, lines.map((l) => h('li', null,
      h('span', { class: 'exl-name' }, l.title, h('small', null, [catLabel(l.cat), l.sub].filter(Boolean).join(' · '))),
      h('span', { class: 'exl-time' }, l.sec ? fmtDuration(l.sec) : '—')))));
}

/* ---------- period breakdown ---------- */

function resText(b, withDays = true) {
  const parts = b.res.map(([k, s]) => `${RES[k]} ${fmtMins(s)}`).join(', ');
  return `Yarı kapalı ses yolu (bütün bölümlerde) ${fmtMins(b.resSec)}${withDays ? `, ${b.resDays} gün` : ''}: ${parts}.`;
}

function renderSpread(box, b, period) {
  if (!b.total) {
    clear(box, h('p', { class: 'muted' }, period ? `Son ${period} günde kayıtlı çalışma yok.` : 'Henüz kayıtlı çalışma yok.'));
    return;
  }
  const trads = Object.entries(b.trads).filter(([, s]) => s > 0).sort((x, y) => y[1] - x[1]);
  const names = (list, set) => list.map(([id, s]) => `${scaleFor(set, id).short} ${fmtMins(s)}`).join(', ');
  clear(box,
    h('p', { class: 'stats' }, `${fmtMins(b.total)} çalıştın, ${b.days} gün; çalıştığın günlerde ortalama ${fmtMins(b.total / b.days)}.`),
    h('h3', null, 'Teknik'),
    bars(b.cats, b.total, catLabel),
    h('h3', null, 'Bölüm'),
    bars(trads, b.total, (k) => TRADS[k]),
    h('p', { class: 'muted small' }, 'Ortak: SOVT, VFE, soğuma ve repertuvar. Bunların dem ile çalışılan Türk müziği sürümleri Türk müziğine sayılır.'),
    b.resSec ? h('p', { class: 'muted' }, resText(b)) : null,
    b.cesni.length ? h('p', { class: 'muted' }, `Çeşniler: ${names(b.cesni, 'd5')}.`) : null,
    b.makam.length ? h('p', { class: 'muted' }, `Makamlar: ${names(b.makam, 'dizi')}.`) : null);
}

/** Horizontal bars, longest first, each with its minutes and share. */
function bars(entries, total, labelOf) {
  const max = Math.max(...entries.map(([, s]) => s), 1);
  return h('ul', { class: 'bars' }, entries.map(([k, sec]) => h('li', null,
    h('span', { class: 'bar-label' }, labelOf(k)),
    h('span', { class: 'bar-track', 'aria-hidden': 'true' }, h('span', { class: 'bar-fill', style: { '--w': `${Math.max(2, (sec / max) * 100)}%` } })),
    h('span', { class: 'bar-val' }, fmtMins(sec), h('small', null, `%${Math.round((sec / total) * 100)}`)))));
}

/* ---------- self-ratings ---------- */

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

function notesCharts(results) {
  const ratings = results.filter((r) => r.kind === 'rating');
  const one = (v) => v.toFixed(1).replace('.', ',');
  return [
    chartBlock('Rahatlık', 'Egzersiz sonrası kendi notunun günlük ortalaması (1–5)', series(ratings.filter((r) => r.ease != null), (rs) => avg(rs.map((r) => r.ease))), one, 1, 5),
    chartBlock('Entonasyon, kulağına göre', 'Kendi notunun günlük ortalaması (1–5)', series(ratings.filter((r) => r.tune != null), (rs) => avg(rs.map((r) => r.tune))), one, 1, 5),
    chartBlock('VFE 1 süresi', 'Günün en uzun “i” sesi, saniye', series(results.filter((r) => r.exId === 'vfe-1' && r.kind === 'sustain'), (rs) => Math.max(...rs.map((r) => r.best))), (v) => `${Math.round(v)} sn`),
  ];
}

function series(rs, reduce) {
  const by = {};
  for (const r of rs) (by[dayKey(r.at)] ||= []).push(r);
  return Object.entries(by).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-30)
    .map(([, list]) => ({ t: new Date(list[0].at).setHours(12, 0, 0, 0), v: reduce(list) }));
}

function chartBlock(title, sub, pts, fmt, yMin = null, yMax = null) {
  const readoutEl = h('span', { class: 'chart-read' }, '');
  const canvas = h('canvas', { class: 'chart', 'aria-label': `${title}: ${pts.map((p) => fmt(p.v)).join(', ')}` });
  const block = h('div', { class: 'chart-block' },
    h('div', { class: 'chart-title' }, h('h3', null, title), readoutEl),
    h('p', { class: 'muted small' }, sub),
    pts.length >= 2 ? canvas : h('p', { class: 'empty' }, pts.length ? `Şimdilik tek gün: ${fmt(pts[0].v)}. İkinci günden sonra çizgi oluşur.` : 'Henüz veri yok. Egzersiz sonrası not verdikçe burada görünecek.'));
  if (pts.length >= 2) {
    requestAnimationFrame(() => {
      const draw = lineChart(canvas, pts, {
        fmt, yMin, yMax,
        onHover: (p) => { readoutEl.textContent = p ? `${new Date(p.t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}: ${fmt(p.v)}` : ''; },
      });
      new ResizeObserver(() => draw()).observe(canvas);
    });
  }
  return block;
}
