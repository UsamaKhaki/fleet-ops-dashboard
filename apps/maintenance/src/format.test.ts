import { describe, expect, it } from 'vitest';
import { isOverdue } from './format';
import { makeWorkOrder } from './test-utils';

describe('isOverdue', () => {
  const today = '2026-10-27';

  it('flags open work past its due date', () => {
    expect(isOverdue(makeWorkOrder({ dueDate: '2026-10-26' }), today)).toBe(true);
    expect(isOverdue(makeWorkOrder({ dueDate: '2026-10-27' }), today)).toBe(false);
  });

  it('never flags completed work', () => {
    expect(isOverdue(makeWorkOrder({ dueDate: '2026-01-01', status: 'completed' }), today)).toBe(
      false,
    );
  });
});
