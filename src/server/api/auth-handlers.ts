import { ApiError, handleApi, jsonResponse, noContent, readJson } from "@/server/http/errors";
import { assertCsrf, assertSameOrigin } from "@/server/auth/guard";
import {
 CSRF_COOKIE,
 SESSION_COOKIE,
 SESSION_TTL_MS,
 clearedAuthCookies,
 csrfCookie,
 parseCookies,
 sessionCookie,
} from "@/server/auth/cookies";
import { findSessionByToken, revokeSession } from "@/server/auth/session";
import { loginAccount, registerAccount, toPublicUser } from "@/server/auth/service";
import { loginSchema, registerSchema } from "@/server/auth/schemas";
import { sha256Hex, secretsEqual } from "@/server/crypto/tokens";
import { limitByAccount, limitByIp } from "@/server/api/limits";
import { recordAudit } from "@/server/audit/log";
import { blindIndex } from "@/server/crypto/blind-index";
import { normalizeEmail } from "@/server/security/canonical";

function withAuthCookies(headers: Headers, token: string, csrfToken: string): Headers {
 const maxAge = Math.floor(SESSION_TTL_MS / 1000);
 headers.append("Set-Cookie", sessionCookie(token, maxAge));
 headers.append("Set-Cookie", csrfCookie(csrfToken, maxAge));
 return headers;
}

export function registerRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 assertSameOrigin(request);
 limitByIp(request, "register", 5, 60 * 60 * 1000);

 const input = await readJson(request, registerSchema);
 limitByAccount(sha256Hex(`email:${blindIndex("email", normalizeEmail(input.email))}`), "register", 3, 60 * 60 * 1000);

 const result = await registerAccount(input, request);
 const headers = withAuthCookies(new Headers(), result.token, result.csrfToken);
 return jsonResponse({ user: result.user, csrfToken: result.csrfToken }, { status: 201, headers });
 });
}

export function loginRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 assertSameOrigin(request);
 limitByIp(request, "login", 20, 60 * 1000);

 const input = await readJson(request, loginSchema);
 const emailKey = sha256Hex(`email:${blindIndex("email", normalizeEmail(input.email))}`);
 limitByAccount(emailKey, "login", 10, 15 * 60 * 1000);

 const result = await loginAccount(input, request);
 const headers = withAuthCookies(new Headers(), result.token, result.csrfToken);
 return jsonResponse({ user: result.user, csrfToken: result.csrfToken }, { status: 200, headers });
 });
}

export function logoutRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const cookies = parseCookies(request.headers.get("cookie"));
 const authed = await findSessionByToken(cookies.get(SESSION_COOKIE));
 if (authed) {
 try {
 assertSameOrigin(request);
 await assertCsrf(request, authed);
 await revokeSession(authed.session.id);
 await recordAudit({ userId: authed.user.id, action: "auth.logout", request });
 } catch (error) {
 // Cookies are cleared even when a stale/missing CSRF token prevents the
 // server-side revoke; otherwise the login page can redirect straight back.
 if (!(error instanceof ApiError) || error.code !== "CSRF_FAILED") throw error;
 }
 }
 const headers = new Headers();
 for (const cookie of clearedAuthCookies()) headers.append("Set-Cookie", cookie);
 return noContent({ headers });
 });
}

export function sessionRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const cookies = parseCookies(request.headers.get("cookie"));
 const authed = await findSessionByToken(cookies.get(SESSION_COOKIE));
 if (!authed) {
 throw new ApiError(401, "UNAUTHENTICATED", "Session not found");
 }
 const csrfValue = cookies.get(CSRF_COOKIE);
 const csrfToken =
 csrfValue && secretsEqual(sha256Hex(csrfValue), authed.session.csrfHash) ? csrfValue : null;
 return jsonResponse({
 user: toPublicUser(authed.user),
 csrfToken,
 expiresAt: authed.session.expiresAt,
 });
 });
}
