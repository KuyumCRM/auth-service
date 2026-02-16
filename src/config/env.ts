import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .default('info'),

  // PostgreSQL
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),

  // Redis
  REDIS_URL: z.string().url(),

  // Kafka
  KAFKA_BROKERS: z.string().transform((s) => s.split(',')),
  KAFKA_CLIENT_ID: z.string().default('auth-service'),

  // JWT — RS256 key pair (PEM format, base64-encoded in env)
  JWT_PRIVATE_KEY_B64: z.string().min(1),
  JWT_PUBLIC_KEY_B64: z.string().min(1),
  JWT_ACCESS_TTL_SEC: z.coerce.number().default(900), // 15 min
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

  // Instagram OAuth
  IG_APP_ID: z.string().min(1),
  IG_APP_SECRET: z.string().min(1),
  IG_REDIRECT_URI: z.string().url(),

  // Encryption
  ENCRYPTION_KEY_B64: z.string().length(44), // 32 bytes base64 = 44 chars

  // Internal
  INTERNAL_API_KEY: z.string().min(32), // For service-to-service calls
  DASHBOARD_URL: z.string().url(), // Post-OAuth redirect target
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
