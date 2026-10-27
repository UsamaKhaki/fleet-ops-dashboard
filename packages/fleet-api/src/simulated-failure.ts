// A dev-only switch, shared through localStorage so the shell can flip it for every
// micro-frontend at once. The mock server reads the header and fails on purpose.
export const SIMULATED_FAILURE_HEADER = 'x-simulate-failure';
export const FAILURE_MODES = ['off', 'mutations', 'all'] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

const STORAGE_KEY = 'fleet-ops:simulate-failure';
/** Fired on window when the mode changes, so open apps can refetch and show the new behaviour. */
export const FAILURE_MODE_EVENT = 'fleet-ops:failure-mode';

export function getFailureMode(): FailureMode {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return FAILURE_MODES.find((mode) => mode === stored) ?? 'off';
  } catch {
    return 'off';
  }
}

export function setFailureMode(mode: FailureMode): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  globalThis.dispatchEvent?.(new CustomEvent(FAILURE_MODE_EVENT, { detail: mode }));
}
