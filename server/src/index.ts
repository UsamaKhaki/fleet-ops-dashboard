import { createMockServer } from './app';

// Not PORT: dev tooling often sets PORT for the page server, which must stay on 6701.
const port = Number(process.env.MOCK_SERVER_PORT ?? 6709);
const latencyMax = Number(process.env.MOCK_LATENCY_MS ?? 600);

const mock = createMockServer({ latencyMs: [Math.min(150, latencyMax), latencyMax] });
const boundPort = await mock.listen(port);
console.log(
  `[mock-server] REST on http://localhost:${boundPort}/api, live feed on ws://localhost:${boundPort}/ws`,
);

const shutdown = () => {
  void mock.close().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
