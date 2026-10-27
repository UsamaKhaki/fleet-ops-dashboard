import { useCallback, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'fleet-ops:search-params';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSearch = () => window.location.search;

/**
 * Table state (page, filters, sort) lives in the query string so a filtered view can be
 * shared or reloaded. Updates replace the history entry rather than adding one per keystroke.
 */
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, getSearch, () => '');

  const update = useCallback((change: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    change(params);
    const next = params.toString();
    const url = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [new URLSearchParams(search), update] as const;
}
