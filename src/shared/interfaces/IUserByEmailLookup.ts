// Port for global user lookup by email (e.g. forgot-password, no tenant context).
import type { User } from '../../domain/auth/auth.types.js';

export interface IUserByEmailLookup {
  findByEmail(email: string): Promise<User | null>;
}
