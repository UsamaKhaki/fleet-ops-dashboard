import { ApiError } from '@fleet/api';
import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 1;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // A 4xx will fail the same way again, so only retry network and server errors.
        retry: (failureCount, error) => {
          const isClientError =
            error instanceof ApiError && error.status >= 400 && error.status < 500;
          return !isClientError && failureCount < MAX_RETRIES;
        },
      },
    },
  });
}
