import { describe, expect, it } from 'vitest';
import { userCheckItemClaimedSchema } from '../../src/api/schemas/User';

describe('Unit: UserCheckItemClaimedSchema Validation', () => {
  it('success case', () => {
    const payload = {
      email: 'test@example.com',
      username: 'test',
    };
    const { error } = userCheckItemClaimedSchema.query.validate(payload);
    expect(error).toBeUndefined();
  });

  it('failed case #1: no email nor username', () => {
    const payload = {};
    const { error } = userCheckItemClaimedSchema.query.validate(payload);
    expect(error).toBeDefined();
  });

  it('failed case #2: no itemId', () => {
    const payload = {};
    const { error } = userCheckItemClaimedSchema.params.validate(payload);
    expect(error).toBeDefined();
  });
});
