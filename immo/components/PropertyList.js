'use client';
import { deleteProperty } from '@/lib/api';

const eur0 = (n) =>
  n == null ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function PropertyList({ items, token, onEdit, onChanged }) {
  const del = async (p) => {
    if (!confirm('„' + p.name + '" wirklich löschen?')) return;
    try { await deleteProperty(token, p.id); onChanged(); } catch { alert('Löschen fehlgeschlagen.'); }
  };

  if (!items.length)
    return <p className="text-slate-500 text-sm py-12 text-center">Noch keine Immobilien angelegt. Oben rechts über „+ Neu" beginnen.</p>;

  return (
    <div className="grid gap-3">
      {items.map((p) => {
        const addr = [p.street, p.house_number].filter(Boolean).join(' ');
        const loc = [p.zip, p.city].filter(Boolean).join(' ');
        return (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-sm text-slate-500 truncate">{[addr, loc].filter(Boolean).join(', ') || '—'}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {p.current_value != null && <span>Wert: {eur0(p.current_value)}</span>}
                {p.cold_rent != null && <span>Kaltmiete: {eur0(p.cold_rent)}/M</span>}
                {p.status && <span className="uppercase tracking-wide text-slate-400">{p.status}</span>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(p)} className="px-2.5 py-1 text-sm rounded-lg hover:bg-slate-100">Bearbeiten</button>
              <button onClick={() => del(p)} className="px-2.5 py-1 text-sm rounded-lg text-red-600 hover:bg-red-50">Löschen</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
