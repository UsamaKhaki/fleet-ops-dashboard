import type { z } from 'zod';

/**
 * Parses list state from the URL. A hand-edited or stale link with one bad value
 * (say `status=flying`) drops that field and keeps the rest, instead of failing the page.
 */
export function parseSearchParams<S extends z.ZodObject>(
  schema: S,
  params: URLSearchParams,
): z.output<S> {
  const raw = Object.fromEntries(params);
  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const invalidKeys = new Set(result.error.issues.map((issue) => String(issue.path[0])));
  const valid = Object.fromEntries(Object.entries(raw).filter(([key]) => !invalidKeys.has(key)));
  return schema.parse(valid);
}
