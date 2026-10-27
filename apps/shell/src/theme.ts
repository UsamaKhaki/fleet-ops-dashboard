import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Must match the inline script in apps/root-config/index.html that runs before first paint.
export const THEME_STORAGE_KEY = 'fleet-ops:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function useTheme() {
  const [preference, setPreference] = useState(readThemePreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    // The class on <html> is the whole theming contract: every app reads the same CSS tokens.
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved]);

  const changePreference = (next: ThemePreference) => {
    setPreference(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  };

  return { preference, resolved, setPreference: changePreference };
}
