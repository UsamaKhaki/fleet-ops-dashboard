import { ApiError, fleetApi, workOrderKeys, type Page, type WorkOrder } from '@fleet/api';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, makePage, makeWorkOrder, withQueryClient } from './test-utils';
import { useCreateWorkOrder, useUpdateWorkOrderStatus } from './work-order-mutations';

const query = { page: 1 };
const input = {
  assetId: 'AST-00002',
  title: 'Replace air filter',
  priority: 'low',
  dueDate: '2026-11-03',
} as const;

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup<T>(useHook: () => T) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(workOrderKeys.list(query), makePage([makeWorkOrder()]));
  // invalidateQueries would refetch the seeded list; there is no server in these tests.
  vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const { result } = renderHook(useHook, { wrapper: withQueryClient(queryClient) });
  const items = () =>
    queryClient.getQueryData<Page<WorkOrder>>(workOrderKeys.list(query))?.items ?? [];
  return { result, items };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCreateWorkOrder', () => {
  it('shows a pending row, then swaps in the saved one', async () => {
    const request = deferred<WorkOrder>();
    vi.spyOn(fleetApi, 'createWorkOrder').mockReturnValue(request.promise);
    const { result, items } = setup(() => useCreateWorkOrder(query));

    act(() => result.current.mutate(input));
    await waitFor(() => expect(items()).toHaveLength(2));
    expect(items()[0]?.id).toMatch(/^pending-/);

    act(() => request.resolve(makeWorkOrder({ id: 'WO-2000', title: input.title })));
    await waitFor(() => expect(items()[0]?.id).toBe('WO-2000'));
  });

  it('removes the pending row when the server refuses', async () => {
    const request = deferred<WorkOrder>();
    vi.spyOn(fleetApi, 'createWorkOrder').mockReturnValue(request.promise);
    const { result, items } = setup(() => useCreateWorkOrder(query));

    act(() => result.current.mutate(input));
    await waitFor(() => expect(items()).toHaveLength(2));

    act(() => request.reject(new ApiError('Asset not found', 422)));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(items().map((order) => order.id)).toEqual(['WO-1001']);
  });
});

describe('useUpdateWorkOrderStatus', () => {
  it('rolls the status back when the update fails', async () => {
    const request = deferred<WorkOrder>();
    vi.spyOn(fleetApi, 'updateWorkOrder').mockReturnValue(request.promise);
    const { result, items } = setup(() => useUpdateWorkOrderStatus());

    act(() => result.current.mutate({ id: 'WO-1001', status: 'completed' }));
    await waitFor(() => expect(items()[0]?.status).toBe('completed'));
    expect(items()[0]?.completedAt).not.toBeNull();

    act(() => request.reject(new ApiError('Simulated failure', 503)));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(items()[0]).toMatchObject({ status: 'open', completedAt: null });
  });
});
