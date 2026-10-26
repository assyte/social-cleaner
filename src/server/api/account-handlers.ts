import { ApiError, handleApi, jsonResponse, noContent, readJson } from "@/server/http/errors";
import { requireMutationAuth, requireSession } from "@/server/auth/guard";
import { limitMutation, enforceRateLimit } from "@/server/api/limits";
import { verifyUserPassword } from "@/server/auth/service";
import { clearedAuthCookies } from "@/server/auth/cookies";
import { deleteUserAccount, exportUserData, listAuditEvents } from "@/server/vault/service";
import { deleteAccountSchema } from "@/server/vault/schemas";
import { recordAudit } from "@/server/audit/log";

export function exportAccountRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 enforceRateLimit(`export:${authed.user.id}`, 5, 60 * 60 * 1000);

 // Written before reading so the export itself is part of the exported trail.
 await recordAudit({
 userId: authed.user.id,
 action: "account.export",
 entityType: "user",
 entityId: authed.user.id,
 request,
 });

 const payload = await exportUserData(authed.user.id);

 const filename = `social-cleaner-export-${new Date().toISOString().slice(0, 10)}.json`;
 const headers = new Headers({
 "Content-Type": "application/json; charset=utf-8",
 "Content-Disposition": `attachment; filename="${filename}"`,
 "Cache-Control": "no-store",
 });
 return new Response(JSON.stringify(payload, null, 2), { status: 200, headers });
 });
}

export function deleteAccountRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 const input = await readJson(request, deleteAccountSchema);

 const passwordOk = await verifyUserPassword(authed.user.id, input.password);
 if (!passwordOk) {
 await recordAudit({
 userId: authed.user.id,
 action: "account.delete",
 outcome: "denied",
 meta: { reason: "bad_password" },
 request,
 });
 throw new ApiError(403, "INVALID_CREDENTIALS", "Password could not be verified");
 }

 await deleteUserAccount(authed.user.id, request);
 const headers = new Headers();
 for (const cookie of clearedAuthCookies()) headers.append("Set-Cookie", cookie);
 return noContent({ headers });
 });
}

export function auditLogRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 const url = new URL(request.url);
 const rawLimit = Number(url.searchParams.get("limit") ?? "50");
 const rawCursor = Number(url.searchParams.get("cursor") ?? "0");
 const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;
 const cursor = Number.isFinite(rawCursor) && rawCursor > 0 ? Math.trunc(rawCursor) : undefined;
 return jsonResponse(await listAuditEvents(authed.user.id, limit, cursor));
 });
}
