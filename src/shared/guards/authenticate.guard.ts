// Fastify preHandler — verifies JWT, checks blacklist, attaches payload to request.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify, importSPKI, type CryptoKey } from 'jose';
import type { ITokenBlacklist } from '../interfaces/ITokenBlacklist.js';
import type { JwtPayload } from '../../domain/token/token.types.js';

const RS256 = 'RS256';
const BEARER_PREFIX = 'Bearer ';

export interface AuthenticateGuardDeps {
  tokenBlacklist: ITokenBlacklist;
  publicKeyPem: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    cachedPublicKey = await importSPKI(publicKeyPem, RS256);
  }
  return cachedPublicKey;
}

export function createAuthenticateGuard(deps: AuthenticateGuardDeps) {
  const { tokenBlacklist, publicKeyPem } = deps;

  return async function authenticateGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      return reply.status(401).send({
        error: 'Missing or invalid Authorization header',
        code: 'invalid',
      });
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      return reply.status(401).send({
        error: 'Invalid token',
        code: 'invalid',
      });
    }

    try {
      const publicKey = await getPublicKey(publicKeyPem);
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: [RS256],
      });

      const jti = payload.jti as string | undefined;
      if (!jti) {
        return reply.status(401).send({
          error: 'Invalid token',
          code: 'invalid',
        });
      }

      const blacklisted = await tokenBlacklist.has(jti);
      if (blacklisted) {
        return reply.status(401).send({
          error: 'Token revoked',
          code: 'blacklisted',
        });
      }

      request.user = payload as unknown as JwtPayload;
      request.tenantId = (payload.tenant_id as string) ?? undefined;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('expired') || message.includes('JWT Expired')) {
        return reply.status(401).send({
          error: 'Token expired',
          code: 'expired',
        });
      }
      return reply.status(401).send({
        error: 'Invalid token',
        code: 'invalid',
      });
    }
  };
}
