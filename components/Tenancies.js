'use client';
import { useEffect, useState, useCallback } from 'react';
import { listTenanciesX, upsertTenancy, deleteTenancy } from '@/lib/api';

const STATUS = ['geplant', 'aktiv', 'beendet'];
const RENT_TYPES = [
  { v: 'standard', l: 'Normale Miete' },
  { v: 'staffel', l: 'Staffelmiete' },
  { v: 'index', l: 'Indexmiete' },
];

const eur = (n) => (n == null || n === '' ? '–'
  : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

const statusColor = (s) => ({
  geplant: 'bg-sky-100 text-sky-700',
  aktiv: 'bg-emerald-100 text-emerald-700',
  beendet: 'bg-slate-100 text-slate-500',
}[s] || 'bg-slate-100 text-slate-600');

const emptyForm = {
  property_id: '', tenant_name: '', tenant_contact: '', persons: '', status: 'aktiv',
  start_date: '', end_date: '', notice_months: '3', cold_rent: '', utility_prepayment: '',
  rent_type: 'standard', last_increase_date: '', deposit_amount: '', deposit_received_at: '',
  deposit_returned_at: '', deposit_separate: false, billing_period_end: '',
  last_billing_sent_at: '', notes: '',
};

export default function Tenancies({ token, items }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const propName = (id) => items.find((p) => p.id === id)?.name || 'Ohne Objekt';

  const load = useCallback(async () => {
    try { setRows((await listTenanciesX(token)).data || []); }
    catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (t) => {
    const f = { ...emptyForm };
    Object.keys(emptyForm).forEach((k) => {
      f[k] = t[k] === null || t[k] === undefined ? emptyForm[k] : t[k];
    });
    setForm(f); setEditId(t.id); setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.tenant_name.trim()) { setErr('Name des Mieters ist nötig.'); return; }
    if (!form.property_id) { setErr('Bitte ein Objekt zuordnen.'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { ...form, deposit_separate: String(!!form.deposit_separate) };
      if (editId) payload.id = editId;
      await upsertTenancy(token, payload);
      setOpen(false); setEditId(null); setForm(emptyForm);
      await load();
    } catch { setErr('Speichern fehlgeschlagen.'); }
    setBusy(false);
  };

  const del = async (t) => {
    if (!confirm('Mietverhältnis „' + t.tenant_name + '" löschen?')) return;
    setRows((s) => s.filter((x) => x.id !== t.id));
    try { await deleteTenancy(token, t.id); } catch { await load(); }
  };

  const capWarn = form.cold_rent && form.deposit_amount
    && Number(form.deposit_amount) > Number(form.cold_rent) * 3;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Mietverhältnisse</h2>
        <button onClick={() => (open ? setOpen(false) : startNew())}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
          {open ? 'Schließen' : '+ Mieter'}
        </button>
      </div>

      {open && (
        <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block mb-1">Mieter *</label>
              <input value={form.tenant_name}
                onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Objekt *</label>
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
                <option value="">— wählen —</option>
                {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Kontakt</label>
              <input value={form.tenant_contact}
                onChange={(e) => setForm({ ...form, tenant_contact: e.target.value })}
                placeholder="Telefon oder E-Mail" />
            </div>
            <div>
              <label className="block mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Personen im Haushalt</label>
              <input type="number" min="1" inputMode="numeric" value={form.persons}
                onChange={(e) => setForm({ ...form, persons: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Mietbeginn</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Mietende (falls bekannt)</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Kaltmiete / Monat (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.cold_rent}
                onChange={(e) => setForm({ ...form, cold_rent: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">NK-Vorauszahlung / Monat (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.utility_prepayment}
                onChange={(e) => setForm({ ...form, utility_prepayment: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Mietart</label>
              <select value={form.rent_type} onChange={(e) => setForm({ ...form, rent_type: e.target.value })}>
                {RENT_TYPES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Letzte Mieterhöhung</label>
              <input type="date" value={form.last_increase_date}
                onChange={(e) => setForm({ ...form, last_increase_date: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Kündigungsfrist (Monate)</label>
              <input type="number" min="1" inputMode="numeric" value={form.notice_months}
                onChange={(e) => setForm({ ...form, notice_months: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Kaution (€)</label>
              <input type="number" step="0.01" inputMode="decimal" value={form.deposit_amount}
                onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} />
              {capWarn && (
                <p className="text-[11px] text-red-600 mt-1 leading-tight">
                  Über drei Kaltmieten – nach § 551 BGB unzulässig.
                </p>
              )}
            </div>
            <div>
              <label className="block mb-1">Kaution erhalten am</label>
              <input type="date" value={form.deposit_received_at}
                onChange={(e) => setForm({ ...form, deposit_received_at: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1">Kaution zurückgezahlt am</label>
              <input type="date" value={form.deposit_returned_at}
                onChange={(e) => setForm({ ...form, deposit_returned_at: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" className="w-5 h-5" checked={!!form.deposit_separate}
                onChange={(e) => setForm({ ...form, deposit_separate: e.target.checked })} />
              <label className="mb-0">Kaution getrennt angelegt</label>
            </div>
            <div>
              <label className="block mb-1">Abrechnungszeitraum endet am</label>
              <input type="date" value={form.billing_period_end}
                onChange={(e) => setForm({ ...form, billing_period_end: e.target.value })} />
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                Meist der 31.12. Ab hier laufen zwölf Monate für die Abrechnung.
              </p>
            </div>
            <div>
              <label className="block mb-1">Abrechnung verschickt am</label>
              <input type="date" value={form.last_billing_sent_at}
                onChange={(e) => setForm({ ...form, last_billing_sent_at: e.target.value })} />
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
            {busy ? 'Speichere…' : editId ? 'Änderungen speichern' : 'Mietverhältnis anlegen'}
          </button>
        </form>
      )}

      <div className="grid gap-2">
        {rows.length === 0 ? (
          <p className="text-slate-500 text-sm">Noch keine Mietverhältnisse erfasst.</p>
        ) : rows.map((t) => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <button onClick={() => startEdit(t)} className="min-w-0 flex-1 text-left">
                <div className="font-medium break-words">{t.tenant_name}</div>
                <div className="text-xs text-slate-500">{propName(t.property_id)}</div>
              </button>
              <span className={'text-[11px] rounded px-1.5 py-0.5 shrink-0 ' + statusColor(t.status)}>
                {t.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 text-slate-600">
              {t.cold_rent != null && <span>Kalt {eur(t.cold_rent)}</span>}
              {t.utility_prepayment != null && <span>NK {eur(t.utility_prepayment)}</span>}
              {t.deposit_amount != null && <span>Kaution {eur(t.deposit_amount)}</span>}
              {t.start_date && <span className="text-slate-400">seit {fmtDay(t.start_date)}</span>}
              {t.end_date && <span className="text-slate-400">bis {fmtDay(t.end_date)}</span>}
              {t.rent_type !== 'standard' && (
                <span className="text-slate-400">{RENT_TYPES.find((r) => r.v === t.rent_type)?.l}</span>
              )}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
              <button onClick={() => startEdit(t)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200">Bearbeiten</button>
              <button onClick={() => del(t)}
                className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600">Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
