import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';

/** Retry a read once for transient failures only (network / 5xx). 4xx answers are final. */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  return error instanceof ApiError && (error.isNetwork || error.status >= 500);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      // Mutations are NEVER retried automatically: a retried money/moderation action must be a deliberate click.
      mutations: { retry: false },
    },
  });
}
