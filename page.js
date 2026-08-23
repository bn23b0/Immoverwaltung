'use client';
import { useEffect, useState, useCallback } from 'react';
import { getToken, setToken, clearToken } from '@/lib/session';
import { listProperties, logout } from '@/lib/api';
import Login from '@/components/Login';
import PropertyList from '@/components/PropertyList';
import PropertyForm from '@/components/PropertyForm';
import Stats from '@/components/Stats';

export default function Page() {
  const [token, setTok] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(null);
  const [items, setItems] = useState([]);

  const load = useCallback(async (t) => {
    try {
      const data = await listProperties(t);
      setItems(data || []);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const t = getToken();
    (async () => {
      if (t && (await load(t))) setTok(t);
      else clearToken();
      setReady(true);
    })();
  }, [load]);

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

  const NavBtn = ({ id, children }) => (
    <button
      onClick={() => { setEditing(null); setView(id); }}
      className={'px-3 py-1.5 rounded-lg text-sm font-medium ' +
        (view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200')}
    >{children}</button>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="font-semibold mr-2">Immobilien</span>
          <NavBtn id="list">Objekte</NavBtn>
          <NavBtn id="stats">Statistik</NavBtn>
          <button
            onClick={() => { setEditing(null); setView('form'); }}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white"
          >+ Neu</button>
          <button onClick={onLogout} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">Abmelden</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
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
      </main>
    </div>
  );
}
