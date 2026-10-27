import { assetKeys, type Asset, type Page } from '@fleet/api';
import type { QueryClient } from '@tanstack/react-query';

/** Replaces one asset in every cached list page that contains it, without refetching. */
export function replaceAssetInLists(queryClient: QueryClient, asset: Asset) {
  queryClient.setQueriesData<Page<Asset>>({ queryKey: assetKeys.lists() }, (page) => {
    if (!page?.items.some((item) => item.id === asset.id)) return page;
    return { ...page, items: page.items.map((item) => (item.id === asset.id ? asset : item)) };
  });
}

export function findCachedAsset(queryClient: QueryClient, id: string): Asset | undefined {
  for (const [, page] of queryClient.getQueriesData<Page<Asset>>({ queryKey: assetKeys.lists() })) {
    const match = page?.items.find((item) => item.id === id);
    if (match) return match;
  }
  return undefined;
}
