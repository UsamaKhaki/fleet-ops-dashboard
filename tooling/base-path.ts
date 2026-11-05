/// <reference types="vite/client" />

/**
 * The path the dashboard is served under: empty locally, /fleet-ops-dashboard on GitHub Pages.
 * Browser code only, because Vite fills this in at build time.
 */
export const BASE_PATH = (import.meta.env.VITE_FLEET_BASE_PATH as string | undefined) ?? '';

export function routeUrl(path: string) {
  return `${BASE_PATH}${path}`;
}
