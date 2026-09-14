import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminDb, requireUser } from './auth';
import { ApiError } from './http';
import { CLOUD_BUCKET } from '../cloud-types';
export const guestCookie = 'folio-workspace-session';
export async function workspaceIdentity(request: Request, create = false) {
  const site = request.headers.get('sec-fetch-site');
  if (request.headers.get('x-folio-workspace') !== '1' || (site !== null && site !== 'same-origin'))
    throw new ApiError(403, 'Open this document from Folio.');
  // The browser's Fetch Metadata cannot be set by page JavaScript. Next may
  // construct request.url with its internal listener (0.0.0.0), including behind
  // a proxy, so that URL is not the browser's origin.
  const origin = request.headers.get('origin');
  if (origin && site !== 'same-origin') {
    const url = new URL(request.url);
    const host = request.headers.get('host');
    const expected = host ? new URL(`${url.protocol}//${host}`).origin : url.origin;
    if (origin !== expected) throw new ApiError(403, 'Open this document from Folio.');
  }
  const user = request.headers.has('authorization') ? await requireUser(request) : null;
  const previous = request.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(guestCookie + '='))
    ?.slice(guestCookie.length + 1);
  const valid = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : null;
  const token = valid || (create && !user ? randomBytes(32).toString('hex') : null);
  return {
    actor: user?.id || null,
    guest: token ? createHash('sha256').update(token).digest('hex') : null,
    cookie: create && !user ? token : null,
  };
}
export function workspaceResponse(
  request: Request,
  value: unknown,
  cookie?: string | null,
  status = 200,
) {
  const response = NextResponse.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
  if (cookie)
    response.cookies.set(guestCookie, cookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(request.url).protocol === 'https:',
      path: '/',
      maxAge: 86400,
    });
  return response;
}
export function workspaceError(error: { message: string } | null) {
  if (!error) return;
  if (/workspace_missing/.test(error.message))
    throw new ApiError(404, 'This document is unavailable or its guest session has expired.');
  if (/workspace_conflict/.test(error.message))
    throw new ApiError(
      409,
      'This document changed in another tab. Open the saved version in a new tab before continuing. Your edits remain here.',
    );
  if (/storage_limit/.test(error.message))
    throw new ApiError(
      409,
      'There is not enough private storage to save this document. Delete older files or recovery drafts in My files, then try again.',
    );
  if (/invalid_workspace|workspace_bound/.test(error.message))
    throw new ApiError(
      413,
      'These edits exceed the 8 MB workspace limit. Reduce added images and retry saving.',
    );
  throw new ApiError(
    503,
    'Automatic document saving is unavailable. Keep this tab open and retry.',
  );
}
export async function ownedWorkspace(
  identity: Awaited<ReturnType<typeof workspaceIdentity>>,
  id: string,
  allowDeleting = false,
) {
  const { data, error } = await adminDb()
    .from('cloud_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  workspaceError(error);
  if (
    !data ||
    !(
      (identity.actor && data.user_id === identity.actor) ||
      (data.user_id === null &&
        identity.guest &&
        data.guest_hash === identity.guest &&
        Date.parse(data.expires_at) > Date.now())
    )
  )
    throw new ApiError(404, 'This document is unavailable or its guest session has expired.');
  if (data.status === 'deleting' && !allowDeleting)
    throw new ApiError(409, 'This document is being removed.');
  return data;
}
export async function finishWorkspace(file: {
  id: string;
  object_path: string;
  size: number;
  status: string;
}) {
  if (file.status === 'ready') return;
  const bucket = adminDb().storage.from(CLOUD_BUCKET);
  const { data, error } = await bucket.info(file.object_path);
  if (error || !data)
    throw new ApiError(409, 'The upload has not finished. Keep this tab open and retry.');
  if (data.size !== file.size || data.contentType !== 'application/pdf')
    throw new ApiError(409, 'The uploaded file does not match this PDF.');
  const result = await adminDb()
    .from('cloud_documents')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', file.id)
    .eq('status', 'pending');
  workspaceError(result.error);
}
