import crypto from 'crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { STANDARD } from '../../src/api/constants/request';
import { BASE_URL } from '../vite.config';

let dummyEmail: string;
let dummyUsername: string;
let dummyItemId: number;
let dummyItemName: string;

describe('Integration: Purchase Flow', () => {
  it('Create dummy user for purchase test', async () => {
    dummyEmail = `dummy_${crypto.randomBytes(16).toString('hex')}@gmail.com`;
    dummyUsername = `dummy_${crypto.randomBytes(16).toString('hex')}`;
    const response = await fetch(`${BASE_URL}/api/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: dummyEmail,
        username: dummyUsername,
      }),
    });

    const resp = await response.json();

    expect(response.status).toBe(STANDARD.OK.statusCode);
    expect(resp.data.email).toBe(dummyEmail);
    expect(resp.data.username).toBe(dummyUsername);
  });

  it('Create dummy item for purchase test', async () => {
    dummyItemName = `dummyItem_${crypto.randomBytes(16).toString('hex')}`;
    const startFlashAt = new Date(Date.now() + 1000).toISOString();
    const endFlashAt = new Date(Date.now() + 86400000).toISOString();
    const response = await fetch(`${BASE_URL}/api/item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: dummyItemName,
        quantity: 1000,
        price: 20000,
        discount: 50,
        startFlashAt: startFlashAt,
        endFlashAt: endFlashAt,
      }),
    });

    const resp = await response.json();
    dummyItemId = resp.data.id;

    expect(response.status).toBe(STANDARD.OK.statusCode);
    expect(resp.data.name).toBe(dummyItemName);
    expect(resp.data.quantity).toBe(1000);
    expect(resp.data.price).toBe(20000);
    expect(resp.data.discount).toBe(50);
    expect(resp.data.start_flash_at).toBe(startFlashAt);
    expect(resp.data.end_flash_at).toBe(endFlashAt);
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });
});

describe('Purchase Flow - Success Case', () => {
  it('User purchase item', async () => {
    const response = await fetch(`${BASE_URL}/api/user/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: dummyEmail,
        username: dummyUsername,
        itemId: dummyItemId,
        quantity: 1,
        isFlashSale: true,
      }),
    });

    const resp = await response.json();

    expect(response.status).toBe(STANDARD.ACCEPTED.statusCode);
    expect(resp.status).toBe('success');
    expect(resp.message).toBe('Item claimed successfully');
  });

  it('Check if user has claimed the item', async () => {
    const response = await fetch(
      `${BASE_URL}/api/user/check/${dummyItemId}?email=${dummyEmail}&username=${dummyUsername}`,
      {
        method: 'GET',
      },
    );

    const resp = await response.json();

    expect(response.status).toBe(STANDARD.OK.statusCode);
    expect(resp.status).toBe('Claimed');
  });

  it('Check item flash sale status', async () => {
    const response = await fetch(`${BASE_URL}/api/item/status/${dummyItemId}`, {
      method: 'GET',
    });

    const resp = await response.json();

    expect(response.status).toBe(STANDARD.OK.statusCode);
    expect(resp.status).toBe('active');
    expect(resp.message).toBe('Flash sale is active.');
  });

  it('Get all flash sale items', async () => {
    const response = await fetch(`${BASE_URL}/api/item?isFlashSale=true`, {
      method: 'GET',
    });

    const resp = await response.json();
    expect(response.status).toBe(STANDARD.OK.statusCode);
    expect(resp.data).toBeInstanceOf(Array);
    expect(resp.data.length).toBeGreaterThan(0);

    resp.data.sort(
      (a: { start_flash_at: string }, b: { start_flash_at: string }) =>
        new Date(a.start_flash_at).getTime() -
        new Date(b.start_flash_at).getTime(),
    );

    const lastElem = resp.data.at(-1);
    expect(lastElem.name).toBe(dummyItemName);
    expect(lastElem.quantity).toBe(999);
    expect(lastElem.price).toBe(20000);
    expect(lastElem.discount).toBe(50);
  });
});
