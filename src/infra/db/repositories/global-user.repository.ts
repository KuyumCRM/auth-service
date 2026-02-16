import type { IGlobalUserRepository } from '../../../shared/interfaces/IGlobalUserRepository.js';
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

export function createGlobalUserRepository(): IGlobalUserRepository {
  const repository = AppDataSource.getRepository(UserEntity);

  return {
    async findById(userId: string): Promise<User | null> {
      const entity = await repository.findOne({ where: { id: userId } });
      return entity ? entityToUser(entity) : null;
    },

    async update(userId: string, data: Partial<User>): Promise<User> {
      const updateData: Partial<UserEntity> = { updatedAt: new Date() };
      if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;
      if (data.loginCount !== undefined) updateData.loginCount = data.loginCount;
      await repository.update({ id: userId }, updateData);
      const entity = await repository.findOne({ where: { id: userId } });
      if (!entity) throw new Error(`User not found: ${userId}`);
      return entityToUser(entity);
    },
  };
}
