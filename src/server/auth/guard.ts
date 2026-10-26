import { getEnv } from "@/server/config/env";
import { secretsEqual, sha256Hex } from "@/server/crypto/tokens";
import { ApiError, forbidden, unauthorized } from "@/server/http/errors";
import { CSRF_COOKIE, SESSION_COOKIE, parseCookies } from "@/server/auth/cookies";
import { findSessionByToken, type AuthedSession } from "@/server/auth/session";

export async function requireSession(request: Request): Promise<AuthedSession> {
 const cookies = parseCookies(request.headers.get("cookie"));
 const token = cookies.get(SESSION_COOKIE);
 const authed = await findSessionByToken(token);
 if (!authed) throw unauthorized();
 return authed;
}

export function assertSameOrigin(request: Request): void {
 const expected = new URL(getEnv().appUrl).origin;
 const origin = request.headers.get("origin");
 if (origin && origin !== expected) {
 throw forbidden("CSRF_FAILED", "Request origin could not be verified");
 }
 const site = request.headers.get("sec-fetch-site");
 if (site && site !== "same-origin" && site !== "none") {
 throw forbidden("CSRF_FAILED", "Request origin could not be verified");
 }
}

/**
 * Double-submit CSRF:
 * - the `sc_csrf` cookie must equal the `x-csrf-token` header (so a cross-site
 * attacker who cannot read the cookie cannot forge the header),
 * - the header must hash to the value bound to the session at login.
 * A stolen cookie alone is therefore not enough, and a stolen token cannot be
 * used from another origin.
 */
export async function assertCsrf(request: Request, authed: AuthedSession): Promise<void> {
 const header = request.headers.get("x-csrf-token");
 const cookie = parseCookies(request.headers.get("cookie")).get(CSRF_COOKIE);
 if (!header || !cookie || !secretsEqual(header, cookie)) {
 throw forbidden("CSRF_FAILED", "CSRF validation failed");
 }
 if (!secretsEqual(sha256Hex(header), authed.session.csrfHash)) {
 throw forbidden("CSRF_FAILED", "CSRF validation failed");
 }
}

export async function requireMutationAuth(request: Request): Promise<AuthedSession> {
 assertSameOrigin(request);
 const authed = await requireSession(request);
 await assertCsrf(request, authed);
 return authed;
}

export function assertOwner(resourceUserId: string | null | undefined, currentUserId: string): void {
 if (!resourceUserId || resourceUserId !== currentUserId) {
 // 404 instead of 403: do not reveal that someone else's record exists.
 throw new ApiError(404, "NOT_FOUND", "Record not found");
 }
}
