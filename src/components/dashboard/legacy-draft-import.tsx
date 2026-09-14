'use client';
import { useEffect, useState } from 'react';
import { CloudUpload, FileText } from 'lucide-react';
import { deleteDocument, getDocument, getDocuments } from '@/lib/storage';
import { uploadCloudPdf } from '@/lib/cloud-client';
import { pdfName } from '@/lib/cloud-types';
import { runPdf } from '@/lib/pdf-client';
import {
  legacyRecoveries,
  migrateLegacyRecovery,
  type LegacyRecovery,
} from '@/lib/legacy-recovery';
import type { DocumentSummary } from '@/lib/types';
import s from './dashboard.module.css';
export function LegacyDraftImport({ refresh }: { refresh: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<DocumentSummary[]>([]);
  const [recoveries, setRecoveries] = useState<LegacyRecovery[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    getDocuments()
      .then((data) => {
        if (active) setDrafts(data);
      })
      .catch(() => {
        if (active) setError('Older browser drafts could not be checked. Reload to try again.');
      });
    legacyRecoveries()
      .then((data) => {
        if (active) setRecoveries(data);
      })
      .catch(() => {
        if (active)
          setError('Older checkout recovery drafts could not be checked. Reload to try again.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function move(id: string) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const draft = await getDocument(id);
      if (!draft) throw new Error('This older draft could not be found.');
      const pdf = await runPdf('edit', [{ bytes: draft.bytes, name: draft.name }], {
        state: draft.state,
      });
      await uploadCloudPdf(
        new Blob([new Uint8Array(pdf.bytes)], { type: 'application/pdf' }),
        pdfName(draft.name),
      );
      try {
        await deleteDocument(id);
      } catch {
        throw new Error(
          'Your PDF was saved to cloud storage, but the older browser copy could not be removed.',
        );
      }
      setDrafts((current) => current.filter((doc) => doc.id !== id));
      setNotice('Your PDF and its edits have been moved to cloud storage.');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'The draft could not be moved. Your browser copy is still available.',
      );
    } finally {
      await refresh();
      setBusy('');
    }
  }
  async function moveRecovery(draft: LegacyRecovery) {
    setBusy(draft.kind);
    setError('');
    setNotice('');
    try {
      await migrateLegacyRecovery(draft);
      setRecoveries((current) => current.filter((item) => item.kind !== draft.kind));
      setNotice(
        `Your recovery draft is saved in cloud storage. Open ${draft.kind === 'pro-text' ? 'Edit PDF text' : draft.kind.replaceAll('-', ' ')} to continue working.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your older recovery draft could not be moved.');
    } finally {
      setBusy('');
    }
  }
  const count = drafts.length + recoveries.length;
  if (!count && !error && !notice) return null;
  return (
    <div className={s.legacyImport}>
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!!count && (
        <>
          <h3>Move your older drafts to cloud storage.</h3>
          <p className={s.deviceNote}>
            {count} older draft{count === 1 ? '' : 's'} found in this browser. Each PDF, including
            its edits, is removed from the browser only after a successful upload to your account.
          </p>
          <button
            className="text-link"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide older drafts' : 'Review older drafts'}
          </button>
          {expanded && (
            <div className={s.fileList}>
              {drafts.map((doc) => (
                <div className={s.fileRow} key={doc.id}>
                  <FileText size={20} />
                  <div className={s.fileName}>
                    <strong>{doc.name}</strong>
                    <small>{doc.pageCount} pages</small>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!!busy}
                    onClick={() => void move(doc.id)}
                  >
                    <CloudUpload size={16} />
                    {busy === doc.id ? 'Moving…' : 'Move to cloud'}
                  </button>
                </div>
              ))}
              {recoveries.map((draft) => (
                <div className={s.fileRow} key={draft.kind}>
                  <FileText size={20} />
                  <div className={s.fileName}>
                    <strong>{draft.name}</strong>
                    <small>Checkout recovery · {draft.kind.replaceAll('-', ' ')}</small>
                  </div>
                  <button
                    className="button secondary"
                    disabled={!!busy}
                    onClick={() => void moveRecovery(draft)}
                  >
                    <CloudUpload size={16} />
                    {busy === draft.kind ? 'Moving…' : 'Move recovery to cloud'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
