import { getDb } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";
import { newId, ID_PREFIXES } from "@/server/ids";
import { sanitizeAuditMeta } from "@/server/security/masking";
import { ipHashFromRequest } from "@/server/auth/cookies";

export type AuditOutcome = "success" | "denied" | "failure";

export type AuditInput = {
 userId: string | null;
 actorType?: "user" | "system" | "worker";
 action: string;
 entityType?: string;
 entityId?: string | null;
 outcome?: AuditOutcome;
 meta?: Record<string, unknown>;
 request?: Request;
};

/**
 * Append-only audit trail. Writes must never break the user-facing operation, so
 * failures are logged (action name only, no PII) and swallowed.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
 try {
 const db = await getDb();
 await db.insert(auditEvents).values({
 id: newId(ID_PREFIXES.audit),
 userId: input.userId,
 actorType: input.actorType ?? "user",
 action: input.action,
 entityType: input.entityType ?? null,
 entityId: input.entityId ?? null,
 outcome: input.outcome ?? "success",
 metaJson: JSON.stringify(sanitizeAuditMeta(input.meta)),
 ipHash: input.request ? ipHashFromRequest(input.request) : null,
 createdAt: Date.now(),
 });
 } catch (error) {
 console.error(
 "[audit] failed to write record:",
 input.action,
 error instanceof Error ? error.message : "unknown",
 );
 }
}
