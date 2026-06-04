import { describe, expect, it } from 'vitest';
import { userPurchaseSchema } from '../../src/api/schemas/User';

describe('Unit: UserPurchaseSchema Validation', () => {
  it('success case', () => {
    const payload = {
      email: 'test@example.com',
      username: 'test',
      itemId: 'test',
      quantity: 1,
      isFlashSale: true,
    };
    const { error } = userPurchaseSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('failed case #1: no email nor username', () => {
    const payload = {
      itemId: 'test',
      quantity: 1,
      isFlashSale: true,
    };
    const { error } = userPurchaseSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('failed case #2: no itemId', () => {
    const payload = {
      email: 'test@example.com',
      username: 'test',
      quantity: 1,
      isFlashSale: true,
    };
    const { error } = userPurchaseSchema.validate(payload);
    expect(error).toBeDefined();
  });
});
