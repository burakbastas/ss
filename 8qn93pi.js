import { h, clear, icon, toast } from './nyxk7bs.js';
import { loadSettings, settings } from './f36qmgd.js';
import { configureMusic } from './ewdv3t5.js';
import { applyTheme } from './w7vpbjf.js';
import { renderToday } from './nx8kc5c.js';
import { renderLibrary } from './5axywum.js';
import { renderPiano } from './bdicq9j.js';
import { renderRecordings } from './7uhqccq.js';
import { renderSettings } from './4jze4k2.js';
import { inIframe, initAudio, loadPiano, ensureAudio } from './qpy3wmh.js';

const SW_URL = './syj8mjz.js';

const ROUTES = [
  { id: 'bugun', label: 'Bugün', icon: 'today', render: renderToday },
  { id: 'egzersiz', label: 'Egzersizler', icon: 'list', render: renderLibrary },
  { id: 'piyano', label: 'Piyano', icon: 'keys', render: renderPiano },
  { id: 'kayit', label: 'Kayıtlar', icon: 'rec', render: renderRecordings },
  { id: 'ayar', label: 'Ayarlar', icon: 'settings', render: renderSettings },
];

let cleanup = null;
const main = h('main', { id: 'main', tabindex: '-1' });
const nav = h('nav', { class: 'nav', 'aria-label': 'Bölümler' });

function current() {
  const id = location.hash.replace(/^#\/?/, '');
  return ROUTES.find((r) => r.id === id) || ROUTES[0];
}

async function route() {
  const r = current();
  for (const a of nav.querySelectorAll('a')) a.setAttribute('aria-current', a.dataset.id === r.id ? 'page' : 'false');
  try { await cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  try {
    cleanup = (await r.render(main)) || null;
  } catch (err) {
    console.error(err);
    clear(main, h('p', { class: 'note' }, 'Bu sayfa açılamadı. Sayfayı yenilemeyi dene.'));
  }
}

async function boot() {
  await loadSettings();
  configureMusic({ noteNames: settings.noteNames, a4: settings.a4 });
  applyTheme();
  clear(nav, ROUTES.map((r) => h('a', { href: `#${r.id}`, 'data-id': r.id }, icon(r.icon), h('span', null, r.label))));
  clear(document.getElementById('app'),
    h('div', { class: 'shell' },
      h('div', { class: 'brand', 'aria-hidden': 'true' }, h('span', { class: 'brand-mark' }), 'Etüt'),
      nav,
      main));
  window.addEventListener('hashchange', route);
  await route();
  registerSW();
  // Fetch and decode the piano in the background; audio starts on the first tap.
  initAudio();
  loadPiano();
  const unlock = () => { ensureAudio(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);
}

function registerSW() {
  if (!('serviceWorker' in navigator) || inIframe) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register(SW_URL).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Yeni sürüm hazır.', { label: 'Yenile', run: () => w.postMessage('skip') });
        }
      });
    });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    location.reload();
  });
}

boot();
