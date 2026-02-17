// Fastify preHandler — verifies JWT, checks blacklist, attaches payload to request.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { jwtVerify, importSPKI, type CryptoKey } from 'jose';
import {
  JWT_ALGORITHM_RS256,
  BEARER_PREFIX,
  ERROR_CODE_INVALID,
  ERROR_CODE_BLACKLISTED,
  ERROR_CODE_EXPIRED,
  ERROR_MSG_MISSING_AUTH_HEADER,
  ERROR_MSG_INVALID_TOKEN,
  ERROR_MSG_TOKEN_REVOKED,
  ERROR_MSG_TOKEN_EXPIRED,
} from '../../config/constants.js';
import type { ITokenBlacklist } from '../interfaces/ITokenBlacklist.js';
import type { JwtPayload } from '../../domain/token/token.types.js';

export interface AuthenticateGuardDeps {
  tokenBlacklist: ITokenBlacklist;
  publicKeyPem: string;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    cachedPublicKey = await importSPKI(publicKeyPem, JWT_ALGORITHM_RS256);
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
        error: ERROR_MSG_MISSING_AUTH_HEADER,
        code: ERROR_CODE_INVALID,
      });
    }

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    if (!token) {
      return reply.status(401).send({
        error: ERROR_MSG_INVALID_TOKEN,
        code: ERROR_CODE_INVALID,
      });
    }

    try {
      const publicKey = await getPublicKey(publicKeyPem);
      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: [JWT_ALGORITHM_RS256],
      });

      const jti = payload.jti as string | undefined;
      if (!jti) {
        return reply.status(401).send({
          error: ERROR_MSG_INVALID_TOKEN,
          code: ERROR_CODE_INVALID,
        });
      }

      const blacklisted = await tokenBlacklist.has(jti);
      if (blacklisted) {
        return reply.status(401).send({
          error: ERROR_MSG_TOKEN_REVOKED,
          code: ERROR_CODE_BLACKLISTED,
        });
      }

      request.user = payload as unknown as JwtPayload;
      request.tenantId = (payload.tenant_id as string) ?? undefined;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('expired') || message.includes('JWT Expired')) {
        return reply.status(401).send({
          error: ERROR_MSG_TOKEN_EXPIRED,
          code: ERROR_CODE_EXPIRED,
        });
      }
      return reply.status(401).send({
        error: ERROR_MSG_INVALID_TOKEN,
        code: ERROR_CODE_INVALID,
      });
    }
  };
}
