# Immobilienverwaltung

Next.js-Frontend auf dem bestehenden Supabase-Backend (Projekt `immobilien-verwaltung`).
Nutzt ausschließlich die vorhandenen RPCs (login, list/upsert/delete_property, property_stats, …).
Es werden keine Tabellen verändert.

## Enthalten
- PIN-Login (Session-Token 12 h)
- Immobilien: Liste, anlegen, bearbeiten, löschen (alle Felder)
- Statistik: Cashflow, AfA, Wertsteigerung, Rendite (Portfolio + je Objekt)
- PWA (installierbar, App-Shell offline)

## Noch nicht enthalten (nächste Iteration)
Kalender/To-dos, Cold-Call-Tracking, Dokumente/OneDrive, regionale Wertsteigerung,
voller verschlüsselter Offline-Schreib-Sync.

## Environment (in Vercel setzen)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Lokal
npm install && npm run dev
