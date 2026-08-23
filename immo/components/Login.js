'use client';
import { useState } from 'react';
import { login } from '@/lib/api';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await login(pin);
      if (r?.ok) { onLogin(r.token); return; }
      if (r?.error === 'locked')
        setErr('Zu viele Versuche. Gesperrt bis ' + new Date(r.locked_until).toLocaleTimeString('de-DE') + '.');
      else if (r?.error === 'wrong_pin')
        setErr('Falscher PIN. Verbleibende Versuche: ' + r.attempts_left + '.');
      else if (r?.error === 'no_pin') setErr('Es ist kein PIN eingerichtet.');
      else setErr('Anmeldung fehlgeschlagen.');
    } catch { setErr('Verbindungsfehler.'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-xs bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-1">Immobilienverwaltung</h1>
        <p className="text-sm text-slate-500 mb-4">Bitte PIN eingeben.</p>
        <input
          type="password" inputMode="numeric" autoFocus value={pin}
          onChange={(e) => setPin(e.target.value)} placeholder="PIN"
          className="mb-3 text-center tracking-widest" />
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button disabled={busy || !pin}
          className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">
          {busy ? 'Prüfe…' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
