import { h, clear, icon, toast, fmtDuration, fmtClock, segmented } from './nyxk7bs.js';
import { audio, ensureAudio, loadPiano, keepAwake } from './qpy3wmh.js';
import { settings, db } from './f36qmgd.js';
import { byId, RES, resolveEx } from './d8hbkej.js';
import { buildRep, buildGlide, buildIntervalTrial } from './f6c5xz4.js';
import { noteName } from './ewdv3t5.js';
import { approxName, offsetText } from './392vqcv.js';
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
  const clockText = h('span', null, '0:00');
  const clock = h('span', { class: 'elapsed', title: 'Bu egzersizde geçen çalışma süresi' }, icon('clock', 16), clockText);
  const el = h('header', { class: 'run-head' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Kapat', onclick: requestClose }, icon('close')),
    h('div', { class: 'run-titles' }, t, h('p', { class: 'run-sub' }, clock, key, count, vowel)),
    onInfo ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Nasıl yapılır', onclick: onInfo }, icon('info')) : h('span'));
  return {
    el,
    set({ title: tt, key: k, count: c, vowel: v }) {
      if (tt != null) t.textContent = tt;
      if (k != null) key.textContent = k;
      if (c != null) count.textContent = c;
      if (v != null) vowel.textContent = v ? `“${v}”` : '';
    },
    time(sec) {
      const txt = fmtClock(sec);
      if (clockText.textContent !== txt) clockText.textContent = txt;
    },
  };
}

const sentence = (m) => (/[.!?)]$/.test(m) ? m : `${m}.`);
export const metaText = (list) => list.map(sentence).join(' ');

export function exMeta(ex) {
  return [
    ex.res ? `Yarı kapalı ses yolu: ${RES[ex.res]}` : null,
    ex.gear ? `Gereken: ${ex.gear}` : null,
    ex.scale || null,
    ex.scaleInfo || null,
    ex.arizalar || null,
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
      if (big.textContent !== text) {
        big.textContent = text;
        big.classList.toggle('long', text.length > 6 && text.length <= 10);
        big.classList.toggle('longer', text.length > 10);
      }
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
    else if (ev.kind === 'drone') audio.synth.droneAt(ev.midis, t0 + ev.t, ev.dur, ev.vel * (settings.dem || 1), ev.levels);
    else if (ev.kind === 'glide') audio.synth.glideTone(ev.points, t0 + ev.t, ev.vel * (settings.dem || 1));
  }
}

/** Pitch along a glide path at time t. */
function pathAt(path, t) {
  if (t <= path[0].t) return path[0].midi;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (t <= b.t) return a.midi + ((b.midi - a.midi) * (t - a.t)) / (b.t - a.t);
  }
  return path[path.length - 1].midi;
}

// Each row also keeps the exercise's category and SOVT resistance as they were when it was
// practised, so the progress breakdown stays the same if the library is reorganised later.
const saveAll = async (rows) => {
  for (const r of rows) {
    const ex = byId[r.exId];
    if (ex && r.cat == null) r.cat = ex.cat;
    if (ex?.res && r.res == null) r.res = ex.res;
    try { await db.add('results', r); } catch { /* storage full */ }
  }
};

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
      if (aborted) { resolve({ completed: false, results: [], sec: 0 }); return; }
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
  const q0 = step.kind === 'queue' ? step.queue[0] : null;
  const firstEx = q0 ? resolveEx(byId[q0.exId], q0.tm) : byId[step.exId];
  let tempo = settings.tempo;
  let i = 0;
  let rep = null;
  let repStart = 0;
  let running = false;
  let done = false;
  let guideOverride = null;
  let doneReps = 0;
  let active = 0;
  let lastT = null;
  // Counters per exercise, and per çeşni or makam in Turkish-music runs.
  const exCount = {};
  const repsByEx = {};
  const secByEx = {};
  const keyInfo = {};
  const vkey = (ex) => (ex.isTm ? `${ex.id}|${ex.variant}` : ex.id);
  const ivTrials = [];
  const built = [];

  const head = header({
    title: firstEx.title,
    onInfo: () => infoSheet(rep?.ex || firstEx, step.interleaved
      ? 'Bu blokta egzersizler birkaç tonda bir dönüşümlü gelir. İlk anda zor hissettirir ama araştırmalarda kalıcı öğrenmeyi artırdığı görülüyor.'
      : step.kind === 'glide' ? 'Kılavuz ses sirenin yolunu çizer; altta en pes sesten bir dem çalar. Melodi düğmesi kılavuz sesi açıp kapatır.'
        : step.mixed ? `Karışık: ${step.mixed.names}. Her ${step.mixed.chunk} tonda bir sıradakine geçilir; benzer perdeleri art arda söylemek koma farklarını ayırt etmeyi güçlendirir. Akor yok, altta karar perdesinden dem çalar.`
        : firstEx.isTm ? 'Akor yerine karar perdesinden sürekli bir dem çalar; melodi çaldığında piyano onu iki oktav birden verir. Perdeler koma hassasiyetinde (1 koma ≈ 22,6 sent).'
          : settings.guide === 'fade' ? 'Melodi her egzersizin ilk iki tonunda piyanoda çalar, sonra yalnızca akorlar kalır. Melodi düğmesiyle istediğin zaman açıp kapatabilirsin.' : null),
  });
  // Mixed runs change the scale text between reps; a fixed height keeps the roll steady.
  const meta = h('p', { class: step.mixed ? 'run-meta fixed' : 'run-meta' });
  const focus = h('p', { class: 'run-focus' }, firstEx.focus);
  const canvas = h('canvas', { class: 'roll', 'aria-label': 'Söylenecek notalar ve eşlik' });
  const now = nowDisplay();
  const markHit = h('button', { class: 'btn', type: 'button' }, 'Tuttu');
  const markMiss = h('button', { class: 'btn ghost', type: 'button' }, 'Kaçtı');
  const marks = h('div', { class: 'row marks', hidden: true }, markHit, markMiss);
  const side = h('div', { class: 'run-side' }, marks);

  const playBtn = h('button', { class: 'ctl main', type: 'button', 'aria-label': 'Duraklat' }, icon('pause', 26));
  const tempoVal = h('span', { class: 'tempo-val' });
  const guideBtn = h('button', { class: 'btn guide', type: 'button', 'aria-pressed': 'false' }, step.kind === 'glide' ? 'Kılavuz ses' : 'Melodi');
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
    step.kind !== 'interval' ? h('div', { class: 'ctl-group' }, guideBtn) : null);

  clear(root, h('div', { class: 'run' }, head.el, progress, meta, focus, h('div', { class: 'stage' }, canvas), h('div', { class: 'run-read' }, now.el, side), controls));

  playBtn.addEventListener('click', () => toggle());
  guideBtn.addEventListener('click', () => {
    guideOverride = !(rep?.guide);
    guideBtn.setAttribute('aria-pressed', String(guideOverride));
    const what = step.kind === 'glide' ? 'Kılavuz ses' : 'Melodi';
    toast(guideOverride ? `${what} sonraki tekrardan itibaren çalacak.` : `${what} sonraki tekrardan itibaren susacak.`);
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
    return (exCount[vkey(ex)] || 0) < 2;
  }

  // The siren guide tone is the accompaniment itself, so it stays on unless turned off.
  const glideGuide = () => (guideOverride != null ? guideOverride : settings.guide !== 'never');

  function getRep(k) {
    if (step.kind === 'queue') {
      const q = step.queue[k];
      const ex = resolveEx(byId[q.exId], q.tm);
      return buildRep(ex, q.root, sCur(), { guide: guideFor(ex) });
    }
    if (step.kind === 'glide') return buildGlide(firstEx, settings, k, { guide: glideGuide() });
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
    keyInfo[vkey(ex)] = ex.isTm ? { exId: ex.id, tm: ex.variant, set: ex.set } : { exId: ex.id };
    // In a mixed run, say which çeşni or makam comes next while the intro plays.
    const prev = step.mixed && i > 0 ? step.queue[i - 1] : null;
    rep.cue = !!(step.mixed && ex.isTm && (!prev || prev.tm !== ex.variant));
    const keyText = rep.kind === 'glide' ? '' : step.mixed && ex.isTm ? `${ex.sc.short}: ${rep.label}` : rep.label;
    head.set({ title: ex.title, key: keyText, count: `${i + 1}/${total}`, vowel: ex.vowel });
    // Short form while singing; the full description is in the info sheet.
    meta.textContent = metaText(exMeta(ex).filter((m) => m !== ex.scaleInfo && m !== ex.arizalar));
    meta.hidden = !meta.textContent;
    focus.textContent = ex.focus;
    progress.firstChild.style.width = `${(i / total) * 100}%`;
    marks.hidden = true;
  }

  function endRep() {
    running = false;
    const ex = rep.ex;
    exCount[vkey(ex)] = (exCount[vkey(ex)] || 0) + 1;
    doneReps++;
    if (rep.kind === 'pattern') (repsByEx[vkey(ex)] ||= []).push(rep.root);
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
    // Working time: counts only while a rep is playing, so pauses are left out.
    if (running && lastT != null) {
      const dt = Math.min(0.25, Math.max(0, nowT - lastT));
      active += dt;
      secByEx[vkey(rep.ex)] = (secByEx[vkey(rep.ex)] || 0) + dt;
    }
    lastT = nowT;
    head.time(active);
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
    const nm = (tg) => (tg.perde || noteName(tg.midi));
    const sub = (tg) => {
      if (!tg.perde) return tg.syl || '';
      const off = offsetText(tg.info);
      const where = [off || approxName(tg.midi), tg.info?.note].filter(Boolean).join(', ');
      return tg.syl ? `${tg.syl}: ${where}` : where;
    };
    if (rep.kind === 'interval') {
      if (t < rep.singStart) now.set(noteName(rep.root), 'Dinle', 'listen');
      else if (t < rep.singEnd) now.set('?', `${rep.interval.name} ${rep.dir > 0 ? 'yukarı' : 'aşağı'}: söyle`, 'sing');
      else now.set(noteName(rep.targets[0].midi), 'Doğru ses buydu', 'answer');
    } else if (rep.kind === 'glide') {
      if (t < rep.singStart) now.set(noteName(rep.root), 'Başlangıç sesi', 'listen');
      else if (t < rep.singEnd) now.set(noteName(pathAt(rep.path, t)), `${ex.vowel}, kaydır`, 'sing');
      else now.set('Nefes', '', 'rest');
    } else {
      const cur = rep.targets.find((tg) => t >= tg.t0 && t < tg.t1);
      const next = rep.targets.find((tg) => tg.t0 >= t);
      const first = rep.targets[0];
      if (rep.listen && t < rep.singStart - rep.beat) now.set(nm(first), 'Önce dinle', 'listen');
      else if (t < rep.singStart) {
        const n = Math.max(1, Math.ceil((rep.singStart - t) / rep.beat));
        now.set(nm(first), rep.cue ? `${ex.sc.label}, hazırlan ${n}` : `Hazırlan, ${n}`, 'listen');
      }
      else if (cur) now.set(nm(cur), sub(cur), 'sing');
      else if (next) now.set(nm(next), sub(next), 'sing');
      else now.set('Nefes', '', 'rest');
    }
    if (t >= rep.duration) endRep();
  }

  async function saveResults() {
    const at = Date.now();
    const sid = opts.sessionId || null;
    const out = [];
    const extra = (k) => ({ sec: Math.round(secByEx[k] || 0), ...(keyInfo[k] || { exId: k }) });
    for (const [k, roots] of Object.entries(repsByEx)) {
      out.push({ at, sessionId: sid, kind: 'pattern', keys: roots.length, roots, ...extra(k) });
    }
    if (step.kind === 'glide' && doneReps) out.push({ exId: firstEx.id, at, sessionId: sid, kind: 'glide', reps: doneReps, ...extra(firstEx.id) });
    if (step.kind === 'interval' && ivTrials.length) {
      const marked = ivTrials.filter((x) => x?.mark);
      out.push({
        exId: firstEx.id, at, sessionId: sid, kind: 'interval', trials: ivTrials.filter(Boolean),
        hitRate: marked.length ? marked.filter((x) => x.mark === 'hit').length / marked.length : null, ...extra(firstEx.id),
      });
    }
    // Stopped before the first full rep: keep the time anyway.
    for (const [k, sec] of Object.entries(secByEx)) {
      const info = keyInfo[k] || { exId: k };
      if (sec >= 5 && !out.some((r) => r.exId === info.exId && (r.tm || null) === (info.tm || null))) out.push({ at, sessionId: sid, kind: 'time', ...extra(k) });
    }
    await saveAll(out);
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
    resolve({ completed, results, exIds: step.exIds || [firstEx.id], sec: active });
  }

  startRep();
  return { abort: () => finish(false) };
}

/* ---------- sustained notes with a stopwatch (VFE 1 and 4) ---------- */

function sustainRunner(root, step, opts, resolve) {
  const ex = byId[step.exId];
  const notes = step.notes;
  const started = performance.now();
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

  const elapsed = () => (performance.now() - started) / 1000;
  const stopLoop = frameLoop(() => {
    head.time(elapsed());
    if (holdStart != null) timer.textContent = fmtSec((performance.now() - holdStart) / 1000);
  });

  async function finish(completed) {
    if (done) return;
    done = true;
    stopLoop();
    audio.synth.stopAll();
    const sec = elapsed();
    const results = [];
    const base = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, sec: Math.round(sec) };
    if (out.length) results.push({ ...base, kind: 'sustain', mpt: out, best: Math.max(...out.map((x) => x.sec)) });
    else if (sec >= 5) results.push({ ...base, kind: 'time' });
    await saveAll(results);
    resolve({ completed, results, exIds: [ex.id], sec });
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
  head.set({ count: `${Math.round(limit / 60)} dk ayrıldı` });

  const tick = setInterval(() => {
    const el = (Date.now() - started) / 1000;
    const left = limit - el;
    head.time(el);
    clock.textContent = left >= 0
      ? `${fmtClock(left)} kaldı`
      : `Süre doldu, +${fmtClock(-left)}`;
    if (left < 0 && !warned) { warned = true; toast('Ayrılan süre doldu. İstersen devam et.'); }
  }, 500);

  async function finish(completed) {
    if (done) return;
    done = true;
    clearInterval(tick);
    const sec = (Date.now() - started) / 1000;
    const r = { exId: ex.id, at: Date.now(), sessionId: opts.sessionId || null, kind: 'free', sec: Math.round(sec), note: note.value.trim() };
    await saveAll([r]);
    resolve({ completed, results: [r], exIds: [ex.id], sec });
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

export function summaryLines(results, { total: withTotal = true } = {}) {
  const lines = [];
  const total = results.reduce((a, r) => a + (r.sec || 0), 0);
  if (withTotal && results.length > 1 && total) lines.push(['Toplam süre', fmtDuration(total)]);
  for (const r of results) {
    const ex = byId[r.exId];
    if (!ex) continue;
    const title = r.tm ? `${resolveEx(ex, r.tm).title}, ${resolveEx(ex, r.tm).sc.label}` : ex.title;
    const time = r.sec ? `, ${fmtDuration(r.sec)}` : '';
    if (r.kind === 'pattern') lines.push([title, `${r.keys} ton${time}`]);
    else if (r.kind === 'interval') {
      const marked = r.trials.filter((x) => x.mark);
      lines.push([title, (marked.length ? `${marked.filter((x) => x.mark === 'hit').length}/${marked.length} tuttu (kendi işaretlemen)` : `${r.trials.length} deneme`) + time]);
    } else if (r.kind === 'sustain') lines.push([title, r.mpt.map((m) => `${noteName(m.midi)} ${fmtSec(m.sec)} sn`).join(', ') + time]);
    else if (r.kind === 'glide') lines.push([title, `${r.reps} tekrar${time}`]);
    else if (r.kind === 'free') lines.push([title, fmtDuration(r.sec)]);
    else if (r.kind === 'time') lines.push([title, `yarıda kaldı, ${fmtDuration(r.sec)}`]);
  }
  return lines;
}
