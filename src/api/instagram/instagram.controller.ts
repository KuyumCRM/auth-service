// Instagram onboarding: initiate OAuth, handle callback.
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ERROR_CODE_OAUTH_EXCHANGE_FAILED,
  ERROR_CODE_INTERNAL,
  ERROR_MSG_INTERNAL_SERVER,
} from '../../config/constants.js';
import {
  InstagramOAuthError,
  InstagramPersonalAccountError,
  InstagramAlreadyHasWorkspaceError,
} from '../../domain/auth/auth.errors.js';

function handleError(reply: FastifyReply, err: unknown): void {
  if (err instanceof InstagramPersonalAccountError) {
    reply.status(403).send({
      error: err.message,
      code: err.code,
    });
    return;
  }
  if (err instanceof InstagramAlreadyHasWorkspaceError) {
    reply.status(409).send({
      error: err.message,
      code: err.code,
    });
    return;
  }
  if (err instanceof InstagramOAuthError) {
    reply.status(502).send({
      error: err.message,
      code: ERROR_CODE_OAUTH_EXCHANGE_FAILED,
    });
    return;
  }
  reply.status(500).send({ error: ERROR_MSG_INTERNAL_SERVER, code: ERROR_CODE_INTERNAL });
}

/** POST /onboard-connect — returns redirect URL and state for frontend to redirect user to Instagram. */
export async function onboardConnect(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const instagramOAuthService = request.server.instagramOAuthService!;
    const result = await instagramOAuthService.initiateOnboardConnect();
    reply.status(200).send(result);
  } catch (err) {
    handleError(reply, err);
  }
}

/** GET /onboard-callback — code + state from Instagram; returns onboardingToken and igUsername. */
export async function onboardCallback(
  request: FastifyRequest<{ Querystring: { code: string; state: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { code, state } = request.query;
  try {
    const instagramOAuthService = request.server.instagramOAuthService!;
    const result = await instagramOAuthService.handleOnboardCallback(code, state);
    reply.status(200).send(result);
  } catch (err) {
    handleError(reply, err);
  }
}
