// Password reset HTTP handlers — thin: validate, call domain, format response.
import type { FastifyRequest, FastifyReply } from 'fastify';
import { MESSAGE_PASSWORD_UPDATED } from '../../config/constants.js';

// POST /forgot-password
export async function forgotPassword(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
): Promise<void> {
  const passwordResetService = request.server.passwordResetService!;
  await passwordResetService.forgotPassword({ email: request.body.email });
  reply.status(202).send();
}

// POST /reset-password
export async function resetPassword(
  request: FastifyRequest<{ Body: { token: string; newPassword: string } }>,
  reply: FastifyReply
): Promise<void> {
  const passwordResetService = request.server.passwordResetService!;
  await passwordResetService.resetPassword({
    token: request.body.token,
    newPassword: request.body.newPassword,
  });
  reply.status(200).send({ message: MESSAGE_PASSWORD_UPDATED });
}
