import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity({ schema: 'auth', name: 'tenants' })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'text', default: 'pending_verification' })
  status!: string;

  @Column({ type: 'text', default: 'starter' })
  plan!: string;

  @Column({ name: 'feature_flags', type: 'text', array: true, default: '{}' })
  featureFlags!: string[];

  @Column({ name: 'ig_verified_at', type: 'timestamptz', nullable: true })
  igVerifiedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
