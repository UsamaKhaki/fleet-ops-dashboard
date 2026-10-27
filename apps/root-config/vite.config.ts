import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import {
  MICRO_FRONTENDS,
  ROOT_CONFIG_PORT,
  SHARED_DEPENDENCIES,
  microFrontendFileName,
} from '../../tooling/micro-frontends';

/**
 * Writes the import map into index.html. In dev every micro-frontend is loaded from its
 * own port; in a production build they sit next to the root under /apps/<dir>/.
 */
function importMap(): Plugin {
  let isDevServer = false;
  return {
    name: 'fleet-import-map',
    configResolved(config) {
      isDevServer = config.command === 'serve';
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const imports: Record<string, string> = {};
        for (const [specifier, file] of Object.entries(SHARED_DEPENDENCIES)) {
          imports[specifier] = `/shared/${file}`;
        }
        for (const app of MICRO_FRONTENDS) {
          const file = microFrontendFileName(app.dir);
          imports[app.name] = isDevServer
            ? `http://localhost:${app.port}/${file}`
            : `/apps/${app.dir}/${file}`;
        }
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: JSON.stringify({ imports }, null, 2),
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [importMap(), tailwindcss()],
  server: { port: ROOT_CONFIG_PORT, strictPort: true },
  preview: { port: ROOT_CONFIG_PORT, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
});
