import { h, clear, segmented, icon } from './nyxk7bs.js';
import { audio, ensureAudio } from './qpy3wmh.js';
import { settings } from './f36qmgd.js';
import { noteName, isNatural } from './ewdv3t5.js';

const SHAPES = {
  nota: [0],
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  bes: [0, 7],
};

/** On-screen keyboard; tap plays a note or a chord built on it. */
export function pianoTools({ compact = false } = {}) {
  let shape = 'nota';
  let start = Math.max(36, Math.floor((settings.lo - 2) / 12) * 12);
  const span = compact ? 24 : 36;
  const keysWrap = h('div', { class: 'kb-scroll' });
  const label = h('span', { class: 'muted kb-range' });
  const last = h('span', { class: 'kb-last', 'aria-live': 'polite' }, '');

  function play(m) {
    ensureAudio();
    const now = audio.ctx.currentTime + 0.02;
    const notes = SHAPES[shape].map((d) => m + d);
    if (notes.length === 1) audio.synth.piano(m, now, 1.6, 0.55);
    else audio.synth.chord(notes, now, 1.8, 0.38, 0.015);
    last.textContent = notes.length === 1 ? noteName(m) : `${noteName(m)} ${({ major: 'majör', minor: 'minör', dom7: '7', bes: '5\'li' })[shape]}`;
  }

  function render() {
    const whites = [];
    for (let m = start; m < start + span; m++) if (isNatural(m)) whites.push(m);
    const kb = h('div', { class: 'kb', style: { '--whites': whites.length } });
    whites.forEach((m, i) => {
      const key = h('button', {
        class: `kb-w${m === settings.lo || m === settings.hi ? ' edge' : ''}`, type: 'button', 'aria-label': noteName(m),
        onpointerdown: (e) => { e.preventDefault(); play(m); },
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(m); } },
      }, m % 12 === 0 ? h('span', null, noteName(m)) : null);
      kb.append(key);
      const sharp = m + 1;
      if (!isNatural(sharp) && sharp < start + span) {
        kb.append(h('button', {
          class: 'kb-b', type: 'button', 'aria-label': noteName(sharp), style: { '--i': i + 1 },
          onpointerdown: (e) => { e.preventDefault(); play(sharp); },
          onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(sharp); } },
        }));
      }
    });
    clear(keysWrap, kb);
    label.textContent = `${noteName(start)} – ${noteName(start + span - 1)}`;
  }

  const shift = (d) => { start = Math.min(84 - span + 12, Math.max(24, start + d)); render(); };
  const controls = h('div', { class: 'row kb-bar' },
    segmented([['nota', 'Nota'], ['major', 'Majör'], ['minor', 'Minör'], ['dom7', '7'], ['bes', 'Beşli']], shape, (v) => { shape = v; }, 'Çalış biçimi'),
    h('div', { class: 'row tight' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Bir oktav aşağı', onclick: () => shift(-12) }, icon('prev', 18)),
      label,
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Bir oktav yukarı', onclick: () => shift(12) }, icon('next', 18))),
    last);
  render();
  return { el: h('div', { class: 'piano-tools' }, controls, keysWrap) };
}

/** Sustained reference (dem) and a simple metronome. */
export function demAndMetronome() {
  let demOn = false;
  let demNote = settings.lo + 2;
  let fifth = true;
  const demSel = h('select', { class: 'select', 'aria-label': 'Dem notası' },
    Array.from({ length: settings.hi - settings.lo + 13 }, (_, i) => settings.lo - 12 + i)
      .map((m) => h('option', { value: m, selected: m === demNote }, noteName(m))));
  const demBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, 'Dem aç');
  const applyDem = () => {
    if (!demOn) { audio.synth?.stopDrone(); return; }
    ensureAudio();
    audio.synth.drone(fifth ? [demNote - 12, demNote - 5] : [demNote - 12]);
  };
  demBtn.addEventListener('click', () => {
    demOn = !demOn;
    demBtn.setAttribute('aria-pressed', String(demOn));
    demBtn.textContent = demOn ? 'Dem kapat' : 'Dem aç';
    applyDem();
  });
  demSel.addEventListener('change', () => { demNote = Number(demSel.value); applyDem(); });
  const fifthSel = segmented([[true, 'Karar + beşli'], [false, 'Yalnız karar']], fifth, (v) => { fifth = v; applyDem(); }, 'Dem biçimi');

  let metOn = false;
  let bpm = 72;
  let timer = 0;
  let nextAt = 0;
  let beatN = 0;
  let meter = 4;
  const bpmIn = h('input', { type: 'number', class: 'input narrow', min: 30, max: 220, value: bpm, 'aria-label': 'Metronom hızı' });
  const meterSel = h('select', { class: 'select narrow-select', 'aria-label': 'Ölçü' },
    [2, 3, 4, 5, 7, 9].map((n) => h('option', { value: n, selected: n === meter }, `${n} vuruş`)));
  const metBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, 'Metronomu başlat');
  bpmIn.addEventListener('change', () => { bpm = Math.min(220, Math.max(30, Number(bpmIn.value) || 72)); bpmIn.value = bpm; });
  meterSel.addEventListener('change', () => { meter = Number(meterSel.value); beatN = 0; });
  const schedule = () => {
    const ctx = audio.ctx;
    while (nextAt < ctx.currentTime + 0.15) {
      audio.synth.click(nextAt, beatN % meter === 0);
      nextAt += 60 / bpm;
      beatN++;
    }
  };
  metBtn.addEventListener('click', () => {
    metOn = !metOn;
    metBtn.setAttribute('aria-pressed', String(metOn));
    metBtn.textContent = metOn ? 'Metronomu durdur' : 'Metronomu başlat';
    clearInterval(timer);
    if (metOn) {
      ensureAudio();
      nextAt = audio.ctx.currentTime + 0.1;
      beatN = 0;
      timer = setInterval(schedule, 40);
      schedule();
    }
  });

  return {
    el: h('div', { class: 'tools-grid' },
      h('div', { class: 'field' }, h('span', null, 'Dem'), h('div', { class: 'row' }, demSel, demBtn), fifthSel),
      h('div', { class: 'field' }, h('span', null, 'Metronom'), h('div', { class: 'row' }, bpmIn, meterSel, metBtn))),
    stop() {
      clearInterval(timer);
      metOn = false;
      if (demOn) { demOn = false; audio.synth?.stopDrone(); }
    },
  };
}
