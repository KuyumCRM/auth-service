// Port for user lookup/update by id without tenant scope (e.g. reset-password, verify-email).
import type { User } from '../../domain/auth/auth.types.js';

export interface IGlobalUserRepository {
  findById(userId: string): Promise<User | null>;
  update(userId: string, data: Partial<User>): Promise<User>;
}
