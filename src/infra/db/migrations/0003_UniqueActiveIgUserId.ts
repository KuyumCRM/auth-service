import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures at most one active Instagram connection per ig_user_id (one workspace per IG account).
 * Prevents duplicate tenant registration for the same Instagram identity.
 */
export class UniqueActiveIgUserId0003 implements MigrationInterface {
  name = 'UniqueActiveIgUserId0003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_instagram_connections_active_ig_user_id
      ON auth.instagram_connections(ig_user_id)
      WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS auth.idx_instagram_connections_active_ig_user_id
    `);
  }
}
