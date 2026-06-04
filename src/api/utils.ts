import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { CLAIM_SLOT_SCRIPT } from './helpers/lua.helper';

// Prisma instance
export const prisma = new PrismaClient();

// Redis instance
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,
});

declare module 'ioredis' {
  interface Redis {
    claimSlot(
      metaKey: string,
      slotKey: string,
      claimedEmailsKey: string,
      userEmailMap: string,
      email: string,
      username: string,
      currentSeconds: number,
    ): Promise<number> | string;
  }
}

redis.defineCommand('claimSlot', {
  numberOfKeys: 4,
  lua: CLAIM_SLOT_SCRIPT,
});

// Health check
export const healthCheck = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    throw new Error(`Health check failed: ${e.message}`);
  }
};
