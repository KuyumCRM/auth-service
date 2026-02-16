import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity({ schema: 'auth', name: 'api_keys' })
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'key_prefix', type: 'text' })
  keyPrefix!: string;

  @Column({ name: 'key_hash', type: 'text', unique: true })
  keyHash!: string;

  @Column({ name: 'scopes', type: 'text', array: true })
  scopes!: string[];

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
