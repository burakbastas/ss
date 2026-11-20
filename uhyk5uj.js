import { h, clear, icon, toast, fmtDuration, segmented } from './nyxk7bs.js';
import { audio, ensureAudio, loadPiano, keepAwake } from './qpy3wmh.js';
import { settings, db } from './f36qmgd.js';
import { byId, RES } from './d8hbkej.js';
import { buildRep, buildGlide, buildIntervalTrial } from './f6c5xz4.js';
import { noteName } from './ewdv3t5.js';
import { drawRep, readPalette } from './zvga6p5.js';
import { pianoTools } from './ybmk6gs.js';

/* ---------- overlay ---------- */

const ov = { el: null, onClose: null };

export function openOverlay(onClose) {
  if (!ov.el) {
    ov.el = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' });
    document.body.append(ov.el);
  }
  ov.onClose = onClose;
  ov.el.hidden = false;
  document.body.classList.add('locked');
  try { history.pushState({ overlay: true }, ''); } catch { /* sandboxed */ }
  keepAwake(true);
  readPalette();
  return ov.el;
}

export function requestClose() {
  if (history.state?.overlay) history.back();
  else finishClose();
}

function finishClose() {
  if (!ov.el || ov.el.hidden) return;
  const cb = ov.onClose;
  ov.onClose = null;
  cb?.();
  ov.el.hidden = true;
  clear(ov.el);
  document.body.classList.remove('locked');
  keepAwake(false);
}

window.addEventListener('popstate', () => { if (ov.el && !ov.el.hidden) finishClose(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ov.el && !ov.el.hidden) keepAwake(true);
});

/* ---------- shared pieces ---------- */

function header({ title, onInfo }) {
  const t = h('h2', { class: 'run-title' }, title);
  const key = h('span', { class: 'key' });
  const count = h('span', { class: 'count' });
  const vowel = h('span', { class: 'vowel' });
  const el = h('header', { class: 'run-head' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Kapat', onclick: requestClose }, icon('close')),
    h('div', { class: 'run-titles' }, t, h('p', { class: 'run-sub' }, key, count, vowel)),
    onInfo ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nasıl yapılır', onclick: onInfo }, icon('info')) : h('span'));
  return {
    el,
    set({ title: tt, key: k, count: c, vowel: v }) {
      if (tt != null) t.textContent = tt;
      if (k != null) key.textContent = k;
      if (c != null) count.textContent = c;
      if (v != null) vowel.textContent = v ? `“${v}”` : '';
    },
  };
}

export function exMeta(ex) {
  return [
    ex.res ? `Yarı kapalı ses yolu: ${RES[ex.res]}` : null,
    ex.gear ? `Gereken: ${ex.gear}` : null,
    ex.scale || null,
  ].filter(Boolean);
}

function infoSheet(ex, extra) {
  const dlg = h('dialog', { class: 'dialog sheet' },
    h('h3', null, ex.title),
    ex.vowel ? h('p', { class: 'muted' }, `Ses: ${ex.vowel}`) : null,
    exMeta(ex).map((m) => h('p', { class: 'muted' }, m)),
    h('p', null, ex.how),
    h('p', { class: 'focus-note' }, ex.focus),
    extra ? h('p', { class: 'muted small' }, extra) : null,
    h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => dlg.close() }, 'Tamam')));
  document.body.append(dlg);
  dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 50));
  dlg.showModal();
}

function nowDisplay() {
  const big = h('div', { class: 'now-big' }, '—');
  const sub = h('div', { class: 'now-sub' }, '');
  const el = h('div', { class: 'now' }, big, sub);
  return {
    el,
    set(text, subText = '', state = '') {
      if (big.textContent !== text) big.textContent = text;
      if (sub.textContent !== subText) sub.textContent = subText;
      el.dataset.state = state;
    },
  };
}

const fmtSec = (sec) => sec.toFixed(1).replace('.', ',');

function keyHandler(map) {
  const fn = (e) => {
    if (e.target.closest('input, textarea, select')) return;
    const f = map[e.code];
    if (f) { e.preventDefault(); f(); }
  };
  document.addEventListener('keydown', fn);
  return () => document.removeEventListener('keydown', fn);
}

function frameLoop(fn) {
  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); fn(audio.ctx.currentTime); };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function schedule(r, t0) {
  for (const ev of r.events) {
    if (ev.kind === 'chord') audio.synth.chord(ev.midis, t0 + ev.t, ev.dur, ev.vel, ev.spread ?? 0.012);
    else if (ev.kind === 'note') audio.synth.piano(ev.midi, t0 + ev.t, ev.dur, ev.vel);
    else if (ev.kind === 'click') audio.synth.click(t0 + ev.t, ev.accent);
  }
}

/* ---------- step runner entry ---------- */

/**
 * Runs one step inside the overlay. Resolves with { completed, results } when the
 * step ends or is aborted (abort also saves what was done).
 */
export function runStep(root, step, opts = {}) {
  let ctl = null;
  let aborted = false;
  const promise = new Promise((resolve) => {
    const boot = async () => {
      ensureAudio();
      if (!audio.synth.ready) {
        const msg = h('p', { class: 'muted' }, 'Piyano yükleniyor…');
        clear(root, h('div', { class: 'run-msg' }, msg));
        const ok = await loadPiano((p) => { msg.textContent = `Piyano yükleniyor… %${Math.round(p * 100)}`; });
        if (!ok) toast('Piyano sesleri yüklenemedi; yedek ses kullanılıyor.');
      }
      if (aborted) { resolve({ completed: false, results: [] }); return; }
      const make = step.kind === 'sustain' ? sustainRunner : step.kind === 'free' ? freeRunner : timelineRunner;
      ctl = make(root, step, opts, resolve);
    };
    boot();
  });
  return { promise, abort: () => { aborted = true; ctl?.abort(); } };
}

/* ---------- pattern / glide / interval ---------- */

function timelineRunner(root, step, opts, resolve) {
  const total = step.kind === 'queue' ? step.queue.length : step.kind === 'glide' ? step.reps : step.trials;
  const firstEx = byId[step.kind === 'queue' ? step.queue[0].exId : step.exId];
  let tempo = settings.tempo;
  let i = 0;
  let rep = null;
  let repStart = 0;
  let running = false;
  let done = false;
  let guideOverride = null;
  let doneReps = 0;
  const exCount = {};
  const repsByEx = {};
  const ivTrials = [];
  const built = [];

  const head = header({
    title: firstEx.title,
    onInfo: () => infoSheet(rep?.ex || firstEx, step.interleaved
      ? 'Bu blokta egzersizler birkaç tonda bir dönüşümlü gelir. İlk anda zor hissettirir ama araştırmalarda kalıcı öğrenmeyi artırdığı görülüyor.'
      : settings.guide === 'fade' ? 'Melodi her egzersizin ilk iki tonunda piyanoda çalar, sonra yalnızca akorlar kalır. Melodi düğmesiyle istediğin zaman açıp kapatabilirsin.' : null),
  });
  const meta = h('p', { class: 'run-meta' });
  const focus = h('p', { class: 'run-focus' }, firstEx.focus);
  const canvas = h('canvas', { class: 'roll', 'aria-label': 'Söylenecek notalar ve akorlar' });
  const now = nowDisplay();
  const markHit = h('button', { class: 'btn', type: 'button' }, 'Tuttu');
  const markMiss = h('button', { class: 'btn ghost', type: 'button' }, 'Kaçtı');
  const marks = h('div', { class: 'row marks', hidden: true }, markHit, markMiss);
  const side = h('div', { class: 'run-side' }, marks);

  const playBtn = h('button', { class: 'ctl main', type: 'button', 'aria-label': 'Duraklat' }, icon('pause', 26));
  const tempoVal = h('span', { class: 'tempo-val' });
  const guideBtn = h('button', { class: 'btn guide', type: 'button', 'aria-pressed': 'false' }, 'Melodi');
  const progress = h('div', { class: 'run-progress' }, h('span'));

  const controls = h('footer', { class: 'run-ctrl' },
    h('div', { class: 'ctl-group' },
      h('button', { class: 'ctl', type: 'button', 'aria-label': 'Önceki', onclick: () => go(-1) }, icon('prev')),
      playBtn,
      h('button', { class: 'ctl', type: 'button', 'aria-label': 'Sonraki', onclick: () => go(1) }, icon('next')),
      h('button', { class: 'ctl', type: 'button', 'aria-label': 'Bu tekrarı yeniden', onclick: () => go(0) }, icon('again'))),
    step.kind === 'queue' ? h('div', { class: 'ctl-group tempo' },
      h('button', { class: 'ctl small', type: 'button', 'aria-label': 'Tempoyu düşür', onclick: () => setTempo(-0.05) }, icon('minus', 18)),
      tempoVal,
      h('button', { class: 'ctl small', type: 'button', 'aria-label': 'Tempoyu artır', onclick: () => setTempo(0.05) }, icon('plus', 18))) : null,
    step.kind === 'queue' ? h('div', { class: 'ctl-group' }, guideBtn) : null);

  clear(root, h('div', { class: 'run' }, head.el, progress, meta, focus, h('div', { class: 'stage' }, canvas), h('div', { class: 'run-read' }, now.el, side), controls));

  playBtn.addEventListener('click', () => toggle());
  guideBtn.addEventListener('click', () => {
    guideOverride = !(rep?.guide);
    guideBtn.setAttribute('aria-pressed', String(guideOverride));
    toast(guideOverride ? 'Melodi sonraki tondan itibaren çalacak.' : 'Melodi sonraki tondan itibaren susacak.');
  });

  const sCur = () => ({ ...settings, tempo });
  function setTempo(d) {
    tempo = Math.round(Math.min(1.5, Math.max(0.5, tempo + d)) * 100) / 100;
    tempoVal.textContent = `Tempo %${Math.round(tempo * 100)}`;
  }
  setTempo(0);

  function guideFor(ex) {
    if (guideOverride != null) return guideOverride;
    if (settings.guide === 'always') return true;
    if (settings.guide === 'never') return false;
    return (exCount[ex.id] || 0) < 2;
  }

  function getRep(k) {
    if (step.kind === 'queue') {
      const q = step.queue[k];
      const ex = byId[q.exId];
      return buildRep(ex, q.root, sCur(), { guide: guideFor(ex) });
    }
    if (step.kind === 'glide') return buildGlide(firstEx, settings, k);
    if (!built[k]) built[k] = buildIntervalTrial(firstEx, settings);
    return built[k];
  }

  function startRep() {
    rep = getRep(i);
    audio.synth.stopAll();
    repStart = audio.ctx.currentTime + 0.12;
    schedule(rep, repStart);
    running = true;
    playBtn.replaceChildren(icon('pause', 26));
    playBtn.setAttribute('aria-label', 'Duraklat');
    guideBtn.setAttribute('aria-pressed', String(!!rep.guide));
    const ex = rep.ex;
    head.set({ title: ex.title, key: rep.kind === 'glide' ? '' : rep.label, count: `${i + 1}/${total}`, vowel: ex.vowel });
    meta.textContent = exMeta(ex).join('. ');
    meta.hidden = !meta.textContent;
    focus.textContent = ex.focus;
    progress.firstChild.style.width = `${(i / total) * 100}%`;
    marks.hidden = true;
  }

  function endRep() {
    running = false;
    const ex = rep.ex;
    exCount[ex.id] = (exCount[ex.id] || 0) + 1;
    doneReps++;
    if (rep.kind === 'pattern') (repsByEx[ex.id] ||= []).push(rep.root);
    i++;
    if (i >= total) { finish(true); return; }
    startRep();
  }

  function setMark(k, mark) {
    const trial = ivTrials[k];
    if (trial) trial.mark = mark;
    marks.hidden = true;
  }

  function toggle() {
    if (done) return;
    if (running) {
      audio.synth.stopAll();
      running = false;
      playBtn.replaceChildren(icon('play', 26));
      playBtn.setAttribute('aria-label', 'Devam et');
      now.set('Durdu', 'Devam etmek için oynat düğmesine bas');
    } else {
      startRep();
    }
  }

  function go(d) {
    if (done) return;
    if (d > 0 && i + 1 >= total) { finish(true); return; }
    i = Math.max(0, i + d);
    startRep();
  }

  function tick(nowT) {
    if (!rep) return;
    const t = running ? nowT - repStart : 0;
    const ex = rep.ex;
    let hide = false;
    if (rep.kind === 'interval') {
      hide = t < rep.answerAt;
      if (running && !hide && marks.hidden && !ivTrials[i]) {
        ivTrials[i] = { st: rep.interval.st, dir: rep.dir, mark: null };
        const k = i;
        markHit.onclick = () => setMark(k, 'hit');
        markMiss.onclick = () => setMark(k, 'miss');
        marks.hidden = false;
      }
    }
    drawRep(canvas, { rep, t, hideTargets: hide, lane: ex.dyn === 'mdv', marks: rep.kind === 'interval' && ivTrials[i]?.mark ? [ivTrials[i].mark] : null });
    if (!running) return;
    // What to sing now
    if (rep.kind === 'interval') {
      if (t < rep.singStart) now.set(noteName(rep.root), 'Dinle', 'listen');
      else if (t < rep.singEnd) now.set('?', `${rep.interval.name} ${rep.dir > 0 ? 'yukarı' : 'aşağı'}: söyle`, 'sing');
      else now.set(noteName(rep.targets[0].midi), 'Doğru ses buydu', 'answer');
    } else if (rep.kind === 'glide') {
      now.set(t < rep.singStart ? noteName(rep.root) : 'Kaydır', t < rep.singStart ? 'Başlangıç sesi' : ex.vowel, t < rep.singStart ? 'listen' : 'sing');
    } else {
      const cur = rep.targets.find((tg) => t >= tg.t0 && t < tg.t1);
      const next = rep.targets.find((tg) => tg.t0 >= t);
      if (rep.listen && t < rep.singStart - rep.beat) now.set(noteName(rep.targets[0].midi), 'Önce dinle', 'listen');
      else if (t < rep.singStart) now.set(noteName(rep.targets[0].midi), `Hazırlan, ${Math.max(1, Math.ceil((rep.singStart - t) / rep.beat))}`, 'listen');
      else if (cur) now.set(noteName(cur.midi), cur.syl || '', 'sing');
      else if (next) now.set(noteName(next.midi), next.syl || '', 'sing');
      else now.set('Nefes', '', 'rest');
    }
    if (t >= rep.duration) endRep();
  }

  async function saveResults() {
    const at = Date.now();
    const out = [];
    for (const [exId, roots] of Object.entries(repsByEx)) {
      out.push({ exId, at, sessionId: opts.sessionId || null, kind: 'pattern', keys: roots.length, roots });
    }
    if (step.kind === 'glide' && doneReps) out.push({ exId: firstEx.id, at, sessionId: opts.sessionId || null, kind: 'glide', reps: doneReps });
    if (step.kind === 'interval' && ivTrials.length) {
      const marked = ivTrials.filter((x) => x?.mark);
      out.push({
        exId: firstEx.id, at, sessionId: opts.sessionId || null, kind: 'interval', trials: ivTrials.filter(Boolean),
        hitRate: marked.length ? marked.filter((x) => x.mark === 'hit').length / marked.length : null,
      });
    }
    for (const r of out) { try { await db.add('results', r); } catch { /* storage full */ } }
    return out;
  }

  const stopLoop = frameLoop(tick);
  const stopKeys = keyHandler({ Space: toggle, ArrowLeft: () => go(-1), ArrowRight: () => go(1), KeyR: () => go(0) });

  async function finish(completed) {
    if (done) return;
    done = true;
    running = false;
    stopLoop();
    stopKeys();
    audio.synth.stopAll();
    const results = await saveResults();
    resolve({ completed, results, exIds: step.exIds || [firstEx.id] });
  }

  startRep();
  return { abort: () => finish(false) };
}

/* ---------- sustained notes with a stopwatch (VFE 1 and 4) ---------- */

function sustainRunner(root, step, opts, resolve) {
  const ex = byId[step.exId];
  const notes = step.notes;
  let k = 0;
  let holdStart = null;
  let done = false;
  const out = [];

  const head = header({ title: ex.title, onInfo: () => infoSheet(ex) });
  const timer = h('div', { class: 'timer' }, '0,0');
  const hint = h('p', { class: 'timer-hint' }, '');
  const mainBtn = h('button', { class: 'btn primary huge', type: 'button' }, 'Başla');
  const giveBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => cue() }, 'Notayı yeniden ver');
  const nextBtn = h('button', { class: 'btn', type: 'button', hidden: true, onclick: () => next() }, 'Sonraki nota');
  const list = h('div', { class: 'mpt-list' });

  clear(root, h('div', { class: 'run' },
    head.el,
    h('p', { class: 'run-focus' }, ex.focus),
    h('div', { class: 'sustain-stage' }, timer, hint, mainBtn, h('div', { class: 'row center' }, giveBtn, nextBtn)),
    list));

  function renderList() {
    clear(list, out.map((r) => h('span', { class: 'mpt' }, `${noteName(r.midi)} ${fmtSec(r.sec)} sn`)));
  }

  function cue() {
    audio.synth.stopAll();
    audio.synth.piano(notes[k], audio.ctx.currentTime + 0.05, 1.4, 0.5);
  }

  function enter() {
    head.set({ key: noteName(notes[k]), count: `${k + 1}/${notes.length}`, vowel: ex.vowel });
    holdStart = null;
    timer.textContent = '0,0';
    hint.textContent = 'Notayı dinle, nefes al, sesi başlatırken düğmeye bas.';
    mainBtn.textContent = 'Başla';
    mainBtn.hidden = false;
    nextBtn.hidden = true;
    cue();
  }

  mainBtn.addEventListener('click', () => {
    if (holdStart == null) {
      holdStart = performance.now();
      mainBtn.textContent = 'Bitti';
      hint.textContent = 'Ses bittiğinde bas.';
    } else {
      const sec = (performance.now() - holdStart) / 1000;
      holdStart = null;
      out.push({ midi: notes[k], sec });
      renderList();
      timer.textContent = fmtSec(sec);
      mainBtn.hidden = true;
      hint.textContent = k + 1 < notes.length ? 'Dinlen, hazır olunca sonraki notaya geç.' : 'Son nota bitti.';
      nextBtn.textContent = k + 1 < notes.length ? 'Sonraki nota' : 'Bitir';
      nextBtn.hidden = false;
    }
  });

  function next() {
    k++;
    if (k >= notes.length) { finish(true); return; }
    enter();
  }

  const stopLoop = frameLoop(() => {
    if (holdStart != null) timer.textContent = fmtSec((performance.now() - holdStart) / 1000);
  });

  async function finish(completed) {
    if (done) return;
    done = true;
    stopLoop();
    audio.synth.stopAll();
    const results = [];
    if (out.length) {
      const r = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, kind: 'sustain', mpt: out, best: Math.max(...out.map((x) => x.sec)) };
      try { await db.add('results', r); } catch { /* ignore */ }
      results.push(r);
    }
    resolve({ completed, results, exIds: [ex.id] });
  }

  enter();
  return { abort: () => finish(false) };
}

/* ---------- free practice (repertoire) ---------- */

function freeRunner(root, step, opts, resolve) {
  const ex = byId[step.exId];
  const limit = (step.minutes || ex.minutes || 8) * 60;
  const started = Date.now();
  let done = false;
  let warned = false;
  const head = header({ title: ex.title, onInfo: () => infoSheet(ex) });
  const clock = h('div', { class: 'clock' }, '');
  const note = h('textarea', { class: 'input', rows: 2, placeholder: 'Hangi eser, hangi pasaj? Ne fark ettin?', id: 'free-note' });
  const tools = pianoTools({ compact: true });

  clear(root, h('div', { class: 'run' },
    head.el,
    h('p', { class: 'run-focus' }, ex.focus),
    h('div', { class: 'free-body' }, tools.el, h('label', { class: 'field' }, h('span', null, 'Not'), note)),
    h('footer', { class: 'run-ctrl' }, clock, h('button', { class: 'btn primary', type: 'button', onclick: () => finish(true) }, 'Bitir'))));
  head.set({ count: `${Math.round(limit / 60)} dk` });

  const tick = setInterval(() => {
    const el = (Date.now() - started) / 1000;
    const left = limit - el;
    clock.textContent = left >= 0
      ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} kaldı`
      : `+${Math.floor(-left / 60)}:${String(Math.floor(-left % 60)).padStart(2, '0')}`;
    if (left < 0 && !warned) { warned = true; toast('Ayrılan süre doldu. İstersen devam et.'); }
  }, 500);

  async function finish(completed) {
    if (done) return;
    done = true;
    clearInterval(tick);
    const sec = (Date.now() - started) / 1000;
    const r = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, kind: 'free', sec, note: note.value.trim() };
    try { await db.add('results', r); } catch { /* ignore */ }
    resolve({ completed, results: [r], exIds: [ex.id] });
  }

  return { abort: () => finish(false) };
}

/* ---------- self-rating and summaries ---------- */

/** Two quick 1–5 self-ratings after an exercise; saves and calls onDone. */
export function ratingPanel({ exIds, sessionId = null, onDone }) {
  let ease = null;
  let tune = null;
  const save = async () => {
    if (ease != null || tune != null) {
      try { await db.add('results', { kind: 'rating', exIds, sessionId, at: Date.now(), ease, tune }); } catch { /* ignore */ }
    }
    onDone?.();
  };
  return h('div', { class: 'rating' },
    h('div', { class: 'field' }, h('span', null, 'Ne kadar rahattı?'),
      segmented([1, 2, 3, 4, 5].map((v) => [v, String(v)]), null, (v) => { ease = v; }, 'Rahatlık'),
      h('span', { class: 'scale-ends' }, h('span', null, 'zorlandım'), h('span', null, 'çok rahat'))),
    h('div', { class: 'field' }, h('span', null, 'Kulağına göre entonasyon?'),
      segmented([1, 2, 3, 4, 5].map((v) => [v, String(v)]), null, (v) => { tune = v; }, 'Entonasyon'),
      h('span', { class: 'scale-ends' }, h('span', null, 'çoğu kaydı'), h('span', null, 'tam yerinde'))),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: save }, 'Kaydet ve devam'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => onDone?.() }, 'Geç')));
}

export function summaryLines(results) {
  const lines = [];
  for (const r of results) {
    const ex = byId[r.exId];
    if (!ex) continue;
    if (r.kind === 'pattern') lines.push([ex.title, `${r.keys} ton`]);
    else if (r.kind === 'interval') {
      const marked = r.trials.filter((x) => x.mark);
      lines.push([ex.title, marked.length ? `${marked.filter((x) => x.mark === 'hit').length}/${marked.length} tuttu (kendi işaretlemen)` : `${r.trials.length} deneme`]);
    } else if (r.kind === 'sustain') lines.push([ex.title, r.mpt.map((m) => `${noteName(m.midi)} ${fmtSec(m.sec)} sn`).join(', ')]);
    else if (r.kind === 'glide') lines.push([ex.title, `${r.reps} tekrar`]);
    else if (r.kind === 'free') lines.push([ex.title, fmtDuration(r.sec)]);
  }
  return lines;
}
