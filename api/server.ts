import { createMockServer } from '../server/src/app.js';

/**
 * The mock REST API and live feed as one Vercel Function. vercel.json rewrites every /api/*
 * request here, including the /api/ws WebSocket upgrade, and Vercel starts the exported
 * server itself. Data lives in memory per function instance, which is fine for a demo:
 * a new instance simply starts from the same seed.
 */
const mock = createMockServer();
mock.startSimulation();

export default mock.server;
