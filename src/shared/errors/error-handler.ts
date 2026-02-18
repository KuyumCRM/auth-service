// Centralized Fastify error handler — maps domain errors to HTTP responses.
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  ERROR_CODE_APP_ERROR,
  ERROR_CODE_INVALID_CREDENTIALS,
  ERROR_CODE_ACCOUNT_LOCKED,
  ERROR_CODE_OAUTH_EXCHANGE_FAILED,
  ERROR_CODE_GOOGLE_OAUTH_FAILED,
  ERROR_CODE_INTERNAL,
  ERROR_MSG_INVALID_CREDENTIALS,
  ERROR_MSG_INTERNAL_SERVER,
} from '../../config/constants.js';
import {
  AppError,
  InvalidCredentialsError,
  AccountLockedError,
  UserNotFoundError,
  InvalidOnboardingTokenError,
  InstagramPersonalAccountError,
  InstagramAlreadyHasWorkspaceError,
  InstagramOAuthError,
  GoogleOAuthError,
} from './domain-errors.js';

/** Check if error has a `code` property (typed for domain errors that extend AppError). */
function hasCode(
  err: AppError
): err is AppError & { code: string } {
  return 'code' in err && typeof (err as AppError & { code?: string }).code === 'string';
}

export function createErrorHandler() {
  return function errorHandler(
    err: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): void {
    // Check specific error types first (before generic AppError)
    if (err instanceof UserNotFoundError) {
      reply.status(err.statusCode).send({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof InvalidOnboardingTokenError) {
      reply.status(400).send({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof InvalidCredentialsError) {
      reply.status(401).send({ error: ERROR_MSG_INVALID_CREDENTIALS, code: ERROR_CODE_INVALID_CREDENTIALS });
      return;
    }
    if (err instanceof AccountLockedError) {
      reply.status(423).send({ error: err.message, code: ERROR_CODE_ACCOUNT_LOCKED });
      return;
    }
    if (err instanceof InstagramPersonalAccountError) {
      reply.status(403).send({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof InstagramAlreadyHasWorkspaceError) {
      reply.status(409).send({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof InstagramOAuthError) {
      reply.status(502).send({ error: err.message, code: ERROR_CODE_OAUTH_EXCHANGE_FAILED });
      return;
    }
    if (err instanceof GoogleOAuthError) {
      reply.status(502).send({ error: err.message, code: ERROR_CODE_GOOGLE_OAUTH_FAILED });
      return;
    }
    if (err instanceof AppError) {
      const code = hasCode(err) ? err.code : ERROR_CODE_APP_ERROR;
      reply.status(err.statusCode).send({ error: err.message, code });
      return;
    }

    // Unknown error — log and return 500
    request.log?.error?.(err);
    reply.status(500).send({ error: ERROR_MSG_INTERNAL_SERVER, code: ERROR_CODE_INTERNAL });
  };
}
