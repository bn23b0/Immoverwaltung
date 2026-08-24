'use client';
import { useEffect, useState } from 'react';
import { propertyStats } from '@/lib/api';

const eur = (n) => (n == null ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const pct = (n) => (n == null ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n) + ' %');

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Stats({ token }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { propertyStats(token).then(setD).catch(() => setErr('Statistik konnte nicht geladen werden.')); }, [token]);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!d) return <p className="text-slate-500 text-sm">Lädt…</p>;
  const pf = d.portfolio;
  if (!pf || !pf.count) return <p className="text-slate-500 text-sm">Noch keine Daten für eine Auswertung.</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Portfolio ({pf.count})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Tile label="Cashflow p.a. (vor Steuer)" value={eur(pf.cashflow_pre_tax)} sub={eur(pf.cashflow_pre_tax / 12) + ' / Monat'} />
          <Tile label="Nettomiete p.a." value={eur(pf.net_operating_income)} sub="nach Kosten & Rücklagen" />
          <Tile label="Kapitaldienst p.a." value={eur(pf.annual_debt_service)} />
          <Tile label="Rücklage Mietausfall p.a." value={eur(pf.reserve_vacancy)} sub="4 % der Kaltmiete" />
          <Tile label="Rücklage Instandhaltung p.a." value={eur(pf.reserve_maintenance)} sub="1 €/m²/Monat" />
          <Tile label="Steuerl. Ergebnis p.a." value={eur(pf.taxable_income)} sub="ohne Rücklagen & Tilgung" />
          <Tile label="Aktueller Wert" value={eur(pf.current_value)} sub={'Wertzuwachs ' + eur(pf.appreciation_abs)} />
          <Tile label="Eingesetztes EK" value={eur(pf.equity)} />
          <Tile label="AfA p.a." value={eur(pf.annual_afa)} />
          <Tile label="Bruttorendite" value={pct(pf.gross_yield_pct)} />
          <Tile label="Nettorendite" value={pct(pf.net_yield_pct)} />
          <Tile label="EK-Rendite" value={pct(pf.equity_yield_pct)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Je Objekt</h3>
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-3">Objekt</th>
                <th className="p-3 text-right">Cashflow/M</th>
                <th className="p-3 text-right">Nettorendite</th>
                <th className="p-3 text-right">AfA p.a.</th>
                <th className="p-3 text-right">Wertzuwachs</th>
              </tr>
            </thead>
            <tbody>
              {d.properties.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-right">{eur(p.cashflow_pre_tax_monthly)}</td>
                  <td className="p-3 text-right">{pct(p.net_yield_pct)}</td>
                  <td className="p-3 text-right">{eur(p.annual_afa)}</td>
                  <td className="p-3 text-right">{eur(p.appreciation_abs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Einnahme = Kaltmiete (monatlich × 12), Nebenkosten sind nicht Teil der Einnahme.
        Abzüge: laufende Kosten, Rücklage Mietausfall (4 % der Kaltmiete) und Instandhaltung (1 €/m²/Monat) – beide senken den Cashflow, nicht die Steuerlast.
        Kapitaldienst = anfänglicher Zins + Tilgung, konstant. Renovierungskosten erhöhen Gesamtinvestition/EK (keine automatische AfA).
        Steuerl. Ergebnis = Kaltmiete − laufende Kosten − Zins − AfA.
      </p>
    </div>
  );
}
