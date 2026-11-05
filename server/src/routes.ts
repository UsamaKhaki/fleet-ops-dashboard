import {
  assetListQuerySchema,
  assetPatchSchema,
  workOrderCreateSchema,
  workOrderListQuerySchema,
  workOrderPatchSchema,
  type ApiErrorBody,
  type LiveMessage,
} from '@fleet/api/schemas';
import type { z } from 'zod';
import type { FleetStore } from './store.js';

export interface ApiOptions {
  store: FleetStore;
  latencyMs: readonly [min: number, max: number];
  broadcast: (message: LiveMessage) => void;
}

/** One API call, independent of whether it arrived over HTTP or from a patched fetch. */
export interface ApiRequest {
  method: string;
  url: URL;
  /** The value of the simulated failure header, if the client sent one. */
  failureMode: string | string[] | undefined;
  readBody: () => Promise<unknown>;
}

export type JsonResult = { status: number; body: unknown };

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: ApiErrorBody['issues'],
  ) {
    super(message);
  }
}

function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(
      400,
      'Validation failed',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldSimulateFailure({ failureMode, method }: ApiRequest) {
  return failureMode === 'all' || (failureMode === 'mutations' && method !== 'GET');
}

export function createApiRouter({ store, latencyMs, broadcast }: ApiOptions) {
  const routes: {
    method: string;
    pattern: RegExp;
    handle: (params: string[], request: ApiRequest) => Promise<JsonResult>;
  }[] = [
    {
      method: 'GET',
      pattern: /^\/api\/health$/,
      handle: () => Promise.resolve({ status: 200, body: { ok: true } }),
    },
    {
      method: 'GET',
      pattern: /^\/api\/assets$/,
      handle: (_params, { url }) => {
        const query = validate(assetListQuerySchema, Object.fromEntries(url.searchParams));
        return Promise.resolve({ status: 200, body: store.listAssets(query) });
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/assets\/([^/]+)$/,
      handle: async ([id = ''], { readBody }) => {
        const patch = validate(assetPatchSchema, await readBody());
        const asset = store.updateAsset(decodeURIComponent(id), patch);
        if (!asset) throw new HttpError(404, 'Asset not found');
        broadcast({ type: 'asset.updated', asset });
        return { status: 200, body: asset };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/work-orders$/,
      handle: (_params, { url }) => {
        const query = validate(workOrderListQuerySchema, Object.fromEntries(url.searchParams));
        return Promise.resolve({ status: 200, body: store.listWorkOrders(query) });
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/work-orders$/,
      handle: async (_params, { readBody }) => {
        const input = validate(workOrderCreateSchema, await readBody());
        const workOrder = store.createWorkOrder(input);
        if (!workOrder) {
          throw new HttpError(422, 'Asset not found', [
            { path: 'assetId', message: 'No asset with this id' },
          ]);
        }
        broadcast({ type: 'workOrder.updated', workOrder });
        return { status: 201, body: workOrder };
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/work-orders\/([^/]+)$/,
      handle: async ([id = ''], { readBody }) => {
        const patch = validate(workOrderPatchSchema, await readBody());
        const workOrder = store.updateWorkOrder(decodeURIComponent(id), patch);
        if (!workOrder) throw new HttpError(404, 'Work order not found');
        broadcast({ type: 'workOrder.updated', workOrder });
        return { status: 200, body: workOrder };
      },
    },
  ];

  return async (request: ApiRequest): Promise<JsonResult> => {
    const { pathname } = request.url;
    const pathMatches = routes.filter((route) => route.pattern.test(pathname));
    const route = pathMatches.find((candidate) => candidate.method === request.method);

    try {
      if (!route) {
        throw pathMatches.length > 0
          ? new HttpError(405, 'Method not allowed')
          : new HttpError(404, 'Not found');
      }

      const [min, max] = latencyMs;
      if (max > 0) await delay(min + Math.random() * (max - min));

      if (shouldSimulateFailure(request)) {
        throw new HttpError(
          503,
          'Simulated failure: the mock server was asked to fail this request',
        );
      }

      const [, ...params] = pathname.match(route.pattern) ?? [];
      return await route.handle(params, request);
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiErrorBody = { error: error.message };
        if (error.issues) body.issues = error.issues;
        return { status: error.status, body };
      }
      console.error('[mock-server] unhandled error', error);
      return { status: 500, body: { error: 'Internal server error' } };
    }
  };
}
