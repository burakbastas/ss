import { noteName, isNatural } from './ewdv3t5.js';

let palette = null;
export function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  palette = {
    bg: v('--surface'), line: v('--line'), grid: v('--grid'), ink: v('--ink'), muted: v('--muted'),
    voice: v('--voice'), target: v('--target'), hit: v('--hit'), near: v('--near'), miss: v('--miss'),
  };
  return palette;
}
export const pal = () => palette || readPalette();

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(10, Math.round(r.width));
  const hgt = Math.max(10, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hgt * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h: hgt };
}

function alpha(color, a) {
  if (color.startsWith('#') && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return color;
}

export function makeY(min, max, top, bottom) {
  const span = max - min;
  return (m) => bottom - ((m - min) / span) * (bottom - top);
}

/** Perde lines for Turkish-music reps: one line per scale degree, named on the left. */
function drawPerde(g, { w, min, max, y, left, right, lines }) {
  const p = pal();
  g.font = '600 11px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  for (let m = Math.ceil(min); m <= Math.floor(max); m++) {
    const yy = Math.round(y(m)) + 0.5;
    g.strokeStyle = p.grid;
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(left, yy);
    g.lineTo(w - right, yy);
    g.stroke();
  }
  const shown = lines.filter((ln) => ln.midi >= min && ln.midi <= max);
  for (const ln of shown) {
    const yy = Math.round(y(ln.midi)) + 0.5;
    g.strokeStyle = ln.karar ? alpha(p.target, 0.5) : alpha(p.muted, 0.35);
    g.lineWidth = ln.karar ? 1.4 : 1;
    g.beginPath();
    g.moveTo(left, yy);
    g.lineTo(w - right, yy);
    g.stroke();
  }
  // Karar names first, then the others where they fit.
  const used = [];
  for (const ln of [...shown.filter((l) => l.karar), ...shown.filter((l) => !l.karar)]) {
    const yy = Math.round(y(ln.midi)) + 0.5;
    if (used.some((u) => Math.abs(u - yy) < 11)) continue;
    used.push(yy);
    g.fillStyle = ln.karar ? p.ink : p.muted;
    g.fillText(ln.name, left - 6, yy);
  }
}

export function drawGrid(g, { w, min, max, y, left, right, rootPc = null, labels = true }) {
  const p = pal();
  const per = Math.abs(y(min) - y(min + 1));
  g.font = '600 11px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  for (let m = Math.ceil(min); m <= Math.floor(max); m++) {
    const yy = Math.round(y(m)) + 0.5;
    const natural = isNatural(m);
    const isRoot = rootPc != null && ((m % 12) + 12) % 12 === rootPc;
    g.strokeStyle = isRoot ? alpha(p.target, 0.45) : p.grid;
    g.lineWidth = isRoot ? 1.4 : natural ? 1 : 0.5;
    if (!natural && per < 7) continue;
    g.beginPath();
    g.moveTo(left, yy);
    g.lineTo(w - right, yy);
    g.stroke();
    const showLabel = labels && (per >= 15 || (per >= 8 && natural) || m % 12 === 0);
    if (showLabel) {
      g.fillStyle = isRoot ? p.ink : p.muted;
      g.fillText(noteName(m), left - 6, yy);
    }
  }
}

function roundRect(g, x, y, w, hgt, r) {
  const rr = Math.min(r, hgt / 2, w / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + hgt, rr);
  g.arcTo(x + w, y + hgt, x, y + hgt, rr);
  g.arcTo(x, y + hgt, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function voicePath(g, pts, x, y, maxGap = 0.12) {
  const p = pal();
  g.strokeStyle = p.voice;
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  let prev = null;
  for (const s of pts) {
    if (s.midi == null) { prev = null; continue; }
    const px = x(s.t);
    const py = y(s.midi);
    if (!prev || s.t - prev.t > maxGap) g.moveTo(px, py);
    else g.lineTo(px, py);
    prev = s;
  }
  g.stroke();
}

/**
 * Piano-roll view of one repetition: chord names on top, notes to sing as bars that
 * fill with gold as the playhead passes, a glide path, and a dynamics lane for messa.
 */
export function drawRep(canvas, { rep, t, hideTargets = false, lane = false, marks = null }) {
  const { g, w, h } = fitCanvas(canvas);
  const p = pal();
  g.clearRect(0, 0, w, h);
  const left = rep.perdeLines ? 86 : 48;
  const right = 14;
  const chordBand = rep.labels?.length ? 26 : 6;
  const laneH = lane ? Math.round(h * 0.18) : 0;
  const top = 10 + chordBand;
  const bottom = h - 14 - laneH;
  let notes = rep.targets.map((tg) => tg.midi);
  if (rep.ref) notes.push(rep.ref.midi);
  if (rep.path) notes = notes.concat(rep.path.map((q) => q.midi));
  let min = Math.min(...notes) - 2.5;
  let max = Math.max(...notes) + 2.5;
  if (max - min < 9) { const c = (max + min) / 2; min = c - 4.5; max = c + 4.5; }
  const y = makeY(min, max, top, bottom);
  const dur = rep.duration;
  const x = (tt) => left + (tt / dur) * (w - left - right);
  if (rep.perdeLines) {
    drawPerde(g, { w, min, max, y, left, right, lines: rep.perdeLines });
  } else {
    drawGrid(g, { w, min, max, y, left, right, rootPc: rep.kind === 'glide' ? null : ((Math.round(rep.root) % 12) + 12) % 12 });
  }

  // Listening and intro time are shaded.
  if (rep.singStart > 0.2) {
    g.fillStyle = alpha(p.line, 0.28);
    g.fillRect(left, top, x(rep.singStart) - left, bottom - top);
  }

  // Chord names
  if (rep.labels?.length) {
    g.font = '600 12px "Atkinson Hyperlegible Next", system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    rep.labels.forEach((lb, i) => {
      const next = rep.labels[i + 1]?.t ?? rep.singEnd;
      const active = t >= lb.t && t < next;
      g.fillStyle = active ? p.ink : p.muted;
      const tw = g.measureText(lb.text).width;
      g.fillText(lb.text, Math.max(left, Math.min(x(lb.t) + 2, w - right - tw)), 14);
      g.strokeStyle = alpha(p.muted, 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(Math.round(x(lb.t)) + 0.5, 6);
      g.lineTo(Math.round(x(lb.t)) + 0.5, 22);
      g.stroke();
    });
  }

  const per = Math.abs(y(0) - y(1));
  const bh = Math.max(8, Math.min(24, per * 0.74));
  if (rep.ref) {
    const x0 = x(rep.ref.t0);
    roundRect(g, x0, y(rep.ref.midi) - bh / 2, x(rep.ref.t1) - x0, bh, 5);
    g.fillStyle = alpha(p.muted, 0.4);
    g.fill();
  }
  if (rep.path) {
    g.strokeStyle = alpha(p.target, 0.4);
    g.lineWidth = Math.max(7, bh * 0.75);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    rep.path.forEach((q, i) => (i ? g.lineTo(x(q.t), y(q.midi)) : g.moveTo(x(q.t), y(q.midi))));
    g.stroke();
    // Gold progress along the path
    if (t > rep.path[0].t) {
      g.save();
      g.beginPath();
      g.rect(0, 0, x(Math.min(t, rep.singEnd)), h);
      g.clip();
      g.strokeStyle = p.voice;
      g.lineWidth = Math.max(4, bh * 0.4);
      g.beginPath();
      rep.path.forEach((q, i) => (i ? g.lineTo(x(q.t), y(q.midi)) : g.moveTo(x(q.t), y(q.midi))));
      g.stroke();
      g.restore();
    }
  }
  rep.targets.forEach((tg, i) => {
    if (hideTargets) return;
    const x0 = x(tg.t0);
    const x1 = Math.max(x0 + 6, x(tg.t1));
    const yy = y(tg.midi);
    const isCur = t >= tg.t0 && t < tg.t1;
    const mark = marks ? marks[i] : null;
    roundRect(g, x0, yy - bh / 2, x1 - x0, bh, 5);
    g.fillStyle = alpha(mark === 'hit' ? p.hit : mark === 'miss' ? p.miss : p.target, isCur ? 0.38 : 0.22);
    g.fill();
    g.strokeStyle = alpha(mark === 'hit' ? p.hit : mark === 'miss' ? p.miss : p.target, isCur ? 0.95 : 0.55);
    g.lineWidth = isCur ? 1.6 : 1.1;
    g.stroke();
    if (t > tg.t0) {
      const fx = Math.min(x1, x(t));
      g.save();
      roundRect(g, x0, yy - bh / 2, x1 - x0, bh, 5);
      g.clip();
      g.fillStyle = alpha(p.voice, isCur ? 0.95 : 0.55);
      g.fillRect(x0, yy - bh / 2, fx - x0, bh);
      g.restore();
    }
    if (tg.syl) {
      g.fillStyle = p.ink;
      g.font = '600 13px "Atkinson Hyperlegible Next", system-ui, sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(tg.syl, x0 + 2, yy - bh / 2 - 10);
    }
  });

  // Playhead
  const px = Math.round(x(Math.min(t, dur))) + 0.5;
  g.strokeStyle = alpha(p.ink, 0.55);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(px, top - 6);
  g.lineTo(px, bottom + 6);
  g.stroke();

  if (lane && rep.targets[0]) {
    const tg = rep.targets[0];
    const lt = h - laneH - 4;
    const lh = laneH - 4;
    g.fillStyle = alpha(p.line, 0.35);
    g.fillRect(left, lt, w - left - right, lh);
    const x0 = x(tg.t0);
    const x1 = x(tg.t1);
    g.fillStyle = alpha(p.target, 0.25);
    g.beginPath();
    g.moveTo(x0, lt + lh - 2);
    g.lineTo((x0 + x1) / 2, lt + 3);
    g.lineTo(x1, lt + lh - 2);
    g.closePath();
    g.fill();
    g.fillStyle = p.muted;
    g.font = '600 11px "Atkinson Hyperlegible Next", system-ui, sans-serif';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText('güç', left - 6, lt + lh / 2);
  }
}

/** Small static pitch sketch for recordings. */
export function drawSketch(canvas, track, progress = null) {
  const { g, w, h } = fitCanvas(canvas);
  const p = pal();
  g.clearRect(0, 0, w, h);
  const pts = track.filter((s) => s.midi != null);
  if (!pts.length) return;
  const min = Math.min(...pts.map((s) => s.midi)) - 1;
  const max = Math.max(...pts.map((s) => s.midi)) + 1;
  const dur = Math.max(track[track.length - 1].t, 1);
  const y = makeY(min, Math.max(max, min + 6), 4, h - 4);
  const x = (t) => (t / dur) * w;
  g.globalAlpha = 0.9;
  voicePath(g, track, x, y, 0.3);
  g.globalAlpha = 1;
  if (progress != null) {
    g.strokeStyle = p.ink;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x(progress) + 0.5, 0);
    g.lineTo(x(progress) + 0.5, h);
    g.stroke();
  }
}

/** Single-series trend: 2px line, 8px markers, recessive grid, hover/tap readout. */
export function lineChart(canvas, points, { fmt = (v) => String(v), yMin = null, yMax = null, onHover } = {}) {
  const state = { hover: -1 };
  function render() {
    const { g, w, h } = fitCanvas(canvas);
    const p = pal();
    g.clearRect(0, 0, w, h);
    if (!points.length) return;
    const vals = points.map((q) => q.v);
    let lo = yMin ?? Math.min(...vals);
    let hi = yMax ?? Math.max(...vals);
    if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
    const left = 44;
    const right = 10;
    const top = 10;
    const bottom = h - 22;
    const t0 = points[0].t;
    const t1 = Math.max(points[points.length - 1].t, t0 + 1);
    const x = (t) => (points.length === 1 ? (left + w - right) / 2 : left + ((t - t0) / (t1 - t0)) * (w - left - right));
    const y = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    g.font = '500 11px "Atkinson Hyperlegible Next", system-ui, sans-serif';
    g.fillStyle = p.muted;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (const v of [lo, (lo + hi) / 2, hi]) {
      const yy = Math.round(y(v)) + 0.5;
      g.strokeStyle = p.grid;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(left, yy);
      g.lineTo(w - right, yy);
      g.stroke();
      g.fillText(fmt(v), left - 6, yy);
    }
    g.textBaseline = 'alphabetic';
    const dl = (t) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    g.textAlign = 'left';
    g.fillText(dl(t0), left, h - 6);
    if (points.length > 1) { g.textAlign = 'right'; g.fillText(dl(t1), w - right, h - 6); }
    g.strokeStyle = p.voice;
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.beginPath();
    points.forEach((q, i) => (i ? g.lineTo(x(q.t), y(q.v)) : g.moveTo(x(q.t), y(q.v))));
    g.stroke();
    points.forEach((q, i) => {
      g.beginPath();
      g.arc(x(q.t), y(q.v), i === state.hover ? 5.5 : 4, 0, Math.PI * 2);
      g.fillStyle = p.voice;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = p.bg;
      g.stroke();
    });
    state.x = x;
  }
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    const px = ev.clientX - r.left;
    let best = -1;
    let bd = Infinity;
    points.forEach((q, i) => {
      const d = Math.abs(state.x(q.t) - px);
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== state.hover) {
      state.hover = best;
      render();
      onHover?.(best >= 0 ? points[best] : null);
    }
  }
  canvas.addEventListener('pointermove', pick);
  canvas.addEventListener('pointerdown', pick);
  canvas.addEventListener('pointerleave', () => { state.hover = -1; render(); onHover?.(null); });
  render();
  return render;
}
