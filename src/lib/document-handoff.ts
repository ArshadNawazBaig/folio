import { openDB } from 'idb';

type Handoff = { name: string; bytes: Uint8Array; expires: number };
const lifetime = 5 * 60 * 1000;

// Changing a root layout reloads the document. A short-lived handoff preserves
// the selected file until the destination editor or tool can consume it, without putting
// document contents in a URL or creating a persistent local workspace.
async function database() {
  return openDB('folio-document-handoff', 1, {
    upgrade(db) {
      db.createObjectStore('files');
    },
  });
}

export async function stageDocumentHandoff(file: Omit<Handoff, 'expires'>) {
  const db = await database();
  try {
    const transaction = db.transaction('files', 'readwrite');
    let cursor = await transaction.store.openCursor();
    while (cursor) {
      if ((cursor.value as Handoff).expires <= Date.now()) await cursor.delete();
      cursor = await cursor.continue();
    }
    const token = crypto.randomUUID();
    await transaction.store.put({ ...file, expires: Date.now() + lifetime }, token);
    await transaction.done;
    return token;
  } finally {
    db.close();
  }
}

export async function takeDocumentHandoff(
  token: string,
): Promise<Omit<Handoff, 'expires'> | undefined> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return undefined;
  const db = await database();
  try {
    const transaction = db.transaction('files', 'readwrite');
    const file = (await transaction.store.get(token)) as Handoff | undefined;
    await transaction.store.delete(token);
    await transaction.done;
    return file && file.expires > Date.now() ? { name: file.name, bytes: file.bytes } : undefined;
  } finally {
    db.close();
  }
}
