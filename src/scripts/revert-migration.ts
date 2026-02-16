import 'reflect-metadata';
import { initializeDataSource } from '../infra/db/data-source.js';

async function main() {
  const ds = await initializeDataSource();
  await ds.undoLastMigration();
  console.log('Reverted last migration');
  await ds.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
