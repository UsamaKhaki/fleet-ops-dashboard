import {
  ASSET_STATUSES,
  SITE_LOCATIONS,
  SITES,
  WORK_ORDER_PRIORITIES,
  type Asset,
  type AssetType,
  type VehiclePosition,
  type WorkOrder,
} from '@fleet/api/schemas';
import type { Random } from './random.js';

const CATALOGUE: Record<AssetType, { make: string; model: string }[]> = {
  truck: [
    { make: 'Volvo', model: 'FMX 460' },
    { make: 'Scania', model: 'G 410' },
    { make: 'MAN', model: 'TGS 33.440' },
  ],
  excavator: [
    { make: 'Caterpillar', model: '320' },
    { make: 'Komatsu', model: 'PC210' },
    { make: 'Hitachi', model: 'ZX250' },
  ],
  loader: [
    { make: 'Caterpillar', model: '950 GC' },
    { make: 'Volvo', model: 'L120H' },
  ],
  crane: [
    { make: 'Liebherr', model: 'LTM 1100' },
    { make: 'Tadano', model: 'GR-1000XL' },
  ],
  generator: [
    { make: 'Atlas Copco', model: 'QAS 150' },
    { make: 'Cummins', model: 'C220 D5' },
  ],
  forklift: [
    { make: 'Toyota', model: '8FGU25' },
    { make: 'Linde', model: 'H30' },
  ],
};

const ASSET_TYPES = Object.keys(CATALOGUE) as AssetType[];
const MOBILE_TYPES: ReadonlySet<AssetType> = new Set(['truck', 'loader', 'forklift', 'crane']);

const WORK_ORDER_TITLES = [
  'Replace hydraulic hose',
  'Scheduled 500h service',
  'Brake inspection',
  'Tyre replacement',
  'Coolant leak',
  'Battery check',
  'Track tension adjustment',
  'Annual safety inspection',
  'Replace air filter',
  'Telematics unit offline',
];

const DAY_MS = 86_400_000;

function pad(value: number, width: number) {
  return String(value).padStart(width, '0');
}

export function generateAssets(random: Random, count: number, now: Date): Asset[] {
  const statusWeights = [...ASSET_STATUSES, 'active', 'active', 'idle'] as const;

  return Array.from({ length: count }, (_, index) => {
    const type = random.pick(ASSET_TYPES);
    const { make, model } = random.pick(CATALOGUE[type]);
    const number = index + 1;
    return {
      id: `AST-${pad(number, 5)}`,
      name: `${type[0]?.toUpperCase()}${type.slice(1)} ${pad(number, 4)}`,
      type,
      status: random.pick(statusWeights),
      site: random.pick(SITES),
      make,
      model,
      year: random.int(2012, 2026),
      engineHours: random.int(50, 18_000),
      fuelPercent: random.int(3, 100),
      updatedAt: new Date(now.getTime() - random.int(0, 30) * DAY_MS).toISOString(),
    };
  });
}

export function generateWorkOrders(
  random: Random,
  assets: readonly Asset[],
  count: number,
  now: Date,
): WorkOrder[] {
  return Array.from({ length: count }, (_, index) => {
    const asset = random.pick(assets);
    const createdAt = new Date(now.getTime() - random.int(0, 45) * DAY_MS);
    const status = random.pick(['open', 'open', 'in_progress', 'completed'] as const);
    return {
      id: `WO-${1001 + index}`,
      assetId: asset.id,
      assetName: asset.name,
      title: random.pick(WORK_ORDER_TITLES),
      priority: random.pick(WORK_ORDER_PRIORITIES),
      status,
      createdAt: createdAt.toISOString(),
      dueDate: new Date(createdAt.getTime() + random.int(2, 30) * DAY_MS)
        .toISOString()
        .slice(0, 10),
      completedAt:
        status === 'completed'
          ? new Date(createdAt.getTime() + random.int(1, 5) * DAY_MS).toISOString()
          : null,
    };
  });
}

export function generateVehicles(
  random: Random,
  assets: readonly Asset[],
  count: number,
  now: Date,
): VehiclePosition[] {
  return assets
    .filter((asset) => MOBILE_TYPES.has(asset.type))
    .slice(0, count)
    .map((asset) => {
      const home = SITE_LOCATIONS[asset.site];
      return {
        assetId: asset.id,
        name: asset.name,
        status: asset.status,
        lat: home.lat + (random.next() - 0.5) * 0.04,
        lng: home.lng + (random.next() - 0.5) * 0.06,
        speedKph: 0,
        heading: random.int(0, 359),
        reportedAt: now.toISOString(),
      };
    });
}
