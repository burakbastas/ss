import { h, clear, icon, confirmDialog, fmtDuration, fmtDate, fmtTime, toast } from './nyxk7bs.js';
import { db } from './f36qmgd.js';
import { drawSketch, readPalette } from './zvga6p5.js';
import { analyzeFile, trackStats } from './4iub5gi.js';
import { saveFile } from './qpy3wmh.js';
import { noteName } from './ewdv3t5.js';

export async function renderRecordings(main) {
  readPalette();
  let recs = [];
  try { recs = (await db.all('recs')).sort((a, b) => b.at - a.at); } catch { /* none */ }
  const urls = [];
  let est = null;
  try { est = await navigator.storage?.estimate?.(); } catch { /* unsupported */ }
  const used = recs.reduce((a, r) => a + (r.blob?.size || 0), 0);
  const refresh = () => { urls.forEach((u) => URL.revokeObjectURL(u)); renderRecordings(main); };

  const fileIn = h('input', { type: 'file', accept: 'audio/*,video/mp4,video/webm', hidden: true, id: 'rec-upload' });
  const status = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const upBtn = h('button', { class: 'btn', type: 'button', onclick: () => fileIn.click() }, 'Ses dosyası yükle');
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0];
    if (!file) return;
    upBtn.disabled = true;
    try {
      status.textContent = 'İnceleniyor…';
      const { track, dur } = await analyzeFile(file, (p) => { status.textContent = `İnceleniyor… %${Math.round(p * 100)}`; });
      await db.add('recs', { at: Date.now(), title: file.name.replace(/\.[^.]+$/, '').slice(0, 60), exIds: ['yukleme'], blob: file, mime: file.type, dur, track });
      toast('Dosya eklendi.');
      refresh();
    } catch {
      status.textContent = 'Bu dosya çözülemedi. MP3, M4A, WAV ya da WebM dene.';
      upBtn.disabled = false;
    }
  });

  const list = h('ul', { class: 'rec-list' }, recs.map((r) => recRow(r, urls, refresh)));
  clear(main,
    h('section', { class: 'today-head' },
      h('h1', null, 'Kayıtlar'),
      h('p', { class: 'muted' }, recs.length
        ? `${recs.length} kayıt, ${(used / 1048576).toFixed(1)} MB${est?.quota ? `; tarayıcının bu site için ayırdığı alan yaklaşık ${Math.round(est.quota / 1073741824)} GB` : ''}.`
        : ''),
      h('div', { class: 'row' }, upBtn, fileIn, status),
      h('p', { class: 'help' }, 'Telefonla aldığın bir kaydı da yükleyebilirsin; perde izi ve ulaştığın aralık çıkarılır.')),
    recs.length ? list : h('p', { class: 'empty' }, 'Henüz kayıt yok. Bir egzersiz sırasında ya da Ayna sayfasında “Kaydet”e bas; kayıt burada perde iziyle birlikte görünür.'));

  return () => urls.forEach((u) => URL.revokeObjectURL(u));
}

function recRow(r, urls, refresh) {
  const canvas = h('canvas', { class: 'sketch', 'aria-hidden': 'true' });
  const url = URL.createObjectURL(r.blob);
  urls.push(url);
  const audioEl = h('audio', { controls: true, preload: 'metadata', src: url });
  let raf = 0;
  const loop = () => {
    drawSketch(canvas, r.track || [], audioEl.currentTime);
    if (!audioEl.paused) raf = requestAnimationFrame(loop);
  };
  audioEl.addEventListener('play', () => { cancelAnimationFrame(raf); loop(); });
  audioEl.addEventListener('seeked', () => drawSketch(canvas, r.track || [], audioEl.currentTime));
  requestAnimationFrame(() => drawSketch(canvas, r.track || []));

  const mime = r.mime || r.blob?.type || '';
  const ext = mime.includes('mp4') || mime.includes('m4a') ? 'mp4' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm';
  const d = new Date(r.at);
  const fname = `kayit-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.${ext}`;
  const st = trackStats(r.track || []);

  return h('li', { class: 'rec-item' },
    h('div', { class: 'rec-top' },
      h('div', null,
        h('h3', null, r.title || 'Kayıt'),
        h('p', { class: 'muted' }, `${fmtDate(r.at, { day: 'numeric', month: 'long' })}, ${fmtTime(r.at)}, ${fmtDuration(r.dur || 0)}`),
        st ? h('p', { class: 'muted' }, `Aralık ${noteName(st.lo)} – ${noteName(st.hi)}, sesli ${fmtDuration(st.voicedSec)}`) : null),
      h('div', { class: 'row tight' },
        h('button', {
          class: 'icon-btn', type: 'button', 'aria-label': 'İndir',
          onclick: () => saveFile(fname, r.blob).catch(() => toast('Dosya kaydedilemedi.')),
        }, icon('download')),
        h('button', {
          class: 'icon-btn', type: 'button', 'aria-label': 'Sil',
          onclick: async () => { if (await confirmDialog('Bu kayıt silinsin mi? Geri alınamaz.', 'Sil')) { await db.del('recs', r.id); refresh(); } },
        }, icon('trash')))),
    canvas,
    audioEl);
}
