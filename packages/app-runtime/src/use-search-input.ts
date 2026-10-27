import { useEffect, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';

/**
 * A search box backed by the URL: the input updates on every keystroke, and the query
 * string (and so the request) only after typing pauses.
 */
export function useSearchInput(committed: string | undefined, commit: (q: string) => void) {
  const [value, setValue] = useState(committed ?? '');
  const debounced = useDebouncedValue(value, 300);

  useEffect(() => {
    if (debounced !== (committed ?? '')) commit(debounced);
    // Only a new debounced value should commit, not the URL catching up after a commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [value, setValue] as const;
}
