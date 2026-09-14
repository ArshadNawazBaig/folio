import { openDB } from 'idb';
import type { LocalDocument, DocumentSummary } from './types';
function summary(doc: LocalDocument): DocumentSummary {
  return {
    id: doc.id,
    name: doc.name,
    updatedAt: doc.updatedAt,
    size: doc.bytes.byteLength + new TextEncoder().encode(JSON.stringify(doc.state)).length,
    pageCount: doc.state.pages.length,
  };
}
const db = async () => {
  if (
    typeof indexedDB.databases === 'function' &&
    !(await indexedDB.databases()).some((entry) => entry.name === 'folio-local')
  )
    return null;
  return openDB('folio-local', 2, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      if (oldVersion === 0) {
        void transaction.done.catch(() => {});
        transaction.abort();
        return;
      }
      if (!database.objectStoreNames.contains('documents'))
        database.createObjectStore('documents', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('summaries'))
        database.createObjectStore('summaries', { keyPath: 'id' });
      if (oldVersion === 1) {
        // Migrate one draft at a time; never load all PDF bytes into the library view.
        void (async () => {
          let cursor = await transaction.objectStore('documents').openCursor();
          while (cursor) {
            await transaction.objectStore('summaries').put(summary(cursor.value));
            cursor = await cursor.continue();
          }
        })().catch(() => transaction.abort());
      }
    },
  }).catch((error) => {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  });
};
export async function getDocument(id: string): Promise<LocalDocument | undefined> {
  const database = await db();
  if (!database) return undefined;
  try {
    return await database.get('documents', id);
  } finally {
    database.close();
  }
}
export async function getDocuments(): Promise<DocumentSummary[]> {
  const database = await db();
  if (!database) return [];
  try {
    const result: DocumentSummary[] = await database.getAll('summaries');
    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    database.close();
  }
}
export async function deleteDocument(id: string) {
  const database = await db();
  if (!database) return;
  try {
    const tx = database.transaction(['documents', 'summaries'], 'readwrite');
    await tx.objectStore('documents').delete(id);
    await tx.objectStore('summaries').delete(id);
    await tx.done;
  } finally {
    database.close();
  }
}
// Temporary tool handoff only. New document saves use private cloud storage.
let pending: { name: string; bytes: Uint8Array } | undefined;
export function setPendingDocument(value: typeof pending) {
  pending = value;
}
export function getPendingDocument() {
  return pending;
}
