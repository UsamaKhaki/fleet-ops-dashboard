import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiRouter, HttpError, type ApiOptions, type JsonResult } from './routes.js';

const SIMULATED_FAILURE_HEADER = 'x-simulate-failure';
const MAX_BODY_BYTES = 64 * 1024;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

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

export function createRequestHandler(options: ApiOptions) {
  const route = createApiRouter(options);

  return async (request: IncomingMessage, response: ServerResponse) => {
    applyCors(request, response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    sendJson(
      response,
      await route({
        method: request.method ?? 'GET',
        url: new URL(request.url ?? '/', 'http://localhost'),
        failureMode: request.headers[SIMULATED_FAILURE_HEADER],
        readBody: () => readJson(request),
      }),
    );
  };
}
