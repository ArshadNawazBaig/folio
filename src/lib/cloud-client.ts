'use client';
import type { WorkspaceSnapshot } from './workspace-types';
import { accountFetch, authClient } from './auth-client';
import { CLOUD_BUCKET, CLOUD_FILE_LIMIT } from './cloud-types';
export async function uploadCloudPdf(blob: Blob, name: string) {
  const client = authClient();
  if (!client) throw new Error('Sign in to save a PDF to your account.');
  if (!blob.size || blob.size > CLOUD_FILE_LIMIT || !/\.pdf$/i.test(name))
    throw new Error('Choose a PDF of up to 50 MB.');
  const signature = await blob.slice(0, 1024).text();
  if (!signature.includes('%PDF-')) throw new Error('This file is not a PDF.');
  const { id, path } = await (
    await accountFetch('/api/account/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, size: blob.size }),
    })
  ).json();
  // Transfer directly to the private bucket, using the signed-in user's JWT and RLS.
  // The service key and PDF bytes never pass through a Next.js upload endpoint.
  const { error } = await client.storage
    .from(CLOUD_BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', cacheControl: '0', upsert: false });
  if (error) {
    await accountFetch(`/api/account/files/${id}`, { method: 'DELETE' }).catch(() => {});
    throw new Error(
      'The PDF could not be uploaded. Please try again. Any incomplete upload can be removed from My files.',
    );
  }
  await finishCloudUpload(id);
  return id as string;
}
export async function finishCloudUpload(id: string) {
  return accountFetch(`/api/account/files/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finish' }),
  });
}
export async function readCloudPdf(id: string) {
  const client = authClient();
  if (!client) throw new Error('Sign in to open your cloud files.');
  const { name, path, workspace } = await (
    await accountFetch(`/api/account/files/${encodeURIComponent(id)}`)
  ).json();
  const { data, error } = await client.storage.from(CLOUD_BUCKET).download(path);
  if (error || !data) throw new Error('This PDF could not be downloaded. Please try again.');
  return {
    name: name as string,
    bytes: new Uint8Array(await data.arrayBuffer()),
    workspace: workspace as WorkspaceSnapshot | null | undefined,
  };
}
