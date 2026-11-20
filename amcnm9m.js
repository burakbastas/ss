import { h, clear, icon, segmented, fmtDuration, fmtMinutes } from './nyxk7bs.js';
import { openOverlay, requestClose, runStep, summaryLines } from './uhyk5uj.js';
import { db } from './f36qmgd.js';
import { byId } from './d8hbkej.js';
import { stepLabel, stepCatLabel } from './rdjz6js.js';
import { audio } from './qpy3wmh.js';

function summaryScreen(root, { title, lines, extra, actions }) {
  clear(root, h('div', { class: 'run inter' },
    h('header', { class: 'run-head' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Kapat', onclick: requestClose }, icon('close')),
      h('div', { class: 'run-titles' }, h('h2', { class: 'run-title' }, title)), h('span')),
    h('div', { class: 'inter-body' },
      lines.length ? h('dl', { class: 'summary' }, lines.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])) : h('p', { class: 'muted' }, 'Bu turda ölçülebilir ses kaydı olmadı.'),
      extra || null,
      h('div', { class: 'row' }, actions.map(([label, fn, cls]) => h('button', { class: `btn ${cls || ''}`, type: 'button', onclick: fn }, label))))));
}

/** Run a single exercise from the library. */
export function runSingle(step, { onFinish } = {}) {
  let current = null;
  const root = openOverlay(() => current?.abort());
  const go = () => {
    current = runStep(root, step);
    current.promise.then(({ results }) => {
      current = null;
      onFinish?.();
      if (root.hidden) return;
      summaryScreen(root, {
        title: step.cat === 'mix' ? stepLabel(step) : byId[step.exId].title,
        lines: summaryLines(results),
        actions: [['Yeniden', go, 'ghost'], ['Kapat', requestClose, 'primary']],
      });
    });
  };
  go();
}

/** Guided session: interstitial, step, interstitial ... then a short check-out. */
export function runSession(session, { onChange } = {}) {
  let current = null;
  let closed = false;
  const save = () => db.put('sessions', session).catch(() => {});
  const root = openOverlay(() => {
    closed = true;
    current?.abort();
    session.activeSec = (session.activeSec || 0);
    save().then(() => onChange?.());
  });
  const steps = session.plan.steps;

  function stepList() {
    return h('ol', { class: 'step-list' }, steps.map((st, k) => h('li', {
      class: session.done[k] ? 'done' : session.skipped?.[k] ? 'skipped' : k === session.idx ? 'current' : '',
    }, h('span', { class: 'step-name' }, stepLabel(st)), h('span', { class: 'step-meta' }, session.done[k] ? icon('check', 18) : fmtMinutes(st.estSec)))));
  }

  function interstitial() {
    if (closed) return;
    const st = steps[session.idx];
    const exs = st.cat === 'mix' ? st.exIds.map((id) => byId[id]) : [byId[st.exId]];
    const blocked = st.blockedIds?.length ? h('p', { class: 'muted small' }, 'Yeni egzersizler önce tek başına çalışılır; üç seanstan sonra karışık sıraya girer.') : null;
    const mixNote = st.interleaved ? h('p', { class: 'muted small' }, 'Bu blokta egzersizler birkaç tonda bir dönüşümlü gelir. İlk anda zor hissettirir ama öğrenilenin kalıcılığını artırır.') : null;
    clear(root, h('div', { class: 'run inter' },
      h('header', { class: 'run-head' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Seansı kapat', onclick: requestClose }, icon('close')),
        h('div', { class: 'run-titles' }, h('h2', { class: 'run-title' }, 'Seans'), h('p', { class: 'run-sub' }, h('span', { class: 'count' }, `${session.idx + 1}/${steps.length}`))),
        h('span')),
      h('div', { class: 'inter-body' },
        h('p', { class: 'eyebrowless muted' }, 'Sıradaki'),
        h('h2', { class: 'inter-title' }, stepLabel(st)),
        h('p', { class: 'inter-meta' }, `${stepCatLabel(st)}, yaklaşık ${fmtMinutes(st.estSec)}`),
        exs.map((ex) => h('div', { class: 'inter-ex' },
          exs.length > 1 ? h('h3', null, ex.title) : null,
          ex.vowel ? h('p', { class: 'muted' }, `Ses: ${ex.vowel}`) : null,
          h('p', null, ex.how),
          h('p', { class: 'focus-note' }, ex.focus))),
        mixNote, blocked,
        h('div', { class: 'row' },
          h('button', { class: 'btn primary big', type: 'button', onclick: runCurrent }, 'Başla'),
          h('button', { class: 'btn ghost', type: 'button', onclick: skip }, 'Atla'))),
      stepList()));
  }

  function advance() {
    session.idx++;
    save();
    if (session.idx >= steps.length) checkout();
    else interstitial();
  }

  function skip() {
    (session.skipped ||= [])[session.idx] = true;
    advance();
  }

  async function runCurrent() {
    const startedAt = Date.now();
    current = runStep(root, steps[session.idx], { sessionId: session.id });
    const { completed, results } = await current.promise;
    current = null;
    session.activeSec = (session.activeSec || 0) + (Date.now() - startedAt) / 1000;
    if (closed) return;
    if (completed || results.length) session.done[session.idx] = true;
    advance();
  }

  async function checkout() {
    audio.synth?.stopAll();
    const all = await db.all('results');
    const mine = all.filter((r) => r.sessionId === session.id);
    let effort = 3;
    let fatigue = 2;
    const note = h('textarea', { class: 'input', rows: 3, placeholder: 'Bugün ne iyi gitti, neye dikkat etmeli?' });
    summaryScreen(root, {
      title: 'Seans bitti',
      lines: [['Süre', fmtDuration(session.activeSec || 0)], ...summaryLines(mine)],
      extra: h('div', { class: 'checkout' },
        h('div', { class: 'field' }, h('span', null, 'Ses üretmek ne kadar zahmetliydi?'),
          segmented([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], effort, (v) => { effort = v; }, 'Efor'),
          h('span', { class: 'scale-ends' }, h('span', null, 'çok kolay'), h('span', null, 'çok zor'))),
        h('div', { class: 'field' }, h('span', null, 'Sesin ne kadar yorgun?'),
          segmented([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], fatigue, (v) => { fatigue = v; }, 'Yorgunluk'),
          h('span', { class: 'scale-ends' }, h('span', null, 'hiç'), h('span', null, 'çok'))),
        h('label', { class: 'field' }, h('span', null, 'Not'), note)),
      actions: [['Kaydet ve kapat', async () => {
        session.post = { effort, fatigue };
        session.note = note.value.trim();
        session.finishedAt = Date.now();
        await save();
        closed = true;
        requestClose();
        onChange?.();
      }, 'primary']],
    });
  }

  if (session.idx >= steps.length) checkout();
  else interstitial();
}
