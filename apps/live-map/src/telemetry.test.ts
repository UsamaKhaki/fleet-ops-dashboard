import { describe, expect, it } from 'vitest';
import { STALE_AFTER_MS, applyLiveMessage, isStale } from './telemetry';
import { makeVehicle } from './test-utils';

const truck = makeVehicle();
const loader = makeVehicle({ assetId: 'AST-00002', name: 'Loader 0002' });

describe('applyLiveMessage', () => {
  it('ignores updates until the first snapshot arrives', () => {
    expect(applyLiveMessage(null, { type: 'telemetry.update', vehicles: [truck] })).toBeNull();
  });

  it('replaces the fleet on a snapshot and merges updates', () => {
    const snapshot = applyLiveMessage(null, {
      type: 'telemetry.snapshot',
      vehicles: [truck, loader],
    });
    const moved = { ...truck, lat: 51.51 };
    const updated = applyLiveMessage(snapshot, { type: 'telemetry.update', vehicles: [moved] });

    expect(updated?.get(truck.assetId)?.lat).toBe(51.51);
    expect(updated?.get(loader.assetId)).toBe(loader);
    expect(snapshot?.get(truck.assetId)?.lat).toBe(51.5);
  });

  it('applies asset status changes and leaves unrelated messages alone', () => {
    const snapshot = applyLiveMessage(null, { type: 'telemetry.snapshot', vehicles: [truck] });
    const asset = {
      id: truck.assetId,
      name: truck.name,
      type: 'truck' as const,
      status: 'maintenance' as const,
      site: 'North Yard' as const,
      make: 'Volvo',
      model: 'FMX',
      year: 2020,
      engineHours: 1,
      fuelPercent: 50,
      updatedAt: truck.reportedAt,
    };

    const updated = applyLiveMessage(snapshot, { type: 'asset.updated', asset });
    expect(updated?.get(truck.assetId)?.status).toBe('maintenance');

    const otherAsset = applyLiveMessage(snapshot, {
      type: 'asset.updated',
      asset: { ...asset, id: 'AST-99999' },
    });
    expect(otherAsset).toBe(snapshot);
  });
});

describe('isStale', () => {
  it('turns stale once the vehicle stops reporting', () => {
    const reportedAt = Date.parse('2026-10-27T12:00:00.000Z');
    const vehicle = makeVehicle({ reportedAt: new Date(reportedAt).toISOString() });
    expect(isStale(vehicle, reportedAt + STALE_AFTER_MS)).toBe(false);
    expect(isStale(vehicle, reportedAt + STALE_AFTER_MS + 1)).toBe(true);
  });
});
