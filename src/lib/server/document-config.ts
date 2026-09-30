import 'server-only';
import type { RemoteTool } from '../remote-types';

// Public pages only need availability flags. Keep provider SDKs and document
// processing out of their server bundles and cold starts.
export function translationConfig() {
  const project = process.env.GOOGLE_TRANSLATION_PROJECT_ID || '';
  const email = process.env.GOOGLE_TRANSLATION_CLIENT_EMAIL || '';
  const key = (process.env.GOOGLE_TRANSLATION_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project) &&
    /^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(email) &&
    key.includes('-----BEGIN PRIVATE KEY-----')
    ? { project, email, key }
    : null;
}

export function artifactReady() {
  return /^[0-9a-f]{64}$/i.test(process.env.DOCUMENT_RESULT_KEY || '');
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
