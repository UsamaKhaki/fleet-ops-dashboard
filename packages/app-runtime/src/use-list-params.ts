import { useCallback } from 'react';
import type { z } from 'zod';
import { parseSearchParams } from './parse-search-params';
import { useSearchParams } from './use-search-params';

/**
 * Writes a partial change into the query string, leaving defaults and empty values out so
 * URLs stay short. Any change other than paging goes back to page 1.
 */
export function applyListChange<T extends Record<string, unknown>>(
  params: URLSearchParams,
  change: Partial<T>,
  defaults: T,
): void {
  for (const [key, value] of Object.entries(change)) {
    const isDefault = value === defaults[key];
    const isEmpty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
    if (isDefault || isEmpty) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  if (!('page' in change)) params.delete('page');
}

/** List state (page, sort, filters) for a list query schema, kept in the URL. */
export function useListParams<S extends z.ZodObject>(schema: S) {
  type Query = z.output<S>;
  const [params, updateParams] = useSearchParams();
  const query: Query = parseSearchParams(schema, params);

  const setQuery = useCallback(
    (change: Partial<Query>) =>
      updateParams((next) => applyListChange(next, change, schema.parse({}))),
    [updateParams, schema],
  );

  return [query, setQuery] as const;
}
