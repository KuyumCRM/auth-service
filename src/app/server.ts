import { env } from '../config/env.js';
import { getDataSource } from '../infra/db/data-source.js';
import { closeRedis } from '../infra/redis/redis.client.js';
import { closeKafka } from '../infra/kafka/kafka.client.js';
import { createApp } from './create-app.js';

async function main(): Promise<void> {
  const app = await createApp();

  const port = env.PORT;
  const host = env.HOST;

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Shutting down');
    try {
      await app.close();
      await getDataSource().destroy();
      await closeRedis();
      await closeKafka();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
