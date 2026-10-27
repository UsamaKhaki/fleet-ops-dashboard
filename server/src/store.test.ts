import { assetListQuerySchema, workOrderListQuerySchema } from '@fleet/api/schemas';
import { describe, expect, it } from 'vitest';
import { FleetStore } from './store.js';

const NOW = new Date('2026-10-01T08:00:00.000Z');
const assetQuery = (input: Record<string, string> = {}) => assetListQuerySchema.parse(input);
const workOrderQuery = (input: Record<string, string> = {}) =>
  workOrderListQuerySchema.parse(input);

describe('FleetStore', () => {
  it('is deterministic for a given seed', () => {
    const a = new FleetStore({ seed: 7, now: NOW });
    const b = new FleetStore({ seed: 7, now: NOW });
    expect(a.listAssets(assetQuery()).items).toEqual(b.listAssets(assetQuery()).items);
  });

  it('paginates and reports the filtered total', () => {
    const store = new FleetStore({ assetCount: 120, now: NOW });
    const page = store.listAssets(assetQuery({ page: '3', pageSize: '50' }));
    expect(page.total).toBe(120);
    expect(page.items).toHaveLength(20);
    expect(page.items[0]?.id).toBe('AST-00101');
  });

  it('combines filters and free-text search', () => {
    const store = new FleetStore({ assetCount: 500, now: NOW });
    const page = store.listAssets(
      assetQuery({ status: 'active,idle', type: 'truck', pageSize: '1000' }),
    );
    expect(page.total).toBeGreaterThan(0);
    for (const asset of page.items) {
      expect(['active', 'idle']).toContain(asset.status);
      expect(asset.type).toBe('truck');
    }

    const search = store.listAssets(assetQuery({ q: 'ast-00042' }));
    expect(search.items.map((asset) => asset.id)).toEqual(['AST-00042']);
  });

  it('returns an empty page when nothing matches', () => {
    const store = new FleetStore({ assetCount: 50, now: NOW });
    expect(store.listAssets(assetQuery({ q: 'no such asset' }))).toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('sorts descending', () => {
    const store = new FleetStore({ assetCount: 200, now: NOW });
    const hours = store
      .listAssets(assetQuery({ sort: 'engineHours', order: 'desc', pageSize: '200' }))
      .items.map((asset) => asset.engineHours);
    expect(hours).toEqual([...hours].sort((a, b) => b - a));
  });

  it('sorts work orders by priority rank, not alphabetically', () => {
    const store = new FleetStore({ now: NOW });
    const priorities = store
      .listWorkOrders(workOrderQuery({ sort: 'priority', order: 'desc', pageSize: '1000' }))
      .items.map((order) => order.priority);
    expect(priorities[0]).toBe('critical');
    expect(priorities.at(-1)).toBe('low');
  });

  it('keeps the vehicle status in sync when an asset changes', () => {
    const store = new FleetStore({ now: NOW });
    const vehicle = store.vehiclePositions()[0];
    if (!vehicle) throw new Error('expected seeded vehicles');

    store.updateAsset(vehicle.assetId, { status: 'offline' }, NOW);

    const updated = store.vehiclePositions().find((v) => v.assetId === vehicle.assetId);
    expect(updated?.status).toBe('offline');
    expect(store.advanceTelemetry(1000).some((v) => v.assetId === vehicle.assetId)).toBe(false);
  });

  it('creates and completes work orders', () => {
    const store = new FleetStore({ now: NOW });
    const created = store.createWorkOrder(
      { assetId: 'AST-00001', title: 'Brake check', priority: 'high', dueDate: '2026-10-10' },
      NOW,
    );
    expect(created).toMatchObject({ status: 'open', assetId: 'AST-00001', completedAt: null });

    const completed = store.updateWorkOrder(created!.id, { status: 'completed' }, NOW);
    expect(completed?.completedAt).toBe(NOW.toISOString());

    expect(
      store.createWorkOrder({
        assetId: 'missing',
        title: 'x'.repeat(5),
        priority: 'low',
        dueDate: '2026-10-10',
      }),
    ).toBeUndefined();
  });
});
