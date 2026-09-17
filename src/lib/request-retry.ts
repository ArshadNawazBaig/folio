export function connectionInterrupted(error: unknown) {
  return (
    error instanceof Error &&
    /^(?:Load failed|Failed to fetch|fetch failed|Network request failed|NetworkError.*|The network connection was lost\.?)$/i.test(
      error.message,
    )
  );
}

// Opt in only for reads or idempotent operations. Keep body consumption inside
// the operation so a connection lost after response headers also recovers.
export async function retryTransientRequest<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      signal?.throwIfAborted();
      const temporary =
        error instanceof Error &&
        'status' in error &&
        [408, 500, 502, 503, 504].includes(Number(error.status));
      if (
        (!connectionInterrupted(error) && !temporary) ||
        attempt === 2 ||
        (typeof navigator !== 'undefined' && navigator.onLine === false)
      )
        throw error;
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(signal!.reason);
        };
        const timer = setTimeout(
          () => {
            signal?.removeEventListener('abort', abort);
            resolve();
          },
          400 * 2 ** attempt,
        );
        signal?.addEventListener('abort', abort, { once: true });
      });
    }
  }
}
