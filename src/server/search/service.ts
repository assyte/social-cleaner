import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
 identityProfiles,
 searchResults,
 searchRuns,
 type SearchResultRow,
 type SearchRunRow,
} from "@/server/db/schema";
import { ApiError, badRequest, forbidden, notFound } from "@/server/http/errors";
import { newId, ID_PREFIXES } from "@/server/ids";
import { encryptField } from "@/server/crypto/field-cipher";
import { maskSensitive } from "@/server/security/masking";
import { recordAudit } from "@/server/audit/log";
import {
 planForUser,
 planAllowsField,
 planSummary,
 type Plan,
 type PlanSummary,
 type SearchField,
} from "@/server/billing/plans";
import {
 PLATFORMS,
 getPlatform,
 normalizeHandle,
 type PlatformDefinition,
} from "@/server/search/platforms";
import { checkPlatforms, type CheckResult } from "@/server/search/checker";
import { buildProviderQuery, searchProviderStatus, searchWeb, type WebSearchHit } from "@/server/search/providers";
import { validateSearchQuery, type SearchRequestInput } from "@/server/search/schemas";

export type SearchResultView = {
 id: string;
 platformId: string;
 platformName: string;
 platformIcon: string;
 platformColor: string;
 domain: string;
 profileUrl: string;
 handle: string;
 confidence: number;
 verification: string;
 evidence: Record<string, unknown>;
};

export type PlatformOutcomeStatus =
 | "found"
 | "not_found"
 | "blocked"
 | "unsupported"
 | "error";

export type PlatformOutcomeView = {
 platformId: string;
 platformName: string;
 platformIcon: string;
 platformColor: string;
 domain: string;
 profileUrl: string;
 status: PlatformOutcomeStatus;
 /** direct = live probe, provider = search-provider mention, manual = link only. */
 method: "direct" | "provider" | "manual";
 verification: "verified" | "possible" | "mention" | "none";
 confidence: number;
 evidence: Record<string, unknown>;
 /** True when the result exists but its profile link is withheld by the current plan. */
 hidden?: boolean;
 error?: string;
};

export type SearchRunView = {
 id: string;
 fieldType: SearchField;
 queryMasked: string;
 status: string;
 createdAt: number;
 finishedAt: number | null;
 checkedCount: number;
 foundCount: number;
 hiddenCount: number;
 blockedCount: number;
 errorCount: number;
 visibleResults: number;
 results: SearchResultView[];
 /** One row for every selected platform, including negative outcomes. */
 outcomes: PlatformOutcomeView[];
 plan: PlanSummary;
};

export type SearchRunSummary = Omit<SearchRunView, "results" | "outcomes" | "plan">;

export type SearchUsage = {
 usedToday: number;
 runsPerDay: number;
 remainingToday: number;
};

async function assertOwnershipDeclared(userId: string): Promise<void> {
 const db = await getDb();
 const rows = await db
 .select({ ownerDeclared: identityProfiles.ownerDeclared })
 .from(identityProfiles)
 .where(eq(identityProfiles.userId, userId))
 .limit(1);
 if (!rows[0]?.ownerDeclared) {
 throw forbidden(
 "OWNERSHIP_NOT_DECLARED",
 "Declare ownership in the Identity Vault before running a search.",
 );
 }
}

function startOfToday(): number {
 const date = new Date();
 date.setHours(0, 0, 0, 0);
 return date.getTime();
}

export async function getSearchUsage(userId: string, plan: Plan): Promise<SearchUsage> {
 const db = await getDb();
 const rows = await db
 .select({ value: sql<number>`count(*)` })
 .from(searchRuns)
 .where(and(eq(searchRuns.userId, userId), gte(searchRuns.createdAt, startOfToday())));
 const usedToday = Number(rows[0]?.value ?? 0);
 return {
 usedToday,
 runsPerDay: plan.limits.runsPerDay,
 remainingToday: Math.max(0, plan.limits.runsPerDay - usedToday),
 };
}

function resolvePlatforms(ids: string[]): PlatformDefinition[] {
 const unique = [...new Set(ids)];
 const resolved: PlatformDefinition[] = [];
 for (const id of unique) {
 const platform = getPlatform(id);
 if (!platform) throw badRequest(`Unknown platform: ${id}`);
 resolved.push(platform);
 }
 return resolved;
}

async function markFailed(runId: string, code: string): Promise<void> {
 const db = await getDb();
 await db
 .update(searchRuns)
 .set({ status: "failed", errorCode: code, finishedAt: Date.now() })
 .where(eq(searchRuns.id, runId))
 .catch(() => undefined);
}

function hostMatches(hostname: string, domain: string): boolean {
 const host = hostname.toLowerCase().replace(/^www\./, "");
 const target = domain.toLowerCase();
 return host === target || host.endsWith(`.${target}`);
}

/** Keep provider costs bounded even when a Pro user selects all 40 platforms. */
const MAX_PROVIDER_USERNAME_LOOKUPS = 10;

function platformBase(platform: PlatformDefinition, handle: string) {
 return {
 platformId: platform.id,
 platformName: platform.name,
 platformIcon: platform.icon,
 platformColor: platform.color,
 domain: platform.domain,
 profileUrl: platform.profileUrl?.(handle) ?? `https://${platform.domain}`,
 };
}

function outcomeFromCheck(platform: PlatformDefinition, check: CheckResult): PlatformOutcomeView {
 return {
 ...platformBase(platform, check.handle),
 status: check.outcome === "found" ? "found" : check.outcome,
 method: "direct",
 verification: check.verification,
 confidence: check.confidence,
 profileUrl: check.profileUrl,
 evidence: check.evidence as unknown as Record<string, unknown>,
 ...(check.error ? { error: check.error } : {}),
 };
}

function manualOutcome(platform: PlatformDefinition, handle: string): PlatformOutcomeView {
 return {
 ...platformBase(platform, handle),
 status: "unsupported",
 method: "manual",
 verification: "none",
 confidence: 0,
 evidence: {
 httpStatus: null,
 method: "manual",
 marker: "provider_not_configured",
 title: null,
 checkedAt: new Date().toISOString(),
 },
 };
}

function isExactProfileUrl(platform: PlatformDefinition, handle: string, rawUrl: string): boolean {
 const expected = platform.profileUrl?.(handle);
 if (!expected) return false;
 try {
 const actual = new URL(rawUrl);
 const target = new URL(expected);
 if (!hostMatches(actual.hostname, platform.domain)) return false;
 const normalize = (path: string) => path.toLowerCase().replace(/\/+$/, "") || "/";
 return normalize(actual.pathname) === normalize(target.pathname);
 } catch {
 return false;
 }
}

async function providerLookup(
 platform: PlatformDefinition,
 handle: string,
): Promise<{ outcome: PlatformOutcomeView; hit: WebSearchHit | null }> {
 const manual = platformBase(platform, handle);
 try {
 const hits = await searchWeb(`site:${platform.domain} "${handle}"`, 6);
 const hit = hits.find((item) => isExactProfileUrl(platform, handle, item.url)) ?? null;
 if (hit) {
 return {
 outcome: {
 ...manual,
 profileUrl: hit.url,
 status: "found",
 method: "provider",
 verification: "mention",
 confidence: 55,
 evidence: {
 httpStatus: null,
 method: "web_search",
 marker: "exact_profile_url",
 title: hit.title || null,
 checkedAt: new Date().toISOString(),
 },
 },
 hit,
 };
 }
 return {
 outcome: {
 ...manual,
 status: "not_found",
 method: "provider",
 verification: "none",
 confidence: 0,
 evidence: {
 httpStatus: null,
 method: "web_search",
 marker: "provider_no_exact_profile",
 title: null,
 checkedAt: new Date().toISOString(),
 },
 },
 hit: null,
 };
 } catch (error) {
 return {
 outcome: {
 ...manual,
 status: "error",
 method: "provider",
 verification: "none",
 confidence: 0,
 evidence: {
 httpStatus: null,
 method: "web_search",
 marker: "provider_error",
 title: null,
 checkedAt: new Date().toISOString(),
 },
 error: error instanceof ApiError ? error.code : "PROVIDER_ERROR",
 },
 hit: null,
 };
 }
}

function mapHitsToPlatforms(
 hits: WebSearchHit[],
 allowed: PlatformDefinition[],
): Array<{ hit: WebSearchHit; platform: PlatformDefinition }> {
 const byPlatform = new Map<string, { hit: WebSearchHit; platform: PlatformDefinition }>();
 for (const hit of hits) {
 let host: string;
 try {
 host = new URL(hit.url).hostname;
 } catch {
 continue;
 }
 const platform = allowed.find((p) => hostMatches(host, p.domain));
 if (!platform) continue;
 if (!byPlatform.has(platform.id)) byPlatform.set(platform.id, { hit, platform });
 }
 return [...byPlatform.values()];
}

function toResultView(row: SearchResultRow): SearchResultView {
 const platform = getPlatform(row.platformId);
 let evidence: Record<string, unknown> = {};
 try {
 const parsed: unknown = JSON.parse(row.evidenceJson);
 if (parsed && typeof parsed === "object") evidence = parsed as Record<string, unknown>;
 } catch {
 // Corrupted evidence must not break the result list.
 }
 return {
 id: row.id,
 platformId: row.platformId,
 platformName: row.platformName,
 platformIcon: platform?.icon ?? "",
 platformColor: platform?.color ?? "#525252",
 domain: platform?.domain ?? "",
 profileUrl: row.profileUrl,
 handle: row.handle,
 confidence: row.confidence,
 verification: row.verification,
 evidence,
 };
}

/**
 * Free-plan visibility is enforced on the response, not only in the renderer.
 * A hidden result must not leak its profile URL or page title through the
 * coverage panel or a direct API call.
 */
function hideLockedOutcomes(
 outcomes: PlatformOutcomeView[],
 visibleResults: Array<{ platformId: string }>,
): PlatformOutcomeView[] {
 const visibleIds = new Set(visibleResults.map((result) => result.platformId));
 return outcomes.map((outcome) => {
 if (outcome.status !== "found" || visibleIds.has(outcome.platformId)) return outcome;
 const platform = getPlatform(outcome.platformId);
 return {
 ...outcome,
 hidden: true,
 profileUrl: platform ? `https://${platform.domain}` : "",
 confidence: 0,
 verification: "none",
 evidence: {
 httpStatus: null,
 method: "manual",
 marker: "plan_limit",
 title: null,
 checkedAt: new Date().toISOString(),
 },
 };
 });
}

function parseOutcomes(raw: string | null | undefined): PlatformOutcomeView[] {
 if (!raw) return [];
 try {
 const parsed: unknown = JSON.parse(raw);
 if (!Array.isArray(parsed)) return [];
 return parsed.filter(
 (item): item is PlatformOutcomeView =>
 Boolean(item) &&
 typeof item === "object" &&
 typeof (item as PlatformOutcomeView).platformId === "string" &&
 typeof (item as PlatformOutcomeView).status === "string",
 );
 } catch {
 return [];
 }
}

function toRunSummary(row: SearchRunRow, plan: Plan): SearchRunSummary {
 return {
 id: row.id,
 fieldType: row.fieldType as SearchField,
 queryMasked: row.queryMasked,
 status: row.status,
 createdAt: row.createdAt,
 finishedAt: row.finishedAt,
 checkedCount: row.checkedCount,
 foundCount: row.foundCount,
 hiddenCount: Math.max(0, row.foundCount - plan.limits.visibleResults),
 blockedCount: row.blockedCount,
 errorCount: row.errorCount,
 visibleResults: Math.min(row.foundCount, plan.limits.visibleResults),
 };
}

function maskedQuery(fieldType: SearchField, query: string): string {
 if (fieldType === "username") return query;
 return maskSensitive(query, fieldType);
}

export async function startSearch(
 user: { id: string; plan?: string | null },
 input: SearchRequestInput,
 request: Request,
): Promise<SearchRunView> {
 const plan = planForUser(user);
 if (!planAllowsField(plan, input.fieldType)) {
 throw forbidden(
 "PLAN_REQUIRED",
 input.fieldType === "username"
 ? "This search type is available on the Pro plan."
 : "Email, full name, and phone searches are available on the Pro plan.",
 );
 }
 await assertOwnershipDeclared(user.id);

 const usage = await getSearchUsage(user.id, plan);
 if (usage.remainingToday <= 0) {
 throw new ApiError(429, "QUOTA_EXCEEDED", "You have reached today's search limit.", {
 runsPerDay: usage.runsPerDay,
 usedToday: usage.usedToday,
 });
 }

 let query: string;
 try {
 query = validateSearchQuery(input.fieldType, input.query);
 } catch (error) {
 throw badRequest(error instanceof Error ? error.message : "Invalid search value.");
 }

 let handle = "";
 let platforms: PlatformDefinition[] = [];

 if (input.fieldType === "username") {
 try {
 handle = normalizeHandle(query);
 } catch (error) {
 throw new ApiError(400, "INVALID_HANDLE", error instanceof Error ? error.message : "Invalid username.");
 }
 if (input.platforms.length === 0) {
 throw badRequest("Select at least one platform.");
 }
 platforms = resolvePlatforms(input.platforms);
 if (platforms.length > plan.limits.maxPlatformsPerRun) {
 throw new ApiError(400, "PLATFORM_LIMIT", `The ${plan.id === "pro" ? "Pro" : "Free"} plan allows up to ${plan.limits.maxPlatformsPerRun} platforms per scan.`);
 }
 const allowedPlatformIds = plan.limits.allowedPlatformIds;
 if (allowedPlatformIds) {
 const locked = platforms.filter((platform) => !allowedPlatformIds.includes(platform.id));
 if (locked.length > 0) {
 throw forbidden(
 "PLAN_REQUIRED",
 `${locked[0]?.name ?? "This platform"} is available on the Pro plan.`,
 );
 }
 }
 } else {
 const provider = searchProviderStatus();
 if (!provider.configured) {
 throw new ApiError(503, "PROVIDER_NOT_CONFIGURED", provider.message);
 }
 const requested = resolvePlatforms(input.platforms.filter((id) => Boolean(getPlatform(id)?.check)));
 platforms = requested.length > 0 ? requested : [];
 }

 const db = await getDb();
 const runId = newId(ID_PREFIXES.searchRun);
 const now = Date.now();
 const queryMasked = maskedQuery(input.fieldType, input.fieldType === "username" ? handle : query);

 await db.insert(searchRuns).values({
 id: runId,
 userId: user.id,
 fieldType: input.fieldType,
 queryEnc: encryptField(query, "search_runs.query"),
 queryMasked,
 status: "running",
 platformIdsJson: JSON.stringify(platforms.map((p) => p.id)),
 createdAt: now,
 });

 let foundViews: SearchResultView[] = [];
 let outcomes: PlatformOutcomeView[] = [];
 let checkedCount = 0;
 let blockedCount = 0;
 let errorCount = 0;

 try {
 if (input.fieldType === "username") {
 const provider = searchProviderStatus();
 let providerLookups = 0;
 const outcomeByPlatform = new Map<string, PlatformOutcomeView>();
 const directPlatforms = platforms.filter((platform) => platform.check);
 const fallbackPlatforms = platforms.filter((platform) => !platform.check);

 const checks = await checkPlatforms(directPlatforms, handle);
 for (const check of checks) {
 const platform = getPlatform(check.platformId);
 if (!platform) continue;
 let outcome = outcomeFromCheck(platform, check);

 // A login wall is not evidence of absence. If a search provider is
 // configured, try one exact-profile lookup before giving up; the
 // result stays a "mention", never a verified ownership claim.
 const providerCanSearchUsernames = provider.configured && (provider.name === "brave" || provider.name === "tavily");
 if (
 providerCanSearchUsernames &&
 (outcome.status === "blocked" || outcome.status === "error") &&
 providerLookups < MAX_PROVIDER_USERNAME_LOOKUPS
 ) {
 providerLookups += 1;
 const fallback = await providerLookup(platform, handle);
 if (fallback.outcome.status === "found") outcome = fallback.outcome;
 }
 outcomeByPlatform.set(platform.id, outcome);
 }

 for (const platform of fallbackPlatforms) {
 let outcome: PlatformOutcomeView;
 const providerCanSearchUsernames = provider.configured && (provider.name === "brave" || provider.name === "tavily");
 if (providerCanSearchUsernames && providerLookups < MAX_PROVIDER_USERNAME_LOOKUPS) {
 providerLookups += 1;
 outcome = (await providerLookup(platform, handle)).outcome;
 } else {
 outcome = manualOutcome(platform, handle);
 }
 outcomeByPlatform.set(platform.id, outcome);
 }

 outcomes = platforms.map(
 (platform) => outcomeByPlatform.get(platform.id) ?? manualOutcome(platform, handle),
 );
 checkedCount = outcomes.length;
 blockedCount = outcomes.filter((outcome) => outcome.status === "blocked").length;
 errorCount = outcomes.filter((outcome) => outcome.status === "error").length;

 const found = outcomes
 .filter((outcome) => outcome.status === "found")
 .sort((a, b) => b.confidence - a.confidence);

 if (found.length > 0) {
 const values = found.map((outcome) => {
 const platform = getPlatform(outcome.platformId);
 return {
 id: newId(ID_PREFIXES.searchResult),
 runId,
 platformId: outcome.platformId,
 platformName: outcome.platformName,
 profileUrl: outcome.profileUrl,
 handle,
 confidence: outcome.confidence,
 verification: outcome.verification,
 evidenceJson: JSON.stringify({ ...outcome.evidence, icon: platform?.icon ?? null }),
 createdAt: Date.now(),
 };
 });
 await db.insert(searchResults).values(values);
 const rows = await db
 .select()
 .from(searchResults)
 .where(eq(searchResults.runId, runId))
 .orderBy(desc(searchResults.confidence));
 foundViews = rows.map(toResultView);
 }
 } else {
 const queryForProvider = buildProviderQuery(
 input.fieldType as "email" | "name" | "phone",
 query,
 );
 const hits = await searchWeb(queryForProvider, 20);
 checkedCount = hits.length;
 const allowed = platforms.length > 0 ? platforms : PLATFORMS;
 const mapped = mapHitsToPlatforms(hits, allowed);
 const needle = query.toLowerCase();
 if (mapped.length > 0) {
 const values = mapped.map(({ hit, platform }) => {
 const haystack = `${hit.title} ${hit.description}`.toLowerCase();
 return {
 id: newId(ID_PREFIXES.searchResult),
 runId,
 platformId: platform.id,
 platformName: platform.name,
 profileUrl: hit.url,
 handle: queryMasked,
 confidence: haystack.includes(needle) ? 60 : 45,
 verification: "mention",
 evidenceJson: JSON.stringify({
 httpStatus: null,
 method: "web_search",
 marker: "search_result",
 title: hit.title || null,
 checkedAt: new Date().toISOString(),
 }),
 createdAt: Date.now(),
 };
 });
 await db.insert(searchResults).values(values);
 const rows = await db
 .select()
 .from(searchResults)
 .where(eq(searchResults.runId, runId))
 .orderBy(desc(searchResults.confidence));
 foundViews = rows.map(toResultView);
 }
 outcomes = foundViews.map((result) => ({
 platformId: result.platformId,
 platformName: result.platformName,
 platformIcon: result.platformIcon,
 platformColor: result.platformColor,
 domain: result.domain,
 profileUrl: result.profileUrl,
 status: "found",
 method: "provider",
 verification: "mention",
 confidence: result.confidence,
 evidence: result.evidence,
 }));
 }

 const foundCount = foundViews.length;
 const hiddenCount = Math.max(0, foundCount - plan.limits.visibleResults);
 await db
 .update(searchRuns)
 .set({
 status: "completed",
 checkedCount,
 foundCount,
 hiddenCount,
 blockedCount,
 errorCount,
 outcomesJson: JSON.stringify(outcomes),
 finishedAt: Date.now(),
 })
 .where(eq(searchRuns.id, runId));

 await recordAudit({
 userId: user.id,
 action: "search.run",
 entityType: "search_run",
 entityId: runId,
 meta: { field: input.fieldType, count: foundCount, platform: platforms.map((p) => p.id).slice(0, 20) },
 request,
 });

 const visibleResults = foundViews.slice(0, plan.limits.visibleResults);
 return {
 id: runId,
 fieldType: input.fieldType,
 queryMasked,
 status: "completed",
 createdAt: now,
 finishedAt: Date.now(),
 checkedCount,
 foundCount,
 hiddenCount,
 blockedCount,
 errorCount,
 visibleResults: plan.limits.visibleResults,
 results: visibleResults,
 outcomes: hideLockedOutcomes(outcomes, visibleResults),
 plan: planSummary(plan),
 };
 } catch (error) {
 const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
 await markFailed(runId, code);
 await recordAudit({
 userId: user.id,
 action: "search.run",
 entityType: "search_run",
 entityId: runId,
 outcome: "failure",
 meta: { field: input.fieldType, reason: code },
 request,
 });
 throw error;
 }
}

export async function listSearches(userId: string, plan: Plan): Promise<SearchRunSummary[]> {
 const db = await getDb();
 const rows = await db
 .select()
 .from(searchRuns)
 .where(eq(searchRuns.userId, userId))
 .orderBy(desc(searchRuns.createdAt))
 .limit(plan.limits.historyRuns);
 return rows.map((row) => toRunSummary(row, plan));
}

export async function getSearchTotals(
 userId: string
): Promise<{ totalScans: number; totalFound: number }> {
 const db = await getDb();
 const rows = await db
 .select({
 totalScans: sql<number>`count(*)`,
 totalFound: sql<number>`coalesce(sum(${searchRuns.foundCount}), 0)`,
 })
 .from(searchRuns)
 .where(eq(searchRuns.userId, userId));
 const row = rows[0];
 return {
 totalScans: Number(row?.totalScans ?? 0),
 totalFound: Number(row?.totalFound ?? 0),
 };
}

export async function getSearch(userId: string, id: string, plan: Plan): Promise<SearchRunView> {
 const db = await getDb();
 const rows = await db
 .select()
 .from(searchRuns)
 .where(and(eq(searchRuns.id, id), eq(searchRuns.userId, userId)))
 .limit(1);
 const run = rows[0];
 if (!run) throw notFound("Search not found");

 const results = await db
 .select()
 .from(searchResults)
 .where(eq(searchResults.runId, id))
 .orderBy(desc(searchResults.confidence));

 const storedOutcomes = parseOutcomes(run.outcomesJson);
 // Runs created before the coverage column existed only have positive rows.
 const outcomes =
 storedOutcomes.length > 0
 ? storedOutcomes
 : results.map((row) => {
 const view = toResultView(row);
 return {
 platformId: view.platformId,
 platformName: view.platformName,
 platformIcon: view.platformIcon,
 platformColor: view.platformColor,
 domain: view.domain,
 profileUrl: view.profileUrl,
 status: "found" as const,
 method: row.verification === "mention" ? ("provider" as const) : ("direct" as const),
 verification:
 row.verification === "mention"
 ? ("mention" as const)
 : row.verification === "possible"
 ? ("possible" as const)
 : ("verified" as const),
 confidence: view.confidence,
 evidence: view.evidence,
 };
 });

 const visibleResults = results.slice(0, plan.limits.visibleResults).map(toResultView);
 return {
 ...toRunSummary(run, plan),
 // Recompute against the *current* plan so an upgrade immediately reveals
 // previously hidden rows without rerunning the scan.
 hiddenCount: Math.max(0, run.foundCount - plan.limits.visibleResults),
 visibleResults: plan.limits.visibleResults,
 results: visibleResults,
 outcomes: hideLockedOutcomes(outcomes, visibleResults),
 plan: planSummary(plan),
 };
}

export async function deleteSearch(userId: string, id: string, request: Request): Promise<void> {
 const db = await getDb();
 const rows = await db
 .select({ id: searchRuns.id })
 .from(searchRuns)
 .where(and(eq(searchRuns.id, id), eq(searchRuns.userId, userId)))
 .limit(1);
 if (!rows[0]) throw notFound("Search not found");
 await db.delete(searchRuns).where(and(eq(searchRuns.id, id), eq(searchRuns.userId, userId)));
 await recordAudit({
 userId,
 action: "search.delete",
 entityType: "search_run",
 entityId: id,
 request,
 });
}
