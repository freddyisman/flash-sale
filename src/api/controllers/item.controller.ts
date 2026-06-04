import { FastifyReply, FastifyRequest } from 'fastify';
import { STANDARD } from '../constants/request';
import { handleServerError } from '../helpers/errors.helper';
import {
  CreateItemInterface,
  ItemFlashSaleStatusInterface,
  ListItemInterface,
} from '../schemas/Item';
import { prisma, redis } from '../utils';

export const listItem = async (
  request: FastifyRequest<{
    Querystring: ListItemInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { isFlashSale } = request.query;
    let items: object[] = [];

    if (isFlashSale) {
      const allKeys = await redis.keys('flash_sale:*:meta');

      if (allKeys.length > 0) {
        const pipeline = redis.pipeline();

        allKeys.forEach((key) => {
          const itemId = key.split(':')[1];
          pipeline.hgetall(key);
          pipeline.llen(`flash_sale:${itemId}:slots`);
        });

        const results = await pipeline.exec();

        if (results) {
          for (let i = 0; i < allKeys.length; i++) {
            const itemId = allKeys[i].split(':')[1];

            const resultIndex = i * 2;
            const [errMeta, item] = results[resultIndex] as [Error | null, any];
            const [errLen, quantity] = results[resultIndex + 1] as [
              Error | null,
              number,
            ];

            if (errMeta || errLen) {
              console.error(
                `Error fetching data for item ${itemId}:`,
                errMeta || errLen,
              );
              continue;
            }

            if (item && Object.keys(item).length > 0) {
              items.push({
                id: itemId,
                name: item.name,
                quantity: quantity,
                price: Number(item.price),
                discount: Number(item.discount),
                start_flash_at: item.start_time,
                end_flash_at: item.end_time,
              });
            }
          }
        }
      }
    } else {
      items = await prisma.item.findMany({
        select: {
          id: true,
          name: true,
          quantity: true,
          price: true,
          discount: true,
          start_flash_at: true,
          end_flash_at: true,
        },
      });
    }

    return reply.status(STANDARD.OK.statusCode).send({
      status: 'success',
      data: items,
    });
  } catch (e) {
    handleServerError(reply, e);
  }
};

export const itemFlashSaleStatus = async (
  request: FastifyRequest<{
    Params: ItemFlashSaleStatusInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const { itemId } = request.params;

    const startTime = await redis.hget(
      `flash_sale:${itemId}:meta`,
      'start_time',
    );
    if (!startTime)
      return reply.status(STANDARD.OK.statusCode).send({
        status: 'ended',
        message: "Flash sale has expired or doesn't exist.",
      });

    if (Date.now() < parseInt(startTime) * 1000)
      return reply.status(STANDARD.OK.statusCode).send({
        status: 'upcoming',
        message: 'Flash sale has not started yet.',
      });

    if (Date.now() >= parseInt(startTime) * 1000)
      return reply
        .status(STANDARD.OK.statusCode)
        .send({ status: 'active', message: 'Flash sale is active.' });
  } catch (e) {
    handleServerError(reply, e);
  }
};

export const createItem = async (
  request: FastifyRequest<{
    Body: CreateItemInterface;
  }>,
  reply: FastifyReply,
) => {
  try {
    const {
      name,
      quantity = 1,
      price,
      discount = 0,
      startFlashAt,
      endFlashAt,
    } = request.body;

    const startFlashTime = startFlashAt ? new Date(startFlashAt) : null;
    const endFlashTime = endFlashAt ? new Date(endFlashAt) : null;

    const item = await prisma.item.create({
      data: {
        name,
        quantity,
        price,
        discount,
        start_flash_at: startFlashTime,
        end_flash_at: endFlashTime,
      },
    });

    if (
      startFlashTime &&
      startFlashTime?.getTime() > Date.now() &&
      endFlashTime &&
      endFlashTime?.getTime() > startFlashTime?.getTime() &&
      quantity > 0 &&
      discount > 0
    ) {
      allocateFlashSaleSlotsBG(
        item.id,
        name,
        quantity,
        price,
        discount,
        startFlashTime,
        endFlashTime,
      ).catch((e) => {
        throw new Error(`Allocation failed for item ${item.id}: ${e}`);
      });
    }

    reply.status(STANDARD.OK.statusCode).send({ data: item });
  } catch (e) {
    handleServerError(reply, e);
  }
};

async function allocateFlashSaleSlotsBG(
  itemId: string,
  name: string,
  quantity: number,
  price: number,
  discount: number,
  startFlashTime: Date,
  endFlashTime: Date,
): Promise<void> {
  const metaKey = `flash_sale:${itemId}:meta`;
  const slotsKey = `flash_sale:${itemId}:slots`;
  const claimedEmailsKey = `flash_sale:${itemId}:claimed_emails`;

  const startTimeSec = Math.floor(startFlashTime?.getTime() / 1000);
  const endTimeSec = Math.floor(endFlashTime?.getTime() / 1000);

  const pipeline = redis.pipeline();

  pipeline.hset(metaKey, 'name', name);
  pipeline.hset(metaKey, 'price', price);
  pipeline.hset(metaKey, 'discount', discount);
  pipeline.hset(metaKey, 'start_time', startTimeSec);
  pipeline.hset(metaKey, 'end_time', endTimeSec);
  pipeline.expireat(metaKey, endTimeSec + 3600);

  pipeline.lpush(slotsKey, ...Array.from({ length: quantity }, () => ''));
  pipeline.expireat(slotsKey, endTimeSec + 3600);

  pipeline.expireat(claimedEmailsKey, endTimeSec + 86400);

  await pipeline.exec();
}
