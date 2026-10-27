import type { Page } from '@fleet/api/schemas';

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

type Comparable = string | number | null;

export function sortBy<T>(
  items: readonly T[],
  valueOf: (item: T) => Comparable,
  order: 'asc' | 'desc',
): T[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left < right ? -1 : 1) * direction;
  });
}

export function matchesSearch(term: string | undefined, ...fields: string[]): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(needle));
}
