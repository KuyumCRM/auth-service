import 'fastify';
import type { JwtPayload } from '../../domain/token/token.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    tenantId?: string;
  }

  interface FastifyInstance {
    authService?: import('../../domain/auth/auth.service.js').AuthService;
    tokenService?: import('../../domain/token/token.service.js').TokenService;
    globalUserRepo?: import('../../shared/interfaces/IGlobalUserRepository.js').IGlobalUserRepository;
    instagramRepo?: import('../../shared/interfaces/IInstagramTokenRepository.js').IInstagramTokenRepository;
    authenticateGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
