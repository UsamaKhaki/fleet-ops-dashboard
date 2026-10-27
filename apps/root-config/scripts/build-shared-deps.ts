/**
 * Builds the dependencies every micro-frontend shares (React, ReactDOM, sonner) into
 * public/shared as ES modules, so the import map can hand all apps one React instance.
 *
 * React 18 only ships CommonJS, so each entry is generated: it imports the package and
 * re-exports its keys as named exports. Rollup then puts React in one chunk that the
 * react-dom entries import, instead of copying it into each.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'vite';
import { SHARED_DEPENDENCIES } from '../../../tooling/micro-frontends';

const mode = process.argv[2] === 'production' ? 'production' : 'development';
process.env.NODE_ENV = mode;

const root = path.resolve(import.meta.dirname, '..');
const entriesDir = path.join(root, 'node_modules/.shared-entries');
const outDir = path.join(root, 'public/shared');
const require = createRequire(path.join(root, 'package.json'));

const COMMONJS_PACKAGES = new Set(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime']);

function entrySource(specifier: string): string {
  if (!COMMONJS_PACKAGES.has(specifier)) return `export * from '${specifier}';\n`;

  const exported = Object.keys(require(specifier) as object).filter(
    (key) => key !== 'default' && /^[A-Za-z_$][\w$]*$/.test(key),
  );
  return [
    `import * as mod from '${specifier}';`,
    `const m = mod.default ?? mod;`,
    `export default m;`,
    `export const { ${exported.join(', ')} } = m;`,
    '',
  ].join('\n');
}

await rm(entriesDir, { recursive: true, force: true });
await mkdir(entriesDir, { recursive: true });

const input: Record<string, string> = {};
for (const [specifier, fileName] of Object.entries(SHARED_DEPENDENCIES)) {
  const entryName = fileName.replace(/\.js$/, '');
  const entryPath = path.join(entriesDir, `${entryName}.js`);
  await writeFile(entryPath, entrySource(specifier));
  input[entryName] = entryPath;
}

await build({
  configFile: false,
  publicDir: false,
  root,
  logLevel: 'warn',
  mode,
  define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
  build: {
    outDir,
    emptyOutDir: true,
    minify: mode === 'production',
    target: 'es2022',
    rollupOptions: {
      input,
      onwarn(warning, warn) {
        // sonner ships a "use client" directive, which only means something to RSC bundlers.
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});

console.log(`[shared-deps] built ${Object.keys(input).length} ${mode} modules into public/shared`);
