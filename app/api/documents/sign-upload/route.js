import { admin, requireSession, errorResponse } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const safeName = (n) =>
  String(n || 'datei')
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(-120);

export async function POST(req) {
  try {
    const { token, property_id, filename, size } = await req.json();
    await requireSession(token);

    if (size && size > MAX_BYTES) {
      return Response.json({ error: 'Datei ist größer als 25 MB.' }, { status: 413 });
    }

    const folder = property_id || 'allgemein';
    const path = `${folder}/${crypto.randomUUID()}-${safeName(filename)}`;

    const { data, error } = await admin.storage
      .from('documents')
      .createSignedUploadUrl(path);

    if (error) return Response.json({ error: 'Upload konnte nicht vorbereitet werden.' }, { status: 500 });

    return Response.json({ path: data.path, uploadToken: data.token });
  } catch (e) {
    return errorResponse(e);
  }
}
