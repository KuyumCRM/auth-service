// Domain error classes — base AppError + auth/token/Instagram errors

export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is locked due to too many failed attempts') {
    super(message, 423);
    this.name = 'AccountLockedError';
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = 'Email address has not been verified') {
    super(message, 403);
    this.name = 'EmailNotVerifiedError';
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Token is invalid') {
    super(message, 401);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class TokenReuseDetectedError extends AppError {
  constructor(
    message = 'Refresh token reuse detected - all tokens revoked'
  ) {
    super(message, 401);
    this.name = 'TokenReuseDetectedError';
    Object.setPrototypeOf(this, TokenReuseDetectedError.prototype);
  }
}

export class InstagramOAuthError extends AppError {
  constructor(message = 'Instagram OAuth failed') {
    super(message, 502);
    this.name = 'InstagramOAuthError';
    Object.setPrototypeOf(this, InstagramOAuthError.prototype);
  }
}

/** Thrown when user connects a PERSONAL Instagram account during onboarding. */
export class InstagramPersonalAccountError extends AppError {
  readonly code = 'instagram_personal_account' as const;
  constructor(
    message = 'Only Business or Creator Instagram accounts can create a workspace'
  ) {
    super(message, 403);
    this.name = 'InstagramPersonalAccountError';
    Object.setPrototypeOf(this, InstagramPersonalAccountError.prototype);
  }
}

/** Thrown when ig_user_id already has a tenant (duplicate workspace). */
export class InstagramAlreadyHasWorkspaceError extends AppError {
  readonly code = 'instagram_already_has_workspace' as const;
  constructor(
    message = 'This Instagram account already has a workspace — ask your admin to invite you'
  ) {
    super(message, 409);
    this.name = 'InstagramAlreadyHasWorkspaceError';
    Object.setPrototypeOf(this, InstagramAlreadyHasWorkspaceError.prototype);
  }
}

/** Thrown when onboarding token is missing, expired, or already consumed. */
export class InvalidOnboardingTokenError extends AppError {
  readonly code = 'invalid_onboarding_token' as const;
  constructor(message = 'Invalid or expired onboarding session') {
    super(message, 400);
    this.name = 'InvalidOnboardingTokenError';
    Object.setPrototypeOf(this, InvalidOnboardingTokenError.prototype);
  }
}
