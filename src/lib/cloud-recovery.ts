'use client';
import { accountFetch, authClient } from './auth-client';
import type { StorageUsage } from './cloud-types';
export type RecoverySlot =
  'pro-text' | 'translate-pdf' | 'pdf-to-word' | 'pdf-to-excel' | 'pdf-to-powerpoint';
const bucket = 'folio-recovery';
const limit = 40 * 1024 * 1024;
const writes = new Map<string, Promise<unknown>>();
async function identity() {
  const client = authClient();
  if (!client) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  return session ? { client, id: session.user.id } : null;
}
// Serialize mutations of a slot so an earlier in-flight save cannot undo a deletion.
async function mutate<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (writes.get(key) || Promise.resolve()).catch(() => {}).then(operation);
  writes.set(key, next);
  try {
    return await next;
  } finally {
    if (writes.get(key) === next) writes.delete(key);
  }
}
export async function saveCloudRecovery(slot: RecoverySlot, value: unknown, expiresAt: number) {
  const account = await identity();
  if (!account) return false; // Guest work stays in the current editor, without local persistence.
  const body = new Blob([JSON.stringify({ version: 1, expiresAt, value })], {
    type: 'application/json',
  });
  if (body.size > limit) throw new Error('This recovery draft exceeds the cloud save limit.');
  const path = `${account.id}/${slot}.json`;
  return mutate(path, async () => {
    if ((await identity())?.id !== account.id) return false;
    const { storage } = (await (await accountFetch('/api/account/files')).json()) as {
      storage: StorageUsage;
    };
    const previousSize = storage.recovery.find((draft) => draft.slot === slot)?.size || 0;
    if (body.size > previousSize && storage.used - previousSize + body.size > storage.limit)
      throw new Error(
        'There is not enough private storage for this recovery draft. Delete older files or recovery drafts in My files, then retry saving.',
      );
    const { error } = await account.client.storage
      .from(bucket)
      .upload(path, body, { contentType: 'application/json', cacheControl: '0', upsert: true });
    if (error)
      throw new Error(
        'Your recovery draft could not be saved to cloud storage. Keep this tab open and retry.',
      );
    return (await identity())?.id === account.id;
  });
}
export async function readCloudRecovery<T>(slot: RecoverySlot): Promise<T | undefined> {
  const account = await identity();
  if (!account) return undefined;
  const { data, error } = await account.client.storage
    .from(bucket)
    .download(`${account.id}/${slot}.json`);
  if (error || !data || data.size > limit || (await identity())?.id !== account.id)
    return undefined;
  const result = JSON.parse(await data.text());
  if (result.version !== 1 || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now())
    return undefined;
  return result.value;
}
export async function clearCloudRecovery(slot: RecoverySlot) {
  const account = await identity();
  if (!account) return;
  const path = `${account.id}/${slot}.json`;
  await mutate(path, async () => {
    if ((await identity())?.id !== account.id) return;
    const { error } = await account.client.storage.from(bucket).remove([path]);
    if (error) throw new Error('The cloud recovery draft could not be removed.');
  });
}
