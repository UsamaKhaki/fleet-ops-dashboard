import { describe, expect, it } from 'vitest';
import { assetListQuerySchema, workOrderCreateSchema } from './schemas';
import { toSearchParams } from './search-params';

describe('assetListQuerySchema', () => {
  it('applies defaults for an empty query string', () => {
    const parsed = assetListQuerySchema.parse(Object.fromEntries(new URLSearchParams()));
    expect(parsed).toMatchObject({ page: 1, pageSize: 50, sort: 'id', order: 'asc' });
  });

  it('round-trips filters through URLSearchParams', () => {
    const params = toSearchParams({ page: 3, status: ['active', 'idle'], site: [], q: '' });
    expect(params.toString()).toBe('page=3&status=active%2Cidle');

    const parsed = assetListQuerySchema.parse(Object.fromEntries(params));
    expect(parsed.page).toBe(3);
    expect(parsed.status).toEqual(['active', 'idle']);
    expect(parsed.site).toBeUndefined();
  });

  it('rejects unknown statuses and oversized pages', () => {
    expect(assetListQuerySchema.safeParse({ status: 'active,flying' }).success).toBe(false);
    expect(assetListQuerySchema.safeParse({ pageSize: '5000' }).success).toBe(false);
  });
});

describe('workOrderCreateSchema', () => {
  it('trims the title before checking its length', () => {
    const result = workOrderCreateSchema.safeParse({
      assetId: 'AST-0001',
      title: '  ab ',
      priority: 'high',
      dueDate: '2026-11-01',
    });
    expect(result.success).toBe(false);
  });
});
