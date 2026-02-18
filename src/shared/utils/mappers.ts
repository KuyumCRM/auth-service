import type { TenantStatus, MembershipRole } from '../../domain/tenant/tenant.types.js';
import type { MembershipInfo, MeIgConnection } from '../../domain/auth/auth.types.js';

/** Sanitize user for API response — excludes sensitive fields (passwordHash, mfaSecret, etc.). */
export function toUserSafe(user: {
  id: string;
  email: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    mfaEnabled: user.mfaEnabled,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
  };
}

/** Map MembershipWithTenant (or similar) to MembershipInfo for API response. */
export function toMembershipInfo(m: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  role: string;
}): MembershipInfo {
  return {
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    tenantSlug: m.tenantSlug,
    tenantStatus: m.tenantStatus as TenantStatus,
    role: m.role as MembershipRole,
  };
}

/** Sanitize IG connection for API response — excludes token, iv, scopes. */
export function toMeIgConnection(c: {
  id: string;
  igUserId: string;
  igUsername: string;
  isActive: boolean;
}): MeIgConnection {
  return {
    id: c.id,
    igUserId: c.igUserId,
    igUsername: c.igUsername,
    isActive: c.isActive,
  };
}
