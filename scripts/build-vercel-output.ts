/**
 * Writes the hosted demo in Vercel's Build Output API format (.vercel/output), after
 * `pnpm build` has produced the static dashboard:
 *
 * - static/: the assembled dashboard from apps/root-config/dist
 * - functions/api/server.func: the mock server bundled into one ES module, so the function
 *   needs no TypeScript or workspace packages at runtime
 * - config.json: /api/* (including the WebSocket upgrade) to the function, then static
 *   files, then index.html for the dashboard's own routes
 */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.vercel/output');
const functionDir = path.join(output, 'functions/api/server.func');

await rm(output, { recursive: true, force: true });
await mkdir(functionDir, { recursive: true });

await cp(path.join(root, 'apps/root-config/dist'), path.join(output, 'static'), {
  recursive: true,
});

await build({
  entryPoints: [path.join(root, 'server/src/hosted.ts')],
  outfile: path.join(functionDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // ws is CommonJS and calls require() for Node built-ins.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  // Optional native speed-ups for ws; it falls back to plain JavaScript without them.
  external: ['bufferutil', 'utf-8-validate'],
  logLevel: 'warning',
});

await writeFile(
  path.join(functionDir, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs' }, null, 2),
);

await writeFile(
  path.join(output, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api/(.*)$', dest: '/api/server' },
        { handle: 'filesystem' },
        { src: '^/(.*)$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('[vercel-output] wrote static files, the api/server function and routes');
