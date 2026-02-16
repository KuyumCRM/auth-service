import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { env } from '../../config/env.js';
import { ApiKeyEntity } from './entities/ApiKey.entity.js';
import { AuditLogEntity } from './entities/AuditLog.entity.js';
import { InstagramConnectionEntity } from './entities/InstagramConnection.entity.js';
import { OneTimeTokenEntity } from './entities/OneTimeToken.entity.js';
import { RefreshTokenEntity } from './entities/RefreshToken.entity.js';
import { UserEntity } from './entities/User.entity.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  poolSize: env.DATABASE_POOL_MAX,
  synchronize: false,
  logging: false,
  entities: [
    UserEntity,
    RefreshTokenEntity,
    OneTimeTokenEntity,
    InstagramConnectionEntity,
    ApiKeyEntity,
    AuditLogEntity,
  ],
  migrations: [join(__dirname, 'migrations', '*.js')],
  extra: {
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    max: env.DATABASE_POOL_MAX,
    min: env.DATABASE_POOL_MIN,
  },
});

export function getDataSource(): DataSource {
  return AppDataSource;
}

export async function initializeDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
    } catch (err) {
      console.error('Failed to initialize DataSource:', err);
      throw err;
    }
  }
  return AppDataSource;
}
