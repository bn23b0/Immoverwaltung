/* Nur serverseitig verwenden. Der Service-Role-Key darf niemals ins Frontend. */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlremwjxduwfnpuotzqz.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasAdmin = Boolean(serviceKey);

export const admin = serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function requireSession(token) {
  if (!admin) throw new Error('missing_service_key');
  if (!token) throw new Error('unauthorized');
  const { data, error } = await admin.rpc('is_valid_session', { p_token: token });
  if (error || data !== true) throw new Error('unauthorized');
  return true;
}

export function errorResponse(e) {
  const msg = String(e?.message || e);
  if (msg === 'missing_service_key') {
    return Response.json(
      { error: 'Dokumenten-Upload ist nicht konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt).' },
      { status: 503 }
    );
  }
  if (msg === 'unauthorized') {
    return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }
  return Response.json({ error: 'Serverfehler.' }, { status: 500 });
}
