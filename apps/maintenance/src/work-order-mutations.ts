import {
  fleetApi,
  workOrderKeys,
  type Page,
  type WorkOrder,
  type WorkOrderCreate,
  type WorkOrderListQuery,
  type WorkOrderStatus,
} from '@fleet/api';
import { toast } from '@fleet/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PENDING_ID_PREFIX,
  findCachedWorkOrder,
  removeWorkOrder,
  replaceWorkOrder,
} from './work-order-cache';

/**
 * Creates a work order and shows it at the top of the visible list straight away. The
 * row is marked as saving until the server answers, and removed again if it refuses.
 */
export function useCreateWorkOrder(visibleQuery: WorkOrderListQuery) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WorkOrderCreate) => fleetApi.createWorkOrder(input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: workOrderKeys.lists() });
      const optimistic: WorkOrder = {
        id: `${PENDING_ID_PREFIX}${crypto.randomUUID()}`,
        assetId: input.assetId,
        assetName: input.assetId,
        title: input.title,
        priority: input.priority,
        status: 'open',
        createdAt: new Date().toISOString(),
        dueDate: input.dueDate,
        completedAt: null,
      };
      queryClient.setQueryData<Page<WorkOrder>>(workOrderKeys.list(visibleQuery), (page) =>
        page ? { ...page, items: [optimistic, ...page.items], total: page.total + 1 } : page,
      );
      return { optimisticId: optimistic.id };
    },

    onError: (error, input, context) => {
      if (context) removeWorkOrder(queryClient, context.optimisticId);
      toast.error(`Could not create "${input.title}"`, { description: error.message });
    },

    onSuccess: (created, _input, context) => {
      replaceWorkOrder(queryClient, context.optimisticId, created);
      toast.success(`${created.id} created for ${created.assetName}`);
    },

    // The server owns ordering and totals, so line the lists up with it afterwards.
    onSettled: () => queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() }),
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      fleetApi.updateWorkOrder(id, { status }),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: workOrderKeys.lists() });
      const previous = findCachedWorkOrder(queryClient, id);
      if (previous) {
        replaceWorkOrder(queryClient, id, {
          ...previous,
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
        });
      }
      return { previous };
    },

    onError: (error, { id }, context) => {
      if (context?.previous) replaceWorkOrder(queryClient, id, context.previous);
      toast.error(`Could not update ${id}`, { description: error.message });
    },

    onSuccess: (order) => replaceWorkOrder(queryClient, order.id, order),

    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists(), refetchType: 'none' }),
  });
}
