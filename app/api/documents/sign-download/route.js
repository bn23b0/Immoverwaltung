import { admin, requireSession, errorResponse } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { token, path } = await req.json();
    await requireSession(token);
    if (!path) return Response.json({ error: 'Pfad fehlt.' }, { status: 400 });

    const { data, error } = await admin.storage
      .from('documents')
      .createSignedUrl(path, 300);

    if (error) return Response.json({ error: 'Datei nicht gefunden.' }, { status: 404 });
    return Response.json({ url: data.signedUrl });
  } catch (e) {
    return errorResponse(e);
  }
}
