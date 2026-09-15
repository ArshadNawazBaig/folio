export type QrContent = {
  kind: 'url' | 'text' | 'wifi';
  value: string;
  network: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
};
const escapeWifi = (value: string) => value.replace(/[\\;,:"]/g, '\\$&');
export function qrPayload(content: QrContent) {
  if (content.kind === 'wifi') {
    if (!content.network.trim()) throw new Error('Enter the Wi-Fi network name.');
    if (content.encryption !== 'nopass' && !content.password)
      throw new Error('Enter the Wi-Fi password.');
    return `WIFI:T:${content.encryption};S:${escapeWifi(content.network)};P:${content.encryption === 'nopass' ? '' : escapeWifi(content.password)};H:${content.hidden};;`;
  }
  if (!content.value.trim())
    throw new Error(
      content.kind === 'url' ? 'Enter a website address.' : 'Enter text for your QR code.',
    );
  if (new TextEncoder().encode(content.value).length > 1200)
    throw new Error('Keep the QR content under 1,200 bytes for a readable code.');
  if (content.kind === 'url') {
    let url: URL;
    try {
      url = new URL(content.value.includes('://') ? content.value : `https://${content.value}`);
    } catch {
      throw new Error('Enter a valid website address.');
    }
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !url.hostname.includes('.') ||
      url.username ||
      url.password
    )
      throw new Error('Use an HTTP or HTTPS website address.');
    return url.href;
  }
  return content.value;
}
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export async function createQrSvg(content: QrContent, dark: string, light: string) {
  if (![dark, light].every((c) => /^#[0-9a-f]{6}$/i.test(c)))
    throw new Error('Choose valid QR colors.');
  if ((luminance(light) + 0.05) / (luminance(dark) + 0.05) < 4.5)
    throw new Error('Choose a darker code and a lighter background for reliable scanning.');
  const QRCode = await import('qrcode');
  const code = QRCode.create(qrPayload(content), { errorCorrectionLevel: 'H' });
  const size = code.modules.size,
    extent = size + 8;
  let path = '';
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (code.modules.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges"><rect width="${extent}" height="${extent}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
