// Fastify preHandler — checks that the authenticated user has one of the allowed roles.
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ERROR_CODE_UNAUTHORIZED,
  ERROR_CODE_FORBIDDEN,
  ERROR_MSG_AUTH_REQUIRED,
  ERROR_MSG_INSUFFICIENT_PERMISSIONS,
} from '../../config/constants.js';
import type { JwtPayload, MembershipRole } from '../../domain/token/token.types.js';

/**
 * Creates a role guard that restricts access to specific roles.
 * Must be used AFTER the authenticate guard (request.user must be set).
 */
export function createRoleGuard(...allowedRoles: MembershipRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      return reply.status(401).send({
        error: ERROR_MSG_AUTH_REQUIRED,
        code: ERROR_CODE_UNAUTHORIZED,
      });
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        error: ERROR_MSG_INSUFFICIENT_PERMISSIONS,
        code: ERROR_CODE_FORBIDDEN,
      });
    }
  };
}
