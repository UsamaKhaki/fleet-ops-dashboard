import type * as AppRuntime from '@fleet/app-runtime';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createTestQueryClient, makePage, makeWorkOrder, withQueryClient } from './test-utils';

vi.mock('@fleet/app-runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof AppRuntime>()),
  useLiveFeed: () => 'open',
}));

function respondWith(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp() {
  return render(<App />, { wrapper: withQueryClient(createTestQueryClient()) });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/maintenance');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('maintenance app', () => {
  it('lists work orders and flags overdue ones', async () => {
    respondWith(
      makePage([
        makeWorkOrder(),
        makeWorkOrder({ id: 'WO-1002', title: 'Coolant leak', dueDate: '2020-01-01' }),
      ]),
    );
    renderApp();

    expect(await screen.findByText('Brake inspection')).toBeInTheDocument();
    expect(screen.getAllByText('Overdue')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Start WO-1001' })).toBeInTheDocument();
  });

  it('explains an empty list without filters', async () => {
    respondWith(makePage([]));
    renderApp();
    expect(await screen.findByText('No work orders yet')).toBeInTheDocument();
  });

  it('validates the new work order form before sending anything', async () => {
    const fetchMock = respondWith(makePage([]));
    renderApp();
    await screen.findByText('No work orders yet');
    const requestsBefore = fetchMock.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'New work order' }));
    await userEvent.type(screen.getByLabelText('Title'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByLabelText('Asset ID')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.length).toBe(requestsBefore);
  });

  it('shows a retryable error', async () => {
    respondWith({ error: 'Cannot reach the fleet API' }, 503);
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the fleet API');
  });
});
