// Port interface for JWT jti blacklist (revoked tokens).

export interface ITokenBlacklist {
  add(jti: string, ttlSec?: number): Promise<void>;
  has(jti: string): Promise<boolean>;
}
