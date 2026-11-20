import { h, clear, icon } from './nyxk7bs.js';
import { audio, ensureMic, onPitch, Recorder } from './qpy3wmh.js';
import { settings, db } from './f36qmgd.js';
import { noteName, centsOff } from './ewdv3t5.js';
import { drawTrail } from './zvga6p5.js';

/** Big note name with a cents needle. */
export function readout() {
  const note = h('div', { class: 'note-big', 'aria-live': 'off' }, '—');
  const needle = h('span', { class: 'needle' });
  const val = h('span', { class: 'cents-val' }, '');
  const meter = h('div', { class: 'cents' }, h('div', { class: 'cents-track' }, h('span', { class: 'cents-mid' }), needle), val);
  const sub = h('div', { class: 'note-sub' }, '');
  const el = h('div', { class: 'readout' }, note, h('div', { class: 'readout-side' }, meter, sub));
  return {
    el,
    set(midi, ref = null, tol = settings.tolerance) {
      if (midi == null) {
        note.textContent = '—';
        val.textContent = '';
        needle.style.opacity = '0';
        el.dataset.state = 'idle';
        return;
      }
      const target = ref ?? Math.round(midi);
      const c = centsOff(midi, target);
      note.textContent = noteName(ref != null && Math.abs(c) < 60 ? ref : midi);
      const cc = Math.max(-50, Math.min(50, c));
      needle.style.opacity = '1';
      needle.style.left = `${50 + cc}%`;
      val.textContent = `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(Math.round(c))}¢`;
      el.dataset.state = Math.abs(c) <= tol ? 'hit' : Math.abs(c) <= tol * 2 ? 'near' : 'miss';
    },
    hide(text) {
      note.textContent = text || '·';
      val.textContent = '';
      needle.style.opacity = '0';
      el.dataset.state = 'hidden';
    },
    sub(text) { sub.textContent = text || ''; },
  };
}

/** Live pitch mirror: trail, readout, optional drone and recording hooks. */
export function mirrorWidget({ onFrame, showDrone = true } = {}) {
  const ro = readout();
  const canvas = h('canvas', { class: 'trail', 'aria-label': 'Perde izi' });
  const samples = [];
  let center = (settings.lo + settings.hi) / 2;
  let droneOn = false;
  let droneNote = settings.lo + 5;
  let stopSub = null;

  const droneSel = h('select', { class: 'select', 'aria-label': 'Dem notası' },
    Array.from({ length: settings.hi - settings.lo + 13 }, (_, i) => settings.lo - 6 + i)
      .map((m) => h('option', { value: m, selected: m === droneNote }, noteName(m))));
  const droneBtn = h('button', { class: 'btn ghost', type: 'button', 'aria-pressed': 'false' }, 'Dem aç');
  const setDrone = (on) => {
    droneOn = on;
    droneBtn.setAttribute('aria-pressed', String(on));
    droneBtn.textContent = on ? 'Dem kapat' : 'Dem aç';
    if (on) audio.synth.drone(droneNote); else audio.synth?.stopDrone();
  };
  droneBtn.addEventListener('click', () => setDrone(!droneOn));
  droneSel.addEventListener('change', () => {
    droneNote = Number(droneSel.value);
    if (droneOn) audio.synth.drone(droneNote);
  });
  const droneRow = showDrone ? h('div', { class: 'row drone' }, h('label', { class: 'muted' }, 'Dem'), droneSel, droneBtn) : null;

  const el = h('div', { class: 'mirror' }, ro.el, h('div', { class: 'stage' }, canvas), droneRow);

  function frame(f) {
    const midi = f.midi != null && f.midi > settings.lo - 14 && f.midi < settings.hi + 14 ? f.midi : null;
    samples.push({ t: f.t, midi, db: f.db });
    while (samples.length && samples[0].t < f.t - 12) samples.shift();
    if (midi != null) center += (midi - center) * 0.04;
    const target = droneOn ? droneNote : null;
    ro.set(midi, target != null && midi != null && Math.abs(centsOff(midi, target)) < 150 ? target : null);
    drawTrail(canvas, { samples, now: f.t, center, range: 14, target, tol: settings.tolerance });
    onFrame?.(f, midi);
  }

  return {
    el,
    samples,
    async start() {
      await ensureMic();
      stopSub = onPitch(frame);
    },
    stop() {
      stopSub?.();
      stopSub = null;
      if (droneOn) setDrone(false);
    },
  };
}

/** Record button bound to the open mic; collects a pitch track alongside the audio. */
export function recordControl({ title, exIds = [], onSaved }) {
  let rec = null;
  let track = [];
  let t0 = 0;
  const btn = h('button', { class: 'btn rec', type: 'button', 'aria-pressed': 'false' }, icon('rec', 20), h('span', null, 'Kaydet'));
  const label = btn.querySelector('span:last-child');
  if (audio.silent) btn.hidden = true;
  async function stop() {
    if (!rec) return null;
    const r = rec;
    rec = null;
    btn.setAttribute('aria-pressed', 'false');
    label.textContent = 'Kaydet';
    const blob = await r.stop();
    if (!blob || !blob.size) return null;
    const dur = audio.ctx.currentTime - t0;
    const thin = [];
    let next = 0;
    for (const s of track) {
      if (s.t >= next) { thin.push({ t: +s.t.toFixed(2), midi: s.midi == null ? null : +s.midi.toFixed(2) }); next = s.t + 0.05; }
    }
    const item = { at: Date.now(), title: typeof title === 'function' ? title() : title, exIds, blob, mime: blob.type, dur, track: thin };
    const id = await db.add('recs', item);
    onSaved?.({ ...item, id });
    return id;
  }
  btn.addEventListener('click', async () => {
    if (rec) { await stop(); return; }
    if (!audio.stream) await ensureMic();
    try {
      rec = new Recorder(audio.stream);
      track = [];
      t0 = audio.ctx.currentTime;
      rec.start();
      btn.setAttribute('aria-pressed', 'true');
      label.textContent = 'Durdur';
    } catch {
      rec = null;
    }
  });
  return {
    el: btn,
    get active() { return !!rec; },
    push(f, midi) { if (rec) track.push({ t: f.t - t0, midi }); },
    stop,
  };
}
