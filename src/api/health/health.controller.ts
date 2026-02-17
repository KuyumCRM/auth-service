import type { FastifyRequest, FastifyReply } from 'fastify';

export async function health(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await reply.send({ status: 'ok' });
}
