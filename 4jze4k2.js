import { h, clear, segmented, toast, confirmDialog } from './nyxk7bs.js';
import { settings, saveSettings, exportData, importData, db, DEFAULTS } from './f36qmgd.js';
import { audio, ensureAudio, loadPiano, listOutputs, canPickOutput, applyAudioSettings, saveFile } from './qpy3wmh.js';
import { VOICES, noteName, configureMusic } from './ewdv3t5.js';
import { applyTheme } from './w7vpbjf.js';
import { PIANOS } from './7q63hc9.js';

function noteSelect(value, from, to, onChange, label) {
  const sel = h('select', { class: 'select', 'aria-label': label },
    Array.from({ length: to - from + 1 }, (_, i) => from + i).map((m) => h('option', { value: m, selected: m === value }, noteName(m))));
  sel.addEventListener('change', () => onChange(Number(sel.value)));
  return sel;
}

function field(label, control, help) {
  return h('div', { class: 'field' }, h('span', null, label), control, help ? h('p', { class: 'help' }, help) : null);
}

function demo() {
  ensureAudio();
  const t = audio.ctx.currentTime + 0.05;
  audio.synth.piano(36, t, 2.4, 0.3);
  audio.synth.chord([48, 52, 55, 60], t, 2.4, 0.24);
  [60, 62, 64, 65, 67].forEach((m, i) => audio.synth.piano(m, t + 0.5 + i * 0.32, 0.3, 0.4));
}

export function renderSettings(main) {
  const pianoStatus = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const pianoSel = h('select', { class: 'select', 'aria-label': 'Piyano sesi', id: 'piano-select' },
    Object.entries(PIANOS).map(([k, v]) => h('option', { value: k, selected: k === settings.piano }, v.label)));
  const pianoNote = h('p', { class: 'help' });
  const credit = () => { pianoNote.textContent = `Ses kaynağı: ${PIANOS[settings.piano].credit}.`; };
  credit();
  const load = async (play) => {
    pianoStatus.textContent = 'Yükleniyor…';
    const ok = await loadPiano((p) => { pianoStatus.textContent = `Yükleniyor… %${Math.round(p * 100)}`; });
    pianoStatus.textContent = ok ? 'Hazır' : 'Yüklenemedi; yedek ses kullanılıyor.';
    if (play) demo();
  };
  pianoSel.addEventListener('change', async () => {
    await saveSettings({ piano: pianoSel.value });
    credit();
    load(true);
  });
  if (audio.synth?.ready) pianoStatus.textContent = 'Hazır';

  const outputSel = h('select', { class: 'select', 'aria-label': 'Çıkış', id: 'output-select' });
  const outputField = field('Çıkış', outputSel, 'Ses kartı ya da kulaklık seçimi. Listede yoksa işletim sisteminin ses ayarından seç.');
  outputField.hidden = true;
  if (canPickOutput()) {
    listOutputs().then((outs) => {
      if (!outs.length) return;
      clear(outputSel, h('option', { value: '' }, 'Sistem varsayılanı'),
        outs.map((d) => h('option', { value: d.deviceId, selected: d.deviceId === settings.outputId }, d.label)));
      outputField.hidden = false;
    }).catch(() => {});
  }
  outputSel.addEventListener('change', async () => {
    await saveSettings({ outputId: outputSel.value });
    ensureAudio();
    applyAudioSettings();
    demo();
  });

  const lo = noteSelect(settings.lo, 36, 72, (v) => { saveSettings({ lo: Math.min(v, settings.hi - 7) }); }, 'Alt sınır');
  const hi = noteSelect(settings.hi, 50, 88, (v) => { saveSettings({ hi: Math.max(v, settings.lo + 7) }); }, 'Üst sınır');
  const voiceSel = h('select', { class: 'select', 'aria-label': 'Ses türü', id: 'voice-select' },
    Object.entries(VOICES).map(([k, v]) => h('option', { value: k, selected: k === settings.voice }, v.label)));
  voiceSel.addEventListener('change', () => {
    const v = VOICES[voiceSel.value];
    saveSettings({ voice: voiceSel.value, lo: v.lo, hi: v.hi });
    renderSettings(main);
  });

  const volume = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: settings.volume, class: 'range', 'aria-label': 'Piyano ses düzeyi', id: 'volume' });
  volume.addEventListener('input', () => { saveSettings({ volume: Number(volume.value) }); applyAudioSettings(); });
  const a4 = h('input', { type: 'number', min: 415, max: 466, step: 1, value: settings.a4, class: 'input narrow', 'aria-label': 'La4 frekansı', id: 'a4' });
  a4.addEventListener('change', () => { const v = Math.min(466, Math.max(415, Number(a4.value) || 440)); saveSettings({ a4: v }); configureMusic({ a4: v }); });
  const tempo = h('input', { type: 'range', min: 0.6, max: 1.4, step: 0.05, value: settings.tempo, class: 'range', 'aria-label': 'Varsayılan tempo', id: 'tempo' });
  const tempoVal = h('span', { class: 'muted' }, `%${Math.round(settings.tempo * 100)}`);
  tempo.addEventListener('input', () => { saveSettings({ tempo: Number(tempo.value) }); tempoVal.textContent = `%${Math.round(settings.tempo * 100)}`; });

  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, id: 'backup-in' });
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
      h('h2', null, 'Piyano'),
      field('Piyano sesi', h('div', { class: 'row' }, pianoSel, h('button', { class: 'btn', type: 'button', onclick: () => load(true) }, 'Dinle'), pianoStatus)),
      pianoNote,
      field('Ses düzeyi', volume),
      outputField,
      h('p', { class: 'help' }, 'Bilgisayarda MiniFuse çıkışını sistem ses ayarından varsayılan yaparsan piyano T7V\'lerden çalar. Mikrofon kullanılmıyor; piyanoyu istediğin kadar açabilirsin.')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Ses'),
      field('Ses türü', voiceSel),
      h('div', { class: 'row two' }, field('Alt sınır', lo), field('Üst sınır', hi)),
      h('p', { class: 'help' }, 'Egzersizler bu aralıkta kalır. Rahat çıkabildiğin en tiz notayı yaz; zorlandığın notaları değil. Hafif günlerde uygulama üst sınırı kendiliğinden iki yarım ses düşürür.')),

    h('section', { class: 'set-group' },
      h('h2', null, 'Eşlik'),
      field('Melodi', segmented([['fade', 'İlk iki tonda'], ['always', 'Hep'], ['never', 'Hiç']], settings.guide, (v) => saveSettings({ guide: v }), 'Melodi kılavuzu'),
        'Piyano akorların üstünde söyleyeceğin melodiyi de çalar. “İlk iki tonda”: her egzersizin başında duyarsın, sonra yalnızca akorlar kalır ve kulağın kendi başına çalışır.'),
      field('Akış', segmented([['akor', 'Akorla söyle'], ['once', 'Önce dinle, sonra söyle']], settings.accomp, (v) => saveSettings({ accomp: v }), 'Akış'),
        'Önce dinle: piyano her tonda kalıbı bir kez çalar, sonra sen akorlarla birlikte söylersin. Türk müziğinde meşk usulüne benzer. Yeni egzersizlerde işe yarar; süreyi uzatır.'),
      field('Dem ve kılavuz ses', segmented([[0.6, 'Hafif'], [1, 'Orta'], [1.5, 'Güçlü']], settings.dem, (v) => saveSettings({ dem: v }), 'Dem düzeyi'),
        'Türk müziği egzersizlerindeki karar demi ile sirenlerdeki kayan kılavuz sesin piyanoya göre yüksekliği.'),
      field('Varsayılan tempo', h('div', { class: 'row' }, tempo, tempoVal))),

    h('section', { class: 'set-group' },
      h('h2', null, 'Görünüm ve akort'),
      field('Nota adları', segmented([['solfege', 'Do Re Mi'], ['letter', 'C D E']], settings.noteNames, (v) => { saveSettings({ noteNames: v }); configureMusic({ noteNames: v }); renderSettings(main); }, 'Nota adları')),
      field('Tema', segmented([['auto', 'Sistem'], ['dark', 'Koyu'], ['light', 'Açık']], settings.theme, (v) => { saveSettings({ theme: v }); applyTheme(); }, 'Tema')),
      field('La4 (Hz)', a4)),

    h('section', { class: 'set-group' },
      h('h2', null, 'Veriler'),
      h('p', { class: 'help' }, 'Veriler yalnızca bu cihazda tutulur. Telefon, tablet ve bilgisayar arasında taşımak için yedeği dışa aktarıp diğer cihazda içe aktar. Ses kayıtları yedeğe girmez.'),
      h('div', { class: 'row wrap' },
        h('button', {
          class: 'btn', type: 'button',
          onclick: async () => {
            const data = await exportData();
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            await saveFile(`vocup-yedek-${new Date().toISOString().slice(0, 10)}.json`, blob).catch(() => toast('Yedek kaydedilemedi.'));
          },
        }, 'Yedeği dışa aktar'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileIn.click() }, 'Yedeği içe aktar'),
        fileIn,
        h('button', {
          class: 'btn danger', type: 'button',
          onclick: async () => {
            if (!(await confirmDialog('Tüm seanslar, sonuçlar ve kayıtlar silinsin mi? Geri alınamaz.', 'Hepsini sil'))) return;
            await Promise.all(['sessions', 'results', 'recs'].map((s) => db.clear(s)));
            await saveSettings({ ...DEFAULTS, outputId: settings.outputId });
            toast('Veriler silindi.');
            renderSettings(main);
          },
        }, 'Tüm verileri sil'))));
}
