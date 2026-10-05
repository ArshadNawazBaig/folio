import assert from 'node:assert/strict';
import { mock } from 'node:test';
import JSZip from 'jszip';
import { createSample } from '../../src/lib/sample';
import { remoteTools, outputFormats } from '../../src/lib/remote-types';
import { serverTools } from '../../src/lib/server/tool-catalog';
import { openResult, sealResult } from '../../src/lib/server/result-artifact';
import * as processApi from '../../src/app/api/documents/process/route';
import * as previewApi from '../../src/app/api/documents/preview/route';
import * as exportApi from '../../src/app/api/documents/export/route';
import * as capabilitiesApi from '../../src/app/api/capabilities/route';

delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.DOCUMENT_RESULT_KEY = 'a'.repeat(64);
// Old deployment credentials must never bring retired services back.
process.env.GOOGLE_TRANSLATION_PROJECT_ID = 'folio-fixture';
process.env.GOOGLE_TRANSLATION_CLIENT_EMAIL = 'test@folio-fixture.iam.gserviceaccount.com';
process.env.GOOGLE_TRANSLATION_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----fixture';
process.env.CONVERTAPI_TOKEN = 'convert-fixture-secret';
process.env.CLOUDCONVERT_API_KEY = 'cloudconvert-fixture-secret';
const network = mock.method(globalThis, 'fetch', async () => {
  throw new Error('Retired tools must not make network requests');
});
function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) });
}
try {
  const flags = (await (await capabilitiesApi.GET()).json()).tools;
  assert.equal(serverTools().length, 28);
  for (const tool of remoteTools) {
    assert.equal(flags[tool], false);
    assert.ok(!serverTools().some((entry) => entry.slug === tool));
    const body = new FormData();
    body.append('options', JSON.stringify({ tool }));
    body.append('file', new File(['%PDF-fixture'], 'source.pdf', { type: 'application/pdf' }));
    const request = new Request('http://localhost/api/documents/process', { method: 'POST', body });
    const response = await processApi.POST(request);
    assert.equal(response.status, 410);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match((await response.json()).error, /no longer available/);
    assert.equal(request.bodyUsed, false, 'Reject before reading the upload');
  }
  assert.equal(network.mock.callCount(), 0);

  // Existing saved results retain their expiry, integrity, and download access rules.
  const pdf = await createSample();
  const office = await new JSZip()
    .file('[Content_Types].xml', '<Types/>')
    .generateAsync({ type: 'uint8array' });
  for (const tool of remoteTools) {
    const bytes = tool === 'translate-pdf' ? pdf : office;
    const result = sealResult(bytes, {
      tool,
      filename: `saved.${outputFormats[tool].extension}`,
      pages: 3,
    });
    const opened = openResult(result.artifact);
    assert.deepEqual(opened.bytes, Buffer.from(bytes));
    const exported = await exportApi.POST(
      jsonRequest('/api/documents/export', { artifact: result.artifact }),
    );
    if (process.env.NEXT_PUBLIC_FREE_LAUNCH === 'false') assert.equal(exported.status, 401);
    else {
      assert.equal(exported.status, 200);
      assert.equal(exported.headers.get('content-type'), outputFormats[tool].mime);
      assert.deepEqual(Buffer.from(await exported.arrayBuffer()), Buffer.from(bytes));
    }
    const preview = await previewApi.POST(
      jsonRequest('/api/documents/preview', { artifact: result.artifact, page: 1 }),
    );
    if (tool === 'translate-pdf') {
      assert.equal(preview.status, 200);
      assert.ok((await preview.json()).preview);
    } else assert.equal(preview.status, 400);
  }
  const sealed = sealResult(pdf, { tool: 'translate-pdf', filename: 'result.pdf', pages: 3 });
  for (let index = 0; index < 4; index++) {
    const parts = sealed.artifact.split('.');
    const bytes = Buffer.from(parts[index], 'base64url');
    bytes[0] ^= 1;
    parts[index] = bytes.toString('base64url');
    assert.throws(() => openResult(parts.join('.')), /could not be verified/);
  }
  const clock = mock.method(Date, 'now', () => sealed.expiresAt + 1);
  assert.throws(() => openResult(sealed.artifact), /expired/);
  clock.mock.restore();
  process.env.DOCUMENT_RESULT_KEY = 'b'.repeat(64);
  assert.throws(() => openResult(sealed.artifact), /could not be verified/);
  assert.equal(network.mock.callCount(), 0);
} finally {
  mock.restoreAll();
}
