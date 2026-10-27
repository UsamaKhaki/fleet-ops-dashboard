import type * as AppRuntime from '@fleet/app-runtime';
import type { LiveMessage, LiveStatus } from '@fleet/api';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { makeVehicle } from './test-utils';

interface FakeLiveFeed {
  status: LiveStatus;
  emit: (message: LiveMessage) => void;
}

const live = vi.hoisted((): FakeLiveFeed => ({ status: 'open', emit: () => {} }));

vi.mock('@fleet/app-runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof AppRuntime>()),
  useLiveFeed: (onMessage: (message: LiveMessage) => void) => {
    live.emit = onMessage;
    return live.status;
  },
}));

beforeEach(() => {
  live.status = 'open';
});

describe('live map', () => {
  it('waits for the first snapshot, then lists the vehicles', () => {
    render(<App />);
    expect(screen.getByLabelText('Waiting for the first positions')).toBeInTheDocument();

    act(() =>
      live.emit({
        type: 'telemetry.snapshot',
        vehicles: [
          makeVehicle(),
          makeVehicle({ assetId: 'AST-00002', name: 'Loader 0002', status: 'idle', speedKph: 0 }),
        ],
      }),
    );

    expect(screen.getByRole('img', { name: /map of 2 vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /truck 0001/i })).toBeInTheDocument();
  });

  it('marks a vehicle that stopped reporting', () => {
    render(<App />);
    act(() =>
      live.emit({
        type: 'telemetry.snapshot',
        vehicles: [makeVehicle({ reportedAt: new Date(Date.now() - 60_000).toISOString() })],
      }),
    );
    expect(screen.getByText(/no position for 60s/i)).toBeInTheDocument();
    expect(screen.getByText(/1 without a recent position/i)).toBeInTheDocument();
  });

  it('shows an error when the feed cannot connect at all', () => {
    live.status = 'reconnecting';
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Live feed unavailable');
  });

  it('filters by status on the client', async () => {
    render(<App />);
    act(() =>
      live.emit({
        type: 'telemetry.snapshot',
        vehicles: [makeVehicle({ status: 'offline' })],
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /status/i }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Active' }));

    expect(screen.getByText('No vehicles with this status')).toBeInTheDocument();
  });
});
