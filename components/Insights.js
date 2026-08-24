'use client';
import { useEffect, useState } from 'react';
import { propertyInsightsX, upsertTodo } from '@/lib/api';

const eur = (n) => (n == null ? '–'
  : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–');
const years = (days) => (days == null ? '' : (days / 365).toFixed(1).replace('.', ',') + ' Jahre');

function Card({ tone = 'slate', title, children, action }) {
  const tones = {
    slate: 'border-slate-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
    emerald: 'border-emerald-200 bg-emerald-50',
  };
  return (
    <div className={'border rounded-xl p-3 ' + tones[tone]}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-slate-600 mt-1 leading-relaxed">{children}</div>
      {action}
    </div>
  );
}

export default function Insights({ token, items, onGo }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [added, setAdded] = useState({});

  useEffect(() => {
    propertyInsightsX(token)
      .then((r) => setRows(r.data || []))
      .catch(() => setErr('Hinweise konnten nicht geladen werden.'));
  }, [token]);

  const makeTodo = async (key, title, propertyId, dueDate) => {
    try {
      await upsertTodo(token, {
        title, property_id: propertyId || '', due_date: dueDate || '', done: 'false',
      });
      setAdded((s) => ({ ...s, [key]: true }));
    } catch {}
  };

  const TodoBtn = ({ k, title, propertyId, dueDate }) =>
    added[k] ? (
      <p className="text-xs text-emerald-700 mt-2">Als To-do angelegt.</p>
    ) : (
      <button onClick={() => makeTodo(k, title, propertyId, dueDate)}
        className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white">
        Als To-do anlegen
      </button>
    );

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!rows.length) return <p className="text-slate-500 text-sm">Noch keine Objekte angelegt.</p>;

  return (
    <div className="grid gap-5">
      <h2 className="text-lg font-semibold">Übersicht</h2>

      {rows.map((r) => {
        const cards = [];

        // Fehlender Gebäudeanteil blockiert AfA und die 15-%-Prüfung
        if (r.building_share_missing) {
          cards.push(
            <Card key="bs" tone="amber" title="Gebäudeanteil fehlt">
              Ohne Gebäudeanteil lassen sich weder AfA noch die 15-%-Grenze berechnen.
              Der Wert steht meist im Kaufvertrag oder wird über den Bodenrichtwert ermittelt.
            </Card>
          );
        }

        // Anschaffungsnahe Herstellungskosten
        if (!r.building_share_missing && r.limit_15 > 0 && r.days_to_window_end > 0) {
          const pct = r.used_pct_15 ?? 0;
          const tone = pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'slate';
          cards.push(
            <Card key="15" tone={tone} title={`15-%-Grenze: ${pct.toString().replace('.', ',')} % ausgeschöpft`}>
              <div className="mb-2">
                {eur(r.spent_3y)} von {eur(r.limit_15)} netto verbraucht.
                Frist läuft bis {fmtDay(r.window_3y)}.
              </div>
              <div className="h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                <div className={'h-full ' + (pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: Math.min(100, pct) + '%' }} />
              </div>
              <div className="mt-2">
                Wird die Grenze in den ersten drei Jahren überschritten, zählen die Kosten
                nicht mehr als sofort absetzbarer Erhaltungsaufwand, sondern nur noch über die AfA.
              </div>
            </Card>
          );
        }

        // Spekulationsfrist
        if (r.days_to_spec_end != null) {
          const done = r.days_to_spec_end <= 0;
          cards.push(
            <Card key="spec" tone={done ? 'emerald' : 'slate'}
              title={done ? 'Spekulationsfrist abgelaufen' : 'Spekulationsfrist läuft'}>
              {done
                ? `Seit ${fmtDay(r.spec_end)} ist ein Verkauf des Objekts einkommensteuerfrei.`
                : `Ein Verkauf vor dem ${fmtDay(r.spec_end)} ist steuerpflichtig – noch ${years(r.days_to_spec_end)}.`}
            </Card>
          );
        }

        // Interne Rechnungen fehlen
        if (r.missing_internal_invoice > 0) {
          cards.push(
            <Card key="inv" tone="amber"
              title={`${r.missing_internal_invoice} Leistung(en) der Schreinerei ohne Rechnung`}
              action={<TodoBtn k={r.id + 'inv'} title={'Rechnungen der Schreinerei für ' + r.name + ' erstellen'}
                propertyId={r.id} />}>
              Abgeschlossene Maßnahmen der eigenen Schreinerei ohne Rechnungsnummer.
              Ohne Rechnung zwischen Betrieb und Objekt lässt sich der Aufwand nicht ansetzen.
            </Card>
          );
        }

        // Eigenleistung
        if (r.own_work_measures > 0) {
          cards.push(
            <Card key="own" tone="slate" title={`${r.own_work_measures} Maßnahme(n) als Eigenleistung`}>
              Bei Eigenleistung ist nur das Material absetzbar, nicht die Arbeitszeit.
              Wenn die Schreinerei die Arbeit ohnehin ausführt, ist eine ordentliche Rechnung
              in der Regel die bessere Variante.
            </Card>
          );
        }

        // Budget
        if (r.planned_total > 0) {
          const over = r.spent_total > r.planned_total;
          cards.push(
            <Card key="budget" tone={over ? 'red' : 'slate'} title="Renovierungsbudget">
              {eur(r.spent_total)} abgerechnet von {eur(r.planned_total)} geplant
              {over ? ' – Budget überschritten.' : '.'}
            </Card>
          );
        }

        // Renovierung ohne offene Maßnahmen
        if (r.status === 'in Renovierung' && r.open_measures === 0) {
          cards.push(
            <Card key="norenov" tone="slate" title="Keine offenen Maßnahmen">
              Das Objekt steht auf „in Renovierung", es ist aber nichts geplant oder in Arbeit.
              Entweder Maßnahmen erfassen oder den Status auf „Vermietet" bzw. „Leerstand" ändern –
              der Status steuert auch die Instandhaltungsrücklage.
            </Card>
          );
        }

        return (
          <div key={r.id} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold break-words">{r.name}</h3>
              <span className="text-xs text-slate-500 shrink-0">{r.status}</span>
            </div>
            {cards.length ? cards : <p className="text-sm text-slate-500">Keine Hinweise.</p>}
          </div>
        );
      })}

      <p className="text-xs text-slate-400 leading-relaxed">
        Die Hinweise zur 15-%-Grenze (§ 6 Abs. 1 Nr. 1a EStG), zur Spekulationsfrist (§ 23 EStG)
        und zur Verrechnung zwischen Schreinerei und Objekt sind Rechenhilfen, keine Steuerberatung.
        Ob Kosten als Erhaltungsaufwand oder Herstellungskosten gelten und wie die Leistungen des
        eigenen Betriebs anzusetzen sind, muss dein Steuerberater verbindlich klären.
      </p>
    </div>
  );
}
