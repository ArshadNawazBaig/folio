'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { createQrSvg } from '@/lib/qr-code';
import { friendlyError } from '@/lib/utils';
import { useQrDownloads } from './use-qr-downloads';
import s from './short-links.module.css';

export function ShortLinkQr({ url, alias }: { url: string; alias: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const { svgUrl, pngUrl, error: exportError } = useQrDownloads(svg);
  useEffect(() => {
    let cancelled = false;
    setSvg('');
    setError('');
    // The server supplies a complete URL. Text mode also supports local preview origins.
    void createQrSvg(
      { kind: 'text', value: url, network: '', password: '', encryption: 'WPA', hidden: false },
      '#191919',
      '#ffffff',
    )
      .then((value) => {
        if (!cancelled) setSvg(value);
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return (
    <div className={s.qr}>
      {svg ? (
        <img src={svgUrl} alt={`QR code for ${url}`} width={200} height={200} />
      ) : (
        !error && <p role="status">Generating QR code…</p>
      )}
      <div>
        <strong>Ready for a scan.</strong>
        <p>This code opens your short link. Test it with your camera before sharing or printing.</p>
        <div className={s.actions}>
          {pngUrl ? (
            <a className="button secondary" href={pngUrl} download={`folio-${alias}.png`}>
              <Download size={16} />
              PNG
            </a>
          ) : (
            <button className="button secondary" disabled>
              <Download size={16} />
              {exportError ? 'PNG' : 'Preparing PNG…'}
            </button>
          )}
          {svgUrl ? (
            <a className="button secondary" href={svgUrl} download={`folio-${alias}.svg`}>
              <Download size={16} />
              SVG
            </a>
          ) : (
            <button className="button secondary" disabled>
              <Download size={16} />
              SVG
            </button>
          )}
        </div>
        {(error || exportError) && (
          <p className="error-message" role="alert">
            {error || exportError}
          </p>
        )}
      </div>
    </div>
  );
}
