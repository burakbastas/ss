import { h, clear, segmented, toast, confirmDialog } from './nyxk7bs.js';
import { settings, saveSettings, exportData, importData, db, DEFAULTS } from './f36qmgd.js';
import { audio, ensureAudio, ensureMic, releaseMic, listDevices, canPickOutput, applyAudioSettings, onPitch, saveFile } from './qpy3wmh.js';
import { micReason } from './uhyk5uj.js';
import { VOICES, noteName, configureMusic } from './ewdv3t5.js';
import { applyTheme } from './w7vpbjf.js';

function noteSelect(value, from, to, onChange, label) {
  const sel = h('select', { class: 'select', 'aria-label': label },
    Array.from({ length: to - from + 1 }, (_, i) => from + i).map((m) => h('option', { value: m, selected: m === value }, noteName(m))));
  sel.addEventListener('change', () => onChange(Number(sel.value)));
  return sel;
}

function field(label, control, help) {
  return h('div', { class: 'field' }, h('span', null, label), control, help ? h('p', { class: 'help' }, help) : null);
}

let prevCleanup = null;

export function renderSettings(main) {
  prevCleanup?.();
  let stopMeter = null;
  const inputSel = h('select', { class: 'select', 'aria-label': 'Mikrofon' });
  const outputSel = h('select', { class: 'select', 'aria-label': 'Çıkış' });
  const meterFill = h('span', { class: 'meter-fill' });
  const meterGate = h('span', { class: 'meter-gate' });
  const meterNote = h('span', { class: 'meter-note' }, '');
  const meter = h('div', { class: 'meter', 'aria-hidden': 'true' }, meterFill, meterGate);
  const gateVal = h('span', { class: 'muted' });
  const gate = h('input', { type: 'range', min: -75, max: -30, step: 1, value: settings.gateDb, class: 'range', 'aria-label': 'Ses eşiği' });
  const dbToPct = (d) => Math.max(0, Math.min(100, ((d + 80) / 80) * 100));
  const showGate = () => { gateVal.textContent = `${settings.gateDb} dB`; meterGate.style.left = `${dbToPct(settings.gateDb)}%`; };
  showGate();
  gate.addEventListener('input', () => { saveSettings({ gateDb: Number(gate.value) }); applyAudioSettings(); showGate(); });

  async function fillDevices() {
    const { inputs, outputs } = await listDevices();
    clear(inputSel, h('option', { value: '' }, 'Sistem varsayılanı'),
      inputs.map((d, i) => h('option', { value: d.deviceId, selected: d.deviceId === settings.inputId }, d.label || `Mikrofon ${i + 1}`)));
    clear(outputSel, h('option', { value: '' }, 'Sistem varsayılanı'),
      outputs.map((d, i) => h('option', { value: d.deviceId, selected: d.deviceId === settings.outputId }, d.label || `Çıkış ${i + 1}`)));
  }

  async function startMeter() {
    ensureAudio();
    try {
      await ensureMic();
    } catch (err) {
      toast(micReason(err));
      return;
    }
    await fillDevices();
    stopMeter?.();
    stopMeter = onPitch((f) => {
      meterFill.style.width = `${dbToPct(f.db)}%`;
      meterNote.textContent = f.midi != null ? noteName(f.midi) : '';
    });
    testBtn.textContent = 'Mikrofon açık';
    testBtn.disabled = true;
  }

  inputSel.addEventListener('change', async () => {
    await saveSettings({ inputId: inputSel.value });
    stopMeter?.();
    releaseMic();
    testBtn.disabled = false;
    startMeter();
  });
  outputSel.addEventListener('change', async () => {
    await saveSettings({ outputId: outputSel.value });
    ensureAudio();
    applyAudioSettings();
    audio.synth.piano(57, audio.ctx.currentTime + 0.05, 0.6, 0.5);
  });

  const testBtn = h('button', { class: 'btn', type: 'button', onclick: startMeter }, 'Mikrofonu dene');
  const toneBtn = h('button', {
    class: 'btn ghost', type: 'button',
    onclick: () => { ensureAudio(); const t = audio.ctx.currentTime + 0.05; audio.synth.chord([48, 52, 55, 60], t, 1.2, 0.35); },
  }, 'Piyanoyu dinle');

  const lo = noteSelect(settings.lo, 36, 72, (v) => { saveSettings({ lo: Math.min(v, settings.hi - 7) }); }, 'Alt sınır');
  const hi = noteSelect(settings.hi, 50, 88, (v) => { saveSettings({ hi: Math.max(v, settings.lo + 7) }); }, 'Üst sınır');
  const voiceSel = h('select', { class: 'select', 'aria-label': 'Ses türü' },
    Object.entries(VOICES).map(([k, v]) => h('option', { value: k, selected: k === settings.voice }, v.label)));
  voiceSel.addEventListener('change', () => {
    const v = VOICES[voiceSel.value];
    saveSettings({ voice: voiceSel.value, lo: v.lo, hi: v.hi });
    renderSettings(main);
  });

  const volume = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings.volume, class: 'range', 'aria-label': 'Eşlik ses düzeyi' });
  volume.addEventListener('input', () => { saveSettings({ volume: Number(volume.value) }); applyAudioSettings(); });
  const a4 = h('input', { type: 'number', min: 415, max: 466, step: 1, value: settings.a4, class: 'input narrow', 'aria-label': 'La4 frekansı' });
  a4.addEventListener('change', () => { const v = Math.min(466, Math.max(415, Number(a4.value) || 440)); saveSettings({ a4: v }); configureMusic({ a4: v }); });
  const lat = h('input', { type: 'number', min: -200, max: 400, step: 5, value: settings.latencyMs, class: 'input narrow', 'aria-label': 'Gecikme düzeltmesi' });
  lat.addEventListener('change', () => saveSettings({ latencyMs: Number(lat.value) || 0 }));
  const tempo = h('input', { type: 'range', min: 0.6, max: 1.4, step: 0.05, value: settings.tempo, class: 'range', 'aria-label': 'Varsayılan tempo' });
  const tempoVal = h('span', { class: 'muted' }, `%${Math.round(settings.tempo * 100)}`);
  tempo.addEventListener('input', () => { saveSettings({ tempo: Number(tempo.value) }); tempoVal.textContent = `%${Math.round(settings.tempo * 100)}`; });

  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0];
    if (!f) return;
    try {
      await importData(JSON.parse(await f.text()));
      toast('Yedek içe aktarıldı.');
      renderSettings(main);
    } catch (e) {
      toast(e.message || 'Dosya okunamadı.');
    }
  });

  clear(main,
    h('section', { class: 'today-head' }, h('h1', null, 'Ayarlar')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Ses'),
      field('Ses türü', voiceSel),
      h('div', { class: 'row two' }, field('Alt sınır', lo), field('Üst sınır', hi)),
      h('p', { class: 'help' }, 'Egzersizler bu aralıkta kalır. Rahat çıkabildiğin en tiz notayı yaz; zorlandığın notaları değil. Hafif günlerde uygulama üst sınırı kendiliğinden iki yarım ses düşürür.')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Mikrofon ve çıkış'),
      field('Mikrofon', inputSel),
      h('div', { class: 'row' }, testBtn, meterNote),
      meter,
      field('Ses eşiği', h('div', { class: 'row' }, gate, gateVal), 'Sessizken çubuk eşik çizgisinin solunda kalmalı. Oda gürültüsü perde olarak algılanıyorsa eşiği sağa çek.'),
      canPickOutput() ? field('Çıkış', outputSel) : null,
      h('div', { class: 'row' }, toneBtn),
      h('p', { class: 'help' }, 'Bilgisayarda Seiren X\'i mikrofon, MiniFuse\'u çıkış olarak seçebilirsin. Eşliği monitörlerden dinlerken akor modu sorunsuzdur; melodiyle birlikte söylemek istersen kulaklık tak, yoksa mikrofon piyanoyu da duyar.')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Çalışma'),
      field('Eşlik', segmented([['akor', 'Akor'], ['once', 'Önce dinle'], ['birlikte', 'Melodiyle']], settings.accomp, (v) => saveSettings({ accomp: v }), 'Eşlik'),
        'Akor: her tonda başlangıç akoru çalar, sen boşlukta söylersin. Önce dinle: piyano kalıbı çalar, sonra sen tekrarlarsın. Melodiyle: piyano seninle birlikte çalar (kulaklık önerilir).'),
      field('Perde çizgisi', segmented([['surekli', 'Hep açık'], ['azalan', 'Azalan'], ['ozet', 'Yalnızca sonuç']], settings.feedback, (v) => saveSettings({ feedback: v }), 'Geri bildirim'),
        'Azalan: her egzersizin ilk iki tekrarında çizgi görünür, sonra gizlenir ve sonucu tekrar bitince görürsün. Sürekli geri bildirim anlık performansı artırır ama kalıcı öğrenmeyi zayıflatabilir.'),
      field('Tolerans', segmented([[15, '±15¢'], [25, '±25¢'], [35, '±35¢']], settings.tolerance, (v) => saveSettings({ tolerance: v }), 'Tolerans')),
      field('Varsayılan tempo', h('div', { class: 'row' }, tempo, tempoVal)),
      field('Eşlik ses düzeyi', volume)),

    h('section', { class: 'set-group' },
      h('h2', null, 'Görünüm ve akort'),
      field('Nota adları', segmented([['solfege', 'Do Re Mi'], ['letter', 'C D E']], settings.noteNames, (v) => { saveSettings({ noteNames: v }); configureMusic({ noteNames: v }); renderSettings(main); }, 'Nota adları')),
      field('Tema', segmented([['auto', 'Sistem'], ['dark', 'Koyu'], ['light', 'Açık']], settings.theme, (v) => { saveSettings({ theme: v }); applyTheme(); }, 'Tema')),
      h('div', { class: 'row two' },
        field('La4 (Hz)', a4),
        field('Gecikme düzeltmesi (ms)', lat)),
      h('p', { class: 'help' }, 'Perde çizgin hedeflerin hep biraz sağında kalıyorsa gecikme düzeltmesini artır.')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Veriler'),
      h('p', { class: 'help' }, 'Veriler yalnızca bu cihazda tutulur. Telefon, tablet ve bilgisayar arasında taşımak için yedeği dışa aktarıp diğer cihazda içe aktar. Ses kayıtları yedeğe girmez.'),
      h('div', { class: 'row wrap' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            const data = await exportData();
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            await saveFile(`etut-yedek-${new Date().toISOString().slice(0, 10)}.json`, blob).catch(() => toast('Yedek kaydedilemedi.'));
          },
        }, 'Yedeği dışa aktar'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileIn.click() }, 'Yedeği içe aktar'),
        fileIn,
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (!(await confirmDialog('Tüm seanslar, sonuçlar ve kayıtlar silinsin mi? Geri alınamaz.', 'Hepsini sil'))) return;
            await Promise.all(['sessions', 'results', 'recs'].map((s) => db.clear(s)));
            await saveSettings({ ...DEFAULTS, inputId: settings.inputId, outputId: settings.outputId });
            toast('Veriler silindi.');
            renderSettings(main);
          },
        }, 'Tüm verileri sil'))));

  if (audio.stream) startMeter(); else fillDevices().catch(() => {});

  prevCleanup = () => { stopMeter?.(); stopMeter = null; releaseMic(); prevCleanup = null; };
  return prevCleanup;
}
