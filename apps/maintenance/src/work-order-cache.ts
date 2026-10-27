import { workOrderKeys, type Page, type WorkOrder } from '@fleet/api';
import type { QueryClient } from '@tanstack/react-query';

type ListUpdater = (page: Page<WorkOrder>) => Page<WorkOrder>;

function updateLists(queryClient: QueryClient, update: ListUpdater) {
  queryClient.setQueriesData<Page<WorkOrder>>({ queryKey: workOrderKeys.lists() }, (page) =>
    page ? update(page) : page,
  );
}

export function replaceWorkOrder(queryClient: QueryClient, id: string, next: WorkOrder) {
  updateLists(queryClient, (page) =>
    page.items.some((item) => item.id === id)
      ? { ...page, items: page.items.map((item) => (item.id === id ? next : item)) }
      : page,
  );
}

export function removeWorkOrder(queryClient: QueryClient, id: string) {
  updateLists(queryClient, (page) =>
    page.items.some((item) => item.id === id)
      ? { ...page, items: page.items.filter((item) => item.id !== id), total: page.total - 1 }
      : page,
  );
}

export function findCachedWorkOrder(queryClient: QueryClient, id: string): WorkOrder | undefined {
  for (const [, page] of queryClient.getQueriesData<Page<WorkOrder>>({
    queryKey: workOrderKeys.lists(),
  })) {
    const match = page?.items.find((item) => item.id === id);
    if (match) return match;
  }
  return undefined;
}

export const PENDING_ID_PREFIX = 'pending-';

export function isPendingWorkOrder(order: WorkOrder) {
  return order.id.startsWith(PENDING_ID_PREFIX);
}
