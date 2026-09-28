'use client';

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
  function change<K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) {
    onChange({ ...settings, [key]: value });
  }
  return (
    <div className={s.controls}>
      <div className={s.heading}>
        <div>
          <span className="eyebrow">YOUR IMAGES. A LITTLE CLEARER.</span>
          <h2>Bring out the detail.</h2>
          <p>Choose your adjustments, then add your images.</p>
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
          Reset adjustments
        </button>
      </div>
      <fieldset className={s.adjustments} disabled={disabled}>
        <legend className="sr-only">Image adjustments</legend>
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
          label="Image dimensions"
          value={String(settings.maxDimension)}
          disabled={disabled}
          onValueChange={(value) => change('maxDimension', Number(value))}
          options={[
            { value: '0', label: 'Keep original dimensions' },
            { value: '2560', label: 'Fit within 2560 pixels' },
            { value: '1920', label: 'Fit within 1920 pixels' },
            { value: '1280', label: 'Fit within 1280 pixels' },
          ]}
        />
        <Dropdown
          label="Output format"
          value={settings.format}
          disabled={disabled}
          onValueChange={(format) => change('format', format as ImageSettings['format'])}
          options={[
            { value: 'original', label: 'Keep source format' },
            { value: 'image/jpeg', label: 'JPG' },
            { value: 'image/png', label: 'PNG' },
            { value: 'image/webp', label: 'WebP' },
          ]}
        />
      </div>
      <div className={`${s.options} ${s.quality}`}>
        <label className={s.slider}>
          <span className={s.sliderLabel}>
            <span>JPG / WEBP quality</span>
            <output>{Math.round(settings.quality * 100)}%</output>
          </span>
          <input
            type="range"
            aria-label="JPG / WEBP quality"
            min="40"
            max="100"
            value={Math.round(settings.quality * 100)}
            disabled={disabled}
            onChange={(event) => change('quality', Number(event.target.value) / 100)}
          />
        </label>
        <p className={s.manualHint}>
          {settings.format === 'image/jpeg'
            ? 'JPG fills transparent areas with white. Choose PNG or WebP to keep transparency.'
            : 'PNG uses lossless encoding. PNG and WebP preserve transparent backgrounds.'}
        </p>
      </div>
      <p className={s.note}>
        Adjustments apply to every image in the batch. Compare Original and Result after selecting
        Apply adjustments. These controls adjust existing pixels; they do not restore missing
        detail.
      </p>
    </div>
  );
}
