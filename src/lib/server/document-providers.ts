import 'server-only';
import { JWT } from 'google-auth-library';
import { ApiError } from './http';
import { artifactReady } from './result-artifact';
import {
  outputFormats,
  REMOTE_MAX_OUTPUT,
  type RemoteOptions,
  type RemoteTool,
} from '../remote-types';
function translationConfig() {
  const project = process.env.GOOGLE_TRANSLATION_PROJECT_ID || '';
  const email = process.env.GOOGLE_TRANSLATION_CLIENT_EMAIL || '';
  const key = (process.env.GOOGLE_TRANSLATION_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project) &&
    /^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(email) &&
    key.includes('-----BEGIN PRIVATE KEY-----')
    ? { project, email, key }
    : null;
}
let translationAuth: JWT | undefined,
  authSignature = '';
async function translationToken() {
  const config = translationConfig();
  if (!config) throw new ApiError(503, 'Translation is not connected yet.');
  const signature = JSON.stringify(config);
  if (!translationAuth || authSignature !== signature) {
    translationAuth = new JWT({
      email: config.email,
      key: config.key,
      scopes: ['https://www.googleapis.com/auth/cloud-translation'],
      transporterOptions: { timeout: 15_000, retry: false },
    });
    authSignature = signature;
  }
  try {
    const { token } = await translationAuth.getAccessToken();
    if (!token) throw new Error();
    return token;
  } catch {
    throw new ApiError(503, 'The translation service is not available. Contact support.');
  }
}
export function remoteReady(tool: RemoteTool) {
  return (
    artifactReady() &&
    (tool === 'translate-pdf' ? !!translationConfig() : !!process.env.CONVERTAPI_TOKEN)
  );
}
export async function boundedProviderResponse(response: Response, limit = REMOTE_MAX_OUTPUT) {
  if (Number(response.headers.get('content-length') || 0) > limit) {
    await response.body?.cancel();
    throw new ApiError(422, 'The converted file is too large. Try a smaller document.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(502, 'The document service returned an empty file.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(422, 'The converted file is too large. Try a smaller document.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
export async function processRemotePdf(file: File, options: RemoteOptions, signal?: AbortSignal) {
  if (!remoteReady(options.tool))
    throw new ApiError(
      503,
      'This document service is not connected yet. Your original PDF is unchanged.',
    );
  let body: BodyInit, url: URL;
  const headers = new Headers();
  if (options.tool === 'translate-pdf') {
    url = new URL(
      `https://translate.googleapis.com/v3/projects/${translationConfig()!.project}/locations/us-central1:translateDocument`,
    );
    headers.set('Authorization', `Bearer ${await translationToken()}`);
    headers.set('Content-Type', 'application/json');
    const language = (code: string) => (code === 'zh-Hans' ? 'zh-CN' : code);
    body = JSON.stringify({
      documentInputConfig: {
        content: Buffer.from(await file.arrayBuffer()).toString('base64'),
        mimeType: 'application/pdf',
      },
      targetLanguageCode: language(options.target),
      ...(options.source === 'auto' ? {} : { sourceLanguageCode: language(options.source) }),
    });
  } else {
    url = new URL(
      `https://v2.convertapi.com/convert/pdf/to/${outputFormats[options.tool].extension}`,
    );
    headers.set('Authorization', `Bearer ${process.env.CONVERTAPI_TOKEN}`);
    headers.set('Accept', 'application/octet-stream');
    const form = new FormData();
    form.append('File', file, 'document.pdf');
    form.append('StoreFile', 'false');
    body = form;
  }
  try {
    const timeout = AbortSignal.timeout(90_000);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429)
        throw new ApiError(429, 'The document service is busy. Please try again shortly.');
      if ([401, 403].includes(response.status))
        throw new ApiError(503, 'The document service is not available. Contact support.');
      throw new ApiError(
        422,
        'This PDF could not be processed by the document service. Try a smaller, unsigned PDF.',
      );
    }
    let bytes: Buffer;
    if (options.tool === 'translate-pdf') {
      const payload = JSON.parse(
        (await boundedProviderResponse(response, 30 * 1024 * 1024)).toString(),
      );
      const output = payload.documentTranslation;
      if (
        output?.mimeType !== 'application/pdf' ||
        !Array.isArray(output.byteStreamOutputs) ||
        output.byteStreamOutputs.length !== 1 ||
        typeof output.byteStreamOutputs[0] !== 'string' ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(output.byteStreamOutputs[0])
      )
        throw new ApiError(502, 'The translation service returned an unexpected file.');
      bytes = Buffer.from(output.byteStreamOutputs[0], 'base64');
      if (bytes.length > REMOTE_MAX_OUTPUT)
        throw new ApiError(422, 'The translated file is too large. Try a smaller PDF.');
    } else bytes = await boundedProviderResponse(response);
    const isPdf = bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'));
    const isOffice = bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (options.tool === 'translate-pdf' ? !isPdf : !isOffice)
      throw new ApiError(
        502,
        'The document service returned an unexpected file. Please try again.',
      );
    return bytes;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new ApiError(499, 'Processing cancelled.');
    throw new ApiError(
      504,
      'The document service did not finish in time. Please try a smaller PDF.',
    );
  }
}
