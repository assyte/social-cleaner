import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { blindIndex } from "@/server/crypto/blind-index";
import { normalizeEmail } from "@/server/security/canonical";

/**
 * Local admin helper until a payment provider is connected.
 *
 *   npm run plan:set -- user@example.com pro
 *   npm run plan:set -- user@example.com free
 *
 * This is a shell-level admin action, not a user-facing upgrade path. Never
 * expose it through HTTP. It only touches `users.plan` / `plan_renews_at`.
 */
async function main(): Promise<void> {
  const [rawEmail, rawPlan] = process.argv.slice(2);
  if (!rawEmail || (rawPlan !== "free" && rawPlan !== "pro")) {
    console.error("Kullanım: npm run plan:set -- <e-posta> <free|pro>");
    process.exitCode = 1;
    return;
  }

  const email = normalizeEmail(rawEmail);
  const db = await getDb();
  const result = await db
    .update(users)
    .set({
      plan: rawPlan,
      planRenewsAt: rawPlan === "pro" ? Date.now() + 30 * 24 * 60 * 60 * 1000 : null,
      updatedAt: Date.now(),
    })
    .where(eq(users.emailBidx, blindIndex("email", email)));

  if (result.rowsAffected === 0) {
    console.error("Kullanıcı bulunamadı.");
    process.exitCode = 1;
  } else {
    console.log(`Plan güncellendi: ${email} → ${rawPlan}`);
  }
  await closeDb();
}

main().catch((error) => {
  console.error("Plan güncellenemedi:", error instanceof Error ? error.message : error);
  process.exit(1);
});
