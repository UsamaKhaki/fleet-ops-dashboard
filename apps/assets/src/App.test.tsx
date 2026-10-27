import type * as AppRuntime from '@fleet/app-runtime';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createTestQueryClient, makeAsset, makePage, withQueryClient } from './test-utils';

vi.mock('@fleet/app-runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof AppRuntime>()),
  useLiveFeed: () => 'open',
}));

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ),
  );
}

function renderApp() {
  const Wrapper = withQueryClient(createTestQueryClient());
  return render(<App />, { wrapper: Wrapper });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/assets');
  // jsdom lays nothing out; give the scroll container a size so the virtualiser renders rows.
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(640);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1024);
  // Rows are measured after render; without this they all measure 0px tall.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(41);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('assets app', () => {
  it('renders a server page of assets', async () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      makeAsset({ id: `AST-${String(index + 1).padStart(5, '0')}`, name: `Truck ${index + 1}` }),
    );
    respondWith(makePage(items, 5000));
    renderApp();

    expect(await screen.findByText('AST-00001')).toBeInTheDocument();
    // Only the rows inside the viewport (plus overscan) are in the DOM.
    expect(screen.queryByText('AST-00030')).not.toBeInTheDocument();
    expect(screen.getByText('5,000 machines match the current filters')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 100')).toBeInTheDocument();
  });

  it('puts sorting in the URL', async () => {
    respondWith(makePage([makeAsset()]));
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: /engine hours/i }));
    expect(window.location.search).toContain('sort=engineHours');
  });

  it('shows an empty state that can clear the filters', async () => {
    window.history.replaceState(null, '', '/assets?status=offline&q=zzz');
    respondWith(makePage([]));
    renderApp();

    await userEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
    expect(window.location.search).toBe('');
  });

  it('shows the server error with a retry', async () => {
    respondWith(
      { error: 'Simulated failure: the mock server was asked to fail this request' },
      503,
    );
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent('Simulated failure');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
