import { supabase } from './supabase';
import {
  readCache,
  writeCache,
  enqueue,
  flushQueue,
  isOnline,
  isNetworkError,
  markSynced,
} from './offline';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

/* ---------- Anmeldung (immer online) ---------- */

export const authStatus = () => rpc('auth_status', {});
export const login = (pin) => rpc('login', { p_pin: pin });
export const setupPin = (pin) => rpc('setup_pin', { p_pin: pin });
export const logout = (token) => rpc('logout', { p_token: token });

/* ---------- Lesen mit Cache-Rueckfall ---------- */

async function readWithCache(cacheKey, fn, args, fallback) {
  try {
    const data = await rpc(fn, args);
    writeCache(cacheKey, data ?? fallback);
    markSynced();
    return { data: data ?? fallback, offline: false };
  } catch (e) {
    if (isNetworkError(e)) {
      const cached = readCache(cacheKey, null);
      if (cached !== null) return { data: cached, offline: true };
    }
    throw e;
  }
}

export const listProperties = async (token) =>
  (await readWithCache('properties', 'list_properties', { p_token: token }, [])).data;

export const listPropertiesX = (token) =>
  readWithCache('properties', 'list_properties', { p_token: token }, []);

export const propertyStatsX = (token) =>
  readWithCache('stats', 'property_stats', { p_token: token }, null);

export const listEventsX = (token, days = 365) =>
  readWithCache('events', 'list_events_expanded', { p_token: token, p_days: days }, []);

export const listEventMastersX = (token) =>
  readWithCache('event_masters', 'list_events', { p_token: token }, []);

export const listTodosX = (token) =>
  readWithCache('todos', 'list_todos', { p_token: token }, []);

/* ---------- Schreiben: sofort oder in die Warteschlange ---------- */

export async function mutate(fn, args) {
  if (!isOnline()) {
    enqueue(fn, args);
    return { queued: true };
  }
  try {
    const r = await rpc(fn, args);
    markSynced();
    return r;
  } catch (e) {
    if (isNetworkError(e)) {
      enqueue(fn, args);
      return { queued: true };
    }
    throw e;
  }
}

export const syncPending = () => flushQueue(rpc);

/* ---------- Objekte ---------- */

export const upsertProperty = (token, data) =>
  mutate('upsert_property', { p_token: token, p_data: data });
export const deleteProperty = (token, id) =>
  mutate('delete_property', { p_token: token, p_id: id });

/* ---------- Termine ---------- */

export const upsertEvent = (token, data) =>
  mutate('upsert_event', { p_token: token, p_data: data });
export const deleteEvent = (token, id) =>
  mutate('delete_event', { p_token: token, p_id: id });

/* ---------- To-dos ---------- */

export const upsertTodo = (token, data) =>
  mutate('upsert_todo', { p_token: token, p_data: data });
export const completeTodo = (token, id, done) =>
  mutate('complete_todo', { p_token: token, p_id: id, p_done: done });
export const deleteTodo = (token, id) =>
  mutate('delete_todo', { p_token: token, p_id: id });

/* ---------- Massnahmen ---------- */

export const listMeasuresX = (token, propertyId = null) =>
  readWithCache(
    'measures' + (propertyId ? '_' + propertyId : ''),
    'list_measures',
    { p_token: token, p_property_id: propertyId },
    []
  );

export const upsertMeasure = (token, data) =>
  mutate('upsert_measure', { p_token: token, p_data: data });
export const deleteMeasure = (token, id) =>
  mutate('delete_measure', { p_token: token, p_id: id });

/* ---------- Automatische Hinweise ---------- */

export const propertyInsightsX = (token) =>
  readWithCache('insights', 'property_insights', { p_token: token }, []);

/* ---------- Dokumente (nur online) ---------- */

export const listDocumentsX = (token, propertyId = null) =>
  readWithCache(
    'documents' + (propertyId ? '_' + propertyId : ''),
    'list_documents',
    { p_token: token, p_property_id: propertyId },
    []
  );

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Fehler');
  return json;
}

/** Laedt eine Datei hoch und legt den Datenbankeintrag an. */
export async function uploadDocument(token, file, propertyId, category) {
  if (!isOnline()) throw new Error('Dokumente lassen sich nur mit Verbindung hochladen.');

  const { path, uploadToken } = await post('/api/documents/sign-upload', {
    token,
    property_id: propertyId || null,
    filename: file.name,
    size: file.size,
  });

  const { error } = await supabase.storage
    .from('documents')
    .uploadToSignedUrl(path, uploadToken, file);
  if (error) throw new Error('Upload fehlgeschlagen.');

  return rpc('add_document', {
    p_token: token,
    p_data: {
      property_id: propertyId || '',
      name: file.name,
      storage_path: path,
      mime_type: file.type || '',
      size_bytes: String(file.size),
      category: category || '',
    },
  });
}

export async function documentUrl(token, path) {
  const { url } = await post('/api/documents/sign-download', { token, path });
  return url;
}

export const removeDocument = (token, id) => post('/api/documents/remove', { token, id });
