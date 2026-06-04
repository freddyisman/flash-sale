import { describe, expect, it } from 'vitest';
import { itemFlashSaleStatusSchema } from '../../src/api/schemas/Item';

describe('Unit: ItemFlashSaleStatusSchema Validation', () => {
  it('success case', () => {
    const payload = {
      itemId: 'test',
    };
    const { error } = itemFlashSaleStatusSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('failed case #1: no itemId', () => {
    const payload = {};
    const { error } = itemFlashSaleStatusSchema.validate(payload);
    expect(error).toBeDefined();
  });
});
