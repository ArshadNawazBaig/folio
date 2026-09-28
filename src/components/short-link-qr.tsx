'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { createQrSvg } from '@/lib/qr-code';
import { download, friendlyError } from '@/lib/utils';
import s from './short-links.module.css';

export function ShortLinkQr({ url, alias }: { url: string; alias: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
  const imageUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '';
  async function png() {
    setBusy(true);
    setError('');
    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not export the QR code.');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 1024, 1024);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Could not export the QR code.'))),
          'image/png',
        ),
      );
      download(blob, `folio-${alias}.png`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.qr}>
      {svg ? (
        <img src={imageUrl} alt={`QR code for ${url}`} width={200} height={200} />
      ) : (
        !error && <p role="status">Generating QR code…</p>
      )}
      <div>
        <strong>Ready for a scan.</strong>
        <p>This code opens your short link. Test it with your camera before sharing or printing.</p>
        <div className={s.actions}>
          <button className="button secondary" disabled={!svg || busy} onClick={() => void png()}>
            <Download size={16} />
            {busy ? 'Exporting…' : 'PNG'}
          </button>
          <button
            className="button secondary"
            disabled={!svg || busy}
            onClick={() =>
              download(new TextEncoder().encode(svg), `folio-${alias}.svg`, 'image/svg+xml')
            }
          >
            <Download size={16} />
            SVG
          </button>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
