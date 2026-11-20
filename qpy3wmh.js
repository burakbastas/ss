import { Synth } from './rne5xj8.js';
import { PitchTracker } from './u4rp9mt.js';
import { settings } from './f36qmgd.js';

export const audio = {
  ctx: null,
  synth: null,
  stream: null,
  source: null,
  tracker: null,
  listeners: new Set(),
  raf: 0,
  last: null,
  silent: false,
};

/** Stand-in tracker when no microphone is available: time advances, no pitch. */
class SilentTracker {
  constructor(ctx) { this.ctx = ctx; this.gateDb = -52; }
  read() { return { t: this.ctx.currentTime, db: -120, peak: 0, midi: null, clarity: 0 }; }
}

export function useSilentInput() {
  ensureAudio();
  audio.silent = true;
  audio.tracker = new SilentTracker(audio.ctx);
  return audio.tracker;
}

export const inIframe = (() => { try { return window.top !== window.self; } catch { return true; } })();

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

export function ensureAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC({ latencyHint: 'interactive' });
    audio.synth = new Synth(audio.ctx);
    applyAudioSettings();
    if (navigator.audioSession) {
      try { navigator.audioSession.type = 'play-and-record'; } catch { /* unsupported */ }
    }
  }
  if (audio.ctx.state !== 'running') audio.ctx.resume();
  return audio.ctx;
}

export function applyAudioSettings() {
  if (!audio.ctx) return;
  audio.synth.setVolume(settings.volume);
  if (audio.tracker) audio.tracker.gateDb = settings.gateDb;
  if (settings.outputId && audio.ctx.setSinkId) {
    audio.ctx.setSinkId(settings.outputId).catch(() => {});
  }
}

export async function ensureMic() {
  ensureAudio();
  if (audio.silent && audio.tracker) return audio.tracker;
  if (audio.stream && audio.stream.active) return audio.tracker;
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('getUserMedia unavailable');
    err.name = 'NotSupportedError';
    throw err;
  }
  const constraints = {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  };
  if (settings.inputId) constraints.audio.deviceId = { exact: settings.inputId };
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (settings.inputId && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
      delete constraints.audio.deviceId;
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } else {
      throw err;
    }
  }
  audio.stream = stream;
  audio.source = audio.ctx.createMediaStreamSource(stream);
  audio.tracker = new PitchTracker(audio.ctx, audio.source);
  audio.tracker.gateDb = settings.gateDb;
  return audio.tracker;
}

export function releaseMic() {
  stopLoop();
  if (audio.silent) return;
  if (audio.stream) audio.stream.getTracks().forEach((t) => t.stop());
  if (audio.source) audio.source.disconnect();
  audio.stream = null;
  audio.source = null;
  audio.tracker = null;
}

/** Subscribe to pitch frames; the analysis loop runs while anyone listens. */
export function onPitch(fn) {
  audio.listeners.add(fn);
  if (!audio.raf) loop();
  return () => {
    audio.listeners.delete(fn);
    if (!audio.listeners.size) stopLoop();
  };
}

function loop() {
  audio.raf = requestAnimationFrame(loop);
  if (!audio.tracker) return;
  const frame = audio.tracker.read();
  audio.last = frame;
  for (const fn of audio.listeners) fn(frame);
}

function stopLoop() {
  cancelAnimationFrame(audio.raf);
  audio.raf = 0;
}

/** Seconds to subtract from mic timestamps so they line up with scheduled playback. */
export function latencyComp() {
  const ctx = audio.ctx;
  const out = ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0;
  return out + (settings.latencyMs || 0) / 1000;
}

export class Recorder {
  constructor(stream) {
    const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    this.rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.startedAt = 0;
  }

  start() {
    this.startedAt = audio.ctx.currentTime;
    this.rec.start(1000);
  }

  stop() {
    return new Promise((resolve) => {
      if (this.rec.state === 'inactive') { resolve(null); return; }
      this.rec.onstop = () => resolve(new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' }));
      this.rec.stop();
    });
  }
}

export async function listDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return { inputs: [], outputs: [] };
  const all = await navigator.mediaDevices.enumerateDevices();
  return {
    inputs: all.filter((d) => d.kind === 'audioinput'),
    outputs: all.filter((d) => d.kind === 'audiooutput'),
  };
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
