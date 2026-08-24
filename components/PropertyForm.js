'use client';
import { useState } from 'react';
import { GROUPS, ALL_KEYS } from '@/lib/fields';
import { upsertProperty } from '@/lib/api';

const toStr = (v) => (v === null || v === undefined ? '' : String(v));

export default function PropertyForm({ token, initial, onDone, onCancel }) {
  const start = {};
  ALL_KEYS.forEach((k) => (start[k] = toStr(initial?.[k])));
  const [v, setV] = useState(start);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e) => {
    e.preventDefault();
    if (!v.name?.trim()) { setErr('Bezeichnung ist erforderlich.'); return; }
    setBusy(true); setErr('');
    try {
      const data = { ...v };
      if (initial?.id) data.id = initial.id;
      await upsertProperty(token, data);
      onDone();
    } catch { setErr('Speichern fehlgeschlagen.'); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{initial ? 'Immobilie bearbeiten' : 'Neue Immobilie'}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:underline">Abbrechen</button>
      </div>

      {GROUPS.map((g) => (
        <fieldset key={g.title} className="bg-white border border-slate-200 rounded-xl p-4">
          <legend className="text-sm font-semibold text-slate-700 px-1">{g.title}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {g.fields.map((f) => (
              <div key={f.k} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block mb-1">{f.label}{f.required && ' *'}</label>
                {f.type === 'select' ? (
                  <select value={v[f.k]} onChange={(e) => set(f.k, e.target.value)}>
                    <option value="">—</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={3} value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} />
                ) : (
                  <input type={f.type} step={f.step} placeholder={f.ph || ''}
                    value={v[f.k]} onChange={(e) => set(f.k, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-3 rounded-lg border border-slate-300 sm:order-2">Abbrechen</button>
        <button disabled={busy}
          className="px-4 py-3 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50 sm:order-1">
          {busy ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}
