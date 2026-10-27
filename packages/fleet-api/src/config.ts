/**
 * Where the mock API lives. Locally that is its own port. The hosted demo builds with
 * VITE_FLEET_API_URL set to an empty string, meaning "same origin": REST calls go to /api/*
 * on the page's host and the live feed to /api/ws there.
 */
export const API_URL: string = import.meta.env.VITE_FLEET_API_URL ?? 'http://localhost:6709';

export const LIVE_URL = liveUrl(API_URL, globalThis.location);

export function liveUrl(apiUrl: string, location?: Pick<Location, 'protocol' | 'host'>): string {
  if (apiUrl) return `${apiUrl.replace(/^http/, 'ws')}/ws`;
  if (!location) throw new Error('A same-origin API needs a browser location for the live feed');
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`;
}
