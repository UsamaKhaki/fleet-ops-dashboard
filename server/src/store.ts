import {
  ASSET_STATUSES,
  MAP_BOUNDS,
  WORK_ORDER_PRIORITIES,
  type Asset,
  type AssetPatch,
  type AssetStatus,
  type Page,
  type ParsedAssetListQuery,
  type ParsedWorkOrderListQuery,
  type VehiclePosition,
  type WorkOrder,
  type WorkOrderCreate,
  type WorkOrderPatch,
} from '@fleet/api/schemas';
import { matchesSearch, paginate, sortBy } from './list-query';
import { createRandom, type Random } from './random';
import { generateAssets, generateVehicles, generateWorkOrders } from './seed';

export interface FleetStoreOptions {
  seed?: number;
  assetCount?: number;
  workOrderCount?: number;
  vehicleCount?: number;
  now?: Date;
}

const PRIORITY_RANK = Object.fromEntries(WORK_ORDER_PRIORITIES.map((p, i) => [p, i]));
const SPEED_RANGE_KPH: Record<AssetStatus, readonly [number, number]> = {
  active: [15, 65],
  idle: [0, 0],
  maintenance: [0, 0],
  offline: [0, 0],
};

export class FleetStore {
  private readonly random: Random;
  private readonly assets = new Map<string, Asset>();
  private readonly workOrders = new Map<string, WorkOrder>();
  private readonly vehicles = new Map<string, VehiclePosition>();
  private nextWorkOrderNumber: number;

  constructor({
    seed = 42,
    assetCount = 5000,
    workOrderCount = 400,
    vehicleCount = 80,
    now = new Date(),
  }: FleetStoreOptions = {}) {
    this.random = createRandom(seed);
    const assets = generateAssets(this.random, assetCount, now);
    for (const asset of assets) this.assets.set(asset.id, asset);
    for (const order of generateWorkOrders(this.random, assets, workOrderCount, now)) {
      this.workOrders.set(order.id, order);
    }
    for (const vehicle of generateVehicles(this.random, assets, vehicleCount, now)) {
      this.vehicles.set(vehicle.assetId, vehicle);
    }
    this.nextWorkOrderNumber = 1001 + workOrderCount;
  }

  listAssets(query: ParsedAssetListQuery): Page<Asset> {
    const filtered = [...this.assets.values()].filter(
      (asset) =>
        (!query.status?.length || query.status.includes(asset.status)) &&
        (!query.type?.length || query.type.includes(asset.type)) &&
        (!query.site?.length || query.site.includes(asset.site)) &&
        matchesSearch(query.q, asset.id, asset.name, asset.make, asset.model),
    );
    const sorted = sortBy(filtered, (asset) => asset[query.sort], query.order);
    return paginate(sorted, query.page, query.pageSize);
  }

  updateAsset(id: string, patch: AssetPatch, now = new Date()): Asset | undefined {
    const current = this.assets.get(id);
    if (!current) return undefined;
    return this.saveAsset({ ...current, ...patch, updatedAt: now.toISOString() });
  }

  /** Simulates another operator changing an asset, so the UI has live changes to react to. */
  changeRandomAssetStatus(now = new Date()): Asset {
    const asset = this.random.pick([...this.assets.values()]);
    const status = this.random.pick(ASSET_STATUSES);
    return this.saveAsset({ ...asset, status, updatedAt: now.toISOString() });
  }

  private saveAsset(asset: Asset): Asset {
    this.assets.set(asset.id, asset);
    const vehicle = this.vehicles.get(asset.id);
    if (vehicle) this.vehicles.set(asset.id, { ...vehicle, status: asset.status });
    return asset;
  }

  listWorkOrders(query: ParsedWorkOrderListQuery): Page<WorkOrder> {
    const filtered = [...this.workOrders.values()].filter(
      (order) =>
        (!query.status?.length || query.status.includes(order.status)) &&
        (!query.priority?.length || query.priority.includes(order.priority)) &&
        matchesSearch(query.q, order.id, order.title, order.assetName),
    );
    const sorted = sortBy(
      filtered,
      (order) =>
        query.sort === 'priority' ? (PRIORITY_RANK[order.priority] ?? 0) : order[query.sort],
      query.order,
    );
    return paginate(sorted, query.page, query.pageSize);
  }

  createWorkOrder(input: WorkOrderCreate, now = new Date()): WorkOrder | undefined {
    const asset = this.assets.get(input.assetId);
    if (!asset) return undefined;
    const order: WorkOrder = {
      id: `WO-${this.nextWorkOrderNumber++}`,
      assetId: asset.id,
      assetName: asset.name,
      title: input.title,
      priority: input.priority,
      status: 'open',
      createdAt: now.toISOString(),
      dueDate: input.dueDate,
      completedAt: null,
    };
    this.workOrders.set(order.id, order);
    return order;
  }

  updateWorkOrder(id: string, patch: WorkOrderPatch, now = new Date()): WorkOrder | undefined {
    const current = this.workOrders.get(id);
    if (!current) return undefined;
    const updated: WorkOrder = {
      ...current,
      status: patch.status,
      completedAt: patch.status === 'completed' ? now.toISOString() : null,
    };
    this.workOrders.set(id, updated);
    return updated;
  }

  vehiclePositions(): VehiclePosition[] {
    return [...this.vehicles.values()];
  }

  /**
   * Moves every active vehicle one step and returns the ones that changed. Offline
   * vehicles stop reporting, which is what lets the map show them as stale.
   */
  advanceTelemetry(elapsedMs: number, now = new Date()): VehiclePosition[] {
    const changed: VehiclePosition[] = [];
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.status === 'offline') continue;

      const [minSpeed, maxSpeed] = SPEED_RANGE_KPH[vehicle.status];
      const speedKph = this.random.int(minSpeed, maxSpeed);
      let heading = (vehicle.heading + this.random.int(-25, 25) + 360) % 360;
      // Scaled up so movement is visible on a city-sized map at one tick per second.
      const distanceDeg = (speedKph / 3600) * (elapsedMs / 1000) * 0.08;
      const radians = (heading * Math.PI) / 180;
      let lat = vehicle.lat + Math.cos(radians) * distanceDeg;
      let lng = vehicle.lng + Math.sin(radians) * distanceDeg * 1.6;

      if (
        lat < MAP_BOUNDS.minLat ||
        lat > MAP_BOUNDS.maxLat ||
        lng < MAP_BOUNDS.minLng ||
        lng > MAP_BOUNDS.maxLng
      ) {
        heading = (heading + 180) % 360;
        lat = Math.min(Math.max(lat, MAP_BOUNDS.minLat), MAP_BOUNDS.maxLat);
        lng = Math.min(Math.max(lng, MAP_BOUNDS.minLng), MAP_BOUNDS.maxLng);
      }

      const next = { ...vehicle, lat, lng, heading, speedKph, reportedAt: now.toISOString() };
      this.vehicles.set(vehicle.assetId, next);
      changed.push(next);
    }
    return changed;
  }
}
