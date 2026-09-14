'use client';
import { authClient, AccountRequestError } from './auth-client';
import { WORKSPACE_LIMIT, type WorkspaceRecord, type WorkspaceSnapshot } from './workspace-types';
export async function workspaceRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-folio-workspace', '1');
  const session = await authClient()?.auth.getSession();
  if (session?.data.session)
    headers.set('authorization', `Bearer ${session.data.session.access_token}`);
  const response = await fetch(`/api/workspaces${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new AccountRequestError(
      response.status,
      value.error || 'Your document could not be saved. Please retry.',
    );
  }
  return response;
}
export async function uploadWorkspace(id: string, bytes: Uint8Array, name: string) {
  const result = await (
    await workspaceRequest('', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, name, size: bytes.length }),
    })
  ).json();
  if (!result.ready) {
    const form = new FormData();
    form.append('cacheControl', '0');
    form.append('', new Blob([bytes.slice().buffer], { type: 'application/pdf' }), name);
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const uploaded = await fetch(result.uploadUrl, {
      method: 'PUT',
      body: form,
      headers: publicKey ? { apikey: publicKey } : undefined,
    });
    // A retry may discover an upload already received by Storage after its response was lost.
    if (!uploaded.ok && ![400, 409].includes(uploaded.status))
      throw new Error('The PDF upload failed. Keep this tab open and retry.');
    await workspaceRequest(`/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'finish' }),
    });
  }
}
export async function readWorkspaceRecord(
  id: string,
): Promise<WorkspaceRecord & { sourceUrl: string }> {
  return (await workspaceRequest(`/${encodeURIComponent(id)}`)).json();
}
export async function readWorkspace(id: string) {
  const record = await readWorkspaceRecord(id);
  const response = await fetch(record.sourceUrl, { cache: 'no-store' });
  if (!response.ok)
    throw new Error('This document could not be downloaded from storage. Please retry.');
  return { ...record, bytes: new Uint8Array(await response.arrayBuffer()) };
}
export async function saveWorkspace(
  id: string,
  revision: number,
  name: string,
  snapshot: WorkspaceSnapshot,
  writeId: string,
) {
  const body = JSON.stringify({ action: 'save', revision, name, snapshot, writeId });
  if (new Blob([body]).size > WORKSPACE_LIMIT)
    throw new Error(
      'These edits exceed the 8 MB workspace limit. Reduce added images and retry saving.',
    );
  const result = await (
    await workspaceRequest(`/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body,
    })
  ).json();
  if (
    result?.revision !== revision + 1 ||
    typeof result.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(result.updatedAt)) ||
    (result.expiresAt !== null && typeof result.expiresAt !== 'string')
  )
    throw new Error('Storage did not confirm this save. Keep this tab open and retry saving.');
  return result as { revision: number; updatedAt: string; expiresAt: string | null };
}
export async function claimWorkspace(id: string) {
  await workspaceRequest(`/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'claim' }),
  });
}
