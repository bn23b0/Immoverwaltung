'use client';
import { useEffect, useState, useCallback } from 'react';
import { listTodos, upsertTodo, deleteTodo } from '@/lib/api';

const fmtDay = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Todos({ token, items }) {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: '', property_id: '', due_date: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || '';

  const load = useCallback(async () => {
    try { setTodos((await listTodos(token)) || []); } catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Titel ist nötig.'); return; }
    setBusy(true); setErr('');
    try {
      await upsertTodo(token, { title: form.title, property_id: form.property_id, due_date: form.due_date, done: 'false' });
      setForm({ title: '', property_id: '', due_date: '' });
      await load();
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const toggle = async (t) => {
    try {
      await upsertTodo(token, { id: t.id, title: t.title, property_id: t.property_id || '', due_date: t.due_date || '', done: (!t.done).toString() });
      await load();
    } catch {}
  };

  const remove = async (id) => {
    if (!confirm('To-do löschen?')) return;
    try { await deleteTodo(token, id); await load(); } catch {}
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={add} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
        <h2 className="text-lg font-semibold">Neues To-do</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
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
            <label className="block mb-1">Fällig am (optional)</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div><button disabled={busy} className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">{busy ? 'Speichere…' : 'To-do anlegen'}</button></div>
      </form>

      <div className="grid gap-2">
        {todos.length === 0 ? (
          <p className="text-slate-500 text-sm">Noch keine To-dos.</p>
        ) : todos.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 shrink-0" checked={t.done} onChange={() => toggle(t)} />
            <div className="min-w-0 flex-1">
              <div className={'font-medium truncate ' + (t.done ? 'line-through text-slate-400' : '')}>{t.title}</div>
              <div className="text-xs text-slate-500 flex gap-3">
                {t.property_id && <span>{propName(t.property_id)}</span>}
                {t.due_date && <span>fällig {fmtDay(t.due_date)}</span>}
              </div>
            </div>
            <button onClick={() => remove(t.id)} className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">Löschen</button>
          </div>
        ))}
      </div>
    </div>
  );
}
