import type { AssetListQuery, WorkOrderListQuery } from './schemas';

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (query: AssetListQuery) => [...assetKeys.lists(), query] as const,
};

export const workOrderKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrderKeys.all, 'list'] as const,
  list: (query: WorkOrderListQuery) => [...workOrderKeys.lists(), query] as const,
};
