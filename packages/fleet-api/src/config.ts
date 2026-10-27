export const API_URL: string = import.meta.env.VITE_FLEET_API_URL ?? 'http://localhost:6709';
export const LIVE_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;
