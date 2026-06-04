import crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import 'ioredis';
import { STANDARD } from '../constants/request';
import { ERRORS, handleServerError } from '../helpers/errors.helper';
import { amqpChannel } from '../main';
import {
  CreateUserInterface,
  UserCheckParamsInterface,
  UserCheckQueryInterface,
  UserPurchaseInterface,
} from '../schemas/User';
import { prisma, redis } from '../utils';

const CLAIM_QUEUE = String(process.env.CLAIM_QUEUE) || 'claim_queue';
const PAYMENT_QUEUE = String(process.env.PAYMENT_QUEUE) || 'payment_queue';

export const createUser = async (
  request: FastifyRequest<{
    Body: CreateUserInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const {
      email,
      username = `guest_${crypto.randomBytes(16).toString('hex')}`,
    } = request.body;

    const user = await prisma.user.create({
      data: {
        username,
        email,
      },
    });

    updateUsersRecordBG(email, username).catch((e) => {
      throw new Error(`Failed to update user record: ${e}`);
    });

    return reply.code(STANDARD.OK.statusCode).send({ data: user });
  } catch (err) {
    return handleServerError(reply, err);
  }
};

export const userPurchase = async (
  request: FastifyRequest<{
    Body: UserPurchaseInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const {
      email,
      username,
      itemId,
      quantity = 1,
      isFlashSale = true,
    } = request.body;

    const currentSeconds = Math.floor(Date.now() / 1000);

    if (isFlashSale) {
      const result = await redis.claimSlot(
        `flash_sale:${itemId}:meta`,
        `flash_sale:${itemId}:slots`,
        `flash_sale:${itemId}:claimed_emails`,
        `flash_sale:user_email_map`,
        email,
        username,
        currentSeconds,
      );

      if (typeof result === 'number') {
        switch (result) {
          case -1:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: "Flash sale has expired or doesn't exist.",
            });
          case -2:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Flash sale has not started yet.',
            });
          case -3:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Email already claimed an item.',
            });
          case -4:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Username already claimed an item.',
            });
          case -5:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Username or email is not provided.',
            });
          case -6:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Username not found.',
            });
          case -7:
            return reply.code(STANDARD.OK.statusCode).send({
              status: 'declined',
              message: 'Items are sold out.',
            });
          default:
            return handleServerError(reply, null);
        }
      }
    }

    const messageBuffer = Buffer.from(
      JSON.stringify({
        email,
        username,
        itemId,
        quantity: isFlashSale ? 1 : quantity,
        isFlashSale,
      }),
    );
    amqpChannel.sendToQueue(CLAIM_QUEUE, messageBuffer, {
      persistent: true,
    });
    amqpChannel.sendToQueue(PAYMENT_QUEUE, messageBuffer, {
      persistent: true,
    });

    return reply.code(STANDARD.ACCEPTED.statusCode).send({
      status: 'success',
      message: 'Item claimed successfully',
    });
  } catch (err) {
    return handleServerError(reply, err);
  }
};

export const userCheckItemClaimed = async (
  request: FastifyRequest<{
    Querystring: UserCheckQueryInterface;
    Params: UserCheckParamsInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { itemId } = request.params;
    let { email, username } = request.query;

    let isClaimedByEmail = 0;
    if (await redis.exists(`flash_sale:user_email_map`)) {
      if (!email && username) {
        email = await redis.hget(`flash_sale:user_email_map`, username);
      }

      isClaimedByEmail = await redis.sismember(
        `flash_sale:${itemId}:claimed_emails`,
        email,
      );
    } else {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email || undefined },
            { username: username || undefined },
          ],
        },
      });

      if (!user) {
        return reply
          .code(ERRORS.userNotExists.statusCode)
          .send(ERRORS.userNotExists);
      }

      const purchasedItems = await prisma.purchase.findMany({
        where: {
          user_id: user.id,
          item_id: itemId,
        },
      });

      isClaimedByEmail = purchasedItems.length > 0 ? 1 : 0;
    }

    return reply
      .status(STANDARD.OK.statusCode)
      .send({ status: isClaimedByEmail ? 'Claimed' : 'Not claimed' });
  } catch (err) {
    return handleServerError(reply, err);
  }
};

async function updateUsersRecordBG(
  email: string,
  username: string,
): Promise<void> {
  const mapUsernameEmailKey = `flash_sale:user_email_map`;

  const pipeline = redis.pipeline();
  pipeline.hset(mapUsernameEmailKey, username, email);

  await pipeline.exec();
}
