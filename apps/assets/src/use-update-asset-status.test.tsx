import { ApiError, assetKeys, fleetApi, type Asset, type Page } from '@fleet/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, makeAsset, makePage, withQueryClient } from './test-utils';
import { useUpdateAssetStatus } from './use-update-asset-status';

const listKey = assetKeys.list({ page: 1 });

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(listKey, makePage([makeAsset(), makeAsset({ id: 'AST-00002' })]));
  const { result } = renderHook(() => useUpdateAssetStatus(), {
    wrapper: withQueryClient(queryClient),
  });
  const statusOf = (id: string) =>
    queryClient.getQueryData<Page<Asset>>(listKey)?.items.find((asset) => asset.id === id)?.status;
  return { queryClient, result, statusOf };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useUpdateAssetStatus', () => {
  it('shows the new status before the server answers', async () => {
    let resolve: (asset: Asset) => void = () => {};
    vi.spyOn(fleetApi, 'updateAsset').mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, statusOf } = setup();

    act(() => result.current.mutate({ id: 'AST-00001', status: 'maintenance' }));
    await waitFor(() => expect(statusOf('AST-00001')).toBe('maintenance'));

    act(() => resolve(makeAsset({ status: 'maintenance', updatedAt: '2026-10-02T00:00:00.000Z' })));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back only the failed asset', async () => {
    let reject: (error: Error) => void = () => {};
    vi.spyOn(fleetApi, 'updateAsset').mockReturnValue(new Promise((_, r) => (reject = r)));
    const { queryClient, result, statusOf } = setup();

    act(() => result.current.mutate({ id: 'AST-00001', status: 'offline' }));
    await waitFor(() => expect(statusOf('AST-00001')).toBe('offline'));

    // A live update for another row lands while the request is in flight.
    queryClient.setQueryData<Page<Asset>>(
      listKey,
      (page) =>
        page && {
          ...page,
          items: page.items.map((asset) =>
            asset.id === 'AST-00002' ? { ...asset, status: 'idle' } : asset,
          ),
        },
    );

    act(() => reject(new ApiError('Simulated failure', 503)));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(statusOf('AST-00001')).toBe('active');
    expect(statusOf('AST-00002')).toBe('idle');
  });
});
