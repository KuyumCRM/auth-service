// Domain types: User, Membership, AuthResult (Tenant/Invitation from their domains)
import type { Tenant, TenantStatus, MembershipRole } from '../tenant/tenant.types.js';
import type { TokenPair } from '../token/token.types.js';
import type { IUserRepository } from '../../shared/interfaces/IUserRepository.js';
import type { ITenantRepository } from '../../shared/interfaces/ITenantRepository.js';
import type { IMembershipRepository } from '../../shared/interfaces/IMembershipRepository.js';
import type { IInvitationRepository } from '../../shared/interfaces/IInvitationRepository.js';
import type { IAuditRepository } from '../../shared/interfaces/IAuditRepository.js';
import type { IEventPublisher } from '../../shared/interfaces/IEventPublisher.js';
import type { OneTimeTokenService } from '../one-time-token/one-time-token.service.js';
import type { IOnboardingSessionStore } from '../../shared/interfaces/IOnboardingSessionStore.js';
import type { IInstagramTokenRepository } from '../../shared/interfaces/IInstagramTokenRepository.js';
import type { PasswordService } from '../password/password.service.js';
import type { TokenService } from '../token/token.service.js';
import type { TotpService } from '../mfa/totp.service.js';

export interface AuthServiceDeps {
  userRepo: IUserRepository;
  tenantRepo: ITenantRepository;
  membershipRepo: IMembershipRepository;
  invitationRepo: IInvitationRepository;
  auditRepo: IAuditRepository;
  eventPublisher: IEventPublisher;
  passwordService: PasswordService;
  tokenService: TokenService;
  totpService: TotpService;
  oneTimeTokenService: OneTimeTokenService;
  onboardingSessionStore: IOnboardingSessionStore;
  instagramRepo: IInstagramTokenRepository;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  defaultTenantId: string | null;
  lastLoginAt: Date | null;
  loginCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: MembershipRole;
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Membership with tenant details — returned by membershipRepo.findAllByUserId. */
export interface MembershipWithTenant extends Membership {
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
}

export interface MembershipInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: TenantStatus;
  role: MembershipRole;
}

export interface SignupResult {
  user: User;
  tenant: Tenant;
  membership: Membership;
  tokens: TokenPair;
}

export interface LoginResult {
  user: User;
  tokens: TokenPair;
  currentTenant: Tenant;
  currentRole: MembershipRole;
  tenants: MembershipInfo[];
}

export interface AcceptInviteResult {
  user: User;
  tenant: Tenant;
  membership: Membership;
  tokens: TokenPair;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface SignupDto {
  brandName: string;
  email: string;
  password: string;
}

/** Owner signup after Instagram onboarding: requires one-time onboarding token. */
export interface SignupWithOnboardingDto {
  onboardingToken: string;
  email: string;
  password: string;
  workspaceName?: string; // optional; defaults to igUsername from session
}

export interface AcceptInviteDto {
  inviteToken: string;
  password?: string;
}

/** Input for creating a user (id, createdAt, updatedAt are DB-generated). */
export interface CreateUserDto {
  email: string;
  passwordHash?: string | null;
  emailVerified?: boolean;
  mfaSecret?: string | null;
  mfaEnabled?: boolean;
  defaultTenantId?: string | null;
  lastLoginAt?: Date | null;
  loginCount?: number;
  isActive?: boolean;
}

export interface CreateMembershipDto {
  userId: string;
  tenantId: string;
  role: MembershipRole;
}

/** Shape of one IG connection in GET /me response. */
export interface MeIgConnection {
  id: string;
  igUserId: string;
  igUsername: string;
  isActive: boolean;
}

/** Result of getMe use case: current user profile with tenant, role, memberships, IG connections. */
export interface MeResult {
  id: string;
  email: string;
  mfaEnabled: boolean;
  currentTenant: Tenant | undefined;
  currentRole: MembershipRole | undefined;
  memberships: MembershipInfo[];
  igConnections: MeIgConnection[];
}

/** Internal result of createWorkspaceForUser (tenant + membership + tokens). */
export interface WorkspaceResult {
  tenant: Tenant;
  membership: Membership;
  tokens: TokenPair;
}

/** Options for createWorkspace: either userId (Case 2, JWT) or email+password (Case 1). */
export interface CreateWorkspaceOpts {
  onboardingToken: string;
  workspaceName?: string;
  userId?: string;
  email?: string;
  password?: string;
  mfaCode?: string;
}

/** Result of createWorkspace (same shape as SignupResult for the new workspace). */
export interface CreateWorkspaceResult {
  user: User;
  tenant: Tenant;
  membership: Membership;
  tokens: TokenPair;
}
