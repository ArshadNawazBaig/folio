'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  ImageIcon,
  Loader2,
  Plus,
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
import { Dropdown } from './dropdown';
import { Pagination } from './pagination';
import { useRecordPagination } from './use-record-pagination';
import s from './tool-workbench.module.css';

type Source = { id: string; file: File };
type Result = ImageResult & { id: string; name: string };
export function ImageWorkbench({ tool }: { tool: Tool }) {
  const enhancement = tool.slug === 'enhance-image';
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
          : 'original',
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
    setSettings((s) => ({ ...s, [key]: value }));
    setResults([]);
    setNotice('');
  }
  function add(incoming: File[]) {
    if (busy) return;
    setError('');
    const accepted = (tool.accept || '').split(',');
    if (files.length + incoming.length > 20) {
      setError('Add up to 20 images per batch.');
      return;
    }
    if (
      files.reduce((n, f) => n + f.file.size, 0) + incoming.reduce((n, f) => n + f.size, 0) >
      150 * 1024 * 1024
    ) {
      setError('Keep the batch under 150 MB.');
      return;
    }
    const invalid = incoming.find(
      (f) => !accepted.includes(f.type) || !f.size || f.size > 50 * 1024 * 1024,
    );
    if (invalid) {
      setError(`${invalid.name}: choose a supported image of up to 50 MB.`);
      return;
    }
    const next = incoming.map((file) => ({ id: crypto.randomUUID(), file }));
    setFiles((old) => [...old, ...next]);
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
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    setNotice('');
    setResults([]);
    setProgress(0);
    try {
      const next: Result[] = [];
      for (const [index, { id, file }] of files.entries()) {
        const output = await processImage(file, settings, controller.signal);
        next.push({
          ...output,
          id,
          name: `${baseName(file.name)}-${enhancement ? 'adjusted' : 'optimized'}.${imageExtension(output.blob.type)}`,
        });
        setProgress(index + 1);
      }
      if (controller.signal.aborted) return;
      setResults(next);
      setTab('result');
      setNotice(
        `${next.length} ${next.length === 1 ? 'image is' : 'images are'} ready. Review the result before downloading.`,
      );
    } catch (e) {
      if (!controller.signal.aborted) setError(friendlyError(e));
      else setNotice('Processing cancelled. You can adjust the settings and try again.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function exportAll() {
    try {
      if (results.length === 1) {
        const r = results[0];
        download(new Uint8Array(await r.blob.arrayBuffer()), r.name, r.blob.type);
        return;
      }
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [i, file] of files.entries()) {
        const r = results.find((r) => r.id === file.id)!;
        zip.file(`${String(i + 1).padStart(2, '0')}-${r.name}`, await r.blob.arrayBuffer());
      }
      download(
        await zip.generateAsync({ type: 'uint8array' }),
        'folio-images.zip',
        'application/zip',
      );
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  return (
    <div className={s.workbench}>
      <ol className={s.steps} aria-label="Image workflow">
        {['Choose images', 'Adjust & preview', 'Download'].map((label, i) => (
          <li
            key={label}
            aria-current={i === (results.length ? 2 : files.length ? 1 : 0) ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {!files.length ? (
        <UploadArea
          onFiles={add}
          multiple
          accept={tool.accept}
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
              <h2>Your images</h2>
              <span>
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className={s.fileList}>
              {files.slice(pagination.start, pagination.end).map(({ id, file }, offset) => {
                const i = pagination.start + offset;
                return (
                  <div className={s.fileRow} key={id} data-selected={current?.id === id}>
                    <button
                      className={s.fileSelect}
                      onClick={() => setSelected(id)}
                      aria-label={`Preview ${file.name}`}
                    >
                      <img src={sources[id]} alt="" />
                      <span>
                        <strong>{file.name}</strong>
                        <small>{formatBytes(file.size)}</small>
                      </span>
                    </button>
                    <div className={s.fileActions}>
                      <button
                        className="icon-button"
                        aria-label={`Move ${file.name} up`}
                        disabled={i === 0 || busy}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Move ${file.name} down`}
                        disabled={i === files.length - 1 || busy}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${file.name}`}
                        disabled={busy}
                        onClick={() => {
                          setFiles(files.filter((f) => f.id !== id));
                          setResults([]);
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
              <Pagination {...pagination} disabled={busy} label="Image files pagination" />
            )}
            <label className={s.add}>
              <Plus size={16} />
              Add images
              <input
                type="file"
                accept={tool.accept}
                multiple
                disabled={busy}
                hidden
                onChange={(e) => {
                  add(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
              />
            </label>
            <fieldset className={s.settings} disabled={busy}>
              <legend>Output settings</legend>
              <Dropdown
                label="File format"
                value={settings.format}
                onValueChange={(v) => change('format', v as ImageSettings['format'])}
                disabled={busy || ['jpg-to-webp', 'webp-to-jpg'].includes(tool.slug)}
                options={[
                  { value: 'original', label: 'Keep source format' },
                  { value: 'image/jpeg', label: 'JPG — compatible, white background' },
                  { value: 'image/png', label: 'PNG — lossless, transparency' },
                  { value: 'image/webp', label: 'WEBP — efficient, transparency' },
                ]}
              />
              <Dropdown
                label="Image dimensions"
                value={String(settings.maxDimension)}
                onValueChange={(v) => change('maxDimension', Number(v))}
                disabled={busy}
                options={[
                  { value: '0', label: 'Keep original dimensions' },
                  { value: '2560', label: 'Fit within 2560 pixels' },
                  { value: '1920', label: 'Fit within 1920 pixels' },
                  { value: '1280', label: 'Fit within 1280 pixels' },
                ]}
              />
              <label className={s.slider}>
                JPG / WEBP quality <output>{Math.round(settings.quality * 100)}%</output>
                <input
                  type="range"
                  aria-label="JPG / WEBP quality"
                  min="40"
                  max="100"
                  value={Math.round(settings.quality * 100)}
                  onChange={(e) => change('quality', Number(e.target.value) / 100)}
                />
                <small>PNG uses lossless encoding.</small>
              </label>
              {enhancement && (
                <>
                  {(
                    [
                      ['brightness', 'Brightness', -50, 50, 1],
                      ['contrast', 'Contrast', -50, 50, 1],
                      ['saturation', 'Saturation', 0, 2, 0.05],
                      ['sharpness', 'Sharpness', 0, 1, 0.05],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key} className={s.slider}>
                      {label}
                      <output>{settings[key]}</output>
                      <input
                        type="range"
                        aria-label={label}
                        min={min}
                        max={max}
                        step={step}
                        value={settings[key]}
                        onChange={(e) => change(key, Number(e.target.value))}
                      />
                    </label>
                  ))}
                  <button
                    className="button secondary full"
                    type="button"
                    onClick={() => {
                      setSettings({
                        ...settings,
                        brightness: 0,
                        contrast: 0,
                        saturation: 1,
                        sharpness: 0,
                      });
                      setResults([]);
                    }}
                  >
                    Reset adjustments
                  </button>
                </>
              )}
            </fieldset>
            <div className={s.actions}>
              <button className="button primary full" onClick={run} disabled={busy}>
                {busy ? <Loader2 size={18} className="spin" /> : <ImageIcon size={18} />}{' '}
                {busy ? 'Processing…' : tool.action}
              </button>
              {busy && (
                <button
                  className="button secondary full"
                  onClick={() => {
                    abort.current?.abort();
                    setBusy(false);
                  }}
                >
                  Cancel processing
                </button>
              )}
            </div>
            {busy && (
              <div className={s.progress}>
                <progress max={files.length} value={progress} aria-label="Images processed" />
                <span role="status">
                  {progress} of {files.length} images processed
                </span>
              </div>
            )}
          </div>
          <div className={s.preview}>
            <div className={s.previewToolbar}>
              <span>Preview</span>
              <div className={s.tabs} aria-label="Compare image">
                <button
                  aria-pressed={tab === 'original' || !result}
                  onClick={() => setTab('original')}
                >
                  Original
                </button>
                <button
                  aria-pressed={tab === 'result' && !!result}
                  disabled={!result}
                  onClick={() => setTab('result')}
                >
                  Result
                </button>
              </div>
            </div>
            <div className={s.imageStage}>
              {current && (
                <img
                  src={tab === 'result' && result ? outputs[current.id] : sources[current.id]}
                  alt={`${tab === 'result' && result ? 'Processed' : 'Original'} preview of ${current.file.name}`}
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
                      {result.height} pixels
                    </span>
                    <span>
                      {formatBytes(current.file.size)} → {formatBytes(result.blob.size)}
                      {result.blob.size < current.file.size
                        ? ` · ${Math.round((1 - result.blob.size / current.file.size) * 100)}% smaller`
                        : ''}
                    </span>
                    {result.keptOriginal && (
                      <p>Your original was already smaller. We kept it at its original quality.</p>
                    )}
                    <button
                      className="button secondary"
                      onClick={async () => {
                        try {
                          download(
                            new Uint8Array(await result.blob.arrayBuffer()),
                            result.name,
                            result.blob.type,
                          );
                        } catch (e) {
                          setError(friendlyError(e));
                        }
                      }}
                    >
                      <Download size={16} />
                      Download this image
                    </button>
                  </>
                ) : (
                  <span>Apply settings to compare the actual exported image.</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="error-message processor-message" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      {!!results.length && (
        <div className={s.footer}>
          <span>
            <Check size={18} /> {results.length} {results.length === 1 ? 'image' : 'images'} ready
          </span>
          <button className="button primary" onClick={exportAll}>
            <Download size={17} />
            {results.length > 1 ? 'Download all (ZIP)' : 'Download image'}
          </button>
        </div>
      )}
    </div>
  );
}
