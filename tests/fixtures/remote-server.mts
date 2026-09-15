import { JWT } from 'google-auth-library';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { createSample } from '../../src/lib/sample';
import { remoteOptions, remoteTools } from '../../src/lib/remote-types';
import { processRemotePdf, boundedProviderResponse } from '../../src/lib/server/document-providers';
import { openResult, sealResult } from '../../src/lib/server/result-artifact';
import * as processApi from '../../src/app/api/documents/process/route';
import * as previewApi from '../../src/app/api/documents/preview/route';
import * as exportApi from '../../src/app/api/documents/export/route';
import * as capabilitiesApi from '../../src/app/api/capabilities/route';
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.GOOGLE_TRANSLATION_PRIVATE_KEY;
delete process.env.CONVERTAPI_TOKEN;
delete process.env.CLOUDCONVERT_API_KEY;
process.env.DOCUMENT_RESULT_KEY = 'a'.repeat(64);
process.env.DOCUMENT_DAILY_BUDGET = '50';
assert.ok(
  Object.values((await (await capabilitiesApi.GET()).json()).tools).every((v) => v === false),
);
process.env.GOOGLE_TRANSLATION_PROJECT_ID = 'folio-fixture';
process.env.GOOGLE_TRANSLATION_CLIENT_EMAIL = 'test@folio-fixture.iam.gserviceaccount.com';
process.env.GOOGLE_TRANSLATION_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----fixture';
mock.method(JWT.prototype, 'getAccessToken', async () => ({ token: 'translation-fixture-token' }));
process.env.CONVERTAPI_TOKEN = 'convert-fixture-secret';
assert.ok(
  Object.values((await (await capabilitiesApi.GET()).json()).tools).every((v) => v === true),
);
const pdf = await createSample(),
  file = new File([pdf.slice().buffer], 'source.pdf', { type: 'application/pdf' });
const zip = new JSZip();
zip.file('[Content_Types].xml', '<Types/>');
zip.file('word/document.xml', '<document/>');
const office = await zip.generateAsync({ type: 'nodebuffer' });
const originalFetch = globalThis.fetch;
let providerCalls = 0,
  status = 200;
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init),
    url = new URL(req.url);
  providerCalls++;
  assert.ok(
    ['translate.googleapis.com', 'v2.convertapi.com'].includes(url.hostname),
    'No real provider requests',
  );
  assert.equal(init?.redirect, 'error');
  if (url.hostname === 'v2.convertapi.com') {
    const form = await req.formData();
    assert.match(url.pathname, /^\/convert\/pdf\/to\/(docx|xlsx|pptx)$/);
    assert.equal(req.headers.get('authorization'), 'Bearer convert-fixture-secret');
    assert.equal(req.headers.get('accept'), 'application/octet-stream');
    assert.equal(form.get('StoreFile'), 'false');
    assert.equal((form.get('File') as File).type, 'application/pdf');
  } else {
    assert.equal(
      url.pathname,
      '/v3/projects/folio-fixture/locations/us-central1:translateDocument',
    );
    assert.equal(req.headers.get('authorization'), 'Bearer translation-fixture-token');
    const body = await req.json();
    assert.equal(body.targetLanguageCode, 'es');
    assert.equal('sourceLanguageCode' in body, false);
    assert.equal(body.documentInputConfig.mimeType, 'application/pdf');
    assert.deepEqual(Buffer.from(body.documentInputConfig.content, 'base64'), Buffer.from(pdf));
    assert.equal('documentOutputConfig' in body, false);
  }
  if (status !== 200) return new Response('secret internal details', { status });
  return url.hostname === 'v2.convertapi.com'
    ? new Response(Uint8Array.from(office).buffer)
    : Response.json({
        documentTranslation: {
          mimeType: 'application/pdf',
          byteStreamOutputs: [Buffer.from(pdf).toString('base64')],
        },
      });
};
function processRequest(options: unknown, next = file) {
  const body = new FormData();
  body.append('file', next);
  body.append('options', JSON.stringify(options));
  return new Request('http://localhost/api/documents/process', { method: 'POST', body });
}
function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) });
}
try {
  for (const tool of remoteTools) {
    const response = await processApi.POST(processRequest({ tool }));
    assert.equal(response.status, 200, await response.clone().text());
    const result = await response.json();
    assert.equal(result.tool, tool);
    assert.equal(result.pages, 3);
    assert.equal(result.source, 'auto');
    assert.equal(result.target, 'es');
    assert.equal('bytes' in result, false);
    assert.equal(result.artifact.includes('%PDF'), false);
    const opened = openResult(result.artifact);
    assert.deepEqual(opened.bytes, Buffer.from(tool === 'translate-pdf' ? pdf : office));
    assert.ok(result.expiresAt > Date.now() + 86_000_000);
    assert.equal(
      (await exportApi.POST(jsonRequest('/api/documents/export', { artifact: result.artifact })))
        .status,
      401,
    );
    const preview = await previewApi.POST(
      jsonRequest('/api/documents/preview', { artifact: result.artifact, page: 1 }),
    );
    if (tool === 'translate-pdf') {
      assert.equal(preview.status, 200);
      assert.ok((await preview.json()).preview);
      assert.ok(result.preview.preview);
      assert.equal(
        (
          await previewApi.POST(
            jsonRequest('/api/documents/preview', { artifact: result.artifact, page: 99 }),
          )
        ).status,
        422,
      );
    } else assert.equal(preview.status, 400);
  }
  assert.equal(providerCalls, 4);
  assert.equal(
    (await processApi.POST(processRequest({ tool: 'translate-pdf', source: 'es', target: 'es' })))
      .status,
    400,
  );
  assert.equal(
    (await processApi.POST(processRequest({ tool: 'translate-pdf', target: 'unsupported' })))
      .status,
    400,
  );
  assert.equal(
    (
      await processApi.POST(
        processRequest({ tool: 'pdf-to-word' }, new File(['not a pdf'], 'bad.pdf')),
      )
    ).status,
    422,
  );
  const big = await PDFDocument.create();
  for (let i = 0; i < 21; i++) big.addPage();
  assert.equal(
    (
      await processApi.POST(
        processRequest(
          { tool: 'translate-pdf' },
          new File([(await big.save()) as Uint8Array<ArrayBuffer>], 'pages.pdf'),
        ),
      )
    ).status,
    422,
  );
  assert.equal(providerCalls, 4, 'Invalid PDFs must never incur provider calls');
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
  process.env.DOCUMENT_RESULT_KEY = 'a'.repeat(64);
  for (const failure of [401, 403, 429, 500]) {
    status = failure;
    await assert.rejects(
      processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' })),
      (error: Error) =>
        !error.message.includes('secret') &&
        /not available|busy|could not be processed/.test(error.message),
    );
  }
  await assert.rejects(boundedProviderResponse(new Response('12345'), 4), /too large/);
  await assert.rejects(
    boundedProviderResponse(new Response('a', { headers: { 'content-length': '100' } }), 4),
    /too large/,
  );
  process.env.GOOGLE_TRANSLATION_PROJECT_ID = '../evil';
  assert.equal((await (await capabilitiesApi.GET()).json()).tools['translate-pdf'], false);

  delete process.env.CONVERTAPI_TOKEN;
  process.env.CLOUDCONVERT_API_KEY = 'cloudconvert-fixture-secret';
  assert.equal((await (await capabilitiesApi.GET()).json()).tools['pdf-to-word'], true);
  const jobId = '9a160154-58e2-437f-9b6b-19d63b1f59e3';
  let exportUrl = `https://storage.cloudconvert.com/${jobId}/output.docx`,
    jobStatus = 'finished',
    downloadBytes = office,
    deleted = 0,
    apiStatus = 200;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    calls.push(`${request.method} ${url.hostname}`);
    assert.equal(init?.redirect, 'error');
    if (url.hostname === 'storage.cloudconvert.com') {
      assert.equal(request.headers.get('authorization'), null);
      return new Response(Uint8Array.from(downloadBytes).buffer);
    }
    assert.ok(
      ['api.cloudconvert.com', 'sync.api.cloudconvert.com'].includes(url.hostname),
      'No real requests or arbitrary output URLs',
    );
    assert.equal(request.headers.get('authorization'), 'Bearer cloudconvert-fixture-secret');
    if (request.method === 'DELETE') {
      assert.equal(url.pathname, `/v2/jobs/${jobId}`);
      deleted++;
      return new Response(null, { status: 204 });
    }
    if (apiStatus !== 200) return new Response('private provider detail', { status: apiStatus });
    if (request.method === 'POST') {
      assert.equal(url.hostname, 'api.cloudconvert.com');
      const body = await request.json();
      assert.equal(body.tasks['import-file'].operation, 'import/base64');
      assert.deepEqual(Buffer.from(body.tasks['import-file'].file, 'base64'), Buffer.from(pdf));
      assert.equal(body.tasks['convert-file'].input, 'import-file');
      assert.ok(['docx', 'xlsx', 'pptx'].includes(body.tasks['convert-file'].output_format));
      assert.equal(body.tasks['export-file'].input, 'convert-file');
      return Response.json({ data: { id: jobId, status: 'processing' } });
    }
    assert.equal(url.hostname, 'sync.api.cloudconvert.com');
    return Response.json({
      data: {
        id: jobId,
        status: jobStatus,
        tasks: [
          {
            name: 'export-file',
            operation: 'export/url',
            status: 'finished',
            result: { files: [{ filename: 'output.docx', url: exportUrl }] },
          },
        ],
      },
    });
  };
  for (const tool of ['pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint'] as const)
    assert.deepEqual(await processRemotePdf(file, remoteOptions.parse({ tool })), office);
  assert.equal(deleted, 3, 'Provider source and output jobs are cleaned after downloads');
  for (const badUrl of [
    'http://storage.cloudconvert.com/file',
    'https://storage.cloudconvert.com.evil.test/file',
    'https://127.0.0.1/file',
    'https://user:password@storage.cloudconvert.com/file',
  ]) {
    exportUrl = badUrl;
    await assert.rejects(
      processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' })),
      /unexpected download address/,
    );
  }
  assert.equal(deleted, 7, 'Rejected output URLs still clean up the job');
  assert.equal(calls.filter((call) => call.endsWith('storage.cloudconvert.com')).length, 3);
  exportUrl = `https://storage.cloudconvert.com/${jobId}/output.docx`;
  jobStatus = 'error';
  await assert.rejects(
    processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' })),
    /could not be converted/,
  );
  jobStatus = 'finished';
  downloadBytes = Buffer.from('<html>provider error</html>');
  await assert.rejects(
    processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' })),
    /unexpected file/,
  );
  assert.equal(deleted, 9);
  for (const status of [401, 402, 403, 429, 500]) {
    apiStatus = status;
    await assert.rejects(
      processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' })),
      (e: Error) =>
        !e.message.includes('private') && /not available|busy|could not process/.test(e.message),
    );
  }
  apiStatus = 200;
  const cloudFetch = globalThis.fetch;
  const cancelled = new AbortController();
  globalThis.fetch = async (input, init) => {
    if (new URL(new Request(input, init).url).hostname === 'sync.api.cloudconvert.com') {
      cancelled.abort();
      throw new DOMException('Aborted', 'AbortError');
    }
    return cloudFetch(input, init);
  };
  await assert.rejects(
    processRemotePdf(file, remoteOptions.parse({ tool: 'pdf-to-word' }), cancelled.signal),
    /Processing cancelled/,
  );
  assert.equal(deleted, 10, 'Cancellation uses a separate cleanup signal to delete the known job');
} finally {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
}
