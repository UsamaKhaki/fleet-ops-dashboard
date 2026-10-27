import type { WorkOrder } from '@fleet/api';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate));
}

/** A work order is overdue once its due date has passed and it is still not completed. */
export function isOverdue(order: WorkOrder, today = new Date().toISOString().slice(0, 10)) {
  return order.status !== 'completed' && order.dueDate < today;
}

export function capitalise(value: string): string {
  const spaced = value.replace('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
