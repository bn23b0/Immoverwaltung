'use client';
import { useEffect, useState, useCallback } from 'react';
import { listMeasuresX, upsertMeasure, deleteMeasure } from '@/lib/api';

const TRADES = ['Schreiner', 'Elektro', 'Sanitär/Heizung', 'Maler', 'Boden', 'Fenster/Türen',
  'Dach', 'Trockenbau', 'Fliesen', 'Gerüst', 'Entkernung', 'Sonstiges'];
const EXECUTORS = [
  { v: 'intern', l: 'Eigene Schreinerei (mit Rechnung)' },
  { v: 'extern', l: 'Fremdfirma / Subunternehmer' },
  { v: 'eigenleistung', l: 'Eigenleistung (ohne Rechnung)' },
];
const STATUS = ['geplant', 'beauftragt', 'in Arbeit', 'abgeschlossen'];
const COST_TYPES = [
  { v: 'erhaltung', l: 'Erhaltungsaufwand (sofort absetzbar)' },
  { v: 'herstellung', l: 'Herstellungskosten (über AfA)' },
];

const eur = (n) => (n == null || n === '' ? '–'
  : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const num = (v) => (v == null || v === '' ? 0 : Number(v));

const statusColor = (s) => ({
  geplant: 'bg-slate-100 text-slate-600',
  beauftragt: 'bg-sky-100 text-sky-700',
  'in Arbeit': 'bg-amber-100 text-amber-700',
  abgeschlossen: 'bg-emerald-100 text-emerald-700',
}[s] || 'bg-slate-100 text-slate-600');

const emptyForm = {
  property_id: '', title: '', trade: '', executor: 'intern', contractor: '',
  status: 'geplant', cost_type: 'erhaltung', planned_net: '', material_net: '', labor_net: '',
  invoice_no: '', invoice_date: '', start_date: '', end_date: '', notes: '',
};

export default function Measures({ token, items }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || 'Ohne Objekt';

  const load = useCallback(async () => {
    try { setRows((await listMeasuresX(token)).data || []); }
    catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (m) => {
    setForm({
      property_id: m.property_id || '', title: m.title || '', trade: m.trade || '',
      executor: m.executor || 'intern', contractor: m.contractor || '', status: m.status || 'geplant',
      cost_type: m.cost_type || 'erhaltung',
      planned_net: m.planned_net ?? '', material_net: m.material_net ?? '', labor_net: m.labor_net ?? '',
      invoice_no: m.invoice_no || '', invoice_date: m.invoice_date || '',
      start_date: m.start_date || '', end_date: m.end_date || '', notes: m.notes || '',
    });
    setEditId(m.id); setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErr('Bezeichnung ist nötig.'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { ...form };
      if (editId) payload.id = editId;
      await upsertMeasure(token, payload);
      setOpen(false); setEditId(null); setForm(emptyForm);
      await load();
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const del = async (m) => {
    if (!confirm('Maßnahme „' + m.title + '" löschen?')) return;
    setRows((s) => s.filter((x) => x.id !== m.id));
    try { await deleteMeasure(token, m.id); } catch { await load(); }
  };

  const shown = filter
    ? rows.filter((m) => (filter === 'none' ? !m.property_id : m.property_id === filter))
    : rows;

  const sumPlanned = shown.reduce((a, m) => a + num(m.planned_net), 0);
  const sumActual = shown.reduce((a, m) => a + num(m.material_net) + num(m.labor_net), 0);
  const sumInternal = shown.filter((m) => m.executor === 'intern')
    .reduce((a, m) => a + num(m.material_net) + num(m.labor_net), 0);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Maßnahmen</h2>
        <button onClick={() => (open ? setOpen(false) : startNew())}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
          {open ? 'Schließen' : '+ Maßnahme'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Geplant</div>
          <div className="font-semibold tabular-nums">{eur(sumPlanned)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">Abgerechnet</div>
          <div className="font-semibold tabular-nums">{eur(sumActual)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="text-[11px] text-slate-500">davon Schreinerei</div>
          <div className="font-semibold tabular-nums">{eur(sumInternal)}</div>
        </div>
      </div>

      {open && (
        <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block mb-1">Bezeichnung *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="z. B. Innentüren EG erneuern" />
            </div>
            <div>
              <label className="block mb-1">Objekt</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                <option value="">— ohne Objekt —</option>
                {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Gewerk</label>
              <select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })}>
                <option value="">—</option>
                {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Ausführung</label>
              <select value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value })}>
                {EXECUTORS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
              </select>
              {form.executor === 'eigenleistung' && (
                <p className="text-[11px] text-amber-700 mt-1 leading-tight">
                  Eigenleistung ohne Rechnung ist steuerlich nicht absetzbar – nur das Material.
                </p>
              )}
            </div>
            {form.executor === 'extern' && (
              <div>
                <label className="block mb-1">Firma</label>
                <input value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} />
              </div>
            )}
            <div>
              <label className="block mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Steuerliche Einordnung</label>
              <select value={form.cost_type} onChange={(e) => setForm({ ...form, cost_type: e.target.value })}>
                {COST_TYPES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Budget netto (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.planned_net}
                onChange={(e) => setForm({ ...form, planned_net: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Material netto (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.material_net}
                onChange={(e) => setForm({ ...form, material_net: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Lohn netto (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.labor_net}
                onChange={(e) => setForm({ ...form, labor_net: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Rechnungsnummer</label>
              <input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Rechnungsdatum</label>
              <input type="date" value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Beginn</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Fertig am</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block mb-1">Notiz</label>
              <textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={busy}
            className="w-full sm:w-auto px-4 py-3 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">
            {busy ? 'Speichere…' : editId ? 'Änderungen speichern' : 'Maßnahme anlegen'}
          </button>
        </form>
      )}

      <div>
        <label className="block mb-1">Filter</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Alle ({rows.length})</option>
          <option value="none">Ohne Objekt</option>
          {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid gap-2">
        {shown.length === 0 ? (
          <p className="text-slate-500 text-sm">Noch keine Maßnahmen erfasst.</p>
        ) : shown.map((m) => {
          const ist = num(m.material_net) + num(m.labor_net);
          const over = num(m.planned_net) > 0 && ist > num(m.planned_net);
          return (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <button onClick={() => startEdit(m)} className="min-w-0 flex-1 text-left">
                  <div className="font-medium break-words">{m.title}</div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span>{propName(m.property_id)}</span>
                    {m.trade && <span>· {m.trade}</span>}
                    <span>· {m.executor === 'intern' ? 'Schreinerei'
                      : m.executor === 'extern' ? (m.contractor || 'Fremdfirma') : 'Eigenleistung'}</span>
                  </div>
                </button>
                <span className={'text-[11px] rounded px-1.5 py-0.5 shrink-0 ' + statusColor(m.status)}>
                  {m.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-slate-600">
                {num(m.planned_net) > 0 && <span>Budget {eur(m.planned_net)}</span>}
                {ist > 0 && (
                  <span className={over ? 'text-red-600 font-medium' : ''}>
                    Ist {eur(ist)}{over ? ' (über Budget)' : ''}
                  </span>
                )}
                {m.cost_type === 'herstellung' && <span className="text-slate-400">Herstellungskosten</span>}
                {(m.start_date || m.end_date) && (
                  <span className="text-slate-400">{fmtDay(m.start_date)}{m.end_date ? '–' + fmtDay(m.end_date) : ''}</span>
                )}
                {m.executor === 'intern' && m.status === 'abgeschlossen' && !m.invoice_no && (
                  <span className="text-amber-600">Rechnung fehlt</span>
                )}
              </div>

              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                <button onClick={() => startEdit(m)}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200">Bearbeiten</button>
                <button onClick={() => del(m)}
                  className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600">Löschen</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
