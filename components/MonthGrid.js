'use client';
import { useMemo } from 'react';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const localKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export default function MonthGrid({ month, entries, selected, onSelect, onMonth }) {
  const { cells, label } = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Montag = 0
    const start = new Date(first);
    start.setDate(1 - offset);

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return {
      cells,
      label: first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    };
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map();
    entries.forEach((e) => {
      const k = localKey(e.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    });
    return m;
  }, [entries]);

  const todayKey = localKey(new Date());

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <button type="button" onClick={() => onMonth(-1)}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-lg leading-none">‹</button>
        <div className="font-semibold text-sm capitalize">{label}</div>
        <button type="button" onClick={() => onMonth(1)}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-lg leading-none">›</button>
      </div>

      <div className="grid grid-cols-7 text-[10px] text-slate-400 text-center pb-1">
        {WD.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const k = localKey(d);
          const list = byDay.get(k) || [];
          const outside = d.getMonth() !== month.getMonth();
          const isToday = k === todayKey;
          const isSel = k === selected;
          return (
            <button key={k} type="button" onClick={() => onSelect(k)}
              className={
                'aspect-square rounded-lg flex flex-col items-center justify-start pt-1 text-xs ' +
                (isSel ? 'bg-slate-900 text-white ' :
                  isToday ? 'bg-slate-100 font-semibold ' :
                    outside ? 'text-slate-300 ' : 'text-slate-700 ') +
                (!isSel && !outside ? 'hover:bg-slate-50' : '')
              }>
              <span className="leading-none">{d.getDate()}</span>
              <span className="flex gap-0.5 mt-1 flex-wrap justify-center px-0.5">
                {list.slice(0, 3).map((e, i) => (
                  <span key={i}
                    className={'w-1.5 h-1.5 rounded-full ' +
                      (isSel ? 'bg-white'
                        : e.kind === 'todo' ? 'bg-amber-500'
                          : e.kind === 'measure' ? 'bg-emerald-500' : 'bg-sky-500')} />
                ))}
                {list.length > 3 && (
                  <span className={'text-[8px] leading-none ' + (isSel ? 'text-white' : 'text-slate-400')}>
                    +{list.length - 3}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center pt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" />Termin</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />To-do</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Maßnahme</span>
      </div>
    </div>
  );
}

export { localKey };
