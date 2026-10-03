'use client';
import { useUiTranslation } from '@/components/ui-language';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  ImageIcon,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { Tool } from '@/lib/tools';
import {
  defaultImageSettings,
  imageExtension,
  processImage,
  type ImageResult,
  type ImageSettings,
} from '@/lib/image-tools';
import { baseName, download, formatBytes, friendlyError } from '@/lib/utils';
import { UploadArea } from './upload';
import { ImageCompressionControls } from './image-compression-controls';
import { ImageEnhancementControls } from './image-enhancement-controls';
import { compressionFileLimit, compressionSize } from '@/lib/image-compression';
import { Dropdown } from './dropdown';
import { Pagination } from './pagination';
import { useRecordPagination } from './use-record-pagination';
import s from './tool-workbench.module.css';

type Source = { id: string; file: File };
type Result = ImageResult & { id: string; name: string };
export function ImageWorkbench({ tool }: { tool: Tool }) {
  const tr = useUiTranslation();

  const enhancement = tool.slug === 'enhance-image';
  const compression = tool.slug === 'compress-images';
  const sizeLabel = compression ? compressionSize : formatBytes;
  const [files, setFiles] = useState<Source[]>([]),
    [results, setResults] = useState<Result[]>([]);
  const [settings, setSettings] = useState<ImageSettings>({
    ...defaultImageSettings,
    mode: enhancement ? 'enhance' : tool.slug === 'compress-images' ? 'compress' : 'convert',
    format:
      tool.slug === 'jpg-to-webp'
        ? 'image/webp'
        : tool.slug === 'webp-to-jpg'
          ? 'image/jpeg'
          : compression
            ? 'auto'
            : 'original',
    targetBytes: compression ? 100_000 : 0,
  });
  const [selected, setSelected] = useState(''),
    [tab, setTab] = useState('result'),
    [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [sources, setSources] = useState<Record<string, string>>({}),
    [outputs, setOutputs] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const pagination = useRecordPagination(files.length);
  useEffect(() => {
    const urls = Object.fromEntries(files.map(({ id, file }) => [id, URL.createObjectURL(file)]));
    setSources(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [files]);
  useEffect(() => {
    const urls = Object.fromEntries(results.map(({ id, blob }) => [id, URL.createObjectURL(blob)]));
    setOutputs(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [results]);
  useEffect(() => () => abort.current?.abort(), []);
  const current = files.find((f) => f.id === selected) || files[0];
  const result = results.find((r) => r.id === current?.id);
  function change<K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) {
    updateSettings({ ...settings, [key]: value });
  }
  function updateSettings(next: ImageSettings) {
    setSettings(next);
    setResults([]);
    setFileErrors({});
    setNotice('');
    setError('');
  }
  function clearAll() {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    setFiles([]);
    setResults([]);
    setFileErrors({});
    setSelected('');
    setError('');
    setNotice('');
  }
  function add(incoming: File[]) {
    if (busy || exporting || !incoming.length) return;
    setError('');
    const accepted = (tool.accept || '').split(',');
    if (files.length + incoming.length > 20) {
      setError(tr('Add up to 20 images per batch.'));
      return;
    }
    if (
      files.reduce((n, f) => n + f.file.size, 0) + incoming.reduce((n, f) => n + f.size, 0) >
      (compression ? 150_000_000 : 150 * 1024 * 1024)
    ) {
      setError(tr('Keep the batch under 150 MB.'));
      return;
    }
    const invalid = incoming.find(
      (f) =>
        !accepted.includes(f.type) ||
        !f.size ||
        f.size > (compression ? compressionFileLimit : 50 * 1024 * 1024),
    );
    if (invalid) {
      setError(
        tr('{value0}: choose a supported image of up to {value1} MB.', {
          value0: invalid.name,
          value1: compression ? 35 : 50,
        }),
      );
      return;
    }
    const next = incoming.map((file) => ({ id: crypto.randomUUID(), file }));
    setFiles((old) => [...old, ...next]);
    setFileErrors({});
    setSelected(next[0]?.id || '');
    setResults([]);
    setNotice('');
  }
  function move(index: number, direction: number) {
    setFiles((old) => {
      const next = [...old];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }
  async function run() {
    if (busy || exporting || !files.length) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    setResults([]);
    setProgress(0);
    setFileErrors({});
    try {
      const next: Result[] = [];
      const failures: Record<string, string> = {};
      for (const [index, { id, file }] of files.entries()) {
        try {
          const output = await processImage(file, settings, controller.signal);
          next.push({
            ...output,
            id,
            name: `${baseName(file.name)}-${enhancement ? 'adjusted' : 'optimized'}.${imageExtension(output.blob.type)}`,
          });
        } catch (error) {
          if (controller.signal.aborted || !compression) throw error;
          failures[id] = friendlyError(error);
        }
        if (controller.signal.aborted) return;
        setProgress(index + 1);
      }
      if (controller.signal.aborted) return;
      setFileErrors(failures);
      setResults(next);
      if (Object.keys(failures).length)
        setError(
          tr(
            '{value0} image(s) could not be processed. Select each image to see its error.{value1}',
            {
              value0: Object.keys(failures).length,
              value1: next.length ? ' Successful results are available to download.' : '',
            },
          ),
        );
      setTab('result');
      setNotice(
        next.length
          ? tr('{value0} {value1} ready. Review the result before downloading.', {
              value0: next.length,
              value1: next.length === 1 ? 'image is' : 'images are',
            })
          : '',
      );
    } catch (e) {
      if (abort.current !== controller) return;
      if (!controller.signal.aborted) setError(friendlyError(e));
      else setNotice(tr('Processing cancelled. You can adjust the settings and try again.'));
    } finally {
      if (abort.current === controller) {
        setBusy(false);
        abort.current = null;
      }
    }
  }
  async function exportAll() {
    if (exporting) return;
    setExporting(true);
    try {
      if (results.length === 1) {
        const r = results[0];
        download(r.blob, r.name);
        return;
      }
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [i, file] of files.entries()) {
        const r = results.find((r) => r.id === file.id);
        if (!r) continue;
        zip.file(`${String(i + 1).padStart(2, '0')}-${r.name}`, await r.blob.arrayBuffer());
      }
      download(
        await zip.generateAsync({ type: 'uint8array' }),
        'folio-images.zip',
        'application/zip',
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className={s.workbench}>
      <ol className={s.steps} aria-label={tr('Image workflow')}>
        {['Choose images', 'Adjust & preview', 'Download'].map((label, i) => (
          <li
            key={label}
            aria-current={i === (results.length ? 2 : files.length ? 1 : 0) ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            {tr(label)}
          </li>
        ))}
      </ol>
      {compression && (
        <ImageCompressionControls
          settings={settings}
          onChange={updateSettings}
          disabled={busy || exporting}
        />
      )}
      {enhancement && (
        <ImageEnhancementControls
          settings={settings}
          onChange={updateSettings}
          disabled={busy || exporting}
        />
      )}
      {(compression || enhancement) && (
        <p className={s.privacy}>
          <ShieldCheck size={17} aria-hidden="true" />
          {tr(
            'Processed on your device. Images are not uploaded or saved by Folio. Up to 20 files per batch.',
          )}
        </p>
      )}
      {!files.length ? (
        <UploadArea
          onFiles={add}
          multiple
          accept={tool.accept}
          maxSizeLabel={compression ? '35 MB' : '50 MB'}
          formatsLabel={
            tool.slug === 'jpg-to-webp'
              ? 'JPG images'
              : tool.slug === 'webp-to-jpg'
                ? 'WEBP images'
                : 'JPG, PNG and WEBP'
          }
        />
      ) : (
        <div className={s.grid}>
          <div className={s.controls}>
            <div className={s.heading}>
              <h2>{tr('Your images')}</h2>
              <button className="button secondary" onClick={clearAll} disabled={exporting}>
                {tr('Clear all')}
              </button>
            </div>
            <div className={s.fileList}>
              {files.slice(pagination.start, pagination.end).map(({ id, file }, offset) => {
                const i = pagination.start + offset;
                const output = results.find((result) => result.id === id);
                return (
                  <div className={s.fileRow} key={id} data-selected={current?.id === id}>
                    <button
                      className={s.fileSelect}
                      onClick={() => setSelected(id)}
                      aria-label={tr('Preview {value0}', { value0: file.name })}
                    >
                      <img src={sources[id]} alt="" />
                      <span>
                        <strong>{file.name}</strong>
                        <small>
                          {sizeLabel(file.size)}
                          {output
                            ? tr(' → {value0}', { value0: sizeLabel(output.blob.size) })
                            : fileErrors[id]
                              ? tr(' · Needs attention')
                              : ''}
                        </small>
                      </span>
                    </button>
                    <div className={s.fileActions}>
                      <button
                        className="icon-button"
                        aria-label={tr('Move {value0} up', { value0: file.name })}
                        disabled={i === 0 || busy || exporting}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={tr('Move {value0} down', { value0: file.name })}
                        disabled={i === files.length - 1 || busy || exporting}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={tr('Remove {value0}', { value0: file.name })}
                        disabled={busy || exporting}
                        onClick={() => {
                          setFiles(files.filter((f) => f.id !== id));
                          setResults([]);
                          setFileErrors({});
                          setNotice('');
                          setError('');
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {files.length > 1 && (
              <Pagination
                {...pagination}
                disabled={busy || exporting}
                label={tr('Image files pagination')}
              />
            )}
            <label className={s.add}>
              <Plus size={16} />
              {tr('Add images')}
              <input
                type="file"
                accept={tool.accept}
                multiple
                disabled={busy || exporting}
                hidden
                onChange={(e) => {
                  add(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
              />
            </label>
            {!enhancement && (
              <fieldset
                className={s.settings}
                disabled={busy || exporting}
                hidden={compression && !!settings.targetBytes}
              >
                <legend>{tr('Output settings')}</legend>
                {!compression && (
                  <Dropdown
                    label={tr('File format')}
                    value={settings.format}
                    onValueChange={(v) => change('format', v as ImageSettings['format'])}
                    disabled={
                      busy || exporting || ['jpg-to-webp', 'webp-to-jpg'].includes(tool.slug)
                    }
                    options={[
                      { value: 'original', label: tr('Keep source format') },
                      { value: 'image/jpeg', label: tr('JPG — compatible, white background') },
                      { value: 'image/png', label: tr('PNG — lossless, transparency') },
                      { value: 'image/webp', label: tr('WEBP — efficient, transparency') },
                    ]}
                  />
                )}
                <Dropdown
                  label={tr('Image dimensions')}
                  value={String(settings.maxDimension)}
                  onValueChange={(v) => change('maxDimension', Number(v))}
                  disabled={busy || exporting}
                  options={[
                    { value: '0', label: tr('Keep original dimensions') },
                    { value: '2560', label: tr('Fit within 2560 pixels') },
                    { value: '1920', label: tr('Fit within 1920 pixels') },
                    { value: '1280', label: tr('Fit within 1280 pixels') },
                  ]}
                />
                <label className={s.slider}>
                  {tr('JPG / WEBP quality')} <output>{Math.round(settings.quality * 100)}%</output>
                  <input
                    type="range"
                    aria-label={tr('JPG / WEBP quality')}
                    min="40"
                    max="100"
                    value={Math.round(settings.quality * 100)}
                    onChange={(e) => change('quality', Number(e.target.value) / 100)}
                  />
                  <small>{tr('PNG uses lossless encoding.')}</small>
                </label>
              </fieldset>
            )}
            <div className={s.actions}>
              <button className="button primary full" onClick={run} disabled={busy || exporting}>
                {busy ? <Loader2 size={18} className="spin" /> : <ImageIcon size={18} />}{' '}
                {busy ? tr('Processing…') : tool.action}
              </button>
              {busy && (
                <button
                  className="button secondary full"
                  onClick={() => {
                    abort.current?.abort();
                    setBusy(false);
                  }}
                >
                  {tr('Cancel processing')}
                </button>
              )}
            </div>
            {busy && (
              <div className={s.progress}>
                <progress max={files.length} value={progress} aria-label={tr('Images processed')} />
                <span role="status">
                  {progress} {tr('of')} {files.length} {tr('images processed')}
                </span>
              </div>
            )}
          </div>
          <div className={s.preview}>
            <div className={s.previewToolbar}>
              <span>{tr('Preview')}</span>
              <div className={s.tabs} aria-label={tr('Compare image')}>
                <button
                  aria-pressed={tab === 'original' || !result}
                  onClick={() => setTab('original')}
                >
                  {tr('Original')}
                </button>
                <button
                  aria-pressed={tab === 'result' && !!result}
                  disabled={!result}
                  onClick={() => setTab('result')}
                >
                  {tr('Result')}
                </button>
              </div>
            </div>
            <div className={s.imageStage}>
              {current && (
                <img
                  src={tab === 'result' && result ? outputs[current.id] : sources[current.id]}
                  alt={tr('{value0} preview of {value1}', {
                    value0: tab === 'result' && result ? 'Processed' : 'Original',
                    value1: current.file.name,
                  })}
                />
              )}
            </div>
            {current && (
              <div className={s.imageDetails}>
                <strong>{current.file.name}</strong>
                {result ? (
                  <>
                    <span>
                      {result.originalWidth} × {result.originalHeight} → {result.width} ×{' '}
                      {result.height} {tr('pixels')}
                    </span>
                    <span>
                      {sizeLabel(current.file.size)} → {sizeLabel(result.blob.size)}
                      {result.blob.size < current.file.size
                        ? tr(' · {value0}% smaller', {
                            value0: Math.round((1 - result.blob.size / current.file.size) * 100),
                          })
                        : ''}
                    </span>
                    {compression && (
                      <span>
                        {imageExtension(result.blob.type).toUpperCase()} ·{' '}
                        {result.blob.size.toLocaleString()} {tr('bytes')}
                        {result.targetBytes
                          ? tr(' · Within {value0} limit', {
                              value0: compressionSize(result.targetBytes),
                            })
                          : ''}
                      </span>
                    )}
                    {result.keptOriginal && (
                      <p>
                        {tr(
                          'Your original already meets these settings. We kept it at its original quality.',
                        )}
                      </p>
                    )}
                    <button
                      className="button secondary"
                      onClick={() => {
                        try {
                          download(result.blob, result.name);
                        } catch (e) {
                          setError(friendlyError(e));
                        }
                      }}
                    >
                      <Download size={16} />
                      {tr('Download this image')}
                    </button>
                  </>
                ) : (
                  <span>
                    {fileErrors[current.id] ||
                      tr('Apply settings to compare the actual exported image.')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="error-message processor-message" role="alert">
          {tr(error)}
        </div>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {tr(notice)}
        </p>
      )}
      {!!results.length && (
        <div className={s.footer}>
          <span>
            <Check size={18} /> {results.length} {results.length === 1 ? tr('image') : tr('images')}{' '}
            {tr('ready')}
          </span>
          <button className="button primary" onClick={exportAll} disabled={exporting}>
            <Download size={17} />
            {results.length > 1 ? tr('Download all (ZIP)') : tr('Download image')}
          </button>
        </div>
      )}
    </div>
  );
}
