import type { LiveMessage } from '@fleet/api/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createMockServer } from './app.js';
import { FleetStore } from './store.js';

let mock: ReturnType<typeof createMockServer>;
let baseUrl: string;

beforeEach(async () => {
  mock = createMockServer({
    store: new FleetStore({ assetCount: 100, workOrderCount: 20, vehicleCount: 5 }),
    latencyMs: [0, 0],
    telemetryIntervalMs: 0,
    assetChurnIntervalMs: 0,
  });
  const port = await mock.listen(0);
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  await mock.close();
});

function patch(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('REST API', () => {
  it('lists assets with pagination', async () => {
    const response = await fetch(`${baseUrl}/api/assets?page=2&pageSize=10`);
    const body = (await response.json()) as { total: number; items: unknown[]; page: number };
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ total: 100, page: 2 });
    expect(body.items).toHaveLength(10);
  });

  it('rejects an invalid query with field-level issues', async () => {
    const response = await fetch(`${baseUrl}/api/assets?status=flying`);
    const body = (await response.json()) as { issues: { path: string }[] };
    expect(response.status).toBe(400);
    expect(body.issues[0]?.path).toMatch(/^status/);
  });

  it('updates an asset and returns 404 for an unknown one', async () => {
    const ok = await patch('/api/assets/AST-00001', { status: 'maintenance' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: 'AST-00001', status: 'maintenance' });

    const missing = await patch('/api/assets/AST-99999', { status: 'idle' });
    expect(missing.status).toBe(404);
  });

  it('rejects malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/api/assets/AST-00001`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{nope',
    });
    expect(response.status).toBe(400);
  });

  it('fails on purpose when the simulate header asks it to', async () => {
    const failedWrite = await patch(
      '/api/assets/AST-00001',
      { status: 'idle' },
      { 'x-simulate-failure': 'mutations' },
    );
    expect(failedWrite.status).toBe(503);

    const readStillWorks = await fetch(`${baseUrl}/api/assets`, {
      headers: { 'x-simulate-failure': 'mutations' },
    });
    expect(readStillWorks.status).toBe(200);

    const failedRead = await fetch(`${baseUrl}/api/assets`, {
      headers: { 'x-simulate-failure': 'all' },
    });
    expect(failedRead.status).toBe(503);
  });

  it('answers CORS preflight only for local origins', async () => {
    const local = await fetch(`${baseUrl}/api/assets/AST-00001`, {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:6701' },
    });
    expect(local.status).toBe(204);
    expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:6701');

    const remote = await fetch(`${baseUrl}/api/assets`, {
      headers: { origin: 'https://example.com' },
    });
    expect(remote.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('distinguishes unknown routes from wrong methods', async () => {
    expect((await fetch(`${baseUrl}/api/nope`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/assets`, { method: 'DELETE' })).status).toBe(405);
  });
});

describe('live feed', () => {
  function nextMessage(socket: WebSocket): Promise<LiveMessage> {
    return new Promise((resolve) => {
      socket.once('message', (data: Buffer) => resolve(JSON.parse(data.toString()) as LiveMessage));
    });
  }

  it('sends a snapshot on connect and broadcasts asset changes', async () => {
    const socket = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws`);
    const snapshot = await nextMessage(socket);
    expect(snapshot.type).toBe('telemetry.snapshot');
    if (snapshot.type === 'telemetry.snapshot') expect(snapshot.vehicles).toHaveLength(5);

    const update = nextMessage(socket);
    await patch('/api/assets/AST-00002', { status: 'offline' });
    expect(await update).toMatchObject({
      type: 'asset.updated',
      asset: { id: 'AST-00002', status: 'offline' },
    });

    socket.close();
  });

  it('also accepts the /api/ws path the hosted demo uses', async () => {
    const socket = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/ws`);
    const snapshot = await nextMessage(socket);
    expect(snapshot.type).toBe('telemetry.snapshot');
    socket.close();
  });

  it('refuses upgrades on any other path', async () => {
    const socket = new WebSocket(`${baseUrl.replace('http', 'ws')}/api/other`);
    await new Promise<void>((resolve) => socket.once('error', () => resolve()));
    expect(socket.readyState).not.toBe(WebSocket.OPEN);
  });
});
