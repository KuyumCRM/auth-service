import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity({ schema: 'auth', name: 'instagram_connections' })
export class InstagramConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'ig_user_id', type: 'text' })
  igUserId!: string;

  @Column({ name: 'ig_username', type: 'text' })
  igUsername!: string;

  @Column({ name: 'ig_account_type', type: 'text', nullable: true })
  igAccountType!: string | null;

  @Column({ name: 'access_token_enc', type: 'text' })
  accessTokenEnc!: string;

  @Column({ name: 'token_iv', type: 'text' })
  tokenIv!: string;

  @Column({ name: 'token_expires_at', type: 'timestamptz' })
  tokenExpiresAt!: Date;

  @Column({ name: 'scopes', type: 'text', array: true })
  scopes!: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_refreshed_at', type: 'timestamptz', nullable: true })
  lastRefreshedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
