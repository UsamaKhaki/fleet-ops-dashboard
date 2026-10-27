import { ASSET_STATUSES, type Asset, type AssetSortField, type AssetStatus } from '@fleet/api';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  StatusBadge,
  cn,
} from '@fleet/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon } from 'lucide-react';
import { capitalise, formatRelative, integerFormat } from './format';

interface ColumnOptions {
  onStatusChange: (asset: Asset, status: AssetStatus) => void;
}

// Column ids double as server sort fields, so a sortable column must use one of them.
type AssetColumn = ColumnDef<Asset> & { id: AssetSortField | 'makeModel' };

export function createAssetColumns({ onStatusChange }: ColumnOptions): AssetColumn[] {
  return [
    {
      id: 'id',
      header: 'ID',
      accessorKey: 'id',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    { id: 'name', header: 'Name', accessorKey: 'name' },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: ({ getValue }) => capitalise(getValue<string>()),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-7"
              aria-label={`Change status of ${row.original.name}`}
            >
              <StatusBadge tone={row.original.status} label={row.original.status} />
              <ChevronDownIcon className="size-3 opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Set status</DropdownMenuLabel>
            {ASSET_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={status === row.original.status}
                onSelect={() => onStatusChange(row.original, status)}
              >
                <StatusBadge tone={status} label={status} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    { id: 'site', header: 'Site', accessorKey: 'site' },
    {
      id: 'makeModel',
      header: 'Make / model',
      accessorFn: (asset) => `${asset.make} ${asset.model}`,
      enableSorting: false,
    },
    { id: 'year', header: 'Year', accessorKey: 'year' },
    {
      id: 'engineHours',
      header: 'Engine hours',
      accessorKey: 'engineHours',
      cell: ({ getValue }) => integerFormat.format(getValue<number>()),
    },
    {
      id: 'fuelPercent',
      header: 'Fuel',
      accessorKey: 'fuelPercent',
      cell: ({ getValue }) => {
        const fuel = getValue<number>();
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
              <span
                className={cn(
                  'block h-full rounded-full',
                  fuel < 15 ? 'bg-status-offline' : 'bg-status-active',
                )}
                style={{ width: `${fuel}%` }}
              />
            </span>
            <span className="tabular-nums">{fuel}%</span>
          </span>
        );
      },
    },
    {
      id: 'updatedAt',
      header: 'Updated',
      accessorKey: 'updatedAt',
      cell: ({ getValue }) => (
        <time dateTime={getValue<string>()} className="text-muted-foreground">
          {formatRelative(getValue<string>())}
        </time>
      ),
    },
  ];
}
