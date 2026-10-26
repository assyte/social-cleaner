import type { PlatformDefinition } from "@/server/search/platforms";

/**
 * Direct, polite probing of public profile URLs.
 *
 * Design rules:
 * - Only URLs constructed from the curated catalogue are fetched; the user
 * controls a handle that is URI-encoded, never a full URL.
 * - Redirects are not followed: a login/consent wall must not look like a hit.
 * - The page body is never stored. Only HTTP status, a boolean marker and the
 * <title> text are kept as evidence.
 * - Anything inconclusive is reported as `blocked`, never as "found".
 */

export type CheckOutcome = "found" | "not_found" | "blocked" | "error";

export type CheckEvidence = {
 httpStatus: number | null;
 method: "public_profile" | "public_api";
 marker: string | null;
 title: string | null;
 checkedAt: string;
};

export type CheckResult = {
 platformId: string;
 platformName: string;
 outcome: CheckOutcome;
 profileUrl: string;
 handle: string;
 confidence: number;
 verification: "verified" | "possible" | "none";
 evidence: CheckEvidence;
 error?: string;
};

export type FetchLike = typeof fetch;

const USER_AGENT = "SocialCleanerAudit/0.1 (+public-profile-check)";
/**
 * Some public profile pages only embed machine-readable profile data for a
 * mobile browser. This is still an unauthenticated public-page request; it
 * never sends cookies, never follows a login redirect and never solves a
 * challenge. If the page asks for a challenge we report `blocked`.
 */
const MOBILE_UA =
 "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const TIMEOUT_MS = 6000;
const TOTAL_TIMEOUT_MS = 35_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

class BodyTooLargeError extends Error {
 constructor() {
 super("Response body exceeded the safe limit");
 this.name = "BodyTooLargeError";
 }
}

/** Read at most 2 MB so one oversized platform page cannot exhaust worker memory. */
async function readLimitedText(response: Response): Promise<string> {
 const declared = Number(response.headers.get("content-length") ?? "0");
 if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new BodyTooLargeError();
 if (!response.body) return "";
 const reader = response.body.getReader();
 const chunks: Uint8Array[] = [];
 let total = 0;
 try {
 while (true) {
 const { done, value } = await reader.read();
 if (done) break;
 if (!value) continue;
 total += value.byteLength;
 if (total > MAX_BODY_BYTES) {
 await reader.cancel().catch(() => undefined);
 throw new BodyTooLargeError();
 }
 chunks.push(value);
 }
 } finally {
 reader.releaseLock();
 }
 const merged = new Uint8Array(total);
 let offset = 0;
 for (const chunk of chunks) {
 merged.set(chunk, offset);
 offset += chunk.byteLength;
 }
 return new TextDecoder().decode(merged);
}

function buildProfileUrl(platform: PlatformDefinition, handle: string): string {
 const fn = platform.check?.profileUrl ?? platform.profileUrl;
 if (!fn) throw new Error(`${platform.id} does not have a profile URL defined`);
 return fn(handle);
}

function cleanTitle(html: string): string | null {
 const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
 if (!match?.[1]) return null;
 const decoded = match[1]
 .replace(/&amp;/g, "&")
 .replace(/&lt;/g, "<")
 .replace(/&gt;/g, ">")
 .replace(/&quot;/g, '"')
 .replace(/&#x27;|&#39;/g, "'")
 .replace(/&#x2F;/g, "/")
 .replace(/[\u0000-\u001f\u007f]/g, " ")
 .replace(/\s+/g, " ")
 .trim();
 return decoded ? decoded.slice(0, 160) : null;
}

function evidence(
 httpStatus: number | null,
 method: CheckEvidence["method"],
 marker: string | null,
 title: string | null,
): CheckEvidence {
 return { httpStatus, method, marker, title, checkedAt: new Date().toISOString() };
}

function classifyBlocked(status: number): boolean {
 return status === 401 || status === 403 || status === 429 || (status >= 300 && status < 400);
}

function matchesMarker(haystack: string, marker: string, handle: string, caseInsensitive: boolean): boolean {
 const rendered = marker.replaceAll("{handle}", handle);
 if (caseInsensitive) {
 return haystack.toLowerCase().includes(rendered.toLowerCase());
 }
 return haystack.includes(rendered);
}

export async function checkPlatform(
 platform: PlatformDefinition,
 handle: string,
 fetchImpl: FetchLike = fetch,
 signal?: AbortSignal,
): Promise<CheckResult> {
 const requestUrl = buildProfileUrl(platform, handle);
 // Some adapters fetch an API/XML endpoint; the user-facing evidence link must
 // stay the human-readable public profile.
 const profileUrl = platform.profileUrl?.(handle) ?? requestUrl;
 const base = {
 platformId: platform.id,
 platformName: platform.name,
 profileUrl,
 handle,
 confidence: 0,
 verification: "none" as const,
 };

 const check = platform.check;
 if (!check) {
 return {
 ...base,
 outcome: "error",
 evidence: evidence(null, "public_profile", null, null),
 error: "platform_not_checkable",
 };
 }

 try {
 const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
 const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
 const response = await fetchImpl(requestUrl, {
 method: "GET",
 redirect: "manual",
 signal: requestSignal,
 headers: {
 "user-agent": check.userAgent === "mobile" ? MOBILE_UA : USER_AGENT,
 accept: "text/html,application/json;q=0.9,*/*;q=0.8",
 "accept-language": "en-US,en;q=0.9",
 },
 });

 const status = response.status;
 const method: CheckEvidence["method"] = check.kind === "json_array" ? "public_api" : "public_profile";

 if (check.kind === "status") {
 if (check.notFoundStatus.includes(status)) {
 return { ...base, outcome: "not_found", evidence: evidence(status, method, null, null) };
 }
 if (check.okStatus.includes(status)) {
 return {
 ...base,
 outcome: "found",
 confidence: check.confidence ?? 92,
 verification: check.verification ?? "verified",
 evidence: evidence(status, method, "http_ok", null),
 };
 }
 return {
 ...base,
 outcome: classifyBlocked(status) ? "blocked" : "error",
 evidence: evidence(status, method, null, null),
 };
 }

 if (check.kind === "json_array") {
 if (status === 404) {
 return { ...base, outcome: "not_found", evidence: evidence(status, method, null, null) };
 }
 if (status !== 200) {
 return {
 ...base,
 outcome: classifyBlocked(status) ? "blocked" : "error",
 evidence: evidence(status, method, null, null),
 };
 }
 const data: unknown = JSON.parse(await readLimitedText(response));
 const list = Array.isArray(data) ? data : [];
 const hit = list.find((item) => {
 if (!item || typeof item !== "object") return false;
 const value = (item as Record<string, unknown>)[check.usernameField];
 return typeof value === "string" && value.toLowerCase() === handle.toLowerCase();
 });
 if (hit) {
 const name = (hit as Record<string, unknown>).name;
 return {
 ...base,
 outcome: "found",
 confidence: check.confidence ?? 90,
 verification: check.verification ?? "verified",
 evidence: evidence(status, method, "api_username_match", typeof name === "string" ? name.slice(0, 160) : null),
 };
 }
 return { ...base, outcome: "not_found", evidence: evidence(status, method, "api_empty", null) };
 }

 // Marker checks need the page text.
 if (status === 404) {
 return { ...base, outcome: "not_found", evidence: evidence(status, method, null, null) };
 }
 if (status !== 200) {
 return {
 ...base,
 outcome: classifyBlocked(status) ? "blocked" : "error",
 evidence: evidence(status, method, null, null),
 };
 }

 const html = await readLimitedText(response);
 const title = cleanTitle(html);
 const found = check.foundMarkers?.find((marker) =>
 matchesMarker(html, marker, handle, Boolean(check.caseInsensitive)),
 );
 if (found) {
 return {
 ...base,
 outcome: "found",
 confidence: check.confidence ?? 88,
 verification: check.verification ?? "verified",
 evidence: evidence(status, method, found.replaceAll("{handle}", handle), title),
 };
 }
 const missing = check.notFoundMarkers?.find((marker) =>
 matchesMarker(html, marker, handle, Boolean(check.caseInsensitive)),
 );
 if (missing) {
 return {
 ...base,
 outcome: "not_found",
 evidence: evidence(status, method, missing.replaceAll("{handle}", handle), title),
 };
 }
 if (check.foundMarkerRequired) {
 return {
 ...base,
 outcome: check.unknownOutcome === "blocked" ? "blocked" : "not_found",
 confidence: check.unknownOutcome === "blocked" ? 0 : 70,
 evidence: evidence(status, method, "found_marker_absent", title),
 };
 }
 // 200 with no explicit absence marker: the profile is treated as present.
 return {
 ...base,
 outcome: "found",
 confidence: check.confidence ?? 80,
 verification: check.verification ?? "possible",
 evidence: evidence(status, method, "http_ok_no_absence_marker", title),
 };
 } catch (error) {
 const message = error instanceof Error ? error.name : "unknown";
 return {
 ...base,
 outcome: "error",
 evidence: evidence(null, check.kind === "json_array" ? "public_api" : "public_profile", null, null),
 error: message === "TimeoutError" ? "timeout" : message === "AbortError" ? "timeout" : message === "BodyTooLargeError" ? "body_too_large" : "network_error",
 };
 }
}

/** Run checks with a small concurrency limit so no platform is hammered. */
export async function checkPlatforms(
 platforms: PlatformDefinition[],
 handle: string,
 options: { fetchImpl?: FetchLike; concurrency?: number; totalTimeoutMs?: number } = {},
): Promise<CheckResult[]> {
 const fetchImpl = options.fetchImpl ?? fetch;
 const concurrency = Math.max(1, Math.min(options.concurrency ?? 8, 10));
 const totalTimeoutMs = Math.max(1000, options.totalTimeoutMs ?? TOTAL_TIMEOUT_MS);
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), totalTimeoutMs);
 const results: CheckResult[] = [];
 let index = 0;

 async function worker(): Promise<void> {
 while (index < platforms.length) {
 const current = platforms[index++];
 if (!current) return;
 results.push(await checkPlatform(current, handle, fetchImpl, controller.signal));
 }
 }

 try {
 await Promise.all(Array.from({ length: Math.min(concurrency, platforms.length) }, worker));
 } finally {
 clearTimeout(timer);
 }
 return results;
}
