import 'server-only';
import { ApiError } from './http';
// Instance-wide budget works without trusting spoofable forwarded IP headers.
// Multi-instance production deployments also need an ingress rate limiter.
const windows = new Map<string, { minute: number; count: number }>();
export function publicLimit(
  bucket: 'preview' | 'support' | 'remote' | 'workspace',
  limit = bucket === 'preview' ? 90 : 20,
) {
  const minute = Math.floor(Date.now() / 60000);
  const window = windows.get(bucket);
  if (window?.minute === minute && window.count >= limit)
    throw new ApiError(429, 'The service is busy. Please try again in a moment.');
  windows.set(bucket, { minute, count: window?.minute === minute ? window.count + 1 : 1 });
}

let remoteDay = 0,
  remoteCount = 0,
  remoteRunning = 0;
export function claimRemoteProcessing() {
  publicLimit('remote', 6);
  const day = Math.floor(Date.now() / 86400000);
  if (remoteDay !== day) {
    remoteDay = day;
    remoteCount = 0;
  }
  const configured = Number(process.env.DOCUMENT_DAILY_BUDGET || 50);
  const budget =
    Number.isInteger(configured) && configured >= 0 && configured <= 10000 ? configured : 50;
  if (remoteCount >= budget || remoteRunning >= 2)
    throw new ApiError(
      429,
      'The document service has reached its processing limit. Please try again later.',
    );
  remoteCount++;
  remoteRunning++;
  return () => {
    remoteRunning--;
  };
}
