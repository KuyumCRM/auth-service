// Core auth orchestration logic.
import type { CreateIgConnectionDto } from '../instagram/instagram.types.js';
import type { CreateTenantDto } from '../tenant/tenant.types.js';
import type { TokenPair } from '../token/token.types.js';
import type {
  User,
  SignupWithOnboardingDto,
  SignupResult,
  LoginCredentials,
  LoginResult,
  AcceptInviteDto,
  AcceptInviteResult,
  MembershipInfo,
  MeResult,
  CreateWorkspaceOpts,
  CreateWorkspaceResult,
  WorkspaceResult,
} from './auth.types.js';
import type { OnboardingSessionPayload } from '../instagram/onboarding.types.js';
import type { GoogleProfile } from '../google/google-oauth.types.js';
import { generateSecureToken, sha256, slugify, toMembershipInfo, toMeIgConnection } from '../../shared/utils/index.js';
import {
  AppError,
  InvalidCredentialsError,
  AccountLockedError,
  InvalidOnboardingTokenError,
  UserNotFoundError,
} from '../../shared/errors/domain-errors.js';
import type { AuthServiceDeps } from './auth.types.js';

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /**
   * Pure credential verification. Used by login() and createWorkspace() (Case 1).
   */
  private async authenticateUser(
    email: string,
    password: string,
    mfaCode?: string
  ): Promise<User> {
    const user = await this.deps.userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }
    if (!user.isActive) {
      throw new AccountLockedError();
    }
    const valid = await this.deps.passwordService.verify(password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError('Invalid password');
    }
    if (user.mfaEnabled) {
      if (!mfaCode) {
        throw new AppError('MFA code required', 400);
      }
      if (!user.mfaSecret) {
        throw new AppError('MFA not configured', 400);
      }
      const mfaValid = this.deps.totpService.verify(mfaCode, user.mfaSecret);
      if (!mfaValid) {
        throw new InvalidCredentialsError('Invalid MFA code');
      }
    }
    return user;
  }

  /**
   * Create tenant + membership + IG connection + issue tokens + events. Shared by signupWithOnboarding and createWorkspace.
   */
  private async createWorkspaceForUser(
    userId: string,
    email: string,
    payload: OnboardingSessionPayload,
    workspaceName?: string
  ): Promise<WorkspaceResult> {
    const name = (workspaceName ?? payload.igUsername).trim() || payload.igUsername;
    let slug = slugify(name);
    const existingTenant = await this.deps.tenantRepo.findBySlug(slug);
    if (existingTenant) {
      slug = `${slug}-${generateSecureToken(3)}`;
    }
    const createTenantOpts: CreateTenantDto = {
      name,
      slug,
      status: 'pending_verification',
      plan: 'starter',
    };
    const tenant = await this.deps.tenantRepo.create(createTenantOpts);
    const membership = await this.deps.membershipRepo.create({
      userId,
      tenantId: tenant.id,
      role: 'owner',
    });
    const createIgConnectionDto: CreateIgConnectionDto = {
      userId,
      tenantId: tenant.id,
      igUserId: payload.igUserId,
      igUsername: payload.igUsername,
      igAccountType: payload.accountType,
      accessTokenEnc: payload.accessTokenEnc,
      tokenIv: payload.tokenIv,
      tokenExpiresAt: new Date(payload.tokenExpiresAt),
      scopes: payload.scopes,
      isActive: true,
    };
    await this.deps.instagramRepo.create(createIgConnectionDto);
    await this.deps.userRepo.update(userId, { defaultTenantId: tenant.id });
    const tokens = await this.deps.tokenService.issueTokens({
      userId,
      tenantId: tenant.id,
      email,
      role: 'owner',
      tenantStatus: 'pending_verification',
      deviceInfo: {},
    });
    await this.deps.eventPublisher.publish('auth.tenant.created', {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    });
    await this.deps.auditRepo.create({
      eventType: 'tenant.created',
      userId,
      tenantId: tenant.id,
    });
    return { tenant, membership, tokens };
  }

  /**
   * Owner signup gated by Instagram onboarding: consume one-time session, create user + workspace (tenant + membership + IG connection).
   */
  async signupWithOnboarding(dto: SignupWithOnboardingDto): Promise<SignupResult> {
    const policyResult = this.deps.passwordService.validatePolicy(dto.password);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join('; '), 400);
    }

    const existingUser = await this.deps.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const payload = await this.deps.onboardingSessionStore.consume(dto.onboardingToken);
    if (!payload) {
      throw new InvalidOnboardingTokenError();
    }

    const passwordHash = await this.deps.passwordService.hash(dto.password);
    const user = await this.deps.userRepo.create({
      email: dto.email,
      passwordHash,
      defaultTenantId: null,
    });

    await this.deps.eventPublisher.publish('auth.user.registered', {
      userId: user.id,
    });
    await this.deps.auditRepo.create({
      eventType: 'user.registered',
      userId: user.id,
    });

    const workspace = await this.createWorkspaceForUser(
      user.id,
      user.email,
      payload,
      dto.workspaceName
    );
    return { user, ...workspace };
  }

  /**
   * Accept invite: validate invite token, create user if needed, create membership.
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResult> {
    const tokenHash = sha256(dto.inviteToken);
    const invitation = await this.deps.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError('Invalid invitation token', 400);
    }
    if (invitation.acceptedAt) {
      throw new AppError('Invitation already accepted', 400);
    }
    if (invitation.expiresAt < new Date()) {
      throw new AppError('Invitation has expired', 400);
    }

    const tenant = await this.deps.tenantRepo.findById(invitation.tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    let user = await this.deps.userRepo.findByEmail(invitation.email);

    if (!user) {
      // New user — password is required
      if (!dto.password) {
        throw new AppError('Password is required for new users', 400);
      }
      const policyResult = this.deps.passwordService.validatePolicy(dto.password);
      if (!policyResult.valid) {
        throw new AppError(policyResult.errors.join('; '), 400);
      }
      const passwordHash = await this.deps.passwordService.hash(dto.password);
      user = await this.deps.userRepo.create({
        email: invitation.email,
        passwordHash,
        defaultTenantId: tenant.id,
      });
    }

    // Create membership (DB unique constraint on user_id+tenant_id; duplicate throws MembershipAlreadyExistsError)
    const membership = await this.deps.membershipRepo.create({
      userId: user.id,
      tenantId: tenant.id,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await this.deps.invitationRepo.markAccepted(invitation.id);

    // Update default tenant if user has none
    if (!user.defaultTenantId) {
      await this.deps.userRepo.update(user.id, { defaultTenantId: tenant.id });
    }

    // Issue tokens for the new membership
    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: invitation.role,
      tenantStatus: tenant.status,
      deviceInfo: {},
    });

    await this.deps.eventPublisher.publish('auth.invitation.accepted', {
      userId: user.id,
      tenantId: tenant.id,
      invitationId: invitation.id,
    });

    await this.deps.auditRepo.create({
      eventType: 'invitation.accepted',
      userId: user.id,
      tenantId: tenant.id,
    });

    return { user, tenant, membership, tokens };
  }

  /**
   * Login: multi-tenant aware — returns all memberships.
   */
  async login(dto: LoginCredentials): Promise<LoginResult> {
    const user = await this.authenticateUser(dto.email, dto.password, dto.mfaCode);

    // Load all active memberships
    const memberships = await this.deps.membershipRepo.findAllByUserId(user.id);
    if (memberships.length === 0) {
      throw new AppError('No active memberships found', 403);
    }

    // Choose tenant: default_tenant_id or first membership
    let currentMembership = memberships[0];
    if (user.defaultTenantId) {
      const defaultMatch = memberships.find(
        (m) => m.tenantId === user.defaultTenantId
      );
      if (defaultMatch) {
        currentMembership = defaultMatch;
      }
    }

    const currentTenant = await this.deps.tenantRepo.findById(currentMembership.tenantId);
    if (!currentTenant) {
      throw new AppError('Tenant not found', 404);
    }

    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: currentTenant.id,
      email: user.email,
      role: currentMembership.role,
      tenantStatus: currentTenant.status,
      deviceInfo: {},
    });

    // Update login stats + default tenant
    await this.deps.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      loginCount: user.loginCount + 1,
      defaultTenantId: currentTenant.id,
    });

    await this.deps.eventPublisher.publish('auth.user.logged_in', {
      userId: user.id,
      tenantId: currentTenant.id,
    });

    await this.deps.auditRepo.create({
      eventType: 'user.logged_in',
      userId: user.id,
      tenantId: currentTenant.id,
    });

    const tenants: MembershipInfo[] = memberships.map(toMembershipInfo);

    return {
      user,
      tokens,
      currentTenant,
      currentRole: currentMembership.role,
      tenants,
    };
  }

  /**
   * Login via Google OAuth: find user by googleId or email (and link googleId if found by email), then same as login().
   */
  async googleLogin(profile: GoogleProfile): Promise<LoginResult> {
    let user = await this.deps.userRepo.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.deps.userRepo.findByEmail(profile.email);
      if (user) {
        await this.deps.userRepo.update(user.id, { googleId: profile.googleId });
      }
    }
    if (!user) {
      throw new AppError('No account found. Please sign up first.', 403);
    }
    if (!user.isActive) {
      throw new AccountLockedError();
    }

    const memberships = await this.deps.membershipRepo.findAllByUserId(user.id);
    if (memberships.length === 0) {
      throw new AppError('No active memberships found', 403);
    }

    let currentMembership = memberships[0];
    if (user.defaultTenantId) {
      const defaultMatch = memberships.find(
        (m) => m.tenantId === user!.defaultTenantId
      );
      if (defaultMatch) {
        currentMembership = defaultMatch;
      }
    }

    const currentTenant = await this.deps.tenantRepo.findById(currentMembership.tenantId);
    if (!currentTenant) {
      throw new AppError('Tenant not found', 404);
    }

    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: currentTenant.id,
      email: user.email,
      role: currentMembership.role,
      tenantStatus: currentTenant.status,
      deviceInfo: {},
    });

    await this.deps.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      loginCount: user.loginCount + 1,
      defaultTenantId: currentTenant.id,
    });

    await this.deps.eventPublisher.publish('auth.user.logged_in', {
      userId: user.id,
      tenantId: currentTenant.id,
    });

    await this.deps.auditRepo.create({
      eventType: 'user.logged_in',
      userId: user.id,
      tenantId: currentTenant.id,
    });

    const tenants: MembershipInfo[] = memberships.map(toMembershipInfo);

    return {
      user,
      tokens,
      currentTenant,
      currentRole: currentMembership.role,
      tenants,
    };
  }

  /**
   * Signup via Google OAuth after Instagram onboarding: consume onboarding token, create user (no password), create workspace.
   */
  async googleSignup(profile: GoogleProfile, onboardingToken: string): Promise<SignupResult> {
    const existingUser = await this.deps.userRepo.findByEmail(profile.email);
    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    const payload = await this.deps.onboardingSessionStore.consume(onboardingToken);
    if (!payload) {
      throw new InvalidOnboardingTokenError();
    }

    const user = await this.deps.userRepo.create({
      email: profile.email,
      googleId: profile.googleId,
      passwordHash: null,
      emailVerified: profile.emailVerified ?? true,
    });

    await this.deps.eventPublisher.publish('auth.user.registered', {
      userId: user.id,
    });
    await this.deps.auditRepo.create({
      eventType: 'user.registered',
      userId: user.id,
    });

    const workspace = await this.createWorkspaceForUser(
      user.id,
      user.email,
      payload
    );
    return { user, ...workspace };
  }

  /**
   * Create a new workspace for an existing user. Case 1: authenticate with email+password (no JWT).
   * Case 2: user already authenticated via JWT (userId provided). Onboarding token is consumed after auth succeeds.
   */
  async createWorkspace(opts: CreateWorkspaceOpts): Promise<CreateWorkspaceResult> {
    let user: User;
    if (opts.userId) {
      const found = await this.deps.userRepo.findById(opts.userId);
      if (!found) {
        throw new UserNotFoundError();
      }
      user = found;
    } else {
      if (!opts.email || !opts.password) {
        throw new AppError('Email and password are required', 400);
      }
      user = await this.authenticateUser(opts.email, opts.password, opts.mfaCode);
    }

    const payload = await this.deps.onboardingSessionStore.consume(opts.onboardingToken);
    if (!payload) {
      throw new InvalidOnboardingTokenError();
    }

    const workspace = await this.createWorkspaceForUser(
      user.id,
      user.email,
      payload,
      opts.workspaceName
    );
    return { user, ...workspace };
  }

  /**
   * Switch tenant: issue new JWT for a different tenant.
   */
  async switchTenant(userId: string, tenantId: string): Promise<TokenPair> {
    const membership = await this.deps.membershipRepo.findByUserAndTenant(userId, tenantId);
    if (!membership || !membership.isActive) {
      throw new AppError('Not a member of this tenant', 403);
    }

    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tenant = await this.deps.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    // Update default tenant
    await this.deps.userRepo.update(userId, { defaultTenantId: tenantId });

    const tokens = await this.deps.tokenService.issueTokens({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: membership.role,
      tenantStatus: tenant.status,
      deviceInfo: {},
    });

    await this.deps.auditRepo.create({
      eventType: 'tenant.switched',
      userId,
      tenantId,
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string, all = false): Promise<void> {
    if (all) {
      await this.deps.tokenService.revokeAllForUser(userId);
    } else {
      await this.deps.tokenService.revokeToken(refreshToken);
    }

    await this.deps.eventPublisher.publish('auth.user.logged_out', {
      userId,
      all,
    });

    await this.deps.auditRepo.create({
      eventType: 'user.logged_out',
      userId,
      metadata: { all },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const { userId } = await this.deps.oneTimeTokenService.validateAndConsume(
      token,
      'email_verify'
    );
    await this.deps.userRepo.update(userId, { emailVerified: true });
    await this.deps.auditRepo.create({
      eventType: 'email_verified',
      userId,
    });
  }

  /**
   * Get current user profile for GET /me: user, current tenant/role, all memberships, IG connections.
   */
  async getMe(userId: string, tenantId: string): Promise<MeResult> {
    const user = await this.deps.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const [currentTenant, memberships, connections] = await Promise.all([
      this.deps.tenantRepo.findById(tenantId),
      this.deps.membershipRepo.findAllByUserId(userId),
      this.deps.instagramRepo.findByUserId(userId),
    ]);

    const currentMembership = memberships.find((m) => m.tenantId === tenantId);

    return {
      id: user.id,
      email: user.email,
      mfaEnabled: user.mfaEnabled,
      currentTenant: currentTenant ?? undefined,
      currentRole: currentMembership?.role ?? undefined,
      memberships: memberships.map(toMembershipInfo),
      igConnections: connections.map(toMeIgConnection),
    };
  }
}
