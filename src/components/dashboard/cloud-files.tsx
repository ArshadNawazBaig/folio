'use client';
import { useUiTranslation, useUiLocale } from '../ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import { PAGE_SIZE } from '@/lib/pagination.mjs';
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
import { readWorkspace, uploadGuestPdf, workspaceRequest } from '@/lib/workspace-client';
import { storageLabel, type StorageUsage, type CloudDocument } from '@/lib/cloud-types';
import { clearCloudRecovery, type RecoverySlot } from '@/lib/cloud-recovery';
import { download, formatBytes } from '@/lib/utils';
import { LegacyDraftImport } from './legacy-draft-import';
import { Skeleton, LoadingLabel } from '../skeleton';
import s from './dashboard.module.css';
import { Pagination } from '../pagination';
import { useRecordPagination } from '../use-record-pagination';
type Props = {
  files: CloudDocument[];
  page: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  total: number;
  onPageChange: (page: number) => void;
  query: string;
  sort: string;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: string) => void;
  storage: StorageUsage;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  compact?: boolean;
  guest?: boolean;
};
const recoveryNames: Record<RecoverySlot, string> = {
  'pro-text': 'PDF text editing draft',
  'translate-pdf': 'Translation draft',
  'pdf-to-word': 'Word conversion draft',
  'pdf-to-excel': 'Excel conversion draft',
  'pdf-to-powerpoint': 'PowerPoint conversion draft',
};
export function CloudFiles({
  files,
  page,
  pageSize,
  onPageSizeChange,
  total,
  onPageChange,
  query,
  sort,
  onQueryChange,
  onSortChange,
  storage,
  loading,
  error,
  refresh,
  compact = false,
  guest = false,
}: Props) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const { user, access } = useAccount();
  const router = useRouter();
  const userId = user?.id;
  const recoveryDrafts = storage.recovery.filter((draft) => draft.slot in recoveryNames);
  const recoveryPagination = useRecordPagination(recoveryDrafts.length);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  useEffect(() => {
    let active = true;
    setHasWorkspace(false);
    if (userId && !loading)
      void authClient()
        .then((client) => client?.storage.from('folio-recovery').info(`${userId}/pro-text.json`))
        .then((result) => {
          if (active) setHasWorkspace(!!result && !result.error);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, loading]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<
    (CloudDocument & { recoverySlot?: RecoverySlot }) | null
  >(null);
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
    if (storage.full || (storage.available !== null && file.size > storage.available)) {
      setActionError(
        'There is not enough private storage for this PDF. Delete older files or recovery drafts below, then try again.',
      );
      return;
    }
    await perform(
      'Uploading PDF…',
      async () => {
        try {
          if (guest) await uploadGuestPdf(file);
          else await uploadCloudPdf(file, file.name);
        } finally {
          await refresh();
        }
      },
      guest ? 'PDF saved to your guest workspace for 24 hours.' : 'PDF saved to your account.',
    );
  }
  const visible = files;
  return (
    <section className={s.fileSection}>
      <div className={s.sectionHeading}>
        <div>
          <h2>{compact ? tr('Recent files') : tr('Your files')}</h2>
          <p>
            {compact
              ? tr('Your latest work, ready to open.')
              : tr('Up to 50 MB per PDF · {value0} private storage{value1}', {
                  value0: tr(storageLabel(storage.limit)),
                  value1: storage.limit === null ? '' : tr(' · 200 files'),
                })}
          </p>
        </div>
        <div className={s.inlineActions}>
          {hasWorkspace && (
            <Link
              className="button secondary"
              href={href('/workspace?draft=pro-text')}
              prefetch={false}
            >
              <Pencil size={16} /> {tr('Resume text workspace')}
            </Link>
          )}
          {compact && (
            <Link className="text-link" href={href('/dashboard?view=files')}>
              {tr('View all')} <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="button secondary"
            disabled={!!busy || loading || !!error || storage.full}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} /> {tr('Upload PDF')}
          </button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            aria-label={tr('Upload PDF to cloud')}
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
        <div className={s.fileUsage} aria-busy={loading}>
          {error ? (
            tr('Storage unavailable')
          ) : loading ? (
            <Skeleton width="65%" height={12} />
          ) : (
            <span>
              {storage.limit === null
                ? tr('{value0} used · Unlimited storage', { value0: formatBytes(storage.used) })
                : tr('{value0} of {value1} used', {
                    value0: formatBytes(storage.used),
                    value1: tr(storageLabel(storage.limit)),
                  })}
            </span>
          )}
          {loading && !error ? (
            <Skeleton width="100%" height={6} />
          ) : !error && storage.limit !== null ? (
            <progress
              aria-label={tr('File storage used')}
              value={Math.min(storage.used, storage.limit)}
              max={storage.limit}
            />
          ) : null}
        </div>
      )}
      {storage.full && !loading && !error && (
        <p className="service-note" role="status">
          {tr(
            'Your private storage is full. Delete older files or recovery drafts to upload more. Existing files remain available.',
          )}
        </p>
      )}
      {!compact && (
        <>
          <div className={s.fileControls}>
            <label className={s.search}>
              <Search size={17} />
              <input
                aria-label={tr('Search cloud files')}
                placeholder={tr('Find a document…')}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
              />
            </label>
            <Dropdown
              label={tr('Sort files')}
              hideLabel
              value={sort}
              onValueChange={onSortChange}
              options={[
                { value: 'recent', label: tr('Recently saved') },
                { value: 'name', label: tr('Name A–Z') },
                { value: 'size', label: tr('Largest first') },
              ]}
            />
            <button
              className="icon-button"
              aria-label={tr('Refresh files')}
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
          {tr(busy)} {tr('Keep this tab open until it finishes.')}
        </p>
      )}
      {notice && (
        <p role="status" className={s.notice}>
          {tr(notice)}
        </p>
      )}
      {(actionError || error) && (
        <div role="alert" className="error-message">
          {tr(actionError || error)}
          {error && (
            <button className="text-link" onClick={() => void refresh()}>
              {tr('Retry loading files')}
            </button>
          )}
        </div>
      )}
      <>
        {loading ? (
          <CloudFileSkeleton count={pageSize} />
        ) : !error && !visible.length ? (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <FolderOpen size={30} strokeWidth={1.4} />
            </span>
            <h3>{query ? tr('No matching files.') : tr('Your next document belongs here.')}</h3>
            <p>
              {query
                ? tr('Try another file name.')
                : guest
                  ? tr(
                      'PDFs you open in the editor are saved here automatically. Your files are private to this browser for 24 hours.',
                    )
                  : tr(
                      'PDFs you open in the editor are saved here automatically. Your files are private to your account.',
                    )}
            </p>
            {!query && (
              <button
                className="text-link"
                disabled={!!busy || storage.full}
                onClick={() => input.current?.click()}
              >
                {tr('Upload your first PDF')} <ArrowUpRight size={15} />
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
                        ? tr('PDF · {value0}', {
                            value0: formatBytes(file.size + (file.workspace_size || 0)),
                          })
                        : file.status === 'deleting'
                          ? tr('Removal incomplete · retry below')
                          : tr('Upload incomplete · finish or remove')}
                    </small>
                    {file.guest && file.expires_at && (
                      <small>
                        {tr('Guest file · expires')}{' '}
                        <time dateTime={file.expires_at}>
                          {new Date(file.expires_at).toLocaleString(locale, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      </small>
                    )}
                  </div>
                  <time className={s.fileDate} dateTime={file.updated_at}>
                    {new Date(file.updated_at).toLocaleDateString(locale, {
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
                          aria-label={tr('Open {value0}', { value0: file.name })}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={tr('Download {value0}', { value0: file.name })}
                          onClick={() =>
                            void perform('Downloading PDF…', async () => {
                              const record =
                                file.guest || guest ? await readWorkspace(file.id) : null;
                              const pdf = record
                                ? { ...record, workspace: record.snapshot }
                                : await readCloudPdf(file.id);
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
                          aria-label={tr('Rename {value0}', { value0: file.name })}
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
                              if (file.guest || guest)
                                await workspaceRequest(`/${file.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'finish' }),
                                });
                              else await finishCloudUpload(file.id);
                              await refresh();
                            })
                          }
                        >
                          {tr('Finish upload')}
                        </button>
                      )
                    )}
                    <button
                      className="icon-button danger"
                      disabled={!!busy}
                      aria-label={tr('Delete {value0}', { value0: file.name })}
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
      {!error && (
        <Pagination
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          label={tr('Files pagination')}
          page={page}
          total={total}
          onChange={onPageChange}
          disabled={loading || !!busy}
        />
      )}
      {!compact && !guest && <LegacyDraftImport refresh={refresh} />}
      {!compact && !!storage.recovery.length && (
        <div className={s.recoveryDrafts}>
          <h3>{tr('Recovery drafts')}</h3>
          <p>{tr('Saved work from other tools also counts toward your private storage.')}</p>
          {recoveryDrafts.slice(recoveryPagination.start, recoveryPagination.end).map((draft) => {
            const slot = draft.slot as RecoverySlot;
            const label = tr(recoveryNames[slot]);
            return (
              <div className={s.fileRow} key={slot}>
                <span className={s.fileIcon}>
                  <FileText size={23} />
                </span>
                <div className={s.fileName}>
                  <strong>{label}</strong>
                  <small>{formatBytes(draft.size)}</small>
                </div>
                <button
                  className="icon-button"
                  disabled={!!busy}
                  aria-label={tr('Delete {value0}', { value0: label })}
                  onClick={() => {
                    setSelected({
                      id: slot,
                      recoverySlot: slot,
                      name: label,
                      size: draft.size,
                      status: 'ready',
                      created_at: '',
                      updated_at: '',
                    });
                    setAction('delete');
                    setActionError('');
                    dialog.current?.showModal();
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
          <Pagination
            {...recoveryPagination}
            disabled={!!busy || loading}
            label={tr('Recovery drafts pagination')}
          />
        </div>
      )}
      <dialog
        className={`confirm-dialog ${s.dialog}`}
        aria-labelledby="file-dialog-title"
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="dialog-header">
          <h2 id="file-dialog-title">
            {action === 'rename' ? tr('A new name for this PDF.') : tr('Delete this cloud file?')}
          </h2>
          <button
            className="icon-button"
            disabled={!!busy}
            aria-label={tr('Close file dialog')}
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <form
          className="dialog-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected || busy) return;
            void perform(
              action === 'rename' ? 'Renaming PDF…' : 'Deleting PDF…',
              async () => {
                if (selected.recoverySlot) await clearCloudRecovery(selected.recoverySlot);
                else
                  await (selected.guest || guest ? workspaceRequest : accountFetch)(
                    selected.guest || guest
                      ? `/${selected.id}`
                      : `/api/account/files/${selected.id}`,
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
          <div className="dialog-body">
            {action === 'rename' ? (
              <label className={s.field}>
                {tr('File name')}
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
                {selected?.recoverySlot
                  ? tr(
                      '“{value0}” will be permanently deleted. You will no longer be able to restore this saved draft.',
                      { value0: selected.name },
                    )
                  : tr(
                      '“{value0}” will be permanently removed from your cloud library. Download a copy first if you need to keep it.',
                      { value0: selected?.name ?? '' },
                    )}
              </p>
            )}
            {actionError && (
              <p role="alert" className="error-message">
                {tr(actionError)}
              </p>
            )}
          </div>
          <footer className="dialog-footer">
            <button
              type="button"
              className="button secondary"
              disabled={!!busy}
              onClick={() => dialog.current?.close()}
            >
              {tr('Cancel')}
            </button>
            <button
              className="button primary"
              disabled={!!busy || (action === 'rename' && !name.trim())}
            >
              {busy ? tr('Saving…') : action === 'rename' ? tr('Save name') : tr('Delete file')}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}

export function CloudFileSkeleton({ count = PAGE_SIZE }: { count?: number }) {
  const tr = useUiTranslation();

  return (
    <div className={s.fileList} aria-busy="true" data-loading-files="">
      <LoadingLabel>{tr('Loading your files…')}</LoadingLabel>
      {Array.from({ length: count }, (_, i) => (
        <div className={s.fileRow} key={i} aria-hidden="true">
          <Skeleton width={36} height={43} radius={6} />
          <div className={s.fileName}>
            <strong>
              <Skeleton width={i % 2 ? '52%' : '68%'} height={12} />
            </strong>
            <small>
              <Skeleton width={85} height={10} />
            </small>
          </div>
          <span className={s.fileDate}>
            <Skeleton width={75} height={10} />
          </span>
          <div className={s.fileActions}>
            {[0, 1, 2, 3].map((action) => (
              <span className="icon-button" key={action}>
                <Skeleton width={17} height={17} radius={4} />
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
