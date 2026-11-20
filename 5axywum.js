import { h, clear, segmented, fmtEst, fmtDuration } from './nyxk7bs.js';
import { EXERCISES, CATS, TRADS, inTrad, tmOnly, resolveEx } from './d8hbkej.js';
import { stepFor, stepForMix, historyIndex, variantsOfDay, variantFor, ofDayText } from './rdjz6js.js';
import { runSingle } from './amcnm9m.js';
import { exMeta, metaText } from './uhyk5uj.js';
import { settings, saveSettings, db } from './f36qmgd.js';
import { ensureAudio } from './qpy3wmh.js';
import { SET_VARIANTS, variantLabel } from './392vqcv.js';
import { noteName, VOICES } from './ewdv3t5.js';

export async function renderLibrary(main) {
  let results = [];
  try { results = await db.all('results'); } catch { /* empty */ }
  const hist = historyIndex(results);
  const ofDay = variantsOfDay(results);
  let trad = settings.libTrad === 'tm' ? 'tm' : 'bati';
  const body = h('div');
  const intro = h('p', { class: 'muted' });

  const row = (ex) => {
    const isTm = trad === 'tm' && !!ex.tm;
    let variant = isTm ? variantFor(ex, ofDay) : null;
    let mixed = false;
    const canMix = isTm && ex.type === 'pattern' && SET_VARIANTS[ex.tm.set].length > 1;
    const build = () => (mixed ? stepForMix(ex, settings, null, variant) : stepFor(ex, settings, null, variant));
    const title = h('h3');
    const mixNote = h('p', { class: 'muted', hidden: true });
    const info = h('p', { class: 'muted' });
    const meta = h('p', { class: 'muted' });
    const n = hist[ex.id]?.count || 0;
    const last = hist[ex.id]?.lastSec;
    const update = () => {
      const rex = resolveEx(ex, variant);
      const st = build();
      mixNote.hidden = !st.mixed;
      mixNote.textContent = st.mixed
        ? `Karışık, ${st.mixed.label}: ${st.mixed.names}. ${st.mixed.chunk} tonda bir sıradakine geçer.`
        : '';
      title.textContent = rex.title;
      const roots = st.queue ? [...new Set(st.queue.map((q) => q.root))] : null;
      const span = roots?.length
        ? `${rex.isTm ? 'karar' : 'tonlar'} ${noteName(Math.min(...roots))}–${noteName(Math.max(...roots))} (${roots.length} ton)`
        : null;
      info.textContent = [
        rex.vowel ? `“${rex.vowel}”` : null,
        span,
        `yaklaşık ${fmtEst(st.estSec)}`,
        n ? `${n} kez çalışıldı${last ? `, son ${fmtDuration(last)}` : ''}` : 'henüz çalışılmadı',
      ].filter(Boolean).join(', ');
      const m = exMeta(rex);
      meta.textContent = metaText(m);
      meta.hidden = !m.length;
    };
    update();
    let picker = null;
    if (isTm && SET_VARIANTS[ex.tm.set].length > 1) {
      const set = ex.tm.set;
      picker = h('select', { class: 'select narrow-select', 'aria-label': set === 'dizi' ? 'Makam' : 'Çeşni' },
        SET_VARIANTS[set].map((v) => h('option', { value: v, selected: v === variant }, variantLabel(set, v))));
      picker.addEventListener('change', () => { variant = picker.value; update(); });
    }
    const mixBtn = canMix ? h('button', {
      class: 'btn ghost toggle', type: 'button', 'aria-pressed': 'false',
      title: 'Seçili çeşni ya da makamdan başlayıp benzerleriyle dönüşümlü çalış',
      onclick: (e) => { mixed = !mixed; e.currentTarget.setAttribute('aria-pressed', String(mixed)); update(); },
    }, 'Karışık') : null;
    return h('li', null,
      h('div', { class: 'lib-text' }, title, info, mixNote, meta, h('p', { class: 'lib-how' }, ex.how)),
      h('div', { class: 'lib-act' },
        picker,
        mixBtn,
        h('button', {
          class: 'btn', type: 'button', 'aria-label': `${ex.title} başlat`,
          onclick: () => { ensureAudio(); runSingle(build(), { onFinish: () => renderLibrary(main) }); },
        }, 'Başla')));
  };

  const render = () => {
    intro.textContent = trad === 'tm'
      ? `Akor yok: piyano karar perdesinden sürekli bir dem tutar, melodi çaldığında onu iki oktav birden verir. Perdeler koma hassasiyetinde. Karar perdesi ${VOICES[settings.voice]?.label.toLocaleLowerCase('tr') || 'senin'} sesine ve Ayarlar’daki alt-üst sınıra göre yerleşir, tonlar bu aralığın içinde kayar. ${ofDayText(ofDay)}`
      : `Piyano her tonda akorla eşlik eder; tonlar ${settings.voice === 'tenor' ? 'tenor' : 'seçtiğin ses'} aralığına göre yarım ses yarım ses kayar. Süreler bu aralığa göre hesaplanır; aralığı Ayarlar'dan değiştirebilirsin.`;
    const cats = Object.keys(CATS).filter((cat) => {
      const c = CATS[cat];
      return (c.trad === 'ortak' || c.trad === trad) && EXERCISES.some((e) => e.cat === cat);
    });
    clear(body, cats.map((cat) => {
      const c = CATS[cat];
      const list = EXERCISES.filter((e) => e.cat === cat && inTrad(e, trad) && (trad === 'tm' || !tmOnly(e)));
      return h('section', { class: 'lib-group' },
        h('h2', null, c.label),
        (trad === 'tm' && c.noteTm) || c.note ? h('p', { class: 'lib-note' }, (trad === 'tm' && c.noteTm) || c.note) : null,
        h('ul', { class: 'lib-list' }, list.map(row)));
    }));
  };

  clear(main,
    h('section', { class: 'today-head' },
      h('h1', null, 'Egzersizler'),
      segmented(Object.entries(TRADS), trad, (v) => { trad = v; saveSettings({ libTrad: v }); render(); }, 'Bölüm'),
      intro),
    body);
  render();
}
