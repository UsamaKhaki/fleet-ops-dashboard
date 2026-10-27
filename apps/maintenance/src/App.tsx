import {
  ApiError,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  fleetApi,
  workOrderKeys,
  workOrderListQuerySchema,
  type WorkOrderSortField,
} from '@fleet/api';
import { useListParams, useLiveFeed, useSearchInput } from '@fleet/app-runtime';
import {
  Button,
  EmptyState,
  ErrorState,
  FacetFilter,
  Input,
  LiveIndicator,
  PaginationBar,
} from '@fleet/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoreRowModel, useReactTable, type SortingState } from '@tanstack/react-table';
import { SearchIcon, XIcon } from 'lucide-react';
import { useMemo } from 'react';
import { createWorkOrderColumns } from './columns';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { capitalise } from './format';
import { useCreateWorkOrder, useUpdateWorkOrderStatus } from './work-order-mutations';
import { WorkOrderTable } from './WorkOrderTable';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const STATUS_OPTIONS = WORK_ORDER_STATUSES.map((value) => ({ value, label: capitalise(value) }));
const PRIORITY_OPTIONS = WORK_ORDER_PRIORITIES.map((value) => ({
  value,
  label: capitalise(value),
}));

export function App() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useListParams(workOrderListQuerySchema);
  const [search, setSearch] = useSearchInput(query.q, (q) => setQuery({ q }));

  const workOrders = useQuery({
    queryKey: workOrderKeys.list(query),
    queryFn: ({ signal }) => fleetApi.listWorkOrders(query, signal),
    placeholderData: keepPreviousData,
  });

  const liveStatus = useLiveFeed((message) => {
    if (message.type === 'workOrder.updated') {
      void queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    }
  });

  const createWorkOrder = useCreateWorkOrder(query);
  const { mutate: updateStatus } = useUpdateWorkOrderStatus();
  const columns = useMemo(
    () => createWorkOrderColumns((order, status) => updateStatus({ id: order.id, status })),
    [updateStatus],
  );

  const sorting: SortingState = [{ id: query.sort, desc: query.order === 'desc' }];
  const table = useReactTable({
    data: workOrders.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (order) => order.id,
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const [next] = typeof updater === 'function' ? updater(sorting) : updater;
      if (next) {
        setQuery({ sort: next.id as WorkOrderSortField, order: next.desc ? 'desc' : 'asc' });
      }
    },
  });

  const hasFilters = Boolean(query.q || query.status?.length || query.priority?.length);
  const clearFilters = () => {
    setSearch('');
    setQuery({ q: '', status: [], priority: [] });
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="maintenance-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 id="maintenance-heading" className="text-2xl font-semibold tracking-tight">
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground">Work orders across the fleet</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator status={liveStatus} />
          <CreateWorkOrderDialog onCreate={(input) => createWorkOrder.mutate(input)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search ID, title, asset…"
            aria-label="Search work orders"
            className="h-8 pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FacetFilter
          title="Status"
          options={STATUS_OPTIONS}
          selected={query.status ?? []}
          onChange={(status) => setQuery({ status })}
        />
        <FacetFilter
          title="Priority"
          options={PRIORITY_OPTIONS}
          selected={query.priority ?? []}
          onChange={(priority) => setQuery({ priority })}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
            <XIcon aria-hidden />
          </Button>
        )}
      </div>

      {workOrders.isError ? (
        <div className="rounded-lg border bg-card">
          <ErrorState
            title="Could not load work orders"
            description={
              workOrders.error instanceof ApiError ? workOrders.error.message : 'Unexpected error'
            }
            onRetry={() => void workOrders.refetch()}
            isRetrying={workOrders.isFetching}
          />
        </div>
      ) : (
        <>
          <WorkOrderTable
            table={table}
            isLoading={workOrders.isPending}
            isStale={workOrders.isPlaceholderData}
            emptyState={
              <EmptyState
                title={hasFilters ? 'No work orders match these filters' : 'No work orders yet'}
                description={
                  hasFilters
                    ? 'Try a different search or remove a filter.'
                    : 'Create one to schedule maintenance on an asset.'
                }
                action={
                  hasFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )
                }
              />
            }
          />
          <PaginationBar
            page={query.page}
            pageSize={query.pageSize}
            total={workOrders.data?.total ?? 0}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setQuery({ page })}
            onPageSizeChange={(pageSize) => setQuery({ pageSize })}
          />
        </>
      )}
    </section>
  );
}
