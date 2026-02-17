// Domain types: User, Membership, TokenPair, AuthResult (Tenant/Invitation types from their domains)
import type {
  Tenant,
  TenantStatus,
  TenantPlan,
  MembershipRole,
  CreateTenantDto,
} from '../tenant/tenant.types.js';
import type { Invitation, CreateInvitationDto } from '../invitation/invitation.types.js';

export type { Tenant, TenantStatus, TenantPlan, MembershipRole, CreateTenantDto };
export type { Invitation, CreateInvitationDto };

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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
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
