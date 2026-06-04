import amqp from 'amqplib';
import { Client } from 'pg';

// RabbitMQ URL & Queues
const RABBITMQ_URL = String(process.env.RABBITMQ_URL) || '';
const PAYMENT_QUEUE = String(process.env.PAYMENT_QUEUE) || 'payment_queue';

// Create DB instance
const dbClient = new Client({
  user: 'admin',
  host: 'postgres',
  database: 'postgres_db',
  password: 'password123',
  port: 5432,
});

async function paymentWorker() {
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
        await channel.assertQueue(PAYMENT_QUEUE, { durable: true });

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
    console.log('Worker is waiting for messages in queue:', PAYMENT_QUEUE);

    // Consume and process messages from the queue
    channel.consume(PAYMENT_QUEUE, async (message) => {
      if (message !== null) {
        // Mock payment delay
        await new Promise((res) => setTimeout(res, 1000));
        try {
          const content = JSON.parse(message.content.toString());

          const user = await dbClient.query(
            'SELECT "id" FROM "User" WHERE "email" = $1 LIMIT 1',
            [content.email],
          );

          if (user.rows.length === 0) throw new Error('User not found');

          // Generate random value between 1 to 100
          const random = Math.floor(Math.random() * 100) + 1;

          if (random < 20) {
            await dbClient.query(
              'UPDATE "Purchase" SET "status" = $1 WHERE "user_id" = $2 AND "item_id" = $3 AND "status" = $4',
              ['DECLINED', user.rows[0].id, content.itemId, 'PROCESSING'],
            );
          } else {
            await dbClient.query(
              'UPDATE "Purchase" SET "status" = $1 WHERE "user_id" = $2 AND "item_id" = $3 AND "status" = $4',
              ['SUCCESS', user.rows[0].id, content.itemId, 'PROCESSING'],
            );
          }

          console.log(
            `Payment processed for item ${content.itemId} by ${content.email}`,
          );
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

paymentWorker();
