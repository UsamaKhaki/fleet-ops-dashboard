import { useEffect, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';

/**
 * A search box backed by the URL: the input updates on every keystroke, and the query
 * string (and so the request) only after typing pauses. When the URL changes from
 * elsewhere, such as "Clear filters" or the back button, the input follows it.
 */
export function useSearchInput(committed: string | undefined, commit: (q: string) => void) {
  const urlValue = committed ?? '';
  const [value, setValue] = useState(urlValue);
  const [lastSeenUrlValue, setLastSeenUrlValue] = useState(urlValue);
  const debounced = useDebouncedValue(value, 300);

  // Adjust state while rendering rather than in an effect, so the input never shows a
  // stale value for a frame. A change that matches what we just committed is our own echo.
  if (urlValue !== lastSeenUrlValue) {
    setLastSeenUrlValue(urlValue);
    if (urlValue !== debounced) setValue(urlValue);
  }

  useEffect(() => {
    if (debounced !== urlValue) commit(debounced);
    // Only a new debounced value should commit, not the URL catching up after a commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [value, setValue] as const;
}
