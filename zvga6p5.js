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

/** Piano-roll view of one repetition with the live voice trace. */
export function drawRep(canvas, { rep, samples, t, showVoice, cur, tol, lane, hideTargets = false, statuses = null }) {
  const { g, w, h } = fitCanvas(canvas);
  const p = pal();
  g.clearRect(0, 0, w, h);
  const left = 48;
  const right = 14;
  const laneH = lane ? Math.round(h * 0.2) : 0;
  const top = 14;
  const bottom = h - 16 - laneH;
  let notes = rep.targets.map((tg) => tg.midi);
  if (rep.ref) notes.push(rep.ref.midi);
  if (rep.path) notes = notes.concat(rep.path.map((q) => q.midi));
  let min = Math.min(...notes) - 2.5;
  let max = Math.max(...notes) + 2.5;
  if (max - min < 9) { const c = (max + min) / 2; min = c - 4.5; max = c + 4.5; }
  const y = makeY(min, max, top, bottom);
  const dur = rep.duration;
  const x = (tt) => left + (tt / dur) * (w - left - right);
  drawGrid(g, { w, min, max, y, left, right, rootPc: rep.kind === 'glide' ? null : ((Math.round(rep.root) % 12) + 12) % 12 });

  const per = Math.abs(y(0) - y(1));
  const bh = Math.max(7, Math.min(22, per * 0.72));
  const current = rep.targets.find((tg) => t >= tg.t0 && t < tg.t1);
  const curOk = showVoice && current && cur != null && Math.abs((cur - current.midi) * 100) <= tol;
  if (rep.ref) {
    const x0 = x(rep.ref.t0);
    roundRect(g, x0, y(rep.ref.midi) - bh / 2, x(rep.ref.t1) - x0, bh, 5);
    g.fillStyle = alpha(p.muted, 0.35);
    g.fill();
  }
  rep.targets.forEach((tg, i) => {
    if (hideTargets) return;
    const st = statuses ? statuses[i] : null;
    const stColor = st === 'hit' ? p.hit : st === 'near' ? p.near : st === 'miss' ? p.miss : null;
    const x0 = x(tg.t0);
    const x1 = Math.max(x0 + 6, x(tg.t1));
    const yy = y(tg.midi);
    const isCur = tg === current;
    roundRect(g, x0, yy - bh / 2, x1 - x0, bh, 5);
    if (stColor) {
      g.fillStyle = alpha(stColor, 0.5);
      g.fill();
      g.strokeStyle = stColor;
    } else {
      g.fillStyle = isCur && curOk ? alpha(p.hit, 0.55) : alpha(p.target, isCur ? 0.42 : 0.24);
      g.fill();
      g.strokeStyle = alpha(isCur && curOk ? p.hit : p.target, isCur ? 0.95 : 0.6);
    }
    g.lineWidth = 1.2;
    g.stroke();
    if (tg.syl) {
      g.fillStyle = p.ink;
      g.font = '600 13px "Atkinson Hyperlegible Next", system-ui, sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(tg.syl, x0 + 6, yy - bh / 2 - 9);
    }
  });
  if (rep.path) {
    g.strokeStyle = alpha(p.target, 0.45);
    g.lineWidth = Math.max(6, bh * 0.7);
    g.lineCap = 'round';
    g.beginPath();
    rep.path.forEach((q, i) => (i ? g.lineTo(x(q.t), y(q.midi)) : g.moveTo(x(q.t), y(q.midi))));
    g.stroke();
  }
  // Sing window shading before it starts.
  if (rep.singStart > 0.2) {
    g.fillStyle = alpha(p.line, 0.25);
    g.fillRect(left, top, x(rep.singStart) - left, bottom - top);
  }
  if (showVoice) {
    g.save();
    g.beginPath();
    g.rect(left, top - 6, w - left - right, bottom - top + 12);
    g.clip();
    voicePath(g, samples, x, y);
    g.restore();
  }
  // Playhead
  const px = Math.round(x(Math.min(t, dur))) + 0.5;
  g.strokeStyle = alpha(p.ink, 0.5);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(px, top - 6);
  g.lineTo(px, bottom + 6);
  g.stroke();

  if (lane) drawLane(g, { samples, x, left, right, w, top: h - laneH - 4, h: laneH - 4, target: rep.targets[0], showVoice });
}

function drawLane(g, { samples, x, left, right, w, top, h, target, showVoice }) {
  const p = pal();
  g.fillStyle = alpha(p.line, 0.35);
  g.fillRect(left, top, w - left - right, h);
  if (!target) return;
  const x0 = x(target.t0);
  const x1 = x(target.t1);
  g.setLineDash([5, 5]);
  g.strokeStyle = alpha(p.target, 0.9);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x0, top + h - 3);
  g.lineTo((x0 + x1) / 2, top + 4);
  g.lineTo(x1, top + h - 3);
  g.stroke();
  g.setLineDash([]);
  if (!showVoice) return;
  const yDb = (db) => top + h - 3 - Math.max(0, Math.min(1, (db + 62) / 50)) * (h - 7);
  g.strokeStyle = p.voice;
  g.lineWidth = 2;
  g.beginPath();
  let started = false;
  for (const s of samples) {
    if (s.t < target.t0 - 0.3 || s.t > target.t1 + 0.3) continue;
    if (!started) { g.moveTo(x(s.t), yDb(s.db)); started = true; } else g.lineTo(x(s.t), yDb(s.db));
  }
  g.stroke();
  g.fillStyle = p.muted;
  g.font = '600 11px "Atkinson Hyperlegible Next", system-ui, sans-serif';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText('güç', left - 6, top + h / 2);
}

/** Scrolling trail for the mirror and sustain views. Samples use absolute seconds. */
export function drawTrail(canvas, { samples, now, span = 8, center, range = 13, target = null, tol = 25 }) {
  const { g, w, h } = fitCanvas(canvas);
  const p = pal();
  g.clearRect(0, 0, w, h);
  const left = 48;
  const right = 14;
  const min = center - range / 2;
  const max = center + range / 2;
  const y = makeY(min, max, 12, h - 12);
  const x = (tt) => left + ((tt - (now - span)) / span) * (w - left - right);
  drawGrid(g, { w, min, max, y, left, right, rootPc: target != null ? ((Math.round(target) % 12) + 12) % 12 : null });
  if (target != null) {
    const per = Math.abs(y(0) - y(1));
    const band = Math.max(3, (tol / 100) * per);
    g.fillStyle = alpha(p.hit, 0.16);
    g.fillRect(left, y(target) - band, w - left - right, band * 2);
  }
  g.save();
  g.beginPath();
  g.rect(left, 0, w - left - right, h);
  g.clip();
  voicePath(g, samples.filter((s) => s.t >= now - span - 0.2), x, y);
  g.restore();
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
