import type { LiveMessage, VehiclePosition } from '@fleet/api';

export type VehicleMap = ReadonlyMap<string, VehiclePosition>;

/** A vehicle that has not reported for this long is shown as stale rather than live. */
export const STALE_AFTER_MS = 10_000;

/** Folds one live message into the vehicle map. Returns the same map when nothing changed. */
export function applyLiveMessage(
  vehicles: VehicleMap | null,
  message: LiveMessage,
): VehicleMap | null {
  switch (message.type) {
    case 'telemetry.snapshot':
      return new Map(message.vehicles.map((vehicle) => [vehicle.assetId, vehicle]));

    case 'telemetry.update': {
      // Updates before the first snapshot would give a partial fleet; wait for the snapshot.
      if (!vehicles || message.vehicles.length === 0) return vehicles;
      const next = new Map(vehicles);
      for (const vehicle of message.vehicles) next.set(vehicle.assetId, vehicle);
      return next;
    }

    case 'asset.updated': {
      const current = vehicles?.get(message.asset.id);
      if (!vehicles || !current || current.status === message.asset.status) return vehicles;
      return new Map(vehicles).set(current.assetId, { ...current, status: message.asset.status });
    }

    default:
      return vehicles;
  }
}

export function isStale(vehicle: VehiclePosition, now: number): boolean {
  return now - Date.parse(vehicle.reportedAt) > STALE_AFTER_MS;
}
