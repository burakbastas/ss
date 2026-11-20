import { h, clear, fmtMinutes } from './nyxk7bs.js';
import { EXERCISES, CATS } from './d8hbkej.js';
import { stepFor } from './rdjz6js.js';
import { runSingle } from './amcnm9m.js';
import { exMeta } from './uhyk5uj.js';
import { settings, db } from './f36qmgd.js';
import { ensureAudio } from './qpy3wmh.js';
import { historyIndex } from './rdjz6js.js';

export async function renderLibrary(main) {
  let hist = {};
  try { hist = historyIndex(await db.all('results')); } catch { /* empty */ }
  const groups = Object.keys(CATS).filter((cat) => EXERCISES.some((e) => e.cat === cat)).map((cat) => {
    const list = EXERCISES.filter((e) => e.cat === cat);
    return h('section', { class: 'lib-group' },
      h('h2', null, CATS[cat].label),
      CATS[cat].note ? h('p', { class: 'lib-note' }, CATS[cat].note) : null,
      h('ul', { class: 'lib-list' }, list.map((ex) => {
        const st = stepFor(ex, settings);
        const n = hist[ex.id]?.count || 0;
        return h('li', null,
          h('div', { class: 'lib-text' },
            h('h3', null, ex.title),
            h('p', { class: 'muted' }, [ex.vowel ? `“${ex.vowel}”` : null, fmtMinutes(st.estSec), n ? `${n} kez çalışıldı` : 'henüz çalışılmadı'].filter(Boolean).join(', ')),
            exMeta(ex).length ? h('p', { class: 'muted' }, exMeta(ex).join('. ')) : null,
            h('p', { class: 'lib-how' }, ex.how)),
          h('button', {
            class: 'btn', type: 'button', 'aria-label': `${ex.title} başlat`,
            onclick: () => { ensureAudio(); runSingle(stepFor(ex, settings), { onFinish: () => renderLibrary(main) }); },
          }, 'Başla'));
      })));
  });
  clear(main,
    h('section', { class: 'today-head' },
      h('h1', null, 'Egzersizler'),
      h('p', { class: 'muted' }, `Piyano her tonda akorla eşlik eder; tonlar ${settings.voice === 'tenor' ? 'tenor' : 'seçtiğin ses'} aralığına göre yarım ses yarım ses kayar. Aralığı Ayarlar'dan değiştirebilirsin.`)),
    groups);
}
