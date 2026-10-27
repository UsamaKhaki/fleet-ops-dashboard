import { assetListQuerySchema } from '@fleet/api';
import { describe, expect, it } from 'vitest';
import { applyListChange } from './use-list-params';

const defaults = assetListQuerySchema.parse({});

describe('applyListChange', () => {
  it('goes back to page 1 when a filter changes', () => {
    const params = new URLSearchParams('page=7&status=idle');
    applyListChange(params, { type: ['crane', 'truck'] }, defaults);
    expect(params.toString()).toBe('status=idle&type=crane%2Ctruck');
  });

  it('keeps the page when paging and leaves defaults out of the URL', () => {
    const params = new URLSearchParams('q=volvo');
    applyListChange(params, { page: 3 }, defaults);
    applyListChange(params, { pageSize: 50, page: 3 }, defaults);
    expect(params.toString()).toBe('q=volvo&page=3');
  });

  it('removes cleared filters', () => {
    const params = new URLSearchParams('status=idle&q=volvo');
    applyListChange(params, { status: [], q: '' }, defaults);
    expect(params.toString()).toBe('');
  });
});
