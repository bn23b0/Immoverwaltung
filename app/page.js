'use client';
import { useEffect, useState, useCallback } from 'react';
import { getToken, setToken, clearToken } from '@/lib/session';
import { listPropertiesX, logout, syncPending } from '@/lib/api';
import { queueLength, isOnline, lastSynced } from '@/lib/offline';
import Login from '@/components/Login';
import PropertyList from '@/components/PropertyList';
import PropertyForm from '@/components/PropertyForm';
import Stats from '@/components/Stats';
import Calendar from '@/components/Calendar';
import Todos from '@/components/Todos';
import Documents from '@/components/Documents';
import Measures from '@/components/Measures';
import Insights from '@/components/Insights';

const NAV = [
  { id: 'start', label: 'Übersicht', icon: 'M4 12a8 8 0 1 1 16 0M12 12l4-3' },
  { id: 'list', label: 'Objekte', icon: 'M3 10.5 12 4l9 6.5M5.5 9.5V20h13V9.5' },
  { id: 'calendar', label: 'Kalender', icon: 'M7 3v3M17 3v3M3.5 9h17M4 6h16v14H4z' },
  { id: 'todos', label: 'To-dos', icon: 'M4 7h16M4 12h16M4 17h10' },
];

const MORE = [
  { id: 'measures', label: 'Maßnahmen', desc: 'Renovierung, Gewerke, Kosten' },
  { id: 'stats', label: 'Statistik', desc: 'Rendite, Cashflow, AfA' },
  { id: 'docs', label: 'Dokumente', desc: 'Verträge, Rechnungen, Fotos' },
  { id: 'form', label: 'Neues Objekt', desc: 'Immobilie anlegen' },
];

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d={d} />
    </svg>
  );
}

export default function Page() {
  const [token, setTok] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('start');
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [items, setItems] = useState([]);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  const load = useCallback(async (t) => {
    try {
      const r = await listPropertiesX(t);
      setItems(r.data || []);
      setOffline(r.offline);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    setOffline(!isOnline());
    setPending(queueLength());
    const t = getToken();
    (async () => {
      if (t && (await load(t))) setTok(t);
      else if (!t) clearToken();
      else setTok(t); // offline ohne Cache: Sitzung behalten
      setReady(true);
    })();
  }, [load]);

  // Verbindungswechsel: Warteschlange abarbeiten
  const resync = useCallback(async () => {
    setOffline(!isOnline());
    if (!isOnline() || !token) return;
    try {
      const sent = await syncPending();
      setPending(queueLength());
      if (sent) await load(token);
    } catch {}
  }, [token, load]);

  useEffect(() => {
    const on = () => resync();
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resync();
    });
    const iv = setInterval(() => setPending(queueLength()), 4000);
    resync();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(iv);
    };
  }, [resync]);

  const onLogin = async (t) => {
    setToken(t); setTok(t); await load(t); setView('list');
  };
  const onLogout = async () => {
    try { await logout(token); } catch {}
    clearToken(); setTok(null); setItems([]);
  };
  const refresh = () => load(token);

  if (!ready) return <div className="p-8 text-slate-500">Lädt…</div>;
  if (!token) return <Login onLogin={onLogin} />;

  const go = (id) => { setEditing(null); setView(id); setMoreOpen(false); };

  const TopBtn = ({ id, children }) => (
    <button onClick={() => go(id)}
      className={'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ' +
        (view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200')}
    >{children}</button>
  );

  const sync = lastSynced();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="font-semibold mr-2 shrink-0">Immobilien</span>
          <div className="hidden sm:flex items-center gap-2">
            {NAV.map((n) => <TopBtn key={n.id} id={n.id}>{n.label}</TopBtn>)}
            {MORE.filter((m) => m.id !== 'form').map((m) => <TopBtn key={m.id} id={m.id}>{m.label}</TopBtn>)}
          </div>
          <button onClick={() => go('form')}
            className="ml-auto hidden sm:block px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white shrink-0"
          >+ Neu</button>
          <button onClick={onLogout}
            className="ml-auto sm:ml-0 hidden sm:block px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 shrink-0"
          >Abmelden</button>
        </div>

        {(offline || pending > 0) && (
          <div className={'px-4 py-1.5 text-xs text-center ' +
            (offline ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800')}>
            {offline
              ? 'Offline – Änderungen werden gespeichert und später übertragen.'
              : 'Überträgt…'}
            {pending > 0 && ` (${pending} offen)`}
            {offline && sync && ' Stand: ' + new Date(sync).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 pb-nav">
        {view === 'list' && (
          <PropertyList items={items} token={token}
            onEdit={(p) => { setEditing(p); setView('form'); }}
            onChanged={refresh} />
        )}
        {view === 'form' && (
          <PropertyForm token={token} initial={editing}
            onDone={async () => { await refresh(); setEditing(null); setView('list'); }}
            onCancel={() => { setEditing(null); setView('list'); }} />
        )}
        {view === 'stats' && <Stats token={token} />}
        {view === 'calendar' && <Calendar token={token} items={items} />}
        {view === 'todos' && <Todos token={token} items={items} />}
        {view === 'docs' && <Documents token={token} items={items} />}
        {view === 'measures' && <Measures token={token} items={items} />}
        {view === 'start' && <Insights token={token} items={items} onGo={go} />}
      </main>

      {/* Untere Navigation nur auf dem Handy */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 safe-bottom">
        <div className="grid grid-cols-5">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)}
              className={'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ' +
                (view === n.id ? 'text-slate-900 font-semibold' : 'text-slate-500')}>
              <Icon d={n.icon} />
              {n.label}
            </button>
          ))}
          <button onClick={() => setMoreOpen(true)}
            className={'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ' +
              (MORE.some((m) => m.id === view) ? 'text-slate-900 font-semibold' : 'text-slate-500')}>
            <Icon d="M5 12h.01M12 12h.01M19 12h.01" />
            Mehr
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="sm:hidden fixed inset-0 z-30 bg-slate-900/40 flex items-end"
          onClick={() => setMoreOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl p-3 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
            <div className="grid gap-1">
              {MORE.map((m) => (
                <button key={m.id} onClick={() => go(m.id)}
                  className="text-left px-3 py-3 rounded-xl hover:bg-slate-50">
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </button>
              ))}
              <button onClick={() => { setMoreOpen(false); onLogout(); }}
                className="text-left px-3 py-3 rounded-xl text-red-600 hover:bg-red-50">Abmelden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
