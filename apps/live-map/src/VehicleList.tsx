import type { VehiclePosition } from '@fleet/api';
import { StatusBadge, cn } from '@fleet/ui';
import { isStale } from './telemetry';

interface VehicleListProps {
  vehicles: VehiclePosition[];
  now: number;
  selectedId: string | null;
  onSelect: (assetId: string) => void;
}

export function VehicleList({ vehicles, now, selectedId, onSelect }: VehicleListProps) {
  return (
    <ul
      className="max-h-[min(60vh,560px)] divide-y overflow-auto rounded-lg border bg-card"
      aria-label="Vehicles"
    >
      {vehicles.map((vehicle) => {
        const stale = isStale(vehicle, now);
        const secondsAgo = Math.max(0, Math.round((now - Date.parse(vehicle.reportedAt)) / 1000));
        return (
          <li key={vehicle.assetId}>
            <button
              type="button"
              aria-pressed={vehicle.assetId === selectedId}
              onClick={() => onSelect(vehicle.assetId)}
              className={cn(
                'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent',
                vehicle.assetId === selectedId && 'bg-accent',
              )}
            >
              <span className="flex flex-col">
                <span className="font-medium">{vehicle.name}</span>
                <span className={cn('text-xs text-muted-foreground', stale && 'text-destructive')}>
                  {stale ? `No position for ${secondsAgo}s` : `${vehicle.speedKph} km/h`}
                </span>
              </span>
              <StatusBadge tone={vehicle.status} label={vehicle.status} className="text-xs" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
