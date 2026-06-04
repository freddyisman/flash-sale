import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import amqp from 'amqplib';
import fastify from 'fastify';
import pino from 'pino';
import { STANDARD } from './constants/request';
import { ERRORS } from './helpers/errors.helper';
import itemRouter from './routes/item.router';
import userRouter from './routes/user.router';
import { healthCheck } from './utils';

// Server Port & Host
const API_PORT = Number(process.env.API_PORT) || 5001;
const API_HOST = String(process.env.API_HOST);

// RabbitMQ URL, Queues & Channel
const RABBITMQ_URL = String(process.env.RABBITMQ_URL) || '';
const CLAIM_QUEUE = String(process.env.CLAIM_QUEUE) || 'claim_queue';
const PAYMENT_QUEUE = String(process.env.PAYMENT_QUEUE) || 'payment_queue';
export let amqpChannel: amqp.Channel;

const startServer = async () => {
  const server = fastify({
    logger: pino({ level: process.env.LOG_LEVEL }),
  });

  // Register middlewares
  server.register(formbody);
  server.register(cors);
  server.register(helmet);

  // Register routes
  server.register(userRouter, { prefix: '/api/user' });
  server.register(itemRouter, { prefix: '/api/item' });

  // Set error handler
  server.setErrorHandler((error, _request, reply) => {
    server.log.error(error);
    reply
      .status(ERRORS.internalServerError.statusCode)
      .send({ error: 'Something went wrong' });
  });

  // Health check route
  server.get('/health', async (_request, reply) => {
    try {
      await healthCheck();
      reply.status(STANDARD.OK.statusCode).send({
        message: 'Health check endpoint success.',
      });
    } catch (e) {
      reply.status(ERRORS.internalServerError.statusCode).send({
        message: 'Health check endpoint failed.',
      });
    }
  });

  // Root route
  server.get('/', (_request, reply) => {
    reply.status(STANDARD.OK.statusCode).send({
      message: 'Flash sale system is running.',
    });
  });

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      try {
        await server.close();
        server.log.error(`Closed application on ${signal}`);
        process.exit(0);
      } catch (err) {
        server.log.error(`Error closing application on ${signal}`, err);
        process.exit(1);
      }
    });
  });

  // Set up RabbitMQ connection and channel
  let retries = 5;
  while (retries) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      amqpChannel = await connection.createChannel();
      await amqpChannel.assertQueue(CLAIM_QUEUE, { durable: true });
      await amqpChannel.assertQueue(PAYMENT_QUEUE, { durable: true });

      server.log.info('Successfully connected to RabbitMQ');
      break;
    } catch (err) {
      server.log.error(
        `Connection failed, retrying in 5 seconds... (${retries} retries left)`,
      );
      retries -= 1;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  // Start server
  try {
    await server.listen({
      port: API_PORT,
      host: API_HOST,
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

startServer();
