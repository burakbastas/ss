import { h, clear, icon, toast, fmtDuration } from './nyxk7bs.js';
import { audio, ensureMic, onPitch, latencyComp, keepAwake, useSilentInput, inIframe } from './qpy3wmh.js';
import { settings, db } from './f36qmgd.js';
import { byId } from './d8hbkej.js';
import {
  buildRep, buildGlide, buildIntervalTrial, scoreRep, describeScore, longestPhonation, envelopeMatch,
} from './f6c5xz4.js';
import { noteName, centsOff } from './ewdv3t5.js';
import { drawRep, drawTrail, readPalette } from './zvga6p5.js';
import { readout, mirrorWidget, recordControl } from './94h25de.js';

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
  history.pushState({ overlay: true }, '');
  keepAwake(true);
  readPalette();
  return ov.el;
}

export function setOverlayClose(fn) { ov.onClose = fn; }

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

function header({ title, onClose, onInfo }) {
  const t = h('h2', { class: 'run-title' }, title);
  const key = h('span', { class: 'key' });
  const count = h('span', { class: 'count' });
  const vowel = h('span', { class: 'vowel' });
  const el = h('header', { class: 'run-head' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Kapat', onclick: onClose }, icon('close')),
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

function infoSheet(ex, extra) {
  const dlg = h('dialog', { class: 'dialog sheet' },
    h('h3', null, ex.title),
    ex.vowel ? h('p', { class: 'muted' }, `Ses: ${ex.vowel}`) : null,
    h('p', null, ex.how),
    h('p', { class: 'focus-note' }, ex.focus),
    extra ? h('p', { class: 'muted small' }, extra) : null,
    h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: () => dlg.close() }, 'Tamam')));
  document.body.append(dlg);
  dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 50));
  dlg.showModal();
}

export function micReason(err) {
  if (inIframe) {
    return 'Claude içinde açılan bu görünüm mikrofona erişemiyor. Perde takibi ve kayıt için uygulamayı kendi adresinden aç; burada piyano eşliğiyle ölçümsüz çalışabilirsin.';
  }
  if (err?.name === 'NotAllowedError') return 'Mikrofon izni verilmedi. Adres çubuğundaki izin simgesinden mikrofona izin ver.';
  if (err?.name === 'NotFoundError') return 'Mikrofon bulunamadı. Mikrofonun takılı olduğundan emin ol ya da Ayarlar\'dan başka bir giriş seç.';
  return 'Mikrofon açılamadı. Başka bir uygulama kullanıyor olabilir.';
}

function micError(root, err, retry) {
  clear(root, h('div', { class: 'run-msg' },
    h('h2', null, 'Mikrofon açılamadı'),
    h('p', null, micReason(err)),
    h('div', { class: 'row' },
      inIframe ? null : h('button', { class: 'btn primary', onclick: retry }, 'Tekrar dene'),
      h('button', { class: `btn ${inIframe ? 'primary' : ''}`, onclick: () => { useSilentInput(); retry(); } }, 'Mikrofonsuz devam et'),
      h('button', { class: 'btn ghost', onclick: requestClose }, 'Kapat'))));
}

const inRange = (m) => (m != null && m > settings.lo - 14 && m < settings.hi + 14 ? m : null);

function fmtSec(sec) {
  return sec.toFixed(1).replace('.', ',');
}

function keyHandler(map) {
  const fn = (e) => {
    if (e.target.closest('input, textarea, select')) return;
    const f = map[e.code];
    if (f) { e.preventDefault(); f(); }
  };
  document.addEventListener('keydown', fn);
  return () => document.removeEventListener('keydown', fn);
}

/* ---------- step runner entry ---------- */

/**
 * Runs one step inside the overlay. Resolves with { completed, results } when the
 * step ends or is aborted (abort also saves what was done).
 */
export function runStep(root, step, opts = {}) {
  let ctl = null;
  const promise = new Promise((resolve) => {
    const boot = async () => {
      clear(root, h('div', { class: 'run-msg' }, h('p', { class: 'muted' }, 'Mikrofon açılıyor…')));
      try {
        await ensureMic();
      } catch (err) {
        micError(root, err, boot);
        ctl = { abort: () => resolve({ completed: false, results: [] }) };
        return;
      }
      const make = step.kind === 'sustain' ? sustainRunner : step.kind === 'free' ? freeRunner : timelineRunner;
      ctl = make(root, step, opts, resolve);
    };
    boot();
  });
  return { promise, abort: () => ctl?.abort() };
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
  let paused = false;
  let samples = [];
  let reveal = null;
  let show = true;
  let liveOverride = null;
  let done = false;
  const exCount = {};
  const agg = {};
  const ivTrials = [];
  const glideVals = [];
  const built = [];

  const head = header({
    title: firstEx.title,
    onClose: requestClose,
    onInfo: () => infoSheet(rep?.ex || firstEx, step.interleaved
      ? 'Bu blokta egzersizler birkaç tonda bir dönüşümlü gelir. Bu ilk anda daha zor hissettirir ama araştırmalarda kalıcı öğrenmeyi artırdığı görülüyor.'
      : settings.feedback === 'azalan' ? 'Perde çizgisi ilk iki tekrardan sonra gizlenir; sonuç her tekrarın ardından altta görünür. Göz simgesiyle çizgiyi istediğin zaman açabilirsin.' : null),
  });
  const focus = h('p', { class: 'run-focus' }, firstEx.focus);
  const canvas = h('canvas', { class: 'roll', 'aria-label': 'Hedef notalar ve perde çizgisi' });
  const ro = readout();
  const lastText = h('span', { class: 'last-text' }, '');
  const dots = h('span', { class: 'dots' });
  const last = h('div', { class: 'last', 'aria-live': 'polite' }, lastText, dots);
  const rec = recordControl({ title: () => (step.cat === 'mix' ? 'Teknik blok' : firstEx.title), exIds: step.exIds || [firstEx.id] });

  const playBtn = h('button', { class: 'ctl main', type: 'button', 'aria-label': 'Duraklat' }, icon('pause', 26));
  const tempoVal = h('span', { class: 'tempo-val' });
  const eyeBtn = h('button', { class: 'ctl', type: 'button', 'aria-label': 'Perde çizgisini göster ya da gizle' }, icon('eye'));
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
    h('div', { class: 'ctl-group' }, step.kind !== 'interval' && !audio.silent ? eyeBtn : null, rec.el));

  clear(root, h('div', { class: 'run' }, head.el, progress, focus, h('div', { class: 'stage' }, canvas), h('div', { class: 'run-read' }, ro.el, last), controls));
  if (audio.silent) { showLastSilent(); ro.el.hidden = true; }

  playBtn.addEventListener('click', () => toggle());
  eyeBtn.addEventListener('click', () => {
    liveOverride = !show;
    show = liveOverride;
    eyeBtn.replaceChildren(icon(show ? 'eye' : 'eyeOff'));
  });

  const sCur = () => ({ ...settings, tempo });
  function setTempo(d) {
    tempo = Math.round(Math.min(1.5, Math.max(0.5, tempo + d)) * 100) / 100;
    tempoVal.textContent = `Tempo %${Math.round(tempo * 100)}`;
  }
  setTempo(0);

  function getRep(k) {
    if (step.kind === 'queue') {
      const q = step.queue[k];
      return buildRep(byId[q.exId], q.root, sCur());
    }
    if (step.kind === 'glide') return buildGlide(firstEx, settings, k);
    if (!built[k]) built[k] = buildIntervalTrial(firstEx, settings);
    return built[k];
  }

  function liveVisible(ex) {
    if (rep.kind === 'interval') return false;
    if (liveOverride != null) return liveOverride;
    if (rep.kind === 'glide' || settings.feedback === 'surekli') return true;
    if (settings.feedback === 'ozet') return false;
    return (exCount[ex.id] || 0) < 2;
  }

  function schedule(r, t0) {
    for (const ev of r.events) {
      if (ev.kind === 'chord') audio.synth.chord(ev.midis, t0 + ev.t, ev.dur, ev.vel);
      else if (ev.kind === 'note') audio.synth.piano(ev.midi, t0 + ev.t, ev.dur, ev.vel);
      else if (ev.kind === 'click') audio.synth.click(t0 + ev.t, ev.accent);
    }
  }

  function startRep() {
    reveal = null;
    rep = getRep(i);
    samples = [];
    audio.synth.stopAll();
    repStart = audio.ctx.currentTime + 0.12;
    schedule(rep, repStart);
    running = true;
    paused = false;
    show = liveVisible(rep.ex);
    eyeBtn.replaceChildren(icon(show ? 'eye' : 'eyeOff'));
    playBtn.replaceChildren(icon('pause', 26));
    playBtn.setAttribute('aria-label', 'Duraklat');
    const ex = rep.ex;
    head.set({
      title: ex.title,
      key: rep.kind === 'interval' ? rep.label : rep.kind === 'glide' ? '' : rep.label,
      count: `${i + 1}/${total}`,
      vowel: ex.vowel,
    });
    focus.textContent = ex.focus;
    progress.firstChild.style.width = `${(i / total) * 100}%`;
    if (rep.kind === 'interval') ro.hide('?');
  }

  function showLastSilent() {
    lastText.textContent = 'Mikrofon kapalı: piyano eşlik ediyor, ölçüm yapılmıyor.';
  }

  function showLast(text, statuses = [], devs = []) {
    if (audio.silent) return;
    lastText.textContent = text;
    clear(dots, statuses.map((st, k) => h('span', {
      class: `dot ${st}`,
      title: devs[k] == null ? 'veri yok' : `${devs[k] > 0 ? '+' : ''}${Math.round(devs[k])}¢`,
    })));
  }

  function endRep() {
    running = false;
    const ex = rep.ex;
    exCount[ex.id] = (exCount[ex.id] || 0) + 1;
    if (rep.kind === 'pattern') {
      const sc = scoreRep(rep, samples, settings.tolerance);
      const env = ex.dyn === 'mdv' ? envelopeMatch(samples, rep.targets[0].t0, rep.targets[0].t1) : null;
      (agg[ex.id] ||= { reps: [] }).reps.push({
        root: rep.root, hits: sc.hits, total: sc.total, voiced: sc.voiced, meanAbs: sc.meanAbs, meanSigned: sc.meanSigned, env,
      });
      let text = `${rep.label}: ${describeScore(sc)}`;
      if (env != null) text += `, güç eğrisi %${Math.round(env * 100)}`;
      showLast(text, sc.notes.map((n) => n.status), sc.notes.map((n) => n.dev));
    } else if (rep.kind === 'interval') {
      const sc = scoreRep(rep, samples, Math.max(settings.tolerance, 35));
      const n = sc.notes[0];
      ivTrials.push({ st: rep.interval.st, dir: rep.dir, dev: n.dev, status: n.status });
      const target = noteName(rep.targets[0].midi);
      const text = n.dev == null
        ? `Hedef ${target}; ses algılanmadı`
        : `Hedef ${target}; ${Math.abs(n.dev) < 1 ? 'tam' : `${n.dev > 0 ? '+' : '−'}${Math.abs(Math.round(n.dev))}¢`}`;
      showLast(text, [n.status], [n.dev]);
      reveal = { rep, samples, statuses: [n.status], until: audio.ctx.currentTime + 1.6 };
    } else if (rep.kind === 'glide') {
      const v = samples.filter((x) => x.midi != null).map((x) => x.midi).sort((a, b) => a - b);
      if (v.length > 20) {
        const lo = v[Math.floor(v.length * 0.03)];
        const hi = v[Math.floor(v.length * 0.97)];
        glideVals.push([lo, hi]);
        showLast(`Ulaştığın aralık: ${noteName(lo)} – ${noteName(hi)}`);
      } else {
        showLast('Ses algılanmadı');
      }
    }
    i++;
    if (i >= total) {
      if (reveal) { reveal.final = true; return; }
      finish(true);
      return;
    }
    if (!paused && !reveal) startRep();
  }

  function toggle() {
    if (running) {
      audio.synth.stopAll();
      running = false;
      paused = true;
      playBtn.replaceChildren(icon('play', 26));
      playBtn.setAttribute('aria-label', 'Devam et');
    } else if (!done) {
      startRep();
    }
  }

  function go(d) {
    if (done) return;
    if (d > 0 && i + 1 >= total) { finish(true); return; }
    i = Math.max(0, i + d);
    startRep();
  }

  function frame(f) {
    const midi = inRange(f.midi);
    rec.push(f, midi);
    const now = audio.ctx.currentTime;
    if (running) {
      const t = f.t - latencyComp() - repStart;
      if (t > -0.3) samples.push({ t, midi, db: f.db });
      const tt = now - repStart;
      const current = rep.targets.find((tg) => tt >= tg.t0 && tt < tg.t1);
      if (rep.kind !== 'interval') {
        if (show) ro.set(midi, current ? current.midi : null);
        else ro.hide('·');
      }
      drawRep(canvas, {
        rep, samples, t: tt, showVoice: show, cur: midi, tol: settings.tolerance,
        lane: rep.ex.dyn === 'mdv', hideTargets: rep.kind === 'interval',
      });
      if (tt >= rep.duration) endRep();
    } else if (reveal) {
      drawRep(canvas, { rep: reveal.rep, samples: reveal.samples, t: reveal.rep.duration, showVoice: true, cur: null, tol: settings.tolerance, statuses: reveal.statuses });
      if (now >= reveal.until) {
        const fin = reveal.final;
        reveal = null;
        if (fin) finish(true);
        else if (!paused) startRep();
      }
    } else if (rep) {
      ro.set(midi);
      drawRep(canvas, { rep, samples, t: 0, showVoice: false, cur: null, tol: settings.tolerance, lane: rep.ex.dyn === 'mdv', hideTargets: rep.kind === 'interval' });
    }
  }

  async function saveResults() {
    const at = Date.now();
    const out = [];
    for (const [exId, a] of Object.entries(agg)) {
      const sung = a.reps.filter((r) => r.voiced > 0);
      if (!sung.length) continue;
      const tot = sung.reduce((x, r) => x + r.total, 0);
      const hits = sung.reduce((x, r) => x + r.hits, 0);
      const abs = sung.filter((r) => r.meanAbs != null);
      out.push({
        exId, at, sessionId: opts.sessionId || null, kind: 'pattern', reps: a.reps,
        hitRate: tot ? hits / tot : null,
        meanAbs: abs.length ? abs.reduce((x, r) => x + r.meanAbs, 0) / abs.length : null,
      });
    }
    if (ivTrials.some((x) => x.dev != null)) {
      const sung = ivTrials.filter((x) => x.dev != null);
      out.push({ exId: firstEx.id, at, sessionId: opts.sessionId || null, kind: 'interval', trials: ivTrials, hitRate: sung.filter((x) => x.status === 'hit').length / sung.length });
    }
    if (glideVals.length) {
      out.push({ exId: firstEx.id, at, sessionId: opts.sessionId || null, kind: 'glide', lo: Math.min(...glideVals.map((g) => g[0])), hi: Math.max(...glideVals.map((g) => g[1])) });
    }
    for (const r of out) { try { await db.add('results', r); } catch { /* storage full */ } }
    return out;
  }

  const stopSub = onPitch(frame);
  const stopKeys = keyHandler({ Space: toggle, ArrowLeft: () => go(-1), ArrowRight: () => go(1), KeyR: () => go(0) });

  async function finish(completed) {
    if (done) return;
    done = true;
    running = false;
    stopSub();
    stopKeys();
    audio.synth.stopAll();
    await rec.stop();
    const results = await saveResults();
    resolve({ completed, results });
  }

  startRep();
  return { abort: () => finish(false) };
}

/* ---------- sustained notes (VFE 1 and 4) ---------- */

function sustainRunner(root, step, opts, resolve) {
  const ex = byId[step.exId];
  const notes = step.notes;
  let k = 0;
  let phase = 'cue';
  let phaseAt = 0;
  let samples = [];
  let runStart = null;
  let lastGood = null;
  let bestRun = 0;
  let done = false;
  const out = [];

  const head = header({ title: ex.title, onClose: requestClose, onInfo: () => infoSheet(ex) });
  const focus = h('p', { class: 'run-focus' }, ex.focus);
  const canvas = h('canvas', { class: 'roll' });
  const timer = h('div', { class: 'timer' }, '0,0');
  const hint = h('p', { class: 'timer-hint' }, '');
  const ro = readout();
  const nextBtn = h('button', { class: 'btn primary', type: 'button', hidden: true, onclick: () => next() }, 'Hemen başla');
  const list = h('div', { class: 'mpt-list' });
  const rec = recordControl({ title: ex.title, exIds: [ex.id] });

  clear(root, h('div', { class: 'run' },
    head.el, focus,
    h('div', { class: 'stage' }, canvas),
    h('div', { class: 'run-read sustain' }, h('div', { class: 'timer-box' }, timer, hint), ro.el),
    list,
    h('footer', { class: 'run-ctrl' },
      h('div', { class: 'ctl-group' },
        h('button', { class: 'ctl', type: 'button', 'aria-label': 'Bu notayı yeniden', onclick: () => attempt() }, icon('again')),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => endAttempt() }, 'Bitti')),
      nextBtn, rec.el)));

  function renderList() {
    clear(list, out.map((r) => h('span', { class: 'mpt' }, `${noteName(r.midi)} ${fmtSec(r.sec)} sn`)));
  }

  function attempt() {
    const target = notes[k];
    audio.synth.stopAll();
    samples = [];
    runStart = null;
    lastGood = null;
    bestRun = 0;
    phase = 'cue';
    phaseAt = audio.ctx.currentTime + 0.1;
    audio.synth.piano(target, phaseAt, 1.3, 0.5);
    head.set({ key: noteName(target), count: `${k + 1}/${notes.length}`, vowel: ex.vowel });
    timer.textContent = '0,0';
    hint.textContent = 'Dinle';
    nextBtn.hidden = true;
  }

  function endAttempt() {
    if (phase !== 'hold') return;
    const sec = audio.silent ? audio.ctx.currentTime - phaseAt : longestPhonation(samples, notes[k]);
    if (!audio.silent && sec >= 0.5) out.push({ midi: notes[k], sec });
    renderList();
    timer.textContent = fmtSec(sec);
    phase = 'rest';
    phaseAt = audio.ctx.currentTime + 6;
    nextBtn.hidden = k + 1 >= notes.length;
    if (k + 1 >= notes.length) hint.textContent = 'Son nota bitti';
  }

  function next() {
    k++;
    if (k >= notes.length) { finish(true); return; }
    attempt();
  }

  function frame(f) {
    const midi = inRange(f.midi);
    rec.push(f, midi);
    const now = audio.ctx.currentTime;
    const target = notes[k];
    if (phase === 'cue' && now > phaseAt + 1.5) {
      phase = 'hold';
      phaseAt = now;
      hint.textContent = audio.silent ? 'Tut; bitince “Bitti”ye bas' : 'Tut';
    }
    if (phase === 'hold') {
      samples.push({ t: f.t, midi, db: f.db });
      const good = midi != null && Math.abs(centsOff(midi, target)) <= 100;
      if (good) {
        if (runStart == null || f.t - lastGood > 0.25) runStart = f.t;
        lastGood = f.t;
        bestRun = Math.max(bestRun, lastGood - runStart);
        timer.textContent = fmtSec(bestRun);
      }
      if (audio.silent) {
        timer.textContent = fmtSec(now - phaseAt);
        if (now - phaseAt > 60) endAttempt();
      } else {
        const silentFor = lastGood == null ? now - phaseAt : f.t - lastGood;
        if ((lastGood != null && silentFor > 0.8) || (lastGood == null && silentFor > 12) || now - phaseAt > 90) endAttempt();
      }
    } else if (phase === 'rest') {
      const left = Math.ceil(phaseAt - now);
      if (k + 1 < notes.length) hint.textContent = `Nefeslen; sıradaki ${left} sn sonra`;
      if (now >= phaseAt) {
        if (k + 1 < notes.length) next();
        else finish(true);
      }
    }
    ro.set(phase === 'cue' ? null : midi, target);
    drawTrail(canvas, { samples: phase === 'hold' || phase === 'rest' ? samples : [], now: f.t, span: 12, center: target, range: 8, target, tol: 100 });
  }

  const stopSub = onPitch(frame);

  async function finish(completed) {
    if (done) return;
    done = true;
    stopSub();
    audio.synth.stopAll();
    await rec.stop();
    const results = [];
    if (out.length) {
      const r = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, kind: 'sustain', mpt: out, best: Math.max(...out.map((x) => x.sec)) };
      try { await db.add('results', r); } catch { /* ignore */ }
      results.push(r);
    }
    resolve({ completed, results });
  }

  attempt();
  return { abort: () => finish(false) };
}

/* ---------- free practice (repertoire) ---------- */

function freeRunner(root, step, opts, resolve) {
  const ex = byId[step.exId];
  const limit = (step.minutes || ex.minutes || 8) * 60;
  const started = Date.now();
  let done = false;
  let warned = false;
  const head = header({ title: ex.title, onClose: requestClose, onInfo: () => infoSheet(ex) });
  const clock = h('div', { class: 'clock' }, '');
  const note = h('textarea', { class: 'input', rows: 2, placeholder: 'Hangi eser, hangi pasaj? Ne fark ettin?' });
  const rec = recordControl({ title: () => (note.value.trim().split('\n')[0] || 'Repertuvar').slice(0, 60), exIds: [ex.id] });
  const mirror = mirrorWidget({ onFrame: (f, midi) => rec.push(f, midi) });

  clear(root, h('div', { class: 'run' },
    head.el,
    h('p', { class: 'run-focus' }, ex.focus),
    h('div', { class: 'free-body' }, mirror.el, h('label', { class: 'field' }, h('span', null, 'Not'), note)),
    h('footer', { class: 'run-ctrl' }, clock, rec.el, h('button', { class: 'btn primary', type: 'button', onclick: () => finish(true) }, 'Bitir'))));
  head.set({ count: `${Math.round(limit / 60)} dk` });

  const tick = setInterval(() => {
    const el = (Date.now() - started) / 1000;
    const left = limit - el;
    clock.textContent = left >= 0
      ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} kaldı`
      : `+${Math.floor(-left / 60)}:${String(Math.floor(-left % 60)).padStart(2, '0')}`;
    if (left < 0 && !warned) { warned = true; toast('Ayrılan süre doldu. İstersen devam et.'); }
  }, 500);

  mirror.start().catch(() => {});

  async function finish(completed) {
    if (done) return;
    done = true;
    clearInterval(tick);
    mirror.stop();
    await rec.stop();
    const sec = (Date.now() - started) / 1000;
    const r = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, kind: 'free', sec, note: note.value.trim() };
    try { await db.add('results', r); } catch { /* ignore */ }
    resolve({ completed, results: [r] });
  }

  return { abort: () => finish(false) };
}

/* ---------- step summary ---------- */

export function summaryLines(results) {
  const lines = [];
  for (const r of results) {
    const ex = byId[r.exId];
    if (!ex) continue;
    if (r.kind === 'pattern') {
      lines.push([ex.title, r.hitRate == null ? 'ses algılanmadı' : `%${Math.round(r.hitRate * 100)} isabet, ort. ${Math.round(r.meanAbs)}¢ sapma`]);
    } else if (r.kind === 'interval') {
      lines.push([ex.title, `%${Math.round(r.hitRate * 100)} isabet (${r.trials.length} deneme)`]);
    } else if (r.kind === 'sustain') {
      lines.push([ex.title, r.mpt.map((m) => `${noteName(m.midi)} ${fmtSec(m.sec)} sn`).join(', ')]);
    } else if (r.kind === 'glide') {
      lines.push([ex.title, `${noteName(r.lo)} – ${noteName(r.hi)}`]);
    } else if (r.kind === 'free') {
      lines.push([ex.title, fmtDuration(r.sec)]);
    }
  }
  return lines;
}
