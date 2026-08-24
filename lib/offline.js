'use client';

const CACHE_PREFIX = 'imv_cache_';
const QUEUE_KEY = 'imv_queue';

const hasWindow = () => typeof window !== 'undefined';

export const isOnline = () => (hasWindow() ? navigator.onLine : true);

/* ---------- Lesecache ---------- */

export function readCache(key, fallback = null) {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed?.v ?? fallback;
  } catch {
    return fallback;
  }
}

export function cacheAge(key) {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw)?.t ?? null;
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {}
}

export function clearCache() {
  if (!hasWindow()) return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX) || k === QUEUE_KEY)
    .forEach((k) => localStorage.removeItem(k));
}

/* ---------- Warteschlange fuer Schreibvorgaenge ---------- */

export function getQueue() {
  if (!hasWindow()) return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setQueue(q) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

export function enqueue(fn, args) {
  const q = getQueue();
  q.push({ qid: cryptoId(), fn, args, ts: Date.now() });
  setQueue(q);
  return q.length;
}

export function queueLength() {
  return getQueue().length;
}

export function cryptoId() {
  if (hasWindow() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'tmp-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Arbeitet die Warteschlange ab. runner(fn, args) muss die RPC ausfuehren.
 * Gibt zurueck, wie viele Vorgaenge uebertragen wurden.
 */
export async function flushQueue(runner) {
  if (!isOnline()) return 0;
  let q = getQueue();
  if (!q.length) return 0;

  let sent = 0;
  const rest = [];

  for (const job of q) {
    try {
      await runner(job.fn, job.args);
      sent++;
    } catch (e) {
      if (isNetworkError(e)) {
        // Verbindung wieder weg: Rest fuer spaeter behalten
        rest.push(job);
      } else {
        // Fachlicher Fehler (z. B. Datensatz geloescht): verwerfen, sonst blockiert er ewig
        console.warn('Sync verworfen:', job.fn, e?.message || e);
      }
    }
  }

  setQueue(rest);
  return sent;
}

export function isNetworkError(e) {
  if (!e) return false;
  if (!isOnline()) return true;
  const m = String(e.message || e).toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('fetch failed') ||
    m.includes('network request failed')
  );
}

/** Merkt sich, wann zuletzt erfolgreich synchronisiert wurde. */
export function markSynced() {
  writeCache('last_sync', Date.now());
}
export function lastSynced() {
  return readCache('last_sync', null);
}
