import { createMockServer } from './app.js';

/**
 * Entry point for the hosted demo's Vercel Function. scripts/build-vercel-output.ts bundles
 * this file, so the function needs no TypeScript or workspace packages at runtime. Every
 * /api/* request, including the /api/ws WebSocket upgrade, is routed here, and Vercel starts
 * the exported server itself. Data lives in memory per function instance, which is fine for
 * a demo: a new instance simply starts from the same seed.
 */
const mock = createMockServer();
mock.startSimulation();

export default mock.server;
