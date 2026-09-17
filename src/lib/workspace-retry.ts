import { connectionInterrupted, retryTransientRequest } from './request-retry';

// Only use for reads or idempotent workspace operations. A retry must retain
// the same document ID and write ID if the server saved before the response failed.
export async function retryWorkspaceOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await retryTransientRequest(operation);
  } catch (error) {
    if (connectionInterrupted(error)) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      throw new Error(
        offline
          ? 'You are offline. Reconnect to save your changes.'
          : 'The connection was interrupted before saving could be confirmed. Check your connection and retry saving.',
        { cause: error },
      );
    }
    throw error;
  }
}
