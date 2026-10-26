import { handleApi, jsonResponse, noContent, notFound, readJson } from "@/server/http/errors";
import { requireMutationAuth, requireSession } from "@/server/auth/guard";
import { enforceRateLimit, limitMutation } from "@/server/api/limits";
import { ID_PREFIXES, isValidId } from "@/server/ids";
import { planForUser, planSummary } from "@/server/billing/plans";
import { publicPlatforms } from "@/server/search/platforms";
import { searchProviderStatus } from "@/server/search/providers";
import { searchRequestSchema } from "@/server/search/schemas";
import {
 deleteSearch,
 getSearch,
 getSearchUsage,
 listSearches,
 startSearch,
} from "@/server/search/service";

function assertSearchId(id: string): void {
 if (!isValidId(id, ID_PREFIXES.searchRun)) throw notFound("Search not found");
}

export function getSearchPlatformsRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 const plan = planForUser(authed.user);
 const usage = await getSearchUsage(authed.user.id, plan);
 return jsonResponse({
 platforms: publicPlatforms(),
 plan: planSummary(plan),
 usage,
 provider: searchProviderStatus(),
 limits: {
 maxPlatformsPerRun: plan.limits.maxPlatformsPerRun,
 visibleResults: plan.limits.visibleResults,
 },
 });
 });
}

export function createSearchRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 enforceRateLimit(`search:${authed.user.id}`, 10, 60_000);
 const input = await readJson(request, searchRequestSchema);
 const run = await startSearch(authed.user, input, request);
 return jsonResponse(run, { status: 201 });
 });
}

export function listSearchesRoute(request: Request): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 const plan = planForUser(authed.user);
 const [runs, usage] = await Promise.all([
 listSearches(authed.user.id, plan),
 getSearchUsage(authed.user.id, plan),
 ]);
 return jsonResponse({ runs, plan: planSummary(plan), usage });
 });
}

export function getSearchRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireSession(request);
 assertSearchId(id);
 const plan = planForUser(authed.user);
 return jsonResponse(await getSearch(authed.user.id, id, plan));
 });
}

export function deleteSearchRoute(request: Request, id: string): Promise<Response> {
 return handleApi(async () => {
 const authed = await requireMutationAuth(request);
 limitMutation(authed.user.id);
 assertSearchId(id);
 await deleteSearch(authed.user.id, id, request);
 return noContent();
 });
}
