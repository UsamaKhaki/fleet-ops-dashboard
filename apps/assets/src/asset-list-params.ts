import { assetListQuerySchema, type ParsedAssetListQuery } from '@fleet/api';
import { parseSearchParams, useSearchParams } from '@fleet/app-runtime';
import { useCallback } from 'react';

export const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000] as const;

const DEFAULTS = assetListQuerySchema.parse({});

/** Writes a partial change into the query string. Any change other than paging goes back to page 1. */
export function applyAssetListChange(
  params: URLSearchParams,
  change: Partial<ParsedAssetListQuery>,
): void {
  for (const [key, value] of Object.entries(change)) {
    const isDefault = value === DEFAULTS[key as keyof ParsedAssetListQuery];
    const isEmpty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
    if (isDefault || isEmpty) params.delete(key);
    else params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  if (!('page' in change)) params.delete('page');
}

export function useAssetListParams() {
  const [params, updateParams] = useSearchParams();
  const query = parseSearchParams(assetListQuerySchema, params);

  const setQuery = useCallback(
    (change: Partial<ParsedAssetListQuery>) =>
      updateParams((next) => applyAssetListChange(next, change)),
    [updateParams],
  );

  return [query, setQuery] as const;
}
