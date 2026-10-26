/**
 * Plan definitions and entitlement checks.
 *
 * Paid access is arranged manually while the product is free and open source, so price
 * fields are not rendered on public pages yet. Keep them for a future checkout.
 * Never trust the client: every limit is enforced in the API handlers.
 */

export const PLAN_IDS = ["free", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const SEARCH_FIELDS = ["username", "email", "name", "phone"] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number];

export const FIELD_LABELS: Record<SearchField, string> = {
 username: "Username",
 email: "Email",
 name: "Full name",
 phone: "Phone",
};

/**
 * Core consumer platforms available on the free plan. The UI renders every
 * other catalogue entry as Pro-only, and startSearch rejects locked ids so the
 * restriction cannot be bypassed by calling the API directly.
 */
export const FREE_CORE_PLATFORM_IDS = [
 "instagram",
 "x",
 "github",
 "tiktok",
 "youtube",
 "reddit",
 "facebook",
 "telegram",
] as const;

export type PlanLimits = {
 searchFields: SearchField[];
 maxPlatformsPerRun: number;
 runsPerDay: number;
 visibleResults: number;
 historyRuns: number;
 retentionDays: number;
 exportResults: boolean;
 monitoring: boolean;
 removalDrafts: boolean;
 /** `undefined` means every platform in the catalogue is available. */
 allowedPlatformIds?: readonly string[];
};

export type Plan = {
 id: PlanId;
 name: string;
 tagline: string;
 priceTryMonthly: number; // TRY minor units (1/100 TRY)
 priceTryYearly: number;
 priceUsdMonthly: number; // sent
 trialDays: number;
 limits: PlanLimits;
};

export const PLANS: Record<PlanId, Plan> = {
 free: {
 id: "free",
 name: "Free",
 tagline: "Start with your own usernames.",
 priceTryMonthly: 0,
 priceTryYearly: 0,
 priceUsdMonthly: 0,
 trialDays: 0,
 limits: {
 searchFields: ["username"],
 maxPlatformsPerRun: 8,
 runsPerDay: 3,
 visibleResults: 5,
 historyRuns: 10,
 retentionDays: 7,
 exportResults: false,
 monitoring: false,
 removalDrafts: false,
 allowedPlatformIds: FREE_CORE_PLATFORM_IDS,
 },
 },
 pro: {
 id: "pro",
 name: "Pro",
 tagline: "Username and full-name search, all results, longer history.",
 priceTryMonthly: 14_900,
 priceTryYearly: 129_000,
 priceUsdMonthly: 1000,
 trialDays: 7,
 limits: {
 searchFields: ["username", "email", "name", "phone"],
 maxPlatformsPerRun: 40,
 runsPerDay: 100,
 visibleResults: 40,
 historyRuns: 200,
 retentionDays: 90,
 exportResults: true,
 // Not shipped yet. Keep the entitlement false so no UI can accidentally sell them.
 monitoring: false,
 removalDrafts: false,
 },
 },
};

export function normalizePlan(raw: string | null | undefined): PlanId {
 return raw === "pro" ? "pro" : "free";
}

export function planForUser(user: { plan?: string | null }): Plan {
 return PLANS[normalizePlan(user.plan)];
}

export function planAllowsField(plan: Plan, field: SearchField): boolean {
 return plan.limits.searchFields.includes(field);
}

export function formatTry(kurus: number): string {
 return new Intl.NumberFormat("en-US", {
 style: "currency",
 currency: "TRY",
 currencyDisplay: "narrowSymbol",
 maximumFractionDigits: 0,
 }).format(kurus / 100);
}

export function formatUsd(cents: number): string {
 return new Intl.NumberFormat("en-US", {
 style: "currency",
 currency: "USD",
 currencyDisplay: "narrowSymbol",
 maximumFractionDigits: 0,
 }).format(cents / 100);
}

/** Client-safe plan summary (no server-only imports). */
export type PlanSummary = {
 id: PlanId;
 name: string;
 fields: SearchField[];
 maxPlatformsPerRun: number;
 runsPerDay: number;
 visibleResults: number;
 historyRuns: number;
 retentionDays: number;
 exportResults: boolean;
 monitoring: boolean;
 removalDrafts: boolean;
 allowedPlatformIds: string[] | null;
};

export function planSummary(plan: Plan): PlanSummary {
 return {
 id: plan.id,
 name: plan.name,
 fields: plan.limits.searchFields,
 maxPlatformsPerRun: plan.limits.maxPlatformsPerRun,
 runsPerDay: plan.limits.runsPerDay,
 visibleResults: plan.limits.visibleResults,
 historyRuns: plan.limits.historyRuns,
 retentionDays: plan.limits.retentionDays,
 exportResults: plan.limits.exportResults,
 monitoring: plan.limits.monitoring,
 removalDrafts: plan.limits.removalDrafts,
 allowedPlatformIds: plan.limits.allowedPlatformIds
 ? [...plan.limits.allowedPlatformIds]
 : null,
 };
}
