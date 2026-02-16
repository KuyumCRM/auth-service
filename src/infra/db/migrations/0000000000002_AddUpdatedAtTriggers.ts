import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtTriggers0000000000002 implements MigrationInterface {
  name = 'AddUpdatedAtTriggers0000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth.set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER tr_users_updated_at
      BEFORE UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION auth.set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER tr_instagram_connections_updated_at
      BEFORE UPDATE ON auth.instagram_connections
      FOR EACH ROW
      EXECUTE FUNCTION auth.set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_instagram_connections_updated_at ON auth.instagram_connections`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_users_updated_at ON auth.users`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS auth.set_updated_at()`);
  }
}
