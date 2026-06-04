import { describe, expect, it } from 'vitest';
import { createItemSchema } from '../../src/api/schemas/Item';

describe('Unit: CreateItemSchema Validation', () => {
  it('success case', () => {
    const payload = {
      name: 'test',
      quantity: 1,
      price: 1,
      discount: 0,
    };
    const { error } = createItemSchema.validate(payload);
    expect(error).toBeUndefined();
  });

  it('failed case #1: no name', () => {
    const payload = {
      quantity: 1,
      price: 1,
      discount: 0,
    };
    const { error } = createItemSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('failed case #2: no price', () => {
    const payload = {
      name: 'test',
      quantity: 1,
      discount: 0,
    };
    const { error } = createItemSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('failed case #3: discount > 100', () => {
    const payload = {
      name: 'test',
      quantity: 1,
      price: 1,
      discount: 101,
    };
    const { error } = createItemSchema.validate(payload);
    expect(error).toBeDefined();
  });
});
