import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { auditEvents, searchRuns, sessions, users } from "@/server/db/schema";
import { PLANS, normalizePlan, type PlanId } from "@/server/billing/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
const AUDIT_RETENTION_DAYS = 365;
const STUCK_RUN_HOURS = 24;

export type RetentionSweepResult = {
  ranAt: string;
  deletedSearchRuns: number;
  deletedExpiredSessions: number;
  deletedAuditEvents: number;
  deletedStuckRuns: number;
};

/**
 * Daily retention job. Search history follows the user's current plan; audit
 * events are kept for 365 days. Run it from a scheduler (cron, Vercel Cron,
 * GitHub Actions) after the database backup completes.
 */
export async function runRetentionSweep(now = Date.now()): Promise<RetentionSweepResult> {
  const db = await getDb();
  const userRows = await db.select({ id: users.id, plan: users.plan }).from(users);
  const idsByPlan: Record<PlanId, string[]> = { free: [], pro: [] };
  for (const row of userRows) idsByPlan[normalizePlan(row.plan)].push(row.id);

  let deletedSearchRuns = 0;
  for (const planId of ["free", "pro"] as const) {
    const userIds = idsByPlan[planId];
    if (userIds.length === 0) continue;
    const cutoff = now - PLANS[planId].limits.retentionDays * DAY_MS;
    const deleted = await db
      .delete(searchRuns)
      .where(and(inArray(searchRuns.userId, userIds), lt(searchRuns.createdAt, cutoff)));
    deletedSearchRuns += deleted.rowsAffected;
  }

  const stuckCutoff = now - STUCK_RUN_HOURS * 60 * 60 * 1000;
  const stuck = await db
    .delete(searchRuns)
    .where(and(eq(searchRuns.status, "running"), lt(searchRuns.createdAt, stuckCutoff)));

  const expiredSessions = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), isNotNull(sessions.revokedAt)));

  const auditCutoff = now - AUDIT_RETENTION_DAYS * DAY_MS;
  const oldAudit = await db.delete(auditEvents).where(lt(auditEvents.createdAt, auditCutoff));

  return {
    ranAt: new Date(now).toISOString(),
    deletedSearchRuns,
    deletedExpiredSessions: expiredSessions.rowsAffected,
    deletedAuditEvents: oldAudit.rowsAffected,
    deletedStuckRuns: stuck.rowsAffected,
  };
}
