import type { VehiclePosition } from '@fleet/api';

export function makeVehicle(overrides: Partial<VehiclePosition> = {}): VehiclePosition {
  return {
    assetId: 'AST-00001',
    name: 'Truck 0001',
    status: 'active',
    lat: 51.5,
    lng: -0.1,
    speedKph: 40,
    heading: 90,
    reportedAt: new Date().toISOString(),
    ...overrides,
  };
}
