import 'reflect-metadata';
import { initializeDataSource } from '../infra/db/data-source.js';

async function main() {
  const ds = await initializeDataSource();
  const migrations = await ds.runMigrations();
  console.log(`Ran ${migrations.length} migration(s)`);
  await ds.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
