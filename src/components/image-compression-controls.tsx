'use client';
import { useUiTranslation } from '@/components/ui-language';

import { useState } from 'react';
import { compressionPresets, compressionSize, targetBytesFromKB } from '@/lib/image-compression';
import type { ImageSettings } from '@/lib/image-tools';
import { Dropdown } from './dropdown';
import s from './image-controls.module.css';

export function ImageCompressionControls({
  settings,
  onChange,
  disabled,
}: {
  settings: ImageSettings;
  onChange: (settings: ImageSettings) => void;
  disabled: boolean;
}) {
  const tr = useUiTranslation();

  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const targeted = !!settings.targetBytes;
  return (
    <div className={s.controls}>
      <div className={s.heading}>
        <div>
          <span className="eyebrow">{tr('SMALLER FILES. SAME NEXT STEP.')}</span>
          <h2>{tr('Make room for your images.')}</h2>
          <p>{tr('Choose a size limit, then add your files.')}</p>
        </div>
        <div className={s.modes} role="group" aria-label={tr('Compression method')}>
          <button
            disabled={disabled}
            aria-pressed={targeted}
            onClick={() => {
              onChange({ ...settings, targetBytes: 100_000 });
              setError('');
            }}
          >
            {tr('Target file size')}
          </button>
          <button
            disabled={disabled}
            aria-pressed={!targeted}
            onClick={() => {
              onChange({
                ...settings,
                targetBytes: 0,
                format: settings.format === 'auto' ? 'original' : settings.format,
              });
              setError('');
            }}
          >
            {tr('Manual settings')}
          </button>
        </div>
      </div>
      {targeted && (
        <>
          <div className={s.presets} role="group" aria-label={tr('Target file size')}>
            {compressionPresets.map((kb) => (
              <button
                key={kb}
                disabled={disabled}
                aria-pressed={settings.targetBytes === kb * 1000}
                onClick={() => {
                  onChange({ ...settings, targetBytes: kb * 1000 });
                  setCustom('');
                  setError('');
                }}
              >
                {kb === 1000 ? tr('1 MB') : tr('{value0} KB', { value0: kb })}
              </button>
            ))}
          </div>
        </>
      )}
      <div className={s.options}>
        {targeted ? (
          <form
            className={s.custom}
            onSubmit={(event) => {
              event.preventDefault();
              if (disabled) return;
              try {
                onChange({ ...settings, targetBytes: targetBytesFromKB(custom) });
                setError('');
              } catch (error) {
                setError(error instanceof Error ? error.message : tr('Enter a valid size.'));
              }
            }}
          >
            <label htmlFor="compression-custom-kb">{tr('Custom size (KB)')}</label>
            <div>
              <input
                id="compression-custom-kb"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={tr('e.g. 75')}
                value={custom}
                maxLength={12}
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby={error ? 'compression-size-error' : undefined}
                onChange={(event) => {
                  setCustom(event.target.value);
                  setError('');
                }}
              />
              <button className="button secondary" disabled={disabled} type="submit">
                {tr('Apply')}
              </button>
            </div>
          </form>
        ) : (
          <p className={s.manualHint}>
            {tr('Choose quality and dimensions after adding your images.')}
          </p>
        )}
        <Dropdown
          label={tr('Output format')}
          value={settings.format}
          disabled={disabled}
          onValueChange={(format) =>
            onChange({ ...settings, format: format as ImageSettings['format'] })
          }
          options={[
            ...(targeted ? [{ value: 'auto', label: tr('Auto — best compression') }] : []),
            { value: 'original', label: tr('Keep source format') },
            { value: 'image/jpeg', label: tr('JPG') },
            { value: 'image/png', label: tr('PNG') },
            { value: 'image/webp', label: tr('WebP') },
          ]}
        />
      </div>
      {error && (
        <p id="compression-size-error" className={s.error} role="alert">
          {tr(error)}
        </p>
      )}
      <p className={s.note} aria-live="polite">
        {targeted
          ? tr(
              'Current limit: {value0} per image. Quality and dimensions adjust automatically. 1 KB = 1,000 bytes.',
              { value0: compressionSize(settings.targetBytes!) },
            )
          : tr(
              'Manual settings let you keep the original dimensions. They do not enforce a file-size limit.',
            )}
      </p>
      <p className={s.note}>
        {settings.format === 'image/jpeg'
          ? tr(
              'JPG fills transparent areas with white. Choose PNG or WebP if you need transparency.',
            )
          : settings.format === 'image/png'
            ? tr(
                'PNG uses lossless encoding, but meeting a small target can reduce pixel dimensions.',
              )
            : tr(
                'Auto, PNG, and WebP keep transparent backgrounds. Review the result before downloading.',
              )}
      </p>
    </div>
  );
}
