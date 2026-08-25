'use client';
import { useEffect, useState, useCallback } from 'react';
import { listTodosX, upsertTodo, deleteTodo, completeTodo } from '@/lib/api';
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

const fmtDay = (d) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const emptyForm = {
  title: '', property_id: '', due_date: '',
  recurrence_freq: '', recurrence_interval: '1', recurrence_until: '',
};

export default function Todos({ token, items }) {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || '';

  const load = useCallback(async () => {
    try {
      const r = await listTodosX(token);
      setTodos(r.data || []);
    } catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Titel ist nötig.'); return; }
    if (form.recurrence_freq && !form.due_date) {
      setErr('Für eine Wiederholung ist ein Fälligkeitsdatum nötig.');
      return;
    }
    setBusy(true); setErr(''); setNote('');
    const payload = {
      title: form.title,
      property_id: form.property_id,
      due_date: form.due_date,
      done: 'false',
      recurrence_freq: form.recurrence_freq,
      recurrence_interval: form.recurrence_freq ? form.recurrence_interval || '1' : '1',
      recurrence_until: form.recurrence_freq ? form.recurrence_until : '',
    };
    try {
      const r = await upsertTodo(token, payload);
      if (r?.queued) {
        setTodos((s) => [{
          id: cryptoId(), title: payload.title, done: false,
          property_id: payload.property_id || null, due_date: payload.due_date || null,
          recurrence_freq: payload.recurrence_freq || null, _pending: true,
        }, ...s]);
        setNote('Offline gespeichert – wird bei Verbindung übertragen.');
      } else {
        await load();
      }
      setForm(emptyForm);
      setOpen(false);
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const toggle = async (t) => {
    const next = !t.done;
    // sofortige Rückmeldung, auch offline
    setTodos((s) => s.map((x) => (x.id === t.id ? { ...x, done: next } : x)));
    if (t._pending) return;
    try {
      const r = await completeTodo(token, t.id, next);
      if (!r?.queued) await load();
    } catch { await load(); }
  };

  const remove = async (t) => {
    if (!confirm('To-do löschen?')) return;
    setTodos((s) => s.filter((x) => x.id !== t.id));
    if (t._pending) return;
    try { await deleteTodo(token, t.id); } catch {}
  };

  const openTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);
  const list = showDone ? doneTodos : openTodos;

  const Row = (t) => (
    <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
      <input type="checkbox" className="w-6 h-6 shrink-0 accent-slate-900"
        checked={!!t.done} onChange={() => toggle(t)} />
      <div className="min-w-0 flex-1">
        <div className={'font-medium break-words ' + (t.done ? 'line-through text-slate-400' : '')}>
          {t.title}
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
          {t.property_id && <span>{propName(t.property_id)}</span>}
          {t.due_date && <span>fällig {fmtDay(t.due_date)}</span>}
          {t.recurrence_freq && <span className="text-slate-400">↻ {freqLabel(t.recurrence_freq)}</span>}
          {t._pending && <span className="text-amber-600">nicht übertragen</span>}
        </div>
      </div>
      <button onClick={() => remove(t)}
        className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">Löschen</button>
    </div>
  );

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">To-dos</h2>
        <button onClick={() => setOpen((o) => !o)}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
          {open ? 'Schließen' : '+ To-do'}
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block mb-1">Aufgabe *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Immobilie</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                <option value="">— keine —</option>
                {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Fällig am</label>
              <input type="date" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
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
                <p className="sm:col-span-2 text-xs text-slate-500">
                  Beim Abhaken wird die nächste Fälligkeit automatisch angelegt.
                </p>
              </>
            )}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={busy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">
            {busy ? 'Speichere…' : 'To-do anlegen'}
          </button>
        </form>
      )}

      {note && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{note}</p>}

      <div className="flex gap-2">
        <button onClick={() => setShowDone(false)}
          className={'px-3 py-1.5 rounded-lg text-sm font-medium ' +
            (!showDone ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
          Offen ({openTodos.length})
        </button>
        <button onClick={() => setShowDone(true)}
          className={'px-3 py-1.5 rounded-lg text-sm font-medium ' +
            (showDone ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
          Erledigt ({doneTodos.length})
        </button>
      </div>

      <div className="grid gap-2">
        {list.length === 0
          ? <p className="text-slate-500 text-sm">{showDone ? 'Nichts erledigt.' : 'Nichts offen.'}</p>
          : list.map(Row)}
      </div>
    </div>
  );
}
