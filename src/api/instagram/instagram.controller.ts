// Instagram onboarding: initiate OAuth, handle callback.
import type { FastifyRequest, FastifyReply } from 'fastify';

/** POST /onboard-connect — returns redirect URL and state for frontend to redirect user to Instagram. */
export async function onboardConnect(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const instagramOAuthService = request.server.instagramOAuthService!;
  const result = await instagramOAuthService.initiateOnboardConnect();
  reply.status(200).send(result);
}

/** GET /onboard-callback — code + state from Instagram; returns onboardingToken and igUsername. */
export async function onboardCallback(
  request: FastifyRequest<{ Querystring: { code: string; state: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { code, state } = request.query;
  const instagramOAuthService = request.server.instagramOAuthService!;
  const result = await instagramOAuthService.handleOnboardCallback(code, state);
  reply.status(200).send(result);
}
