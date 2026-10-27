import { ASSET_STATUSES, LIVE_URL, type AssetStatus } from '@fleet/api';
import { useLiveFeed } from '@fleet/app-runtime';
import { EmptyState, ErrorState, FacetFilter, LiveIndicator, Skeleton } from '@fleet/ui';
import { WifiOffIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FleetMap } from './FleetMap';
import { applyLiveMessage, isStale, type VehicleMap } from './telemetry';
import { useNow } from './use-now';
import { VehicleList } from './VehicleList';

const STATUS_OPTIONS = ASSET_STATUSES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export function App() {
  const [vehicleMap, setVehicleMap] = useState<VehicleMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssetStatus[]>([]);
  const now = useNow(1000);

  const liveStatus = useLiveFeed((message) => {
    setVehicleMap((current) => applyLiveMessage(current, message));
  });

  const vehicles = useMemo(
    () =>
      [...(vehicleMap?.values() ?? [])]
        .filter((vehicle) => statusFilter.length === 0 || statusFilter.includes(vehicle.status))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [vehicleMap, statusFilter],
  );
  const staleCount = vehicles.filter((vehicle) => isStale(vehicle, now)).length;
  const toggleSelected = (assetId: string) =>
    setSelectedId((current) => (current === assetId ? null : assetId));

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 id="live-map-heading" className="text-2xl font-semibold tracking-tight">
          Live map
        </h1>
        <p className="text-sm text-muted-foreground">
          {vehicleMap
            ? `${vehicles.length} vehicles shown${staleCount > 0 ? `, ${staleCount} without a recent position` : ''}`
            : 'Positions stream in over a WebSocket once a second'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <FacetFilter
          title="Status"
          options={STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <LiveIndicator status={liveStatus} />
      </div>
    </div>
  );

  let body;
  if (!vehicleMap && liveStatus === 'reconnecting') {
    body = (
      <div className="rounded-lg border bg-card">
        <ErrorState
          title="Live feed unavailable"
          description={`Cannot reach ${LIVE_URL}. Retrying automatically with backoff.`}
        />
      </div>
    );
  } else if (!vehicleMap) {
    body = (
      <Skeleton className="aspect-[5/4] w-full" aria-label="Waiting for the first positions" />
    );
  } else if (vehicles.length === 0) {
    body = (
      <div className="rounded-lg border bg-card">
        <EmptyState
          title={
            vehicleMap.size === 0 ? 'No vehicles are reporting' : 'No vehicles with this status'
          }
          description={
            vehicleMap.size === 0
              ? 'Positions will appear here as soon as a vehicle reports.'
              : undefined
          }
        />
      </div>
    );
  } else {
    body = (
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="relative">
          <FleetMap
            vehicles={vehicles}
            now={now}
            selectedId={selectedId}
            onSelect={toggleSelected}
          />
          {liveStatus !== 'open' && (
            <p
              role="status"
              className="absolute left-3 top-3 flex items-center gap-2 rounded-md border bg-background/90 px-3 py-1.5 text-sm"
            >
              <WifiOffIcon className="size-4 text-destructive" aria-hidden />
              Reconnecting. Positions may be out of date.
            </p>
          )}
        </div>
        <VehicleList
          vehicles={vehicles}
          now={now}
          selectedId={selectedId}
          onSelect={toggleSelected}
        />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="live-map-heading">
      {header}
      {body}
    </section>
  );
}
