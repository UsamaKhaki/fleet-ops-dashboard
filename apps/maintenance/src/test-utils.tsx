import type { Page, WorkOrder } from '@fleet/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function makeWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'WO-1001',
    assetId: 'AST-00001',
    assetName: 'Crane 0001',
    title: 'Brake inspection',
    priority: 'high',
    status: 'open',
    createdAt: '2026-10-01T08:00:00.000Z',
    dueDate: '2099-01-01',
    completedAt: null,
    ...overrides,
  };
}

export function makePage(items: WorkOrder[], total = items.length): Page<WorkOrder> {
  return { items, total, page: 1, pageSize: 50 };
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function withQueryClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
