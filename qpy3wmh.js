import { Synth } from './rne5xj8.js';
import { settings } from './f36qmgd.js';

export const audio = { ctx: null, synth: null };

export const inIframe = (() => { try { return window.top !== window.self; } catch { return true; } })();

/** Creates the audio graph (suspended until a tap) and starts loading the chosen piano. */
export function initAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC({ latencyHint: 'interactive' });
    audio.synth = new Synth(audio.ctx);
    applyAudioSettings();
  }
  return audio.ctx;
}

/** Call from a tap: resumes audio output. */
export function ensureAudio() {
  initAudio();
  if (audio.ctx.state !== 'running') audio.ctx.resume();
  return audio.ctx;
}

export function loadPiano(onProgress) {
  initAudio();
  return audio.synth.load(settings.piano, onProgress).catch(() => false);
}

export function applyAudioSettings() {
  if (!audio.ctx) return;
  audio.synth.setVolume(settings.volume);
  if (settings.outputId && audio.ctx.setSinkId) {
    audio.ctx.setSinkId(settings.outputId).catch(() => {});
  }
}

/** Save a generated file: artifact downloads capability inside Claude, a plain link elsewhere. */
export async function saveFile(filename, blob) {
  if (window.claude?.use) {
    try {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename, data: blob }); return true; }
    } catch (e) {
      if (e?.code === 'declined') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

export async function listOutputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'audiooutput' && d.label);
}

export const canPickOutput = () => typeof (window.AudioContext || {}).prototype?.setSinkId === 'function';

let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* not allowed */ }
}
