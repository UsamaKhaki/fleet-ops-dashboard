import type { WorkOrder, WorkOrderPriority, WorkOrderSortField, WorkOrderStatus } from '@fleet/api';
import { Badge, Button, cn } from '@fleet/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { capitalise, formatDate, isOverdue } from './format';
import { isPendingWorkOrder } from './work-order-cache';

const PRIORITY_CLASSES: Record<WorkOrderPriority, string> = {
  critical: 'border-transparent bg-status-offline text-white',
  high: 'border-transparent bg-status-maintenance text-primary-foreground',
  medium: '',
  low: 'text-muted-foreground',
};

const NEXT_STEP: Record<WorkOrderStatus, { label: string; status: WorkOrderStatus }> = {
  open: { label: 'Start', status: 'in_progress' },
  in_progress: { label: 'Complete', status: 'completed' },
  completed: { label: 'Reopen', status: 'open' },
};

type WorkOrderColumn = ColumnDef<WorkOrder> & {
  id: WorkOrderSortField | 'title' | 'asset' | 'actions';
};

export function createWorkOrderColumns(
  onStatusChange: (order: WorkOrder, status: WorkOrderStatus) => void,
): WorkOrderColumn[] {
  return [
    {
      id: 'id',
      header: 'ID',
      accessorKey: 'id',
      cell: ({ row }) =>
        isPendingWorkOrder(row.original) ? (
          <span className="text-xs text-muted-foreground">Saving…</span>
        ) : (
          <span className="font-mono text-xs">{row.original.id}</span>
        ),
    },
    { id: 'title', header: 'Title', accessorKey: 'title', enableSorting: false },
    {
      id: 'asset',
      header: 'Asset',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span>{row.original.assetName}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.original.assetId}</span>
        </span>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorKey: 'priority',
      cell: ({ row }) => (
        <Badge variant="outline" className={PRIORITY_CLASSES[row.original.priority]}>
          {capitalise(row.original.priority)}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => capitalise(row.original.status),
    },
    {
      id: 'dueDate',
      header: 'Due',
      accessorKey: 'dueDate',
      cell: ({ row }) => (
        <span
          className={cn('flex items-center gap-2', isOverdue(row.original) && 'text-destructive')}
        >
          {formatDate(row.original.dueDate)}
          {isOverdue(row.original) && (
            <Badge variant="destructive" className="text-[10px]">
              Overdue
            </Badge>
          )}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const next = NEXT_STEP[row.original.status];
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={isPendingWorkOrder(row.original)}
            aria-label={`${next.label} ${row.original.id}`}
            onClick={() => onStatusChange(row.original, next.status)}
          >
            {next.label}
          </Button>
        );
      },
    },
  ];
}
