'use client';
import { useEffect, useState } from 'react';
import { propertyStatsX } from '@/lib/api';

const eur = (n) =>
  n == null ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const pct = (n) =>
  n == null ? '–' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n) + ' %';

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
      <div className="text-[11px] sm:text-xs text-slate-500 leading-tight">{label}</div>
      <div className="text-lg sm:text-xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
    </div>
  );
}

export default function Stats({ token }) {
  const [d, setD] = useState(null);
  const [stale, setStale] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    propertyStatsX(token)
      .then((r) => { setD(r.data); setStale(r.offline); })
      .catch(() => setErr('Statistik konnte nicht geladen werden.'));
  }, [token]);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!d) return <p className="text-slate-500 text-sm">Lädt…</p>;
  const pf = d.portfolio;
  if (!pf || !pf.count) return <p className="text-slate-500 text-sm">Noch keine Daten für eine Auswertung.</p>;

  return (
    <div className="grid gap-6">
      {stale && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Offline – zuletzt geladener Stand.
        </p>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Portfolio ({pf.count})</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <Tile label="Cashflow p.a. (vor Steuer)" value={eur(pf.cashflow_pre_tax)}
            sub={eur(pf.cashflow_pre_tax / 12) + ' / Monat'} />
          <Tile label="Kaltmiete p.a." value={eur(pf.annual_rent)} sub="ohne Nebenkosten" />
          <Tile label="Kaltmiete n. Rücklagen p.a." value={eur(pf.net_cold_rent_after_reserves)}
            sub="Kaltmiete − Rücklagen" />
          <Tile label="Laufende Kosten p.a." value={eur(pf.annual_operating_costs)} />
          <Tile label="Rücklage Mietausfall p.a." value={eur(pf.reserve_vacancy)} sub="4 % der Kaltmiete" />
          <Tile label="Rücklage Instandhaltung p.a." value={eur(pf.reserve_maintenance)}
            sub={pf.renovation_count
              ? '1 €/m²/Monat · ' + pf.renovation_count + ' Objekt(e) in Renovierung ausgenommen'
              : '1 €/m²/Monat'} />
          <Tile label="Kapitaldienst p.a." value={eur(pf.annual_debt_service)} />
          <Tile label="Steuerl. Ergebnis p.a." value={eur(pf.taxable_income)} sub="ohne Rücklagen & Tilgung" />
          <Tile label="AfA p.a." value={eur(pf.annual_afa)} />
          <Tile label="Aktueller Wert" value={eur(pf.current_value)}
            sub={'Wertzuwachs ' + eur(pf.appreciation_abs)} />
          <Tile label="Eingesetztes EK" value={eur(pf.equity)} />
          <Tile label="Bruttorendite" value={pct(pf.gross_yield_pct)} />
          <Tile label="Nettorendite" value={pct(pf.net_yield_pct)} />
          <Tile label="EK-Rendite" value={pct(pf.equity_yield_pct)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Je Objekt</h3>

        {/* Handy: Karten statt Tabelle */}
        <div className="grid gap-2 sm:hidden">
          {d.properties.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="font-medium break-words">{p.name}</div>
              {p.in_renovation && (
                <div className="text-[11px] text-amber-700 mt-0.5">
                  in Renovierung – keine Instandhaltungsrücklage
                </div>
              )}
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-500">Cashflow/M</dt>
                <dd className="text-right tabular-nums">{eur(p.cashflow_pre_tax_monthly)}</dd>
                <dt className="text-slate-500">Kaltmiete n. Rückl.</dt>
                <dd className="text-right tabular-nums">{eur(p.net_cold_rent_after_reserves)}</dd>
                <dt className="text-slate-500">Nettorendite</dt>
                <dd className="text-right tabular-nums">{pct(p.net_yield_pct)}</dd>
                <dt className="text-slate-500">AfA p.a.</dt>
                <dd className="text-right tabular-nums">{eur(p.annual_afa)}</dd>
                <dt className="text-slate-500">Wertzuwachs</dt>
                <dd className="text-right tabular-nums">{eur(p.appreciation_abs)}</dd>
              </dl>
            </div>
          ))}
        </div>

        {/* Ab Tablet: Tabelle */}
        <div className="hidden sm:block overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="p-3">Objekt</th>
                <th className="p-3 text-right">Cashflow/M</th>
                <th className="p-3 text-right">Kaltmiete n. Rückl.</th>
                <th className="p-3 text-right">Nettorendite</th>
                <th className="p-3 text-right">AfA p.a.</th>
                <th className="p-3 text-right">Wertzuwachs</th>
              </tr>
            </thead>
            <tbody>
              {d.properties.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-medium">
                    {p.name}
                    {p.in_renovation && (
                      <span className="ml-2 text-[11px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                        Renovierung
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">{eur(p.cashflow_pre_tax_monthly)}</td>
                  <td className="p-3 text-right tabular-nums">{eur(p.net_cold_rent_after_reserves)}</td>
                  <td className="p-3 text-right tabular-nums">{pct(p.net_yield_pct)}</td>
                  <td className="p-3 text-right tabular-nums">{eur(p.annual_afa)}</td>
                  <td className="p-3 text-right tabular-nums">{eur(p.appreciation_abs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Einnahme = Kaltmiete (monatlich × 12); Nebenkosten sind nicht Teil der Einnahme.
        „Kaltmiete nach Rücklagen" = Kaltmiete abzüglich Mietausfall- und Instandhaltungsrücklage,
        ohne laufende Kosten. Die Instandhaltungsrücklage (1 €/m²/Monat) entfällt für Objekte mit
        Status „in Renovierung". Cashflow zieht zusätzlich laufende Kosten und Kapitaldienst ab.
        Steuerl. Ergebnis = Kaltmiete − laufende Kosten − Zins − AfA.
      </p>
    </div>
  );
}
