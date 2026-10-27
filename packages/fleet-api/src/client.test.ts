import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fleetApi } from './client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const asset = {
  id: 'AST-0001',
  name: 'Truck 1',
  type: 'truck',
  status: 'active',
  site: 'North Yard',
  make: 'Volvo',
  model: 'FH16',
  year: 2021,
  engineHours: 1200,
  fuelPercent: 64,
  updatedAt: '2026-10-01T08:00:00.000Z',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fleetApi', () => {
  it('serialises list queries and validates the page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [asset], total: 1, page: 2, pageSize: 25 }));
    vi.stubGlobal('fetch', fetchMock);

    const page = await fleetApi.listAssets({ page: 2, pageSize: 25, status: ['active'] });

    expect(page.items[0]?.id).toBe('AST-0001');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://localhost:6709/api/assets?page=2&pageSize=25&status=active',
    );
  });

  it('turns an error body into an ApiError with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Asset not found' }, 404)),
    );

    const error = await fleetApi.updateAsset('nope', { status: 'idle' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'Asset not found' });
  });

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fleetApi.listWorkOrders({})).rejects.toMatchObject({ status: 0 });
  });

  it('rejects a response that does not match the schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: 'oops' })));

    await expect(fleetApi.listAssets({})).rejects.toThrow(/Unexpected response shape/);
  });
});
