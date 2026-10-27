import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { LiveMessage } from '@fleet/api/schemas';
import { WebSocket, WebSocketServer } from 'ws';
import { createRequestHandler } from './http.js';
import { FleetStore } from './store.js';

const LIVE_PATHS = new Set(['/ws', '/api/ws']);

export interface MockServerOptions {
  store?: FleetStore;
  latencyMs?: readonly [number, number];
  telemetryIntervalMs?: number;
  /** How often a random asset changes status on its own. 0 turns it off. */
  assetChurnIntervalMs?: number;
}

export function createMockServer({
  store = new FleetStore(),
  latencyMs = [150, 600],
  telemetryIntervalMs = 1000,
  assetChurnIntervalMs = 4000,
}: MockServerOptions = {}) {
  const sockets = new WebSocketServer({ noServer: true });

  const broadcast = (message: LiveMessage) => {
    const payload = JSON.stringify(message);
    for (const client of sockets.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  };

  const handleRequest = createRequestHandler({ store, latencyMs, broadcast });
  const server = createServer((request, response) => {
    void handleRequest(request, response);
  });

  server.on('upgrade', (request, socket, head) => {
    // /ws locally; /api/ws when hosted, where every server route sits under /api.
    if (!LIVE_PATHS.has(new URL(request.url ?? '/', 'http://localhost').pathname)) {
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (client) => {
      const snapshot: LiveMessage = {
        type: 'telemetry.snapshot',
        vehicles: store.vehiclePositions(),
      };
      client.send(JSON.stringify(snapshot));
    });
  });

  const timers: ReturnType<typeof setInterval>[] = [];

  /** Starts the telemetry and asset-churn timers. Calling it again does nothing. */
  const startSimulation = () => {
    if (timers.length > 0) return;
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
  };

  return {
    store,
    broadcast,
    /** The HTTP server, for hosts that start it themselves (see api/server.ts). */
    server,
    startSimulation,
    async listen(port: number): Promise<number> {
      await new Promise<void>((resolve) => server.listen(port, resolve));
      startSimulation();
      return (server.address() as AddressInfo).port;
    },
    async close(): Promise<void> {
      timers.forEach(clearInterval);
      for (const client of sockets.clients) client.terminate();
      sockets.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
