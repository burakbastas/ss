export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [prop, val] of Object.entries(v)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
          else el.style[prop] = val;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function clear(el, ...kids) {
  el.replaceChildren();
  append(el, kids);
  return el;
}

const ICONS = {
  today: '<path d="M4 9h16M8 3v4M16 3v4"/><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M9 14l2 2 4-4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  mirror: '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M13 5v14M18 5v14"/><path d="M6.5 5v7h3V5M15.5 5v7h3V5" fill="currentColor"/>',
  rec: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  prev: '<path d="M6 5v14M19 5.5v13L9 12z" fill="currentColor"/>',
  next: '<path d="M18 5v14M5 5.5v13L15 12z" fill="currentColor"/>',
  again: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6c.5-.1.9-.1 1.4-.1 6.4 0 10 6.1 10 6.1a17 17 0 0 1-3 3.7M6.4 6.9A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M6 12h12M12 6v12"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  dot: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2.5h4"/>',
};

export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'ico';
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return span;
}

let toastTimer = 0;
export function toast(msg, action) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div', { class: 'toast', role: 'status' });
    document.body.append(el);
  }
  clear(el, h('span', null, msg), action ? h('button', { class: 'btn small', onclick: () => { action.run(); el.classList.remove('show'); } }, action.label) : null);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 12000 : 3200);
}

export function confirmDialog(text, okLabel = 'Evet') {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog' },
      h('p', null, text),
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', onclick: () => { dlg.close(); resolve(false); } }, 'Vazgeç'),
        h('button', { class: 'btn danger', onclick: () => { dlg.close(); resolve(true); } }, okLabel)));
    document.body.append(dlg);
    dlg.addEventListener('close', () => setTimeout(() => dlg.remove(), 50));
    dlg.showModal();
  });
}

export function segmented(options, value, onChange, label) {
  const wrap = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label || null });
  const render = (val) => {
    clear(wrap, options.map(([v, text]) => h('button', {
      class: 'seg-btn', role: 'radio', 'aria-checked': String(v === val), type: 'button',
      onclick: () => { render(v); onChange(v); },
    }, text)));
  };
  render(value);
  return wrap;
}

export function fmtDuration(sec) {
  sec = Math.round(sec);
  if (sec < 60) return `${sec} sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} dk ${s} sn` : `${m} dk`;
}

export function fmtMinutes(sec) {
  return `${Math.max(1, Math.round(sec / 60))} dk`;
}

/** Estimated length: seconds under a minute (to 5 s), else minutes to the half minute. */
export function fmtEst(sec) {
  if (sec < 55) return `${Math.max(5, Math.round(sec / 5) * 5)} sn`;
  const half = Math.round(sec / 30);
  const m = Math.floor(half / 2);
  return half % 2 ? `${m} dk 30 sn` : `${m} dk`;
}

/** Stopwatch text, m:ss. */
export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function fmtDate(ts, opts = { day: 'numeric', month: 'long', weekday: 'long' }) {
  return new Date(ts).toLocaleDateString('tr-TR', opts);
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
