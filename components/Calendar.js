'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { listEventsX, upsertEvent, deleteEvent, listTodosX, listMeasuresX } from '@/lib/api';
import { cryptoId } from '@/lib/offline';
import MonthGrid, { localKey } from './MonthGrid';

const FREQ = [
  { v: '', l: 'Einmalig' },
  { v: 'daily', l: 'Täglich' },
  { v: 'weekly', l: 'Wöchentlich' },
  { v: 'monthly', l: 'Monatlich' },
  { v: 'quarterly', l: 'Vierteljährlich' },
  { v: 'yearly', l: 'Jährlich' },
];
const freqLabel = (v) => FREQ.find((f) => f.v === v)?.l || '';

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fmtFull = (iso) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const fmtDay = (d) => new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

const emptyForm = {
  title: '', event_date: '', property_id: '', description: '',
  recurrence_freq: '', recurrence_interval: '1', recurrence_until: '',
};

export default function Calendar({ token, items }) {
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localKey(new Date()));
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || '';

  const load = useCallback(async () => {
    try {
      const [ev, td, ms] = await Promise.all([
        listEventsX(token, 365), listTodosX(token), listMeasuresX(token),
      ]);
      setEvents(ev.data || []);
      setTodos((td.data || []).filter((t) => t.due_date && !t.done));
      setMeasures((ms.data || []).filter((m) => m.end_date || m.start_date));
    } catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => ([
    ...events.map((ev) => ({
      kind: 'event', key: 'e' + (ev.master_id || ev.id) + ev.occurs_at,
      id: ev.id, master_id: ev.master_id, date: ev.occurs_at, title: ev.title,
      property_id: ev.property_id, description: ev.description,
      is_recurring: ev.is_recurring, recurrence_freq: ev.recurrence_freq, pending: ev._pending,
    })),
    ...todos.map((t) => ({
      kind: 'todo', key: 't' + t.id, id: t.id, date: t.due_date, title: t.title,
      property_id: t.property_id, is_recurring: !!t.recurrence_freq, recurrence_freq: t.recurrence_freq,
    })),
    ...measures.map((m) => ({
      kind: 'measure', key: 'm' + m.id, id: m.id, date: m.end_date || m.start_date,
      title: m.title, property_id: m.property_id,
      description: [m.trade, m.status].filter(Boolean).join(' · '),
    })),
  ]).sort((a, b) => new Date(a.date) - new Date(b.date)), [events, todos, measures]);

  const dayEntries = entries.filter((e) => localKey(e.date) === selected);
  const upcoming = entries.filter((e) => new Date(e.date) >= new Date(new Date().toDateString()));

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
        setEvents((s) => [...s, {
          id: cryptoId(), master_id: null, title: payload.title, description: payload.description,
          property_id: payload.property_id || null, occurs_at: payload.event_date,
          is_recurring: !!payload.recurrence_freq, recurrence_freq: payload.recurrence_freq || null,
          _pending: true,
        }]);
        setNote('Offline gespeichert – wird bei Verbindung übertragen.');
      } else { await load(); }
      setForm(emptyForm);
      setOpen(false);
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const removeEvent = async (it) => {
    const q = it.is_recurring ? 'Die gesamte Serie „' + it.title + '" löschen?' : 'Termin löschen?';
    if (!confirm(q)) return;
    const master = it.master_id || it.id;
    setEvents((s) => s.filter((x) => (x.master_id || x.id) !== master));
    try { await deleteEvent(token, master); } catch {}
  };

  const shiftMonth = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  // Neuen Termin auf dem gewählten Tag vorbelegen
  const openForm = () => {
    if (!open && selected) setForm((f) => ({ ...f, event_date: selected + 'T09:00' }));
    setOpen((o) => !o);
  };

  const Entry = (it) => (
    <div key={it.key} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3">
      <span className={'w-2 h-2 rounded-full mt-2 shrink-0 ' +
        (it.kind === 'todo' ? 'bg-amber-500' : it.kind === 'measure' ? 'bg-emerald-500' : 'bg-sky-500')} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">
          {mode === 'month'
            ? (it.kind === 'event' ? fmtTime(it.date) : 'ganztägig')
            : (it.kind === 'event' ? fmtFull(it.date) : fmtDay(it.date))}
        </div>
        <div className="font-medium break-words">{it.title}</div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
          {it.property_id && <span>{propName(it.property_id)}</span>}
          {it.kind === 'todo' && <span className="text-amber-600">To-do</span>}
          {it.kind === 'measure' && <span className="text-emerald-600">Maßnahme</span>}
          {it.is_recurring && <span className="text-slate-400">↻ {freqLabel(it.recurrence_freq)}</span>}
          {it.pending && <span className="text-amber-600">nicht übertragen</span>}
        </div>
        {it.description && <div className="text-xs text-slate-400 mt-0.5">{it.description}</div>}
      </div>
      {it.kind === 'event' && !it.pending && (
        <button onClick={() => removeEvent(it)}
          className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">Löschen</button>
      )}
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setMode('month')}
            className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (mode === 'month' ? 'bg-white shadow-sm' : 'text-slate-500')}>
            Monat
          </button>
          <button onClick={() => setMode('list')}
            className={'px-3 py-1.5 rounded-md text-sm font-medium ' + (mode === 'list' ? 'bg-white shadow-sm' : 'text-slate-500')}>
            Liste
          </button>
        </div>
        <button onClick={openForm}
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

      {mode === 'month' ? (
        <>
          <MonthGrid month={month} entries={entries} selected={selected}
            onSelect={setSelected} onMonth={shiftMonth} />
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {new Date(selected + 'T12:00').toLocaleDateString('de-DE',
                { weekday: 'long', day: '2-digit', month: 'long' })}
            </h3>
            {dayEntries.length === 0
              ? <p className="text-slate-500 text-sm">Nichts an diesem Tag.</p>
              : <div className="grid gap-2">{dayEntries.map(Entry)}</div>}
          </div>
        </>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Anstehend</h3>
          {upcoming.length === 0
            ? <p className="text-slate-500 text-sm">Keine Termine, To-dos oder Maßnahmen.</p>
            : <div className="grid gap-2">{upcoming.map(Entry)}</div>}
        </div>
      )}
    </div>
  );
}
