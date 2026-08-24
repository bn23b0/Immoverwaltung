'use client';
import { useEffect, useState, useCallback } from 'react';
import { listEventsX, upsertEvent, deleteEvent, listTodosX } from '@/lib/api';
import { cryptoId } from '@/lib/offline';

const FREQ = [
  { v: '', l: 'Einmalig' },
  { v: 'daily', l: 'Täglich' },
  { v: 'weekly', l: 'Wöchentlich' },
  { v: 'monthly', l: 'Monatlich' },
  { v: 'quarterly', l: 'Vierteljährlich' },
  { v: 'yearly', l: 'Jährlich' },
];
const freqLabel = (v) => FREQ.find((f) => f.v === v)?.l || '';

const fmt = (iso) =>
  new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const fmtDay = (d) =>
  new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

const emptyForm = {
  title: '', event_date: '', property_id: '', description: '',
  recurrence_freq: '', recurrence_interval: '1', recurrence_until: '',
};

export default function Calendar({ token, items }) {
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || '';

  const load = useCallback(async () => {
    try {
      const [ev, td] = await Promise.all([listEventsX(token, 365), listTodosX(token)]);
      setEvents(ev.data || []);
      setTodos((td.data || []).filter((t) => t.due_date && !t.done));
    } catch {
      setErr('Laden fehlgeschlagen.');
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) { setErr('Titel und Datum sind nötig.'); return; }
    setBusy(true); setErr(''); setNote('');
    const payload = {
      title: form.title,
      event_date: new Date(form.event_date).toISOString(),
      property_id: form.property_id,
      description: form.description,
      recurrence_freq: form.recurrence_freq,
      recurrence_interval: form.recurrence_freq ? form.recurrence_interval || '1' : '1',
      recurrence_until: form.recurrence_freq ? form.recurrence_until : '',
    };
    try {
      const r = await upsertEvent(token, payload);
      if (r?.queued) {
        // offline: lokal anzeigen, Übertragung folgt
        setEvents((s) => [...s, {
          id: cryptoId(), master_id: null, title: payload.title,
          description: payload.description, property_id: payload.property_id || null,
          occurs_at: payload.event_date, is_recurring: !!payload.recurrence_freq,
          recurrence_freq: payload.recurrence_freq || null, _pending: true,
        }]);
        setNote('Offline gespeichert – wird bei Verbindung übertragen.');
      } else {
        await load();
      }
      setForm(emptyForm);
      setOpen(false);
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const removeEvent = async (it) => {
    const q = it.is_recurring
      ? 'Die gesamte Serie „' + it.title + '" löschen?'
      : 'Termin löschen?';
    if (!confirm(q)) return;
    const master = it.master_id || it.id;
    setEvents((s) => s.filter((x) => (x.master_id || x.id) !== master));
    try { await deleteEvent(token, master); } catch {}
  };

  const entries = [
    ...events.map((ev) => ({
      kind: 'event', key: 'e' + (ev.master_id || ev.id) + ev.occurs_at,
      id: ev.id, master_id: ev.master_id, date: ev.occurs_at, title: ev.title,
      property_id: ev.property_id, description: ev.description,
      is_recurring: ev.is_recurring, recurrence_freq: ev.recurrence_freq,
      pending: ev._pending,
    })),
    ...todos.map((t) => ({
      kind: 'todo', key: 't' + t.id, id: t.id, date: t.due_date,
      title: t.title, property_id: t.property_id,
      is_recurring: !!t.recurrence_freq, recurrence_freq: t.recurrence_freq,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Kalender</h2>
        <button onClick={() => setOpen((o) => !o)}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
          {open ? 'Schließen' : '+ Termin'}
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">Titel *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Datum & Uhrzeit *</label>
              <input type="datetime-local" value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Immobilie</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                <option value="">— keine —</option>
                {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Notiz</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Wiederholung</label>
              <select value={form.recurrence_freq}
                onChange={(e) => setForm({ ...form, recurrence_freq: e.target.value })}>
                {FREQ.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </div>
            {form.recurrence_freq && (
              <>
                <div>
                  <label className="block mb-1">Alle … (Intervall)</label>
                  <input type="number" min="1" inputMode="numeric" value={form.recurrence_interval}
                    onChange={(e) => setForm({ ...form, recurrence_interval: e.target.value })} />
                </div>
                <div>
                  <label className="block mb-1">Endet am (optional)</label>
                  <input type="date" value={form.recurrence_until}
                    onChange={(e) => setForm({ ...form, recurrence_until: e.target.value })} />
                </div>
              </>
            )}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={busy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">
            {busy ? 'Speichere…' : 'Termin anlegen'}
          </button>
        </form>
      )}

      {note && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{note}</p>}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Anstehend</h3>
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm">Keine Termine oder fälligen To-dos.</p>
        ) : (
          <div className="grid gap-2">
            {entries.map((it) => (
              <div key={it.key}
                className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500">
                    {it.kind === 'event' ? fmt(it.date) : fmtDay(it.date)}
                  </div>
                  <div className="font-medium break-words">
                    {it.kind === 'todo' && (
                      <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 mr-2">To-do</span>
                    )}
                    {it.title}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                    {it.property_id && <span>{propName(it.property_id)}</span>}
                    {it.is_recurring && <span className="text-slate-400">↻ {freqLabel(it.recurrence_freq)}</span>}
                    {it.pending && <span className="text-amber-600">nicht übertragen</span>}
                  </div>
                  {it.description && <div className="text-xs text-slate-400 mt-0.5">{it.description}</div>}
                </div>
                {it.kind === 'event' && !it.pending && (
                  <button onClick={() => removeEvent(it)}
                    className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">
                    Löschen
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
