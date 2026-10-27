/**
 * Copies every micro-frontend build into the root's dist so `vite preview` (or any static
 * host) serves the whole dashboard from one origin, matching the production import map.
 */
import { access, cp } from 'node:fs/promises';
import path from 'node:path';
import { MICRO_FRONTENDS } from '../../../tooling/micro-frontends';

const appsDir = path.resolve(import.meta.dirname, '../..');
const target = path.resolve(import.meta.dirname, '../dist/apps');

for (const app of MICRO_FRONTENDS) {
  const source = path.join(appsDir, app.dir, 'dist');
  try {
    await access(source);
  } catch {
    throw new Error(`${app.name} has no build at ${source}. Build the micro-frontends first.`);
  }
  await cp(source, path.join(target, app.dir), { recursive: true });
}

console.log(`[assemble] copied ${MICRO_FRONTENDS.length} micro-frontends into dist/apps`);
