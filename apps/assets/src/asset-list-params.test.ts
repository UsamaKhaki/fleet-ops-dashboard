import { describe, expect, it } from 'vitest';
import { applyAssetListChange } from './asset-list-params';

describe('applyAssetListChange', () => {
  it('goes back to page 1 when a filter changes', () => {
    const params = new URLSearchParams('page=7&status=idle');
    applyAssetListChange(params, { type: ['crane', 'truck'] });
    expect(params.toString()).toBe('status=idle&type=crane%2Ctruck');
  });

  it('keeps the page when paging and leaves defaults out of the URL', () => {
    const params = new URLSearchParams('q=volvo');
    applyAssetListChange(params, { page: 3 });
    applyAssetListChange(params, { pageSize: 50, page: 3 });
    expect(params.toString()).toBe('q=volvo&page=3');
  });

  it('removes cleared filters', () => {
    const params = new URLSearchParams('status=idle&q=volvo');
    applyAssetListChange(params, { status: [], q: '' });
    expect(params.toString()).toBe('');
  });
});
