import { h, clear, toast } from './nyxk7bs.js';
import { mirrorWidget, recordControl } from './94h25de.js';
import { audio, ensureAudio, releaseMic, keepAwake } from './qpy3wmh.js';
import { readPalette } from './zvga6p5.js';
import { micReason } from './uhyk5uj.js';

export function renderMirror(main) {
  let widget = null;
  let rec = null;
  const body = h('div', { class: 'mirror-page' });
  const startBtn = h('button', { class: 'btn primary big', type: 'button' }, 'Mikrofonu aç');

  const intro = h('div', { class: 'mirror-intro' },
    h('p', null, 'Söylediğin sesi canlı olarak görürsün. Dem açarak bir sese karşı perde tutabilir, eserini kaydedip sonra dinleyebilirsin.'),
    startBtn);

  startBtn.addEventListener('click', async () => {
    ensureAudio();
    readPalette();
    rec = recordControl({ title: 'Ayna kaydı', exIds: ['ayna'], onSaved: () => toast('Kayıt Kayıtlar sayfasına eklendi.') });
    widget = mirrorWidget({ onFrame: (f, midi) => rec.push(f, midi) });
    clear(body, widget.el, h('div', { class: 'row' }, rec.el));
    try {
      await widget.start();
      keepAwake(true);
      if (audio.silent) body.prepend(h('p', { class: 'note' }, 'Mikrofonsuz moddasın; bu sayfa ancak mikrofonla çalışır. Sayfayı yenileyip mikrofona izin ver.'));
    } catch (err) {
      widget.stop();
      clear(body,
        h('p', { class: 'note' }, micReason(err)),
        h('p', null, 'Telefonla aldığın bir kaydı ', h('a', { href: '#kayit' }, 'Kayıtlar'), ' sayfasından yükleyip perde izini görebilirsin.'));
    }
  });

  clear(main, h('section', { class: 'today-head' }, h('h1', null, 'Ayna')), body);
  clear(body, intro);

  return async () => {
    if (rec) await rec.stop();
    widget?.stop();
    keepAwake(false);
    releaseMic();
  };
}
