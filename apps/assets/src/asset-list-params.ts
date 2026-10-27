import { assetListQuerySchema } from '@fleet/api';
import { useListParams } from '@fleet/app-runtime';

export const PAGE_SIZE_OPTIONS = [50, 100, 500, 1000] as const;

export function useAssetListParams() {
  return useListParams(assetListQuerySchema);
}
