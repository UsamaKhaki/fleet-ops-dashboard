import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('single-spa:routing-event', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('single-spa:routing-event', onChange);
  };
}

export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}
