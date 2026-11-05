import type { LiveMessage } from '@fleet/api/schemas';
import { createApiRouter, HttpError } from './routes.js';
import { FleetStore } from './store.js';

const API_PREFIX = '/api/';
const LIVE_PATH = '/api/ws';
const SIMULATED_FAILURE_HEADER = 'x-simulate-failure';

export interface BrowserMockOptions {
  store?: FleetStore;
  latencyMs?: readonly [number, number];
  telemetryIntervalMs?: number;
  assetChurnIntervalMs?: number;
}

function toUrl(input: Parameters<typeof fetch>[0]): URL {
  const href = input instanceof Request ? input.url : String(input);
  // The server's tsconfig has no DOM types, and tests run without a page.
  const page = (globalThis as { location?: { href: string } }).location;
  return new URL(href, page?.href ?? 'http://localhost');
}

/**
 * Runs the mock API in the page for hosts that only serve files. The apps keep calling fetch
 * and WebSocket as usual; requests for /api/* are answered here by the same routes and store
 * the Node server uses. Returns a function that restores the originals.
 */
export function installBrowserMock({
  store = new FleetStore(),
  latencyMs = [150, 600],
  telemetryIntervalMs = 1000,
  assetChurnIntervalMs = 4000,
}: BrowserMockOptions = {}): () => void {
  const originalFetch = globalThis.fetch;
  const OriginalWebSocket = globalThis.WebSocket;
  const sockets = new Set<MockSocket>();

  const broadcast = (message: LiveMessage) => {
    const data = JSON.stringify(message);
    for (const socket of sockets) socket.deliver(data);
  };

  const route = createApiRouter({ store, latencyMs, broadcast });

  class MockSocket extends EventTarget {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;
    readyState: number = MockSocket.OPEN;

    constructor() {
      super();
      // Listeners are attached after the constructor returns, as with a real socket.
      setTimeout(() => {
        if (this.readyState !== MockSocket.OPEN) return;
        sockets.add(this);
        this.dispatchEvent(new Event('open'));
        const snapshot: LiveMessage = {
          type: 'telemetry.snapshot',
          vehicles: store.vehiclePositions(),
        };
        this.deliver(JSON.stringify(snapshot));
      }, 0);
    }

    deliver(data: string) {
      this.dispatchEvent(new MessageEvent('message', { data }));
    }

    close() {
      this.readyState = MockSocket.CLOSED;
      sockets.delete(this);
      this.dispatchEvent(new Event('close'));
    }
  }

  globalThis.fetch = async (input, init) => {
    const url = toUrl(input);
    if (!url.pathname.startsWith(API_PREFIX)) return originalFetch(input, init);

    const { status, body } = await route({
      method: init?.method ?? 'GET',
      url,
      failureMode: new Headers(init?.headers).get(SIMULATED_FAILURE_HEADER) ?? undefined,
      readBody: () => {
        try {
          return Promise.resolve(JSON.parse(init?.body as string));
        } catch {
          throw new HttpError(400, 'Request body must be valid JSON');
        }
      },
    });
    init?.signal?.throwIfAborted();
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };

  globalThis.WebSocket = new Proxy(OriginalWebSocket, {
    construct(target, args: [string | URL, (string | string[])?]) {
      return new URL(args[0]).pathname === LIVE_PATH
        ? new MockSocket()
        : new target(args[0], args[1]);
    },
  });

  const timers: ReturnType<typeof setInterval>[] = [];
  if (telemetryIntervalMs > 0) {
    timers.push(
      setInterval(() => {
        broadcast({
          type: 'telemetry.update',
          vehicles: store.advanceTelemetry(telemetryIntervalMs),
        });
      }, telemetryIntervalMs),
    );
  }
  if (assetChurnIntervalMs > 0) {
    timers.push(
      setInterval(() => {
        broadcast({ type: 'asset.updated', asset: store.changeRandomAssetStatus() });
      }, assetChurnIntervalMs),
    );
  }

  return () => {
    timers.forEach(clearInterval);
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = OriginalWebSocket;
  };
}
