import { describe, expect, it } from 'vitest';
import { formatRelative } from './format';

describe('formatRelative', () => {
  const now = Date.parse('2026-10-27T12:00:00.000Z');

  it('picks the largest whole unit', () => {
    expect(formatRelative('2026-10-27T11:59:40.000Z', now)).toBe('just now');
    expect(formatRelative('2026-10-27T11:15:00.000Z', now)).toBe('45 minutes ago');
    expect(formatRelative('2026-10-26T12:00:00.000Z', now)).toBe('yesterday');
  });
});
