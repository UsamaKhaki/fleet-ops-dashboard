const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

export function formatRelative(iso: string, now = Date.now()): string {
  const elapsed = Date.parse(iso) - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) return relativeTime.format(Math.round(elapsed / ms), unit);
  }
  return 'just now';
}

export const integerFormat = new Intl.NumberFormat('en-GB');

export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
