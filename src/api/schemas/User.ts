import crypto from 'crypto';
import Joi from 'joi';

export interface CreateUserInterface {
  email: string;
  username: string;
}

export interface UserPurchaseInterface {
  email: string;
  username: string;
  itemId: string;
  quantity: number;
  isFlashSale: boolean;
}

export interface UserCheckQueryInterface {
  email: string;
  username: string;
}

export interface UserCheckParamsInterface {
  itemId: string;
}

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().default(
    `guest_${crypto.randomBytes(16).toString('hex')}`,
  ),
});

export const userPurchaseSchema = Joi.object({
  email: Joi.string().email().optional(),
  username: Joi.string().optional(),
  itemId: Joi.string().required(),
  quantity: Joi.number().default(1),
  isFlashSale: Joi.boolean().default(true),
}).or('email', 'username');

export const userCheckItemClaimedSchema = {
  query: Joi.object({
    email: Joi.string().email().optional(),
    username: Joi.string().optional(),
  }).or('email', 'username'),
  params: Joi.object({
    itemId: Joi.string().required(),
  }),
};
