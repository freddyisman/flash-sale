import { FastifyInstance } from 'fastify';
import * as controllers from '../controllers';
import { preValidation } from '../helpers/validation.helper';
import {
  createUserSchema,
  userCheckItemClaimedSchema,
  userPurchaseSchema,
} from '../schemas/User';

async function userRouter(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
          },
        },
      },
      config: {
        description: 'Create user',
      },
      preValidation: preValidation(createUserSchema),
    },
    controllers.createUser,
  );

  fastify.post(
    '/purchase',
    {
      schema: {
        body: {
          type: 'object',
          required: ['itemId'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            itemId: { type: 'string' },
            quantity: { type: 'number' },
            isFlashSale: { type: 'boolean' },
          },
          anyOf: [{ required: ['email'] }, { required: ['username'] }],
        },
      },
      config: {
        description: 'User purchase',
      },
      preValidation: preValidation(userPurchaseSchema),
    },
    controllers.userPurchase,
  );

  fastify.get(
    '/check/:itemId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['itemId'],
          properties: {
            itemId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
          },
          anyOf: [{ required: ['email'] }, { required: ['username'] }],
        },
      },
      config: {
        description: 'User check item claimed status',
      },
      preValidation: preValidation(userCheckItemClaimedSchema),
    },
    controllers.userCheckItemClaimed,
  );
}

export default userRouter;
