import type { LiveMessage } from '@fleet/api/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowserMock } from './browser.js';
import { FleetStore } from './store.js';

let uninstall: () => void;
const realFetch = globalThis.fetch;

beforeEach(() => {
  uninstall = installBrowserMock({
    store: new FleetStore({ assetCount: 100, workOrderCount: 20, vehicleCount: 5 }),
    latencyMs: [0, 0],
    telemetryIntervalMs: 0,
    assetChurnIntervalMs: 0,
  });
});

afterEach(() => {
  uninstall();
  vi.restoreAllMocks();
});

function openSocket() {
  const socket = new WebSocket('wss://example.test/api/ws');
  const messages: LiveMessage[] = [];
  socket.addEventListener('message', (event: MessageEvent) => {
    messages.push(JSON.parse(String(event.data)) as LiveMessage);
  });
  return { socket, messages };
}

describe('browser mock', () => {
  it('answers API calls from a relative URL', async () => {
    const response = await fetch('http://localhost/api/assets?page=2&pageSize=10');
    const body = (await response.json()) as { total: number; items: unknown[] };
    expect(response.status).toBe(200);
    expect(body.total).toBe(100);
    expect(body.items).toHaveLength(10);
  });

  it('rejects an invalid body the same way the server does', async () => {
    const response = await fetch('http://localhost/api/assets/AST-00001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'flying' }),
    });
    expect(response.status).toBe(400);
  });

  it('honours the simulated failure header', async () => {
    const response = await fetch('http://localhost/api/assets/AST-00001', {
      method: 'PATCH',
      headers: { 'x-simulate-failure': 'mutations' },
      body: JSON.stringify({ status: 'maintenance' }),
    });
    expect(response.status).toBe(503);
  });

  it('sends a snapshot, then pushes changes to the live feed', async () => {
    const { socket, messages } = openSocket();
    await vi.waitFor(() => expect(messages[0]?.type).toBe('telemetry.snapshot'));

    await fetch('http://localhost/api/assets/AST-00001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'maintenance' }),
    });
    expect(messages.at(-1)?.type).toBe('asset.updated');
    socket.close();
  });

  it('passes other requests through and restores the originals', async () => {
    const passthrough = vi.fn(() => Promise.resolve(new Response('ok')));
    uninstall();
    globalThis.fetch = passthrough;
    uninstall = installBrowserMock({ telemetryIntervalMs: 0, assetChurnIntervalMs: 0 });

    await fetch('http://localhost/not-the-api');
    expect(passthrough).toHaveBeenCalledOnce();

    uninstall();
    expect(globalThis.fetch).toBe(passthrough);
    globalThis.fetch = realFetch;
    uninstall = () => {};
  });
});
