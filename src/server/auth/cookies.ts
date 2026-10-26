import { createHmac } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { clientIp } from "@/server/http/errors";

export const SESSION_COOKIE = "sc_session";
export const CSRF_COOKIE = "sc_csrf";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SECURE = () => getEnv().isProduction;

export function parseCookies(header: string | null): Map<string, string> {
 const out = new Map<string, string>();
 if (!header) return out;
 for (const part of header.split(";")) {
 const idx = part.indexOf("=");
 if (idx === -1) continue;
 const name = part.slice(0, idx).trim();
 const value = part.slice(idx + 1).trim();
 if (!name) continue;
 try {
 out.set(name, decodeURIComponent(value));
 } catch {
 out.set(name, value);
 }
 }
 return out;
}

export function sessionCookie(token: string, maxAgeSec: number): string {
 return [
 `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
 "Path=/",
 "HttpOnly",
 "SameSite=Lax",
 `Max-Age=${maxAgeSec}`,
 SECURE() ? "Secure" : "",
 ]
 .filter(Boolean)
 .join("; ");
}

/**
 * The CSRF cookie is intentionally readable by same-origin JavaScript
 * (double-submit pattern); the session cookie is HttpOnly.
 */
export function csrfCookie(token: string, maxAgeSec: number): string {
 return [
 `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
 "Path=/",
 "SameSite=Lax",
 `Max-Age=${maxAgeSec}`,
 SECURE() ? "Secure" : "",
 ]
 .filter(Boolean)
 .join("; ");
}

export function clearedAuthCookies(): string[] {
 return [
 `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${SECURE() ? "; Secure" : ""}`,
 `${CSRF_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${SECURE() ? "; Secure" : ""}`,
 ];
}

/** Keyed hashes keep pseudonymous IP/UA values from being brute-forced offline. */
function keyedFingerprint(value: string): string {
 return createHmac("sha256", getEnv().masterKey).update(value).digest("hex");
}

export function ipHashFromRequest(request: Request): string | null {
 const ip = clientIp(request);
 return ip ? keyedFingerprint(`ip:${ip}`) : null;
}

export function userAgentHashFromRequest(request: Request): string | null {
 const ua = request.headers.get("user-agent");
 return ua ? keyedFingerprint(`ua:${ua}`) : null;
}
