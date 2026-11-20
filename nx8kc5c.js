import { h, clear, segmented, fmtMinutes, fmtDate, dayKey } from './nyxk7bs.js';
import { db, settings, saveSettings } from './f36qmgd.js';
import { generatePlan, stepLabel, stepCatLabel } from './rdjz6js.js';
import { runSession } from './amcnm9m.js';
import { ensureAudio } from './qpy3wmh.js';
import { lineChart } from './zvga6p5.js';
import { byId } from './d8hbkej.js';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export async function renderToday(main) {
  const [sessions, results] = await Promise.all([db.all('sessions'), db.all('results')]);
  const today = dayKey(Date.now());
  const open = sessions
    .filter((s) => !s.finishedAt && dayKey(s.startedAt) === today && s.idx < s.plan.steps.length)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  const doneToday = sessions.filter((s) => s.finishedAt && dayKey(s.finishedAt) === today);

  const rerender = () => renderToday(main);
  const top = h('section', { class: 'today-head' },
    h('p', { class: 'muted' }, fmtDate(Date.now())),
    h('h1', null, open ? 'Yarım kalan seans' : doneToday.length ? 'Bugün çalıştın' : 'Bugünkü çalışma'));

  const planBox = h('section', { class: 'plan' });
  if (open) renderResume(planBox, open, rerender);
  else renderPlanner(planBox, { results, sessions, rerender, doneToday: doneToday.length });

  const progress = h('section', { class: 'progress' });
  clear(main, top, planBox, progress);
  renderProgress(progress, { sessions, results });
}

function stepRows(steps, states = []) {
  return h('ol', { class: 'step-list plain' }, steps.map((st, k) => h('li', { class: states[k] || '' },
    h('span', { class: 'step-name' }, stepLabel(st), stepCatLabel(st) !== stepLabel(st) ? h('small', null, stepCatLabel(st)) : null),
    h('span', { class: 'step-meta' }, fmtMinutes(st.estSec)))));
}

function renderResume(box, session, rerender) {
  const states = session.plan.steps.map((_, k) => (session.done[k] ? 'done' : session.skipped?.[k] ? 'skipped' : k === session.idx ? 'current' : ''));
  clear(box,
    h('p', null, `${session.idx}/${session.plan.steps.length} adım tamamlandı.`),
    stepRows(session.plan.steps, states),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary big', type: 'button', onclick: () => { ensureAudio(); runSession(session, { onChange: rerender }); } }, 'Devam et'),
      h('button', {
        class: 'btn ghost', type: 'button',
        onclick: async () => { session.finishedAt = Date.now(); session.abandoned = true; await db.put('sessions', session); rerender(); },
      }, 'Bugünlük bitir')));
}

function renderPlanner(box, { results, sessions, rerender, doneToday }) {
  let minutes = settings.sessionMin || 30;
  let energy = 'normal';
  let plan = null;
  const list = h('div');
  const reason = h('p', { class: 'note' });
  const total = h('span', { class: 'muted' });

  const regen = () => {
    plan = generatePlan({ minutes, settings, results, sessions, energy });
    reason.textContent = plan.reason || '';
    reason.hidden = !plan.reason;
    total.textContent = `Toplam yaklaşık ${fmtMinutes(plan.estSec)}`;
    clear(list, stepRows(plan.steps));
  };

  const start = async () => {
    ensureAudio();
    const session = {
      startedAt: Date.now(), minutes, plan, idx: 0, done: [], skipped: [], pre: { energy }, activeSec: 0,
    };
    session.id = await db.add('sessions', session);
    runSession(session, { onChange: rerender });
  };

  clear(box,
    doneToday ? h('p', { class: 'muted' }, 'İstersen kısa bir ek seans yapabilirsin; ses yorgunsa dinlenmek de çalışmanın parçası.') : null,
    h('div', { class: 'field' }, h('span', null, 'Süre'),
      segmented([[15, '15 dk'], [30, '30 dk'], [45, '45 dk']], minutes, (v) => { minutes = v; saveSettings({ sessionMin: v }); regen(); }, 'Süre')),
    h('div', { class: 'field' }, h('span', null, 'Sesin şu an nasıl?'),
      segmented([['dinc', 'Dinç'], ['normal', 'Normal'], ['yorgun', 'Yorgun']], energy, (v) => { energy = v; regen(); }, 'Ses durumu')),
    reason,
    list,
    h('div', { class: 'row spread' },
      total,
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', onclick: regen }, 'Başka seçim'),
        h('button', { class: 'btn primary big', type: 'button', onclick: start }, 'Seansı başlat'))));
  regen();
}

function renderProgress(box, { sessions, results }) {
  const now = Date.now();
  const days = {};
  for (const r of results) if (r.kind !== 'rating') (days[dayKey(r.at)] ||= []).push(r);

  // Four-week strip, Monday first.
  const d0 = new Date();
  d0.setHours(12, 0, 0, 0);
  const dow = (d0.getDay() + 6) % 7;
  const start = new Date(d0.getTime() - (21 + dow) * 86400e3);
  const cells = [];
  for (let k = 0; k < 28; k++) {
    const d = new Date(start.getTime() + k * 86400e3);
    const key = dayKey(d.getTime());
    const n = (days[key] || []).length;
    const level = n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3;
    const future = d.getTime() > now;
    cells.push(h('span', {
      class: `cal l${level}${future ? ' future' : ''}${key === dayKey(now) ? ' today' : ''}`,
      title: `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}: ${n ? `${n} egzersiz` : 'çalışma yok'}`,
    }));
  }
  const weekAgo = now - 7 * 86400e3;
  const week = sessions.filter((s) => s.finishedAt && s.finishedAt > weekAgo);
  const weekMin = Math.round(week.reduce((a, s) => a + (s.activeSec || 0), 0) / 60);
  const activeDays = Object.keys(days).filter((k) => k >= dayKey(weekAgo)).length;

  const charts = [];
  const ratings = results.filter((r) => r.kind === 'rating');
  const easePts = series(ratings.filter((r) => r.ease != null), (rs) => avg(rs.map((r) => r.ease)));
  charts.push(chartBlock('Rahatlık', 'Egzersiz sonrası kendi notunun günlük ortalaması (1–5)', easePts, (v) => v.toFixed(1).replace('.', ','), 1, 5));
  const tunePts = series(ratings.filter((r) => r.tune != null), (rs) => avg(rs.map((r) => r.tune)));
  charts.push(chartBlock('Entonasyon, kulağına göre', 'Kendi notunun günlük ortalaması (1–5)', tunePts, (v) => v.toFixed(1).replace('.', ','), 1, 5));
  const mptPts = series(results.filter((r) => r.exId === 'vfe-1' && r.kind === 'sustain'), (rs) => Math.max(...rs.map((r) => r.best)));
  charts.push(chartBlock('VFE 1 süresi', 'Günün en uzun “i” sesi, saniye', mptPts, (v) => `${Math.round(v)} sn`));
  const sovtDays = new Set(results.filter((r) => ['sovt', 'sovt-tm'].includes(byId[r.exId]?.cat)).map((r) => dayKey(r.at)));
  const sovtWeek = [...sovtDays].filter((k) => k >= dayKey(now - 7 * 86400e3)).length;
  const rangeText = `Son 7 günde ${sovtWeek} gün yarı kapalı ses yolu çalıştın.`;

  clear(box,
    h('h2', null, 'İlerleme'),
    h('p', { class: 'stats' }, `Son 7 gün: ${activeDays} gün çalıştın, ${week.length} seans, ${weekMin} dk.`),
    h('div', { class: 'cal-wrap' },
      h('div', { class: 'cal-head' }, WEEKDAYS.map((d) => h('span', null, d))),
      h('div', { class: 'cal-grid', role: 'img', 'aria-label': 'Son dört haftanın çalışma günleri' }, cells)),
    rangeText ? h('p', { class: 'muted' }, rangeText) : null,
    charts);
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

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
    pts.length >= 2 ? canvas : h('p', { class: 'empty' }, pts.length ? `Şimdilik tek gün: ${fmt(pts[0].v)}. İkinci günden sonra çizgi oluşur.` : 'Henüz veri yok. Seanslar biriktikçe burada görünecek.'));
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
