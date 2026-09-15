import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { createQrSvg, qrPayload, type QrContent } from '../src/lib/qr-code';

const content: QrContent = {
  kind: 'url',
  value: 'example.com/tools?from=qr',
  network: '',
  password: '',
  encryption: 'WPA',
  hidden: false,
};
test('exported QR codes independently decode URLs, Unicode text and escaped Wi-Fi credentials', async () => {
  for (const item of [
    content,
    {
      ...content,
      kind: 'text' as const,
      value: 'Hello — مرحبا — こんにちは <script>literal text</script>',
    },
    {
      ...content,
      kind: 'wifi' as const,
      network: 'Studio; east',
      password: 'p:a;ss,word',
      hidden: true,
    },
    {
      ...content,
      kind: 'wifi' as const,
      network: 'Guest',
      password: 'ignored',
      encryption: 'nopass' as const,
    },
  ]) {
    const svg = await createQrSvg(item, '#202522', '#ffffff');
    assert.ok(!svg.includes('<script>'));
    const { data, info } = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.equal(decoded?.data, qrPayload(item));
  }
  assert.equal(qrPayload(content), 'https://example.com/tools?from=qr');
  assert.ok(
    qrPayload({ ...content, kind: 'wifi', network: 'Guest', encryption: 'nopass' }).includes(
      ';P:;',
    ),
  );
});
test('QR generation rejects unsafe destinations, low contrast and unreadably large content', async () => {
  for (const value of [
    '',
    'ftp://example.com/a',
    'https://user:secret@example.com/',
    'javascript:alert(1)',
  ])
    assert.throws(() => qrPayload({ ...content, value }));
  assert.throws(
    () => qrPayload({ ...content, kind: 'text', value: '🌿'.repeat(301) }),
    /1,200 bytes/,
  );
  assert.throws(() => qrPayload({ ...content, kind: 'wifi' }), /network name/);
  await assert.rejects(createQrSvg(content, '#ffffff', '#202522'), /darker/);
  await assert.rejects(createQrSvg(content, '#eeeeee', '#ffffff'), /darker/);
  await assert.rejects(createQrSvg(content, 'red', '#ffffff'), /valid QR colors/);
});
