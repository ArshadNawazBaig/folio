import 'server-only';
import { ApiError } from './http';
// Instance-wide budget works without trusting spoofable forwarded IP headers.
// Multi-instance production deployments also need an ingress rate limiter.
const windows = new Map<string, { minute: number; count: number }>();
export function publicLimit(
  bucket: 'preview' | 'support' | 'workspace' | 'download',
  limit = bucket === 'preview' ? 90 : 20,
) {
  const minute = Math.floor(Date.now() / 60000);
  const window = windows.get(bucket);
  if (window?.minute === minute && window.count >= limit)
    throw new ApiError(429, 'The service is busy. Please try again in a moment.');
  windows.set(bucket, { minute, count: window?.minute === minute ? window.count + 1 : 1 });
}
