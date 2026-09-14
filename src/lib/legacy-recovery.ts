import { openDB } from 'idb';
import { saveProDraft, type ProDraft } from './pro-draft';
import { saveRemoteDraft } from './remote-draft';
import { remoteTools, type RemoteResult, type RemoteTool } from './remote-types';
export type LegacyRecovery =
  | { kind: 'pro-text'; name: string; value: ProDraft }
  | { kind: RemoteTool; name: string; value: RemoteResult };
async function existingDatabase(name: string, store: string) {
  if (
    typeof indexedDB.databases === 'function' &&
    !(await indexedDB.databases()).some((entry) => entry.name === name)
  )
    return null;
  const database = await openDB(name, undefined, {
    upgrade(_db, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
        void transaction.done.catch(() => {});
        transaction.abort();
      }
    },
  }).catch((error) => {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  });
  if (!database) return null;
  if (!database.objectStoreNames.contains(store)) {
    database.close();
    return null;
  }
  return database;
}
export async function legacyRecoveries(): Promise<LegacyRecovery[]> {
  const result: LegacyRecovery[] = [];
  const pro = await existingDatabase('folio-pro-draft', 'draft');
  if (pro) {
    try {
      const draft: ProDraft | undefined = await pro.get('draft', 'current');
      if (draft?.bytes && draft.name && draft.savedAt + 7 * 86400000 > Date.now())
        result.push({ kind: 'pro-text', name: draft.name, value: draft });
    } finally {
      pro.close();
    }
  }
  const remote = await existingDatabase('folio-prepared-documents', 'results');
  if (remote) {
    try {
      for (const tool of remoteTools) {
        const value: RemoteResult | undefined = await remote.get('results', tool);
        if (value?.tool === tool && value.expiresAt > Date.now())
          result.push({ kind: tool, name: value.filename, value });
      }
    } finally {
      remote.close();
    }
  }
  return result;
}
export async function migrateLegacyRecovery(draft: LegacyRecovery) {
  const saved =
    draft.kind === 'pro-text'
      ? await saveProDraft(draft.value)
      : await saveRemoteDraft(draft.value);
  if (!saved) throw new Error('Sign in to move this draft to cloud storage.');
  const db = await existingDatabase(
    draft.kind === 'pro-text' ? 'folio-pro-draft' : 'folio-prepared-documents',
    draft.kind === 'pro-text' ? 'draft' : 'results',
  );
  if (db) {
    try {
      await db.delete(
        draft.kind === 'pro-text' ? 'draft' : 'results',
        draft.kind === 'pro-text' ? 'current' : draft.kind,
      );
    } finally {
      db.close();
    }
  }
}
