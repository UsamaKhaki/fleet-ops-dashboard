import { ApiError, assetKeys, fleetApi, type AssetSortField } from '@fleet/api';
import { useLiveFeed } from '@fleet/app-runtime';
import { Button, EmptyState, ErrorState, LiveIndicator, PaginationBar } from '@fleet/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoreRowModel, useReactTable, type SortingState } from '@tanstack/react-table';
import { useMemo } from 'react';
import { replaceAssetInLists } from './asset-cache';
import { PAGE_SIZE_OPTIONS, useAssetListParams } from './asset-list-params';
import { AssetTable } from './AssetTable';
import { AssetToolbar } from './AssetToolbar';
import { createAssetColumns } from './columns';
import { integerFormat } from './format';
import { useUpdateAssetStatus } from './use-update-asset-status';

export function App() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useAssetListParams();
  const updateStatus = useUpdateAssetStatus();

  const assets = useQuery({
    queryKey: assetKeys.list(query),
    queryFn: ({ signal }) => fleetApi.listAssets(query, signal),
    // Keep the current page on screen while the next one loads, instead of a skeleton flash.
    placeholderData: keepPreviousData,
  });

  const liveStatus = useLiveFeed((message) => {
    if (message.type === 'asset.updated') replaceAssetInLists(queryClient, message.asset);
  });

  const { mutate } = updateStatus;
  const columns = useMemo(
    () =>
      createAssetColumns({ onStatusChange: (asset, status) => mutate({ id: asset.id, status }) }),
    [mutate],
  );

  const sorting: SortingState = [{ id: query.sort, desc: query.order === 'desc' }];
  const table = useReactTable({
    data: assets.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (asset) => asset.id,
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
    enableSortingRemoval: false,
    rowCount: assets.data?.total ?? 0,
    state: { sorting },
    onSortingChange: (updater) => {
      const [next] = typeof updater === 'function' ? updater(sorting) : updater;
      if (next) setQuery({ sort: next.id as AssetSortField, order: next.desc ? 'desc' : 'asc' });
    },
  });

  const clearFilters = () => setQuery({ q: '', status: [], type: [], site: [] });

  return (
    <section className="flex flex-col gap-4" aria-labelledby="assets-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 id="assets-heading" className="text-2xl font-semibold tracking-tight">
            Assets
          </h1>
          <p className="text-sm text-muted-foreground">
            {assets.data
              ? `${integerFormat.format(assets.data.total)} machines match the current filters`
              : 'Every machine in the fleet'}
          </p>
        </div>
        <LiveIndicator status={liveStatus} />
      </div>

      <AssetToolbar query={query} onChange={setQuery} />

      {assets.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState
            title="Could not load assets"
            description={
              assets.error instanceof ApiError ? assets.error.message : 'Unexpected error'
            }
            onRetry={() => void assets.refetch()}
            isRetrying={assets.isFetching}
          />
        </div>
      ) : (
        <>
          <AssetTable
            table={table}
            isLoading={assets.isPending}
            isStale={assets.isPlaceholderData}
            pageKey={JSON.stringify(query)}
            emptyState={
              <EmptyState
                title="No assets match these filters"
                description="Try a different search or remove a filter."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            }
          />
          <PaginationBar
            page={query.page}
            pageSize={query.pageSize}
            total={assets.data?.total ?? 0}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page })}
            onPageSizeChange={(pageSize) => setQuery({ pageSize })}
          />
        </>
      )}
    </section>
  );
}
