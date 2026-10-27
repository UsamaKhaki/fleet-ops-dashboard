import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import { MICRO_FRONTENDS, SHARED_DEPENDENCIES, microFrontendFileName } from './micro-frontends';

type MicroFrontendDir = (typeof MICRO_FRONTENDS)[number]['dir'];

/**
 * Builds one micro-frontend as a single ES module with single-spa lifecycles. In dev the
 * module is rebuilt on change (`vite build --watch`) and served by `vite preview`, because
 * the root config loads it cross-origin through the import map rather than through Vite's
 * dev server.
 */
export function defineMicroFrontendConfig(dir: MicroFrontendDir) {
  const app = MICRO_FRONTENDS.find((entry) => entry.dir === dir);
  if (!app) throw new Error(`Unknown micro-frontend: ${dir}`);

  return defineConfig(({ mode }): UserConfig => ({
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      minify: mode !== 'development',
      emptyOutDir: true,
      lib: {
        entry: 'src/main.tsx',
        formats: ['es'],
        fileName: () => microFrontendFileName(dir),
      },
      rollupOptions: {
        external: Object.keys(SHARED_DEPENDENCIES),
        onwarn(warning, warn) {
          // zod ships pure annotations Rollup cannot place; harmless and not ours to fix.
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules')) return;
          warn(warning);
        },
      },
    },
    preview: {
      port: app.port,
      strictPort: true,
      cors: { origin: /^http:\/\/localhost:\d+$/ },
    },
  }));
}
