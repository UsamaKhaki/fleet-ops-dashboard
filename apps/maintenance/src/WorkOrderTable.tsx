import type { WorkOrder } from '@fleet/api';
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@fleet/ui';
import { flexRender, type Table as TanStackTable } from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { isPendingWorkOrder } from './work-order-cache';

interface WorkOrderTableProps {
  table: TanStackTable<WorkOrder>;
  isLoading: boolean;
  isStale: boolean;
  emptyState: ReactNode;
}

// Pages here are at most 100 rows, so the table renders them all; the assets table is the
// one that virtualizes.
export function WorkOrderTable({ table, isLoading, isStale, emptyState }: WorkOrderTableProps) {
  const { rows } = table.getRowModel();
  const columnCount = table.getVisibleLeafColumns().length;

  return (
    <Table
      containerClassName="rounded-lg border bg-card"
      className={cn('transition-opacity', isStale && 'opacity-60')}
      aria-busy={isLoading || isStale}
    >
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              const label = flexRender(header.column.columnDef.header, header.getContext());
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                  }
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {label}
                      {sorted === 'asc' ? (
                        <ArrowUpIcon className="size-3.5" aria-hidden />
                      ) : sorted === 'desc' ? (
                        <ArrowDownIcon className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowUpDownIcon className="size-3.5 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isLoading &&
          Array.from({ length: 8 }, (_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell colSpan={columnCount}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          ))}
        {!isLoading && rows.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount}>{emptyState}</TableCell>
          </TableRow>
        )}
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(isPendingWorkOrder(row.original) && 'animate-pulse bg-muted/40')}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
