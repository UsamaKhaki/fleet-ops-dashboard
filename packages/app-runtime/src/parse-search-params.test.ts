import { assetListQuerySchema } from '@fleet/api';
import { describe, expect, it } from 'vitest';
import { parseSearchParams } from './parse-search-params';

describe('parseSearchParams', () => {
  it('drops only the invalid fields', () => {
    const parsed = parseSearchParams(
      assetListQuerySchema,
      new URLSearchParams('page=4&status=flying&type=truck&pageSize=99999'),
    );
    expect(parsed).toMatchObject({ page: 4, pageSize: 50, type: ['truck'] });
    expect(parsed.status).toBeUndefined();
  });
});
