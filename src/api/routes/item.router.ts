import { FastifyInstance } from 'fastify';
import * as controllers from '../controllers';
import { preValidation } from '../helpers/validation.helper';
import {
  createItemSchema,
  itemFlashSaleStatusSchema,
  listItemSchema,
} from '../schemas/Item';

async function itemRouter(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            isFlashSale: { type: 'boolean' },
          },
        },
      },
      config: {
        description: 'List item',
      },
      preValidation: preValidation(listItemSchema),
    },
    controllers.listItem,
  );

  fastify.get(
    '/status/:itemId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['itemId'],
          properties: {
            itemId: { type: 'string' },
          },
        },
      },
      config: {
        description: 'Check item flash sale status',
      },
      preValidation: preValidation(itemFlashSaleStatusSchema),
    },
    controllers.itemFlashSaleStatus,
  );

  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            name: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
            discount: { type: 'number' },
            startFlashAt: { type: 'string' },
            endFlashAt: { type: 'string' },
          },
        },
      },
      config: {
        description: 'Create item',
      },
      preValidation: preValidation(createItemSchema),
    },
    controllers.createItem,
  );
}

export default itemRouter;
