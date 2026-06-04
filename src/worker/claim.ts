import amqp from 'amqplib';
import crypto from 'crypto';
import Redis from 'ioredis';
import { Client } from 'pg';

// RabbitMQ URL & Queues
const RABBITMQ_URL = String(process.env.RABBITMQ_URL) || '';
const CLAIM_QUEUE = String(process.env.CLAIM_QUEUE) || 'claim_queue';

// Create DB & Redis instance
const dbClient = new Client({
  user: 'admin',
  host: 'postgres',
  database: 'postgres_db',
  password: 'password123',
  port: 5432,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Background function to update users record in Redis
async function updateUsersRecordBG(
  email: string,
  username: string,
): Promise<void> {
  const mapUsernameEmailKey = `flash_sale:user_email_map`;

  const pipeline = redis.pipeline();
  pipeline.hset(mapUsernameEmailKey, username, email);

  await pipeline.exec();
}

async function claimWorker() {
  try {
    // Connect to DB
    await dbClient.connect();
    console.log('Connected to PostgreSQL database.');

    // Connect to RabbitMQ
    let channel: amqp.Channel;
    let retries = 5;
    while (retries) {
      try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(CLAIM_QUEUE, { durable: true });

        console.log('Successfully connected to RabbitMQ');
        break;
      } catch (err) {
        console.error(
          `Connection failed, retrying in 5 seconds... (${retries} retries left)`,
        );
        retries -= 1;
        await new Promise((res) => setTimeout(res, 5000));
      }
    }

    channel.prefetch(1);
    console.log('Worker is waiting for messages in queue:', CLAIM_QUEUE);

    // Consume and process messages from the queue
    channel.consume(CLAIM_QUEUE, async (message) => {
      if (message !== null) {
        try {
          const content = JSON.parse(message.content.toString());

          let user = await dbClient.query(
            'SELECT "id", "username", "email" FROM "User" WHERE "email" = $1 OR "username" = $2 LIMIT 1',
            [content.email, content.username],
          );

          if (user.rows.length === 0 && content.email) {
            const username = `guest_${crypto.randomBytes(16).toString('hex')}`;
            updateUsersRecordBG(content.email, username);
            user = await dbClient.query(
              'INSERT INTO "User" ("id", "username", "email") VALUES ($1, $2, $3) RETURNING "id", "username", "email"',
              [crypto.randomUUID(), username, content.email],
            );
          }

          await dbClient.query(
            'INSERT INTO "Purchase" ("id", "user_id", "item_id", "quantity", "status") VALUES ($1, $2, $3, $4, $5)',
            [
              crypto.randomUUID(),
              user.rows[0].id,
              content.itemId,
              content.quantity,
              'PROCESSING',
            ],
          );

          await dbClient.query(
            'UPDATE "Item" SET "quantity" = "quantity" - $1 WHERE "id" = $2',
            [content.quantity, content.itemId],
          );

          console.log(`Item ${content.itemId} claimed by ${content.email}`);
          channel.ack(message);
        } catch (err) {
          console.error('Error handling message, pushing back to queue:', err);
          channel.nack(message, false, true);
        }
      }
    });
  } catch (error) {
    console.error('Worker initialization failed:', error);
    process.exit(1);
  }
}

claimWorker();
