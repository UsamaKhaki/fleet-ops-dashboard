import { FAILURE_MODE_EVENT } from '@fleet/api';
import { ErrorState } from '@fleet/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import { createQueryClient } from './query-client';

interface MicroFrontendOptions {
  /** Shown in the crash fallback, e.g. "Assets". */
  title: string;
  /** id of the element in the root config's index.html that this app renders into. */
  mountPoint: 'shell' | 'app-content';
  App: React.ComponentType;
}

/**
 * Wraps an app in the providers every micro-frontend needs and returns its single-spa
 * lifecycles. The query client lives at module level so the cache survives navigating
 * away from the app and back.
 */
export function createMicroFrontend({ title, mountPoint, App }: MicroFrontendOptions) {
  const queryClient = createQueryClient();

  function Root() {
    useEffect(() => {
      const refetch = () => void queryClient.invalidateQueries();
      window.addEventListener(FAILURE_MODE_EVENT, refetch);
      return () => window.removeEventListener(FAILURE_MODE_EVENT, refetch);
    }, []);

    return (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  }

  return singleSpaReact({
    React,
    ReactDOMClient,
    rootComponent: Root,
    errorBoundary: (error) => (
      <ErrorState
        title={`${title} crashed`}
        description={error.message}
        onRetry={() => window.location.reload()}
      />
    ),
    domElementGetter: () => {
      const element = document.getElementById(mountPoint);
      if (!element) throw new Error(`#${mountPoint} is missing from the root config`);
      return element;
    },
  });
}
