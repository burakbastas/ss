import { h, clear, segmented, fmtEst, fmtDuration } from './nyxk7bs.js';
import { EXERCISES, CATS, TRADS, inTrad, tmOnly, resolveEx } from './d8hbkej.js';
import { stepFor, historyIndex, variantsOfDay, variantFor, ofDayText } from './rdjz6js.js';
import { runSingle } from './amcnm9m.js';
import { exMeta } from './uhyk5uj.js';
import { settings, saveSettings, db } from './f36qmgd.js';
import { ensureAudio } from './qpy3wmh.js';
import { SET_VARIANTS, variantLabel } from './392vqcv.js';

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
    const title = h('h3');
    const info = h('p', { class: 'muted' });
    const meta = h('p', { class: 'muted' });
    const n = hist[ex.id]?.count || 0;
    const last = hist[ex.id]?.lastSec;
    const update = () => {
      const rex = resolveEx(ex, variant);
      const st = stepFor(ex, settings, null, variant);
      title.textContent = rex.title;
      info.textContent = [
        rex.vowel ? `“${rex.vowel}”` : null,
        `yaklaşık ${fmtEst(st.estSec)}`,
        n ? `${n} kez çalışıldı${last ? `, son ${fmtDuration(last)}` : ''}` : 'henüz çalışılmadı',
      ].filter(Boolean).join(', ');
      const m = exMeta(rex);
      meta.textContent = m.join('. ');
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
    return h('li', null,
      h('div', { class: 'lib-text' }, title, info, meta, h('p', { class: 'lib-how' }, ex.how)),
      h('div', { class: 'lib-act' },
        picker,
        h('button', {
          class: 'btn', type: 'button', 'aria-label': `${ex.title} başlat`,
          onclick: () => { ensureAudio(); runSingle(stepFor(ex, settings, null, variant), { onFinish: () => renderLibrary(main) }); },
        }, 'Başla')));
  };

  const render = () => {
    intro.textContent = trad === 'tm'
      ? `Akor yok: piyano karar perdesinden sürekli bir dem tutar, melodi çaldığında onu iki oktav birden verir. Perdeler koma hassasiyetinde. ${ofDayText(ofDay)}`
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
