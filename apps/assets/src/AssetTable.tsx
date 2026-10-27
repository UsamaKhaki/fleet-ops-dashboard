import type { Asset } from '@fleet/api';
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
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

const ROW_HEIGHT = 41;
const RECENT_CHANGE_MS = 5_000;

interface AssetTableProps {
  table: TanStackTable<Asset>;
  isLoading: boolean;
  isStale: boolean;
  /** Changes whenever the visible page changes, so the scroll position can reset. */
  pageKey: string;
  emptyState: ReactNode;
}

export function AssetTable({ table, isLoading, isStale, pageKey, emptyState }: AssetTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();
  const columnCount = table.getVisibleLeafColumns().length;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    initialRect: { width: 1024, height: 640 },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pageKey]);

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);

  return (
    <Table
      containerRef={scrollRef}
      containerClassName="h-[min(68vh,720px)] min-h-80 rounded-lg border bg-card"
      className={cn('transition-opacity', isStale && 'opacity-60')}
      aria-busy={isLoading || isStale}
    >
      <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
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
          Array.from({ length: 12 }, (_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell colSpan={columnCount}>
                <Skeleton className="h-5 w-full" />
              </TableCell>
            </TableRow>
          ))}

        {!isLoading && rows.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount}>{emptyState}</TableCell>
          </TableRow>
        )}

        {paddingTop > 0 && (
          <tr aria-hidden>
            <td colSpan={columnCount} style={{ height: paddingTop }} />
          </tr>
        )}
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          const changedRecently =
            Date.now() - Date.parse(row.original.updatedAt) < RECENT_CHANGE_MS;
          return (
            <TableRow
              // Keyed by updatedAt so a live change remounts the row and replays the highlight.
              key={`${row.id}:${row.original.updatedAt}`}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn(changedRecently && 'animate-flash')}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {paddingBottom > 0 && (
          <tr aria-hidden>
            <td colSpan={columnCount} style={{ height: paddingBottom }} />
          </tr>
        )}
      </TableBody>
    </Table>
  );
}
