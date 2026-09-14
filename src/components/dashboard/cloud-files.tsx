'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportWorkspacePdf } from '@/lib/editor-text-client';
import { hasTextChanges } from '@/lib/editor-text';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Download,
  FileText,
  FolderOpen,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Dropdown } from '../dropdown';
import { accountFetch, authClient } from '@/lib/auth-client';
import { useAccount } from '../account-provider';
import { finishCloudUpload, readCloudPdf, uploadCloudPdf } from '@/lib/cloud-client';
import { type CloudDocument } from '@/lib/cloud-types';
import { download, formatBytes } from '@/lib/utils';
import { LegacyDraftImport } from './legacy-draft-import';
import s from './dashboard.module.css';
type Props = {
  files: CloudDocument[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  compact?: boolean;
};
export function CloudFiles({ files, loading, error, refresh, compact = false }: Props) {
  const { user, access } = useAccount();
  const router = useRouter();
  const userId = user?.id;
  const [hasWorkspace, setHasWorkspace] = useState(false);
  useEffect(() => {
    let active = true;
    setHasWorkspace(false);
    if (userId && !loading)
      void authClient()
        ?.storage.from('folio-recovery')
        .info(`${userId}/pro-text.json`)
        .then((result) => {
          if (active) setHasWorkspace(!result.error);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, loading]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<CloudDocument | null>(null);
  const [action, setAction] = useState<'rename' | 'delete'>('rename');
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  async function perform(label: string, work: () => Promise<void>, success = '') {
    setBusy(label);
    setActionError('');
    setNotice('');
    try {
      await work();
      setNotice(success);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'This action could not be completed.');
    } finally {
      setBusy('');
    }
  }
  async function upload(file: File) {
    await perform(
      'Uploading PDF…',
      async () => {
        try {
          await uploadCloudPdf(file, file.name);
        } finally {
          await refresh();
        }
      },
      'PDF saved to your account.',
    );
  }
  const ordered = files
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'size'
          ? b.size - a.size
          : Date.parse(b.updated_at) - Date.parse(a.updated_at),
    );
  const visible = compact ? ordered.filter((f) => f.status === 'ready').slice(0, 4) : ordered;
  return (
    <section className={s.fileSection}>
      <div className={s.sectionHeading}>
        <div>
          <h2>{compact ? 'Recent files' : 'Your files'}</h2>
          <p>
            {compact
              ? 'Your latest work, ready to open.'
              : 'Up to 50 MB per PDF · 500 MB storage · 200 files'}
          </p>
        </div>
        <div className={s.inlineActions}>
          {hasWorkspace && (
            <Link className="button secondary" href="/workspace?draft=pro-text" prefetch={false}>
              <Pencil size={16} /> Resume text workspace
            </Link>
          )}
          {compact && (
            <Link className="text-link" href="/dashboard?view=files">
              View all <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} /> Upload PDF
          </button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Upload PDF to cloud"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void upload(file);
            }}
          />
        </div>
      </div>
      {!compact && (
        <>
          <div className={s.fileControls}>
            <label className={s.search}>
              <Search size={17} />
              <input
                aria-label="Search cloud files"
                placeholder="Find a document…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Dropdown
              label="Sort files"
              hideLabel
              value={sort}
              onValueChange={setSort}
              options={[
                { value: 'recent', label: 'Recently saved' },
                { value: 'name', label: 'Name A–Z' },
                { value: 'size', label: 'Largest first' },
              ]}
            />
            <button
              className="icon-button"
              aria-label="Refresh files"
              disabled={loading || !!busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </>
      )}
      {busy && (
        <p role="status" className={s.notice}>
          {busy} Keep this tab open until it finishes.
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {(actionError || error) && (
        <div role="alert" className="error-message">
          {actionError || error}
          {error && (
            <button className="text-link" onClick={() => void refresh()}>
              Retry loading files
            </button>
          )}
        </div>
      )}
      <>
        {loading && !files.length ? (
          <p className={s.empty} role="status">
            Finding your files…
          </p>
        ) : !error && !visible.length ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <FolderOpen size={30} strokeWidth={1.4} />
            </span>
            <h3>{query ? 'No matching files.' : 'Your next document belongs here.'}</h3>
            <p>
              {query
                ? 'Try another file name.'
                : 'PDFs you open in the editor are saved here automatically. Your files are private to your account.'}
            </p>
            {!query && (
              <button
                className="text-link"
                disabled={!!busy}
                onClick={() => input.current?.click()}
              >
                Upload your first PDF <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        ) : (
          !error && (
            <div className={s.fileList}>
              {visible.map((file) => (
                <div className={s.fileRow} key={file.id}>
                  <span className={s.fileIcon}>
                    <FileText size={23} />
                  </span>
                  <div className={s.fileName}>
                    {file.status === 'ready' ? (
                      <Link href={`/workspace?cloud=${file.id}`}>{file.name}</Link>
                    ) : (
                      <strong>{file.name}</strong>
                    )}
                    <small>
                      {file.status === 'ready'
                        ? `PDF · ${formatBytes(file.size + (file.workspace_size || 0))}`
                        : file.status === 'deleting'
                          ? 'Removal incomplete · retry below'
                          : 'Upload incomplete · finish or remove'}
                    </small>
                  </div>
                  <time className={s.fileDate} dateTime={file.updated_at}>
                    {new Date(file.updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                  <div className={s.fileActions}>
                    {file.status === 'ready' ? (
                      <>
                        <Link
                          className="icon-button"
                          href={`/workspace?cloud=${file.id}`}
                          aria-label={`Open ${file.name}`}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={`Download ${file.name}`}
                          onClick={() =>
                            void perform('Downloading PDF…', async () => {
                              const pdf = await readCloudPdf(file.id);
                              if (pdf.workspace) {
                                if (hasTextChanges(pdf.workspace.state) && !access.pro) {
                                  router.push(`/workspace?cloud=${file.id}&download=1`);
                                  return;
                                }
                                const result = await exportWorkspacePdf(
                                  pdf.bytes,
                                  pdf.name,
                                  pdf.workspace.state,
                                  pdf.workspace.flatten,
                                );
                                download(result.bytes, pdf.name);
                              } else download(pdf.bytes, pdf.name);
                            })
                          }
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={`Rename ${file.name}`}
                          onClick={() => {
                            setSelected(file);
                            setAction('rename');
                            setName(file.name);
                            dialog.current?.showModal();
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    ) : (
                      file.status === 'pending' && (
                        <button
                          className="text-link"
                          disabled={!!busy}
                          onClick={() =>
                            void perform('Checking upload…', async () => {
                              await finishCloudUpload(file.id);
                              await refresh();
                            })
                          }
                        >
                          Finish upload
                        </button>
                      )
                    )}
                    <button
                      className="icon-button danger"
                      disabled={!!busy}
                      aria-label={`Delete ${file.name}`}
                      onClick={() => {
                        setSelected(file);
                        setAction('delete');
                        dialog.current?.showModal();
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </>
      {!compact && <LegacyDraftImport refresh={refresh} />}
      <dialog
        className={`confirm-dialog ${s.dialog}`}
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <button
          className="dialog-close icon-button"
          disabled={!!busy}
          aria-label="Close file dialog"
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
        <h2>{action === 'rename' ? 'A new name for this PDF.' : 'Delete this cloud file?'}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected || busy) return;
            void perform(
              action === 'rename' ? 'Renaming PDF…' : 'Deleting PDF…',
              async () => {
                await accountFetch(
                  `/api/account/files/${selected.id}`,
                  action === 'rename'
                    ? {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'rename', name }),
                      }
                    : { method: 'DELETE' },
                );
                dialog.current?.close();
                await refresh();
              },
              action === 'rename' ? 'File renamed.' : 'Cloud file deleted.',
            );
          }}
        >
          {action === 'rename' ? (
            <label className={s.field}>
              File name
              <input
                autoFocus
                required
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : (
            <p>
              “{selected?.name}” will be permanently removed from your cloud library. Download a
              copy first if you need to keep it.
            </p>
          )}
          {actionError && (
            <p role="alert" className="error-message">
              {actionError}
            </p>
          )}
          <div className={s.inlineActions}>
            <button
              type="button"
              className="button secondary"
              disabled={!!busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={!!busy || (action === 'rename' && !name.trim())}
            >
              {busy ? 'Saving…' : action === 'rename' ? 'Save name' : 'Delete file'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
