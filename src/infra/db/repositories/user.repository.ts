// Single global user repository (merges old user, global-user, and user-lookup repos).
import type { IUserRepository } from '../../../shared/interfaces/IUserRepository.js';
import type { User, CreateUserDto } from '../../../domain/auth/auth.types.js';
import { AppDataSource } from '../data-source.js';
import { UserEntity } from '../entities/User.entity.js';

function entityToUser(entity: UserEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    passwordHash: entity.passwordHash,
    emailVerified: entity.emailVerified,
    mfaSecret: entity.mfaSecret,
    mfaEnabled: entity.mfaEnabled,
    defaultTenantId: entity.defaultTenantId,
    lastLoginAt: entity.lastLoginAt,
    loginCount: entity.loginCount,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function createUserRepository(): IUserRepository {
  const repository = AppDataSource.getRepository(UserEntity);

  return {
    async findById(id: string): Promise<User | null> {
      const entity = await repository.findOne({ where: { id } });
      return entity ? entityToUser(entity) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const entity = await repository.findOne({ where: { email } });
      return entity ? entityToUser(entity) : null;
    },

    async create(data: CreateUserDto): Promise<User> {
      const entity = repository.create({
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        emailVerified: data.emailVerified ?? false,
        mfaSecret: data.mfaSecret ?? null,
        mfaEnabled: data.mfaEnabled ?? false,
        defaultTenantId: data.defaultTenantId ?? null,
        lastLoginAt: data.lastLoginAt ?? null,
        loginCount: data.loginCount ?? 0,
        isActive: data.isActive ?? true,
      });
      const saved = await repository.save(entity);
      return entityToUser(saved);
    },

    async update(id: string, data: Partial<User>): Promise<User> {
      const updateData: Partial<UserEntity> = {};
      if (data.email !== undefined) updateData.email = data.email;
      if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
      if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
      if (data.mfaSecret !== undefined) updateData.mfaSecret = data.mfaSecret;
      if (data.mfaEnabled !== undefined) updateData.mfaEnabled = data.mfaEnabled;
      if (data.defaultTenantId !== undefined) updateData.defaultTenantId = data.defaultTenantId;
      if (data.lastLoginAt !== undefined) updateData.lastLoginAt = data.lastLoginAt;
      if (data.loginCount !== undefined) updateData.loginCount = data.loginCount;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const result = await repository.update({ id }, updateData);
      if (result.affected === 0) {
        throw new Error(`User not found: ${id}`);
      }
      const entity = await repository.findOne({ where: { id } });
      if (!entity) throw new Error(`User not found: ${id}`);
      return entityToUser(entity);
    },
  };
}
