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
    tenantService?: import('../../domain/tenant/tenant.service.js').TenantService;
    invitationService?: import('../../domain/invitation/invitation.service.js').InvitationService;
    userRepo?: import('../../shared/interfaces/IUserRepository.js').IUserRepository;
    tenantRepo?: import('../../shared/interfaces/ITenantRepository.js').ITenantRepository;
    membershipRepo?: import('../../shared/interfaces/IMembershipRepository.js').IMembershipRepository;
    instagramRepo?: import('../../shared/interfaces/IInstagramTokenRepository.js').IInstagramTokenRepository;
    instagramOAuthService?: import('../../domain/instagram/instagram-oauth.service.js').InstagramOAuthService;
    tokenBlacklist?: import('../../shared/interfaces/ITokenBlacklist.js').ITokenBlacklist;
    authenticateGuard?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
