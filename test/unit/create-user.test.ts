import { describe, expect, it } from 'vitest';
import { createUserSchema } from '../../src/api/schemas/User';

describe('Unit: CreateUserSchema Validation', () => {
  it('success case', () => {
    const payload = {
      email: 'test@example.com',
      username: 'test',
    };
    const { error } = createUserSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('failed case #1: no email', () => {
    const payload = {};
    const { error } = createUserSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('failed case #2: invalid email', () => {
    const payload = {
      email: 'invalid-email',
      username: 'test',
    };
    const { error } = createUserSchema.validate(payload);
    expect(error).toBeDefined();
  });
});
