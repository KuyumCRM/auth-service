// Global user lookup by email (no tenant scope) for forgot-password etc.
import type { IUserByEmailLookup } from '../../../shared/interfaces/IUserByEmailLookup.js';
import type { User } from '../../../domain/auth/auth.types.js';
import { AppDataSource } from '../data-source.js';
import { UserEntity } from '../entities/User.entity.js';

function entityToUser(entity: UserEntity): User {
  return {
    id: entity.id,
    tenantId: entity.tenantId,
    email: entity.email,
    passwordHash: entity.passwordHash,
    emailVerified: entity.emailVerified,
    mfaSecret: entity.mfaSecret,
    mfaEnabled: entity.mfaEnabled,
    lastLoginAt: entity.lastLoginAt,
    loginCount: entity.loginCount,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function createUserByEmailLookup(): IUserByEmailLookup {
  const repository = AppDataSource.getRepository(UserEntity);

  return {
    async findByEmail(email: string): Promise<User | null> {
      const entity = await repository.findOne({ where: { email } });
      return entity ? entityToUser(entity) : null;
    },
  };
}
