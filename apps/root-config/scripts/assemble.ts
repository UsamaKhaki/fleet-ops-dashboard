/**
 * Copies every micro-frontend build into the root's dist so `vite preview` (or any static
 * host) serves the whole dashboard from one origin, matching the production import map.
 */
import { access, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { MICRO_FRONTENDS } from '../../../tooling/micro-frontends';

const appsDir = path.resolve(import.meta.dirname, '../..');
const dist = path.resolve(import.meta.dirname, '../dist');
const target = path.join(dist, 'apps');

for (const app of MICRO_FRONTENDS) {
  const source = path.join(appsDir, app.dir, 'dist');
  try {
    await access(source);
  } catch {
    throw new Error(`${app.name} has no build at ${source}. Build the micro-frontends first.`);
  }
  await cp(source, path.join(target, app.dir), { recursive: true });
}

// GitHub Pages answers unknown paths with 404.html, so refreshing /assets still gets the app.
await copyFile(path.join(dist, 'index.html'), path.join(dist, '404.html'));

console.log(`[assemble] copied ${MICRO_FRONTENDS.length} micro-frontends into dist/apps`);
