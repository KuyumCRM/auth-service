// Domain types: User, TokenPair, AuthResult, LoginCredentials

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string | null; // NULL for SSO-only users
  emailVerified: boolean;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  lastLoginAt: Date | null;
  loginCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterDto {
  tenantId: string;
  email: string;
  password: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Input for creating a user (id, createdAt, updatedAt are DB-generated). */
export interface CreateUserDto {
  tenantId: string;
  email: string;
  passwordHash?: string | null;
  emailVerified?: boolean;
  mfaSecret?: string | null;
  mfaEnabled?: boolean;
  lastLoginAt?: Date | null;
  loginCount?: number;
  isActive?: boolean;
}
