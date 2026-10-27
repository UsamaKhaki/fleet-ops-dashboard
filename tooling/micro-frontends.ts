/**
 * The single source of truth for which micro-frontends exist, where they run in dev,
 * and which dependencies are shared through the import map instead of bundled.
 */
export const MICRO_FRONTENDS = [
  { name: '@fleet/shell', dir: 'shell', port: 6702 },
  { name: '@fleet/assets', dir: 'assets', port: 6703 },
  { name: '@fleet/maintenance', dir: 'maintenance', port: 6704 },
  { name: '@fleet/live-map', dir: 'live-map', port: 6705 },
] as const;

/** Route-level apps, in menu order. The shell is always mounted and is not listed. */
export const ROUTES = [
  { path: '/assets', app: '@fleet/assets', label: 'Assets' },
  { path: '/maintenance', app: '@fleet/maintenance', label: 'Maintenance' },
  { path: '/live-map', app: '@fleet/live-map', label: 'Live map' },
] as const;

export const ROOT_CONFIG_PORT = 6701;

/** Bare specifier -> file name under /shared/. Every app must externalise exactly these. */
export const SHARED_DEPENDENCIES = {
  react: 'react.js',
  'react-dom': 'react-dom.js',
  'react-dom/client': 'react-dom-client.js',
  'react/jsx-runtime': 'react-jsx-runtime.js',
  sonner: 'sonner.js',
} as const;

export function microFrontendFileName(dir: string) {
  return `${dir}.js`;
}
