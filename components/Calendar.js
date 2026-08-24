'use client';
import { useEffect, useState, useCallback } from 'react';
import { listEvents, upsertEvent, deleteEvent, listTodos } from '@/lib/api';

const fmt = (iso) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const fmtDay = (d) => new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Calendar({ token, items }) {
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: '', event_date: '', property_id: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || '';

  const load = useCallback(async () => {
    try {
      const [ev, td] = await Promise.all([listEvents(token), listTodos(token)]);
      setEvents(ev || []);
      setTodos((td || []).filter((t) => t.due_date && !t.done));
    } catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) { setErr('Titel und Datum sind nötig.'); return; }
    setBusy(true); setErr('');
    try {
      await upsertEvent(token, {
        title: form.title,
        event_date: new Date(form.event_date).toISOString(),
        property_id: form.property_id,
        description: form.description,
      });
      setForm({ title: '', event_date: '', property_id: '', description: '' });
      await load();
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const removeEvent = async (id) => {
    if (!confirm('Termin löschen?')) return;
    try { await deleteEvent(token, id); await load(); } catch {}
  };

  const entries = [
    ...events.map((ev) => ({ kind: 'event', id: ev.id, date: ev.event_date, title: ev.title, property_id: ev.property_id, description: ev.description })),
    ...todos.map((t) => ({ kind: 'todo', id: t.id, date: t.due_date, title: t.title, property_id: t.property_id })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="grid gap-6">
      <form onSubmit={add} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
        <h2 className="text-lg font-semibold">Neuer Termin</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1">Titel *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1">Datum & Uhrzeit *</label>
            <input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
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
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div><button disabled={busy} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">{busy ? 'Speichere…' : 'Termin anlegen'}</button></div>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Anstehend</h3>
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm">Keine Termine oder fälligen To-dos.</p>
        ) : (
          <div className="grid gap-2">
            {entries.map((it) => (
              <div key={it.kind + it.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                <div className="text-xs text-slate-500 w-32 shrink-0">{it.kind === 'event' ? fmt(it.date) : fmtDay(it.date)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {it.kind === 'todo' && <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 mr-2">To-do</span>}
                    {it.title}
                  </div>
                  {it.property_id && <div className="text-xs text-slate-500">{propName(it.property_id)}</div>}
                  {it.description && <div className="text-xs text-slate-400">{it.description}</div>}
                </div>
                {it.kind === 'event' && (
                  <button onClick={() => removeEvent(it.id)} className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">Löschen</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
