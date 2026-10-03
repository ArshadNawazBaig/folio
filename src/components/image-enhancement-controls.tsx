'use client';
import { useUiTranslation } from '@/components/ui-language';

import { defaultImageSettings, type ImageSettings } from '@/lib/image-tools';
import { Dropdown } from './dropdown';
import s from './image-controls.module.css';

export function ImageEnhancementControls({
  settings,
  onChange,
  disabled,
}: {
  settings: ImageSettings;
  onChange: (settings: ImageSettings) => void;
  disabled: boolean;
}) {
  const tr = useUiTranslation();

  function change<K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) {
    onChange({ ...settings, [key]: value });
  }
  return (
    <div className={s.controls}>
      <div className={s.heading}>
        <div>
          <span className="eyebrow">{tr('YOUR IMAGES. A LITTLE CLEARER.')}</span>
          <h2>{tr('Bring out the detail.')}</h2>
          <p>{tr('Choose your adjustments, then add your images.')}</p>
        </div>
        <button
          className={`button secondary ${s.reset}`}
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...settings,
              brightness: defaultImageSettings.brightness,
              contrast: defaultImageSettings.contrast,
              saturation: defaultImageSettings.saturation,
              sharpness: defaultImageSettings.sharpness,
            })
          }
        >
          {tr('Reset adjustments')}
        </button>
      </div>
      <fieldset className={s.adjustments} disabled={disabled}>
        <legend className="sr-only">{tr('Image adjustments')}</legend>
        {(
          [
            ['brightness', 'Brightness', -50, 50, 1],
            ['contrast', 'Contrast', -50, 50, 1],
            ['saturation', 'Saturation', 0, 2, 0.05],
            ['sharpness', 'Sharpness', 0, 1, 0.05],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <label key={key} className={s.slider}>
            <span className={s.sliderLabel}>
              <span>{label}</span>
              <output>{settings[key]}</output>
            </span>
            <input
              type="range"
              aria-label={label}
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(event) => change(key, Number(event.target.value))}
            />
          </label>
        ))}
      </fieldset>
      <div className={s.options}>
        <Dropdown
          label={tr('Image dimensions')}
          value={String(settings.maxDimension)}
          disabled={disabled}
          onValueChange={(value) => change('maxDimension', Number(value))}
          options={[
            { value: '0', label: tr('Keep original dimensions') },
            { value: '2560', label: tr('Fit within 2560 pixels') },
            { value: '1920', label: tr('Fit within 1920 pixels') },
            { value: '1280', label: tr('Fit within 1280 pixels') },
          ]}
        />
        <Dropdown
          label={tr('Output format')}
          value={settings.format}
          disabled={disabled}
          onValueChange={(format) => change('format', format as ImageSettings['format'])}
          options={[
            { value: 'original', label: tr('Keep source format') },
            { value: 'image/jpeg', label: tr('JPG') },
            { value: 'image/png', label: tr('PNG') },
            { value: 'image/webp', label: tr('WebP') },
          ]}
        />
      </div>
      <div className={`${s.options} ${s.quality}`}>
        <label className={s.slider}>
          <span className={s.sliderLabel}>
            <span>{tr('JPG / WEBP quality')}</span>
            <output>{Math.round(settings.quality * 100)}%</output>
          </span>
          <input
            type="range"
            aria-label={tr('JPG / WEBP quality')}
            min="40"
            max="100"
            value={Math.round(settings.quality * 100)}
            disabled={disabled}
            onChange={(event) => change('quality', Number(event.target.value) / 100)}
          />
        </label>
        <p className={s.manualHint}>
          {settings.format === 'image/jpeg'
            ? tr('JPG fills transparent areas with white. Choose PNG or WebP to keep transparency.')
            : tr('PNG uses lossless encoding. PNG and WebP preserve transparent backgrounds.')}
        </p>
      </div>
      <p className={s.note}>
        {tr(
          'Adjustments apply to every image in the batch. Compare Original and Result after selecting Apply adjustments. These controls adjust existing pixels; they do not restore missing detail.',
        )}
      </p>
    </div>
  );
}
