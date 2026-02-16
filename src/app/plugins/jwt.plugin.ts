// RS256 JWT — register keys for signing; verification is done in authenticate guard with jose.
import type { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { env } from '../../config/env.js';

function decodePemFromB64(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

export async function jwtPlugin(app: FastifyInstance): Promise<void> {
  const privatePem = decodePemFromB64(env.JWT_PRIVATE_KEY_B64);
  const publicPem = decodePemFromB64(env.JWT_PUBLIC_KEY_B64);

  await app.register(fastifyJwt, {
    secret: {
      private: privatePem,
      public: publicPem,
    },
    sign: {
      algorithm: 'RS256',
      expiresIn: env.JWT_ACCESS_TTL_SEC,
    },
  });
}
