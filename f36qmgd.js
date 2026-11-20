const DB_NAME = 'etut';
const DB_VERSION = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('results')) {
        const s = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
        s.createIndex('exId', 'exId');
      }
      if (!db.objectStoreNames.contains('recs')) db.createObjectStore('recs', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  get: (store, key) => tx(store, 'readonly', (s) => s.get(key)),
  put: (store, value, key) => tx(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
  add: (store, value) => tx(store, 'readwrite', (s) => s.add(value)),
  del: (store, key) => tx(store, 'readwrite', (s) => s.delete(key)),
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
};

export const DEFAULTS = {
  voice: 'tenor',
  lo: 48,
  hi: 69,
  a4: 440,
  noteNames: 'solfege',
  tolerance: 25,
  feedback: 'azalan',
  accomp: 'akor',
  tempo: 1,
  volume: 0.8,
  gateDb: -52,
  inputId: '',
  outputId: '',
  latencyMs: 0,
  theme: 'auto',
  sessionMin: 30,
};

export const settings = { ...DEFAULTS };

export async function loadSettings() {
  try {
    const saved = await db.get('kv', 'settings');
    if (saved) Object.assign(settings, saved);
  } catch { /* first run or private mode */ }
  return settings;
}

export async function saveSettings(patch = {}) {
  Object.assign(settings, patch);
  try { await db.put('kv', { ...settings }, 'settings'); } catch { /* ignore */ }
}

export async function exportData() {
  const [sessions, results, kv] = await Promise.all([db.all('sessions'), db.all('results'), db.get('kv', 'settings')]);
  return { app: 'etut', version: 1, exportedAt: new Date().toISOString(), settings: kv || settings, sessions, results };
}

export async function importData(data) {
  if (!data || data.app !== 'etut') throw new Error('Bu dosya bu uygulamanın yedeği değil.');
  const existing = await db.all('sessions');
  const seen = new Set(existing.map((s) => s.startedAt));
  for (const s of data.sessions || []) {
    if (seen.has(s.startedAt)) continue;
    const { id, ...rest } = s;
    await db.add('sessions', rest);
  }
  const existingR = await db.all('results');
  const seenR = new Set(existingR.map((r) => `${r.exId}|${r.at}`));
  for (const r of data.results || []) {
    if (seenR.has(`${r.exId}|${r.at}`)) continue;
    const { id, ...rest } = r;
    await db.add('results', rest);
  }
  if (data.settings) {
    const { inputId, outputId, ...portable } = data.settings;
    await saveSettings(portable);
  }
}
