import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/platform';
import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { blogDatabaseError } from '@/lib/server/blog';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(404, 'Post not found.');
    const db = adminDb();
    const { data, error } = await db
      .from('blog_posts')
      .select('id,status')
      .eq('id', id)
      .maybeSingle();
    blogDatabaseError(error);
    if (!data || data.status === 'trashed')
      throw new ApiError(404, 'Open a draft before adding images.');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(request.headers.get('content-type') || '')
    )
      throw new ApiError(400, 'Choose a JPEG, PNG, or WebP image.');
    const input = await boundedBody(request, 5 * 1024 * 1024);
    let output: Buffer;
    try {
      output = await sharp(input, { limitInputPixels: 40000000, animated: false })
        .rotate()
        .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
    } catch {
      throw new ApiError(
        400,
        'This image could not be opened. Choose a valid JPEG, PNG, or WebP under 5 MB.',
      );
    }
    if (output.length > 5 * 1024 * 1024) throw new ApiError(413, 'Choose a smaller image.');
    const path = `${id}/${randomUUID()}.webp`;
    const uploaded = await db.storage
      .from('folio-blog')
      .upload(path, output, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (uploaded.error)
      throw new ApiError(503, 'The image could not be uploaded. Check blog storage and try again.');
    return Response.json(
      { url: db.storage.from('folio-blog').getPublicUrl(path).data.publicUrl },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
