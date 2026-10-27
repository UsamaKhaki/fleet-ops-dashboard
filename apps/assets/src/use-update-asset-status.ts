import { assetKeys, fleetApi, type AssetStatus } from '@fleet/api';
import { toast } from '@fleet/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { findCachedAsset, replaceAssetInLists } from './asset-cache';

interface StatusChange {
  id: string;
  status: AssetStatus;
}

export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: StatusChange) => fleetApi.updateAsset(id, { status }),

    onMutate: async ({ id, status }) => {
      // Stop an in-flight list fetch from landing on top of the optimistic value.
      await queryClient.cancelQueries({ queryKey: assetKeys.lists() });
      const previous = findCachedAsset(queryClient, id);
      if (previous) replaceAssetInLists(queryClient, { ...previous, status });
      return { previous };
    },

    onError: (error, { id }, context) => {
      // Roll back only this asset. Restoring a whole-list snapshot would also undo live
      // updates to other rows that arrived while the request was in flight.
      if (context?.previous) replaceAssetInLists(queryClient, context.previous);
      toast.error(`Could not update ${id}`, { description: error.message });
    },

    onSuccess: (asset) => {
      replaceAssetInLists(queryClient, asset);
      toast.success(`${asset.name} is now ${asset.status}`);
    },

    // Mark lists stale without refetching, so a row that no longer matches the active
    // filter does not vanish under the cursor; it drops out on the next page or filter change.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: assetKeys.lists(), refetchType: 'none' }),
  });
}
