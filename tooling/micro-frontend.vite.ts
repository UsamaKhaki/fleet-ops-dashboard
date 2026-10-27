import react from '@vitejs/plugin-react';
import { defineConfig, type UserConfig } from 'vite';
import { MICRO_FRONTENDS, SHARED_DEPENDENCIES, microFrontendFileName } from './micro-frontends';

type MicroFrontendDir = (typeof MICRO_FRONTENDS)[number]['dir'];

/**
 * Builds one micro-frontend as an ES module that exports its single-spa lifecycles. In dev
 * the module is rebuilt on change (`vite build --watch`) and served by `vite preview`,
 * because the root config loads it cross-origin through the import map rather than through
 * Vite's dev server.
 *
 * This is an app build with a JS entry rather than library mode: library mode skips
 * whitespace minification for ES output, which roughly doubled the bundles.
 */
export function defineMicroFrontendConfig(dir: MicroFrontendDir) {
  const app = MICRO_FRONTENDS.find((entry) => entry.dir === dir);
  if (!app) throw new Error(`Unknown micro-frontend: ${dir}`);

  return defineConfig(({ mode }): UserConfig => ({
    plugins: [react()],
    // Relative, so any chunk is fetched from the app's own origin, not the root's.
    base: './',
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      minify: mode !== 'development',
      emptyOutDir: true,
      rollupOptions: {
        input: 'src/main.tsx',
        // Keep the lifecycle exports; an app build drops entry exports by default.
        preserveEntrySignatures: 'exports-only',
        output: {
          format: 'es',
          entryFileNames: microFrontendFileName(dir),
          chunkFileNames: 'chunks/[name]-[hash].js',
        },
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
