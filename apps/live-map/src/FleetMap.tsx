import { SITE_LOCATIONS, type VehiclePosition } from '@fleet/api';
import { cn } from '@fleet/ui';
import { MAP_HEIGHT, MAP_WIDTH, project } from './projection';
import { isStale } from './telemetry';

const STATUS_FILL = {
  active: 'fill-status-active',
  idle: 'fill-status-idle',
  maintenance: 'fill-status-maintenance',
  offline: 'fill-status-offline',
} as const;

const GRID_LINES = 10;
// Room around the operating area so markers on its edge are not clipped.
const MARGIN = 24;

interface FleetMapProps {
  vehicles: VehiclePosition[];
  now: number;
  selectedId: string | null;
  onSelect: (assetId: string) => void;
}

export function FleetMap({ vehicles, now, selectedId, onSelect }: FleetMapProps) {
  return (
    <svg
      viewBox={`${-MARGIN} ${-MARGIN} ${MAP_WIDTH + MARGIN * 2} ${MAP_HEIGHT + MARGIN * 2}`}
      className="h-auto w-full rounded-lg border bg-card"
      role="img"
      aria-label={`Map of ${vehicles.length} vehicles across the operating area`}
    >
      <g className="stroke-border" strokeWidth={1}>
        {Array.from({ length: GRID_LINES - 1 }, (_, index) => {
          const step = index + 1;
          return (
            <g key={step}>
              <line
                x1={(MAP_WIDTH / GRID_LINES) * step}
                x2={(MAP_WIDTH / GRID_LINES) * step}
                y1={0}
                y2={MAP_HEIGHT}
              />
              <line
                y1={(MAP_HEIGHT / GRID_LINES) * step}
                y2={(MAP_HEIGHT / GRID_LINES) * step}
                x1={0}
                x2={MAP_WIDTH}
              />
            </g>
          );
        })}
      </g>

      {Object.entries(SITE_LOCATIONS).map(([site, location]) => {
        const { x, y } = project(location.lat, location.lng);
        return (
          <g key={site} transform={`translate(${x} ${y})`} className="pointer-events-none">
            <rect
              x={-7}
              y={-7}
              width={14}
              height={14}
              rx={3}
              className="fill-foreground/15 stroke-foreground/40"
            />
            <text
              y={-14}
              textAnchor="middle"
              className="fill-muted-foreground stroke-card text-[15px] font-medium [paint-order:stroke]"
              strokeWidth={4}
            >
              {site}
            </text>
          </g>
        );
      })}

      {vehicles.map((vehicle) => {
        const { x, y } = project(vehicle.lat, vehicle.lng);
        const stale = isStale(vehicle, now);
        const selected = vehicle.assetId === selectedId;
        return (
          <g
            key={vehicle.assetId}
            // CSS transforms animate between ticks, so vehicles glide instead of jumping.
            style={{ transform: `translate(${x}px, ${y}px)` }}
            className="cursor-pointer transition-transform duration-1000 ease-linear"
            onClick={() => onSelect(vehicle.assetId)}
          >
            <title>{`${vehicle.name}: ${stale ? 'no recent position' : `${vehicle.status}, ${vehicle.speedKph} km/h`}`}</title>
            {selected && (
              <circle r={16} className="fill-primary/25 stroke-primary" strokeWidth={2} />
            )}
            {vehicle.speedKph > 0 && !stale && (
              <path
                d="M0,-15 L4,-8 L-4,-8 Z"
                transform={`rotate(${vehicle.heading})`}
                className={STATUS_FILL[vehicle.status]}
              />
            )}
            <circle
              r={7}
              strokeWidth={2}
              className={cn(
                'stroke-card',
                stale ? 'fill-transparent stroke-muted-foreground' : STATUS_FILL[vehicle.status],
              )}
              strokeDasharray={stale ? '3 2' : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
