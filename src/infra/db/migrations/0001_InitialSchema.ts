import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema0001 implements MigrationInterface {
  name = 'InitialSchema0001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);

    // auth.tenants
    await queryRunner.query(`
      CREATE TABLE auth.tenants (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name              TEXT NOT NULL,
        slug              TEXT NOT NULL UNIQUE,
        status            TEXT NOT NULL DEFAULT 'pending_verification'
                          CHECK (status IN ('pending_verification','active','suspended')),
        plan              TEXT NOT NULL DEFAULT 'starter'
                          CHECK (plan IN ('starter','pro','enterprise')),
        feature_flags     TEXT[] NOT NULL DEFAULT '{}',
        ig_verified_at    TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_tenants_slug ON auth.tenants(slug)`);
    await queryRunner.query(`CREATE INDEX idx_tenants_status ON auth.tenants(status)`);

    // auth.users
    await queryRunner.query(`
      CREATE TABLE auth.users (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email               TEXT NOT NULL UNIQUE,
        password_hash       TEXT,
        email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
        mfa_secret          TEXT,
        mfa_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
        default_tenant_id   UUID REFERENCES auth.tenants(id) ON DELETE SET NULL,
        last_login_at       TIMESTAMPTZ,
        login_count         INTEGER NOT NULL DEFAULT 0,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_email ON auth.users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_default_tenant ON auth.users(default_tenant_id)`);

    // auth.memberships
    await queryRunner.query(`
      CREATE TABLE auth.memberships (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        tenant_id   UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
        role        TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('owner','admin','editor','viewer')),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, tenant_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_memberships_user ON auth.memberships(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_memberships_tenant ON auth.memberships(tenant_id)`);

    // auth.invitations
    await queryRunner.query(`
      CREATE TABLE auth.invitations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
        email       TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin','editor','viewer')),
        token_hash  TEXT NOT NULL UNIQUE,
        invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        expires_at  TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_invitations_tenant ON auth.invitations(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_invitations_email ON auth.invitations(email)`);
    await queryRunner.query(`CREATE INDEX idx_invitations_token ON auth.invitations(token_hash)`);

    // auth.refresh_tokens (now with tenant_id instead of device_info hack)
    await queryRunner.query(`
      CREATE TABLE auth.refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        tenant_id   UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL UNIQUE,
        family_id   UUID NOT NULL,
        device_info JSONB,
        expires_at  TIMESTAMPTZ NOT NULL,
        rotated_at  TIMESTAMPTZ,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rt_user_id ON auth.refresh_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_rt_tenant_id ON auth.refresh_tokens(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_rt_family_id ON auth.refresh_tokens(family_id)`);
    await queryRunner.query(`CREATE INDEX idx_rt_expires_at ON auth.refresh_tokens(expires_at)`);

    // auth.one_time_tokens
    await queryRunner.query(`
      CREATE TABLE auth.one_time_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL UNIQUE,
        type        TEXT NOT NULL CHECK (type IN ('email_verify','password_reset','mfa_backup')),
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // auth.instagram_connections (now references tenants)
    await queryRunner.query(`
      CREATE TABLE auth.instagram_connections (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id           UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
        user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        ig_user_id          TEXT NOT NULL,
        ig_username         TEXT NOT NULL,
        ig_account_type     TEXT,
        access_token_enc    TEXT NOT NULL,
        token_iv            TEXT NOT NULL,
        token_expires_at    TIMESTAMPTZ NOT NULL,
        scopes              TEXT[] NOT NULL,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        last_refreshed_at   TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, ig_user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_ig_conn_tenant ON auth.instagram_connections(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_ig_conn_expires ON auth.instagram_connections(token_expires_at)`);

    // auth.api_keys (now references tenants)
    await queryRunner.query(`
      CREATE TABLE auth.api_keys (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id   UUID NOT NULL REFERENCES auth.tenants(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        key_prefix  TEXT NOT NULL,
        key_hash    TEXT NOT NULL UNIQUE,
        scopes      TEXT[] NOT NULL,
        last_used_at TIMESTAMPTZ,
        expires_at  TIMESTAMPTZ,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // auth.audit_log (partitioned table)
    await queryRunner.query(`
      CREATE TABLE auth.audit_log (
        id          BIGSERIAL PRIMARY KEY,
        event_type  TEXT NOT NULL,
        user_id     UUID,
        tenant_id   UUID,
        ip_address  INET,
        user_agent  TEXT,
        metadata    JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      ) PARTITION BY RANGE (created_at)
    `);
    await queryRunner.query(`
      CREATE TABLE auth.audit_log_2026_01 PARTITION OF auth.audit_log
      FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')
    `);
    await queryRunner.query(`
      CREATE TABLE auth.audit_log_2026_02 PARTITION OF auth.audit_log
      FOR VALUES FROM ('2026-02-01') TO ('2026-03-01')
    `);
    await queryRunner.query(`
      CREATE TABLE auth.audit_log_2026_03 PARTITION OF auth.audit_log
      FOR VALUES FROM ('2026-03-01') TO ('2026-04-01')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auth.audit_log_2026_03`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.audit_log_2026_02`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.audit_log_2026_01`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.audit_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.api_keys`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.instagram_connections`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.one_time_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.invitations`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.memberships`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.users`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth.tenants`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS auth`);
  }
}
