import { ApiError } from '@fleet/api';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from './query-client';

describe('createQueryClient retry policy', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('expected a retry function');

  it('does not retry client errors', () => {
    expect(retry(0, new ApiError('Validation failed', 400))).toBe(false);
  });

  it('retries server and network errors once', () => {
    expect(retry(0, new ApiError('Simulated failure', 503))).toBe(true);
    expect(retry(0, new ApiError('offline', 0))).toBe(true);
    expect(retry(1, new ApiError('Simulated failure', 503))).toBe(false);
  });
});
