import { admin, requireSession, errorResponse } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { token, id } = await req.json();
    await requireSession(token);

    const { data: path, error } = await admin.rpc('delete_document', { p_token: token, p_id: id });
    if (error) return Response.json({ error: 'Löschen fehlgeschlagen.' }, { status: 500 });

    if (path) await admin.storage.from('documents').remove([path]);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
