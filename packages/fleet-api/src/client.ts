import type { z } from 'zod';
import { API_URL } from './config';
import {
  apiErrorBodySchema,
  assetSchema,
  pageSchema,
  workOrderSchema,
  type ApiErrorBody,
  type Asset,
  type AssetListQuery,
  type AssetPatch,
  type Page,
  type WorkOrder,
  type WorkOrderCreate,
  type WorkOrderListQuery,
  type WorkOrderPatch,
} from './schemas';
import { toSearchParams } from './search-params';
import { SIMULATED_FAILURE_HEADER, getFailureMode } from './simulated-failure';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: ApiErrorBody['issues'] = undefined,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal | undefined;
}

async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<z.output<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const failureMode = getFailureMode();
  if (failureMode !== 'off') headers[SIMULATED_FAILURE_HEADER] = failureMode;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      signal: signal ?? null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the fleet API. Is the mock server running?', 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = apiErrorBodySchema.safeParse(payload);
    throw new ApiError(
      parsedError.success ? parsedError.data.error : `Request failed with ${response.status}`,
      response.status,
      parsedError.success ? parsedError.data.issues : undefined,
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(`Unexpected response shape from ${path}`, response.status);
  }
  return parsed.data;
}

const assetPageSchema = pageSchema(assetSchema);
const workOrderPageSchema = pageSchema(workOrderSchema);

export const fleetApi = {
  listAssets(query: AssetListQuery, signal?: AbortSignal): Promise<Page<Asset>> {
    return request(`/api/assets?${toSearchParams(query).toString()}`, assetPageSchema, { signal });
  },
  updateAsset(id: string, patch: AssetPatch): Promise<Asset> {
    return request(`/api/assets/${encodeURIComponent(id)}`, assetSchema, {
      method: 'PATCH',
      body: patch,
    });
  },
  listWorkOrders(query: WorkOrderListQuery, signal?: AbortSignal): Promise<Page<WorkOrder>> {
    return request(`/api/work-orders?${toSearchParams(query).toString()}`, workOrderPageSchema, {
      signal,
    });
  },
  createWorkOrder(input: WorkOrderCreate): Promise<WorkOrder> {
    return request('/api/work-orders', workOrderSchema, { method: 'POST', body: input });
  },
  updateWorkOrder(id: string, patch: WorkOrderPatch): Promise<WorkOrder> {
    return request(`/api/work-orders/${encodeURIComponent(id)}`, workOrderSchema, {
      method: 'PATCH',
      body: patch,
    });
  },
};
