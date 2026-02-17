import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatedAtTriggers0002 implements MigrationInterface {
  name = 'UpdatedAtTriggers0002';

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

    const tables = [
      'tenants',
      'users',
      'memberships',
      'invitations',
      'instagram_connections',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        CREATE TRIGGER tr_${table}_updated_at
        BEFORE UPDATE ON auth.${table}
        FOR EACH ROW
        EXECUTE FUNCTION auth.set_updated_at()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'instagram_connections',
      'invitations',
      'memberships',
      'users',
      'tenants',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS tr_${table}_updated_at ON auth.${table}`);
    }

    await queryRunner.query(`DROP FUNCTION IF EXISTS auth.set_updated_at()`);
  }
}
