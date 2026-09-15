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
    (tool === 'translate-pdf'
      ? !!translationConfig()
      : !!(process.env.CLOUDCONVERT_API_KEY?.trim() || process.env.CONVERTAPI_TOKEN))
  );
}
export function conversionProvider() {
  return process.env.CLOUDCONVERT_API_KEY?.trim() ? 'CloudConvert' : 'ConvertAPI';
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
async function cloudConvert(file: File, options: RemoteOptions, signal?: AbortSignal) {
  const key = process.env.CLOUDCONVERT_API_KEY!.trim();
  const timeout = AbortSignal.timeout(90_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let jobId = '';
  async function jobRequest(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: combined,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429)
        throw new ApiError(429, 'The document service is busy. Please try again shortly.');
      if ([401, 402, 403].includes(response.status))
        throw new ApiError(503, 'The document service is not available. Contact support.');
      throw new ApiError(
        422,
        'The conversion service could not process this PDF. Try a smaller, unsigned document.',
      );
    }
    return JSON.parse((await boundedProviderResponse(response, 1024 * 1024)).toString()).data;
  }
  try {
    if (file.size > 10 * 1024 * 1024) throw new ApiError(413, 'Choose a PDF smaller than 10 MB.');
    const job = await jobRequest('https://api.cloudconvert.com/v2/jobs', {
      tasks: {
        'import-file': {
          operation: 'import/base64',
          file: Buffer.from(await file.arrayBuffer()).toString('base64'),
          filename: 'document.pdf',
        },
        'convert-file': {
          operation: 'convert',
          input: 'import-file',
          input_format: 'pdf',
          output_format: outputFormats[options.tool].extension,
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file',
          inline: false,
          archive_multiple_files: false,
        },
      },
    });
    if (typeof job?.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(job.id))
      throw new ApiError(502, 'The conversion service returned an unexpected job.');
    jobId = job.id;
    // Keep the job ID before waiting so failed/cancelled requests can clean up provider files.
    const completed = ['finished', 'error'].includes(job.status)
      ? job
      : await jobRequest(`https://sync.api.cloudconvert.com/v2/jobs/${jobId}`);
    if (completed?.status !== 'finished')
      throw new ApiError(422, 'This PDF could not be converted. Try a smaller, unsigned document.');
    const task = Array.isArray(completed.tasks)
      ? completed.tasks.find(
          (t: { name?: string; operation?: string }) =>
            t.name === 'export-file' && t.operation === 'export/url',
        )
      : undefined;
    const outputs = task?.result?.files;
    if (
      task?.status !== 'finished' ||
      !Array.isArray(outputs) ||
      outputs.length !== 1 ||
      typeof outputs[0]?.url !== 'string'
    )
      throw new ApiError(502, 'The conversion service did not return a single finished file.');
    const url = new URL(outputs[0].url);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'storage.cloudconvert.com' ||
      url.port ||
      url.username ||
      url.password
    )
      throw new ApiError(502, 'The conversion service returned an unexpected download address.');
    const response = await fetch(url, {
      // Never forward API credentials to a download URL.
      signal: combined,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new ApiError(502, 'The converted file could not be retrieved. Please try again.');
    }
    const bytes = await boundedProviderResponse(response);
    if (!bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
      throw new ApiError(502, 'The conversion service returned an unexpected file.');
    return bytes;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new ApiError(499, 'Processing cancelled.');
    throw new ApiError(504, 'The conversion service did not finish in time. Try a smaller PDF.');
  } finally {
    if (jobId) {
      try {
        const response = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(3000),
          redirect: 'error',
          cache: 'no-store',
        });
        await response.body?.cancel();
      } catch {
        // Best-effort cleanup. CloudConvert also expires completed jobs after 24 hours.
      }
    }
  }
}
export async function processRemotePdf(file: File, options: RemoteOptions, signal?: AbortSignal) {
  if (!remoteReady(options.tool))
    throw new ApiError(
      503,
      'This document service is not connected yet. Your original PDF is unchanged.',
    );
  if (options.tool !== 'translate-pdf' && process.env.CLOUDCONVERT_API_KEY?.trim())
    return cloudConvert(file, options, signal);
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
