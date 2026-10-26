/**
 * Daily data-retention sweep. Schedule this after the database backup step.
 * Search history follows the plan retention window; audit events expire after
 * 365 days; expired/revoked sessions and stuck runs are removed.
 */
import { closeDb } from "../src/server/db/client";
import { runRetentionSweep } from "../src/server/retention/sweep";

async function main() {
  const result = await runRetentionSweep();
  console.log(JSON.stringify(result, null, 2));
  await closeDb();
}

main().catch((error) => {
  console.error("Retention sweep failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
