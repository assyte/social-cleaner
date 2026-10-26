/**
 * Applies pending migrations and prints the result. Safe to run repeatedly;
 * `getDb()` also migrates on first use, this script exists for explicit ops.
 */
import { closeDb, getDb } from "../src/server/db/client";
import { MIGRATIONS } from "../src/server/db/migrations";

async function main() {
  await getDb();
  console.log(`Şema hazır. Tanımlı migration sayısı: ${MIGRATIONS.length}`);
  for (const migration of MIGRATIONS) {
    console.log(`  • ${migration.id} (${migration.statements.length} ifade)`);
  }
  await closeDb();
}

main().catch((error) => {
  console.error("Migration başarısız:", error instanceof Error ? error.message : error);
  process.exit(1);
});
