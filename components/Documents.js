'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { listDocumentsX, uploadDocument, documentUrl, removeDocument } from '@/lib/api';
import { isOnline } from '@/lib/offline';

const CATEGORIES = ['Kaufvertrag', 'Mietvertrag', 'Rechnung', 'Nebenkostenabrechnung',
  'Grundbuch', 'Versicherung', 'Foto', 'Sonstiges'];

const kb = (n) => {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
};
const fmtDay = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const iconFor = (mime, name) => {
  const n = (name || '').toLowerCase();
  if ((mime || '').startsWith('image/')) return '🖼️';
  if (n.endsWith('.pdf')) return '📄';
  if (n.match(/\.(xlsx?|csv)$/)) return '📊';
  if (n.match(/\.(docx?|odt)$/)) return '📝';
  return '📎';
};

export default function Documents({ token, items }) {
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [offline, setOffline] = useState(false);
  const fileRef = useRef(null);

  const propName = (id) => items.find((p) => p.id === id)?.name || 'Ohne Objekt';

  const load = useCallback(async () => {
    try {
      const r = await listDocumentsX(token, null);
      setDocs(r.data || []);
      setOffline(r.offline);
    } catch { setErr('Laden fehlgeschlagen.'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const pick = () => {
    setErr('');
    if (!isOnline()) { setErr('Hochladen geht nur mit Verbindung.'); return; }
    fileRef.current?.click();
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setErr('');
    let done = 0;
    for (const f of files) {
      setProgress(`Lade ${++done} von ${files.length}: ${f.name}`);
      try {
        await uploadDocument(token, f, target, category);
      } catch (ex) {
        setErr(String(ex.message || 'Upload fehlgeschlagen.'));
      }
    }
    setProgress('');
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    await load();
  };

  const open = async (d) => {
    try {
      const url = await documentUrl(token, d.storage_path);
      window.open(url, '_blank', 'noopener');
    } catch { setErr('Datei konnte nicht geöffnet werden.'); }
  };

  const del = async (d) => {
    if (!confirm('„' + d.name + '" löschen?')) return;
    setDocs((s) => s.filter((x) => x.id !== d.id));
    try { await removeDocument(token, d.id); } catch { await load(); }
  };

  const shown = filter
    ? docs.filter((d) => (filter === 'none' ? !d.property_id : d.property_id === filter))
    : docs;

  return (
    <div className="grid gap-5">
      <h2 className="text-lg font-semibold">Dokumente</h2>

      {offline && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Offline – Liste zeigt den zuletzt geladenen Stand. Hochladen und Öffnen brauchen Verbindung.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1">Objekt zuordnen</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— ohne Objekt —</option>
              {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1">Art</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">— keine —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <input ref={fileRef} type="file" multiple onChange={onFiles} className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.odt,.txt" />

        <button type="button" onClick={pick} disabled={busy}
          className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white font-medium disabled:opacity-50">
          {busy ? 'Lädt hoch…' : 'Datei oder Foto auswählen'}
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Am Handy kannst du direkt die Kamera wählen. Bis 25 MB je Datei.
        </p>

        {progress && <p className="text-xs text-slate-500">{progress}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <div>
        <label className="block mb-1">Filter</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Alle ({docs.length})</option>
          <option value="none">Ohne Objekt</option>
          {items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid gap-2">
        {shown.length === 0 ? (
          <p className="text-slate-500 text-sm">Noch keine Dokumente.</p>
        ) : shown.map((d) => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{iconFor(d.mime_type, d.name)}</span>
            <button onClick={() => open(d)} className="min-w-0 flex-1 text-left">
              <div className="font-medium break-words">{d.name}</div>
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                <span>{propName(d.property_id)}</span>
                {d.category && <span>{d.category}</span>}
                <span>{kb(d.size_bytes)}</span>
                <span>{fmtDay(d.created_at)}</span>
              </div>
            </button>
            <button onClick={() => del(d)}
              className="text-sm text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 shrink-0">Löschen</button>
          </div>
        ))}
      </div>
    </div>
  );
}
