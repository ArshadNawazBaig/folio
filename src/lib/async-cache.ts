/** A short-lived cache that shares concurrent reads without caching failures. */
export function createAsyncCache<T>(read: () => Promise<T>, lifetimeMs: number) {
  let cached: { value: T; expires: number } | undefined;
  let pending: Promise<T> | undefined;

  function peek() {
    return cached && cached.expires > Date.now() ? cached.value : undefined;
  }

  return {
    peek,
    clear() {
      cached = undefined;
      pending = undefined;
    },
    async get(fresh = false): Promise<T> {
      if (!fresh) {
        const value = peek();
        if (value !== undefined) return value;
        if (pending) return pending;
      }
      const request = read();
      pending = request;
      try {
        const value = await request;
        // A clear or forced refresh may have superseded this read while it ran.
        if (pending === request) cached = { value, expires: Date.now() + lifetimeMs };
        return value;
      } finally {
        if (pending === request) pending = undefined;
      }
    },
  };
}
