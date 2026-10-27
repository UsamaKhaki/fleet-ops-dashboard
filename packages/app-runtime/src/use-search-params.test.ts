import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSearchParams } from './use-search-params';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useSearchParams', () => {
  it('reads and updates the query string without adding history entries', () => {
    window.history.replaceState(null, '', '/assets?page=2');
    const lengthBefore = window.history.length;
    const { result } = renderHook(() => useSearchParams());

    expect(result.current[0].get('page')).toBe('2');

    act(() => {
      result.current[1]((params) => {
        params.set('page', '3');
        params.set('status', 'idle');
      });
    });

    expect(window.location.search).toBe('?page=3&status=idle');
    expect(result.current[0].get('status')).toBe('idle');
    expect(window.history.length).toBe(lengthBefore);
  });

  it('follows back and forward navigation', () => {
    const { result } = renderHook(() => useSearchParams());
    act(() => {
      window.history.replaceState(null, '', '/assets?q=crane');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0].get('q')).toBe('crane');
  });
});
