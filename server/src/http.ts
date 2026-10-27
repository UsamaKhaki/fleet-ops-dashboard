import type { IncomingMessage, ServerResponse } from 'node:http';
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
import type { FleetStore } from './store';

const SIMULATED_FAILURE_HEADER = 'x-simulate-failure';
const MAX_BODY_BYTES = 64 * 1024;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export interface HttpOptions {
  store: FleetStore;
  latencyMs: readonly [min: number, max: number];
  broadcast: (message: LiveMessage) => void;
}

type JsonResult = { status: number; body: unknown };

class HttpError extends Error {
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

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large');
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

function sendJson(response: ServerResponse, { status, body }: JsonResult) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function applyCors(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  if (origin && LOCAL_ORIGIN.test(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('vary', 'origin');
    response.setHeader('access-control-allow-methods', 'GET, POST, PATCH, OPTIONS');
    response.setHeader('access-control-allow-headers', `content-type, ${SIMULATED_FAILURE_HEADER}`);
  }
}

function shouldSimulateFailure(request: IncomingMessage) {
  const mode = request.headers[SIMULATED_FAILURE_HEADER];
  return mode === 'all' || (mode === 'mutations' && request.method !== 'GET');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRequestHandler({ store, latencyMs, broadcast }: HttpOptions) {
  const routes: {
    method: string;
    pattern: RegExp;
    handle: (params: string[], request: IncomingMessage, url: URL) => Promise<JsonResult>;
  }[] = [
    {
      method: 'GET',
      pattern: /^\/api\/health$/,
      handle: () => Promise.resolve({ status: 200, body: { ok: true } }),
    },
    {
      method: 'GET',
      pattern: /^\/api\/assets$/,
      handle: (_params, _request, url) => {
        const query = validate(assetListQuerySchema, Object.fromEntries(url.searchParams));
        return Promise.resolve({ status: 200, body: store.listAssets(query) });
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/assets\/([^/]+)$/,
      handle: async ([id = ''], request) => {
        const patch = validate(assetPatchSchema, await readJson(request));
        const asset = store.updateAsset(decodeURIComponent(id), patch);
        if (!asset) throw new HttpError(404, 'Asset not found');
        broadcast({ type: 'asset.updated', asset });
        return { status: 200, body: asset };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/work-orders$/,
      handle: (_params, _request, url) => {
        const query = validate(workOrderListQuerySchema, Object.fromEntries(url.searchParams));
        return Promise.resolve({ status: 200, body: store.listWorkOrders(query) });
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/work-orders$/,
      handle: async (_params, request) => {
        const input = validate(workOrderCreateSchema, await readJson(request));
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
      handle: async ([id = ''], request) => {
        const patch = validate(workOrderPatchSchema, await readJson(request));
        const workOrder = store.updateWorkOrder(decodeURIComponent(id), patch);
        if (!workOrder) throw new HttpError(404, 'Work order not found');
        broadcast({ type: 'workOrder.updated', workOrder });
        return { status: 200, body: workOrder };
      },
    },
  ];

  return async (request: IncomingMessage, response: ServerResponse) => {
    applyCors(request, response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    const pathMatches = routes.filter((route) => route.pattern.test(url.pathname));
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

      const [, ...params] = url.pathname.match(route.pattern) ?? [];
      sendJson(response, await route.handle(params, request, url));
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiErrorBody = { error: error.message };
        if (error.issues) body.issues = error.issues;
        sendJson(response, { status: error.status, body });
        return;
      }
      console.error('[mock-server] unhandled error', error);
      sendJson(response, { status: 500, body: { error: 'Internal server error' } });
    }
  };
}
