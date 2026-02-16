import 'reflect-metadata';
import Fastify from 'fastify';
import { initializeDataSource } from '../infra/db/data-source.js';
import { registerRoutes } from './routes.js';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

await initializeDataSource();
await app.register(registerRoutes);

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
