import { h, clear } from './nyxk7bs.js';
import { pianoTools, demAndMetronome } from './ybmk6gs.js';
import { audio, loadPiano } from './qpy3wmh.js';
import { PIANOS } from './7q63hc9.js';
import { settings } from './f36qmgd.js';

export function renderPiano(main) {
  const status = h('p', { class: 'muted small' });
  const tools = pianoTools();
  const extra = demAndMetronome();
  clear(main,
    h('section', { class: 'today-head' },
      h('h1', null, 'Piyano'),
      h('p', { class: 'muted' }, 'Eserin başlangıç sesini ya da akorunu al, dem açıp perde tut, metronomla çalış.'),
      status),
    tools.el,
    h('section', { class: 'set-group' }, extra.el));
  if (!audio.synth?.ready) {
    status.textContent = `${PIANOS[settings.piano]?.label || 'Piyano'} yükleniyor…`;
    loadPiano((p) => { status.textContent = `${PIANOS[settings.piano]?.label || 'Piyano'} yükleniyor… %${Math.round(p * 100)}`; })
      .then((ok) => { status.textContent = ok ? '' : 'Piyano sesleri yüklenemedi; yedek ses kullanılıyor.'; });
  }
  return () => extra.stop();
}
