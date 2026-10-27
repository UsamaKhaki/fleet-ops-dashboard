import type { Asset, Page } from '@fleet/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'AST-00001',
    name: 'Truck 0001',
    type: 'truck',
    status: 'active',
    site: 'North Yard',
    make: 'Volvo',
    model: 'FMX 460',
    year: 2020,
    engineHours: 4200,
    fuelPercent: 70,
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}

export function makePage(items: Asset[], total = items.length): Page<Asset> {
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
