import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchInput } from './use-search-input';

interface UrlProps {
  q: string | undefined;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSearchInput', () => {
  it('commits once typing pauses', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useSearchInput(undefined, commit));

    act(() => result.current[1]('cra'));
    act(() => result.current[1]('crane'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('crane');
  });

  it('follows the URL when it is cleared from outside', () => {
    const commit = vi.fn();
    const initialProps: UrlProps = { q: 'volvo' };
    const { result, rerender } = renderHook(({ q }) => useSearchInput(q, commit), {
      initialProps,
    });
    expect(result.current[0]).toBe('volvo');

    rerender({ q: undefined });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current[0]).toBe('');
    expect(commit).not.toHaveBeenCalled();
  });

  it('does not overwrite the input when the URL echoes its own commit', () => {
    const commit = vi.fn();
    const initialProps: UrlProps = { q: undefined };
    const { result, rerender } = renderHook(({ q }) => useSearchInput(q, commit), {
      initialProps,
    });

    act(() => result.current[1]('loader'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ q: 'loader' });

    expect(result.current[0]).toBe('loader');
  });
});
