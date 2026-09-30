'use client';
import { useEffect, useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { createQrSvg, type QrContent } from '@/lib/qr-code';
import { friendlyError } from '@/lib/utils';
import { Dropdown } from './dropdown';
import { useQrDownloads } from './use-qr-downloads';
import s from './tool-workbench.module.css';
export function QrWorkbench() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [content, setContent] = useState<QrContent>({
    kind: 'url',
    value: '',
    network: '',
    password: '',
    encryption: 'WPA',
    hidden: false,
  });
  const [dark, setDark] = useState('#202522'),
    [light, setLight] = useState('#ffffff'),
    [size, setSize] = useState('1024');
  const [svg, setSvg] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const { svgUrl, pngUrl, error: exportError } = useQrDownloads(svg, Number(size));
  useEffect(() => {
    setSvg('');
    setError('');
  }, [content, dark, light]);
  async function generate() {
    setBusy(true);
    setError('');
    try {
      setSvg(await createQrSvg(content, dark, light));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.workbench}>
      <div className={s.grid}>
        <div className={s.controls}>
          <div className={s.heading}>
            <h2>Create your QR code</h2>
          </div>
          <fieldset className={s.settings} disabled={!ready || busy}>
            <Dropdown
              label="QR content"
              value={content.kind}
              onValueChange={(kind) => setContent({ ...content, kind: kind as QrContent['kind'] })}
              options={[
                { value: 'url', label: 'Website address' },
                { value: 'text', label: 'Plain text' },
                { value: 'wifi', label: 'Wi-Fi network' },
              ]}
            />
            {content.kind === 'wifi' ? (
              <>
                <label>
                  Network name
                  <input
                    value={content.network}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(e) => setContent({ ...content, network: e.target.value })}
                  />
                </label>
                <Dropdown
                  label="Security"
                  value={content.encryption}
                  onValueChange={(encryption) =>
                    setContent({ ...content, encryption: encryption as QrContent['encryption'] })
                  }
                  options={[
                    { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
                    { value: 'WEP', label: 'WEP' },
                    { value: 'nopass', label: 'Open network' },
                  ]}
                />
                {content.encryption !== 'nopass' && (
                  <label>
                    Network password
                    <input
                      type="password"
                      value={content.password}
                      autoComplete="new-password"
                      maxLength={100}
                      onChange={(e) => setContent({ ...content, password: e.target.value })}
                    />
                  </label>
                )}
                <label className={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={content.hidden}
                    onChange={(e) => setContent({ ...content, hidden: e.target.checked })}
                  />
                  Hidden network
                </label>
              </>
            ) : (
              <label>
                {content.kind === 'url' ? 'Website address' : 'Text'}
                <textarea
                  rows={content.kind === 'url' ? 2 : 5}
                  value={content.value}
                  maxLength={1200}
                  placeholder={
                    content.kind === 'url' ? 'https://example.com' : 'What would you like to share?'
                  }
                  onChange={(e) => setContent({ ...content, value: e.target.value })}
                />
              </label>
            )}
            <div className={s.colors}>
              <label>
                Code color
                <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
              </label>
              <label>
                Background
                <input type="color" value={light} onChange={(e) => setLight(e.target.value)} />
              </label>
            </div>
            <Dropdown
              label="PNG dimensions"
              value={size}
              onValueChange={setSize}
              options={['512', '1024', '2048'].map((value) => ({
                value,
                label: `${value} × ${value} pixels`,
              }))}
            />
          </fieldset>
          <button className="button primary full" onClick={generate} disabled={!ready || busy}>
            <QrCode size={18} />
            {busy ? 'Generating…' : 'Generate QR code'}
          </button>
          <p className={s.hint}>Static codes. No tracking redirect. No Folio expiry.</p>
        </div>
        <div className={s.preview}>
          <div className={s.previewToolbar}>Your QR code</div>
          <div className={s.qrStage}>
            {svgUrl ? (
              <img src={svgUrl} alt="Generated QR code" />
            ) : (
              <div className={s.empty}>
                <QrCode size={64} />
                <p>Your code will appear here.</p>
              </div>
            )}
          </div>
          <p className={s.hint}>
            Keep the clear border around the code. Test the download with your camera before
            printing.
          </p>
        </div>
      </div>
      {(error || exportError) && (
        <div className="error-message processor-message" role="alert">
          {error || exportError}
        </div>
      )}
      {svg && (
        <div className={s.footer}>
          <span role="status">Your QR code is ready.</span>
          <div className={s.downloads}>
            <a className="button secondary" href={svgUrl} download="folio-qr-code.svg">
              <Download size={17} />
              Download SVG
            </a>
            {pngUrl ? (
              <a className="button primary" href={pngUrl} download="folio-qr-code.png">
                <Download size={17} />
                Download PNG
              </a>
            ) : (
              <button className="button primary" disabled>
                <Download size={17} />
                {exportError ? 'Download PNG' : 'Preparing PNG…'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
