import Joi from 'joi';

export interface CreateItemInterface {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  startFlashAt: string;
  endFlashAt: string;
}
export interface ListItemInterface {
  isFlashSale: boolean;
}

export interface ItemFlashSaleStatusInterface {
  itemId: string;
}

export const createItemSchema = Joi.object({
  name: Joi.string().required(),
  quantity: Joi.number().default(1),
  price: Joi.number().required(),
  discount: Joi.number().default(0).max(100),
  startFlashAt: Joi.string().optional(),
  endFlashAt: Joi.string().optional(),
});

export const listItemSchema = Joi.object({
  isFlashSale: Joi.boolean().optional(),
});

export const itemFlashSaleStatusSchema = Joi.object({
  itemId: Joi.string().required(),
});
