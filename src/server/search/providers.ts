import { createHash } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";

/**
 * Optional web-search providers for name / e-mail / phone lookups.
 *
 * There is deliberately no "mock" mode that fabricates accounts: when no key is
 * configured the API returns 503 and the UI explains how to enable a provider.
 */

export type WebSearchHit = {
 url: string;
 title: string;
 description: string;
};

export type ProviderStatus = {
 configured: boolean;
 name: string;
 label: string;
 message: string;
};

export function searchProviderStatus(): ProviderStatus {
 const provider = getEnv().providers.search;
 const name = provider.name.trim().toLowerCase();
 if ((name === "brave" || name === "tavily") && provider.apiKey) {
 return {
 configured: true,
 name,
 label: name === "brave" ? "Brave Search" : "Tavily",
 message: "Email, full name, and phone searches are enabled.",
 };
 }
 if (name === "test" && process.env.NODE_ENV !== "production") {
 return {
 configured: true,
 name: "test",
 label: "Test (development)",
 message: "Development/test mode: deterministic sample results. Never used in production.",
 };
 }
 if (name === "free" || name === "osint") {
 return {
 configured: true,
 name: "free",
 label: "Open source (free)",
 message: "Real open-source search limited to GitHub and Gravatar. Add Brave or Tavily for broader coverage.",
 };
 }
 return {
 configured: false,
 name: name || "none",
 label: "Provider not configured",
 message:
 "Set SC_SEARCH_PROVIDER=brave (or tavily) and SC_SEARCH_API_KEY to enable email, full name, and phone searches. Results are never fabricated.",
 };
}

function testHits(query: string, limit: number): WebSearchHit[] {
 const q = query.trim();
 const domains = ["linkedin.com", "github.com", "medium.com", "about.me"];
 return domains.slice(0, Math.min(limit, domains.length)).map((domain, index) => ({
 url: `https://www.${domain}/in/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
 title: `${q} — ${domain}`,
 description: `Test-mode result ${index + 1}: ${q} may appear on a public page.`,
 }));
}

async function freeOsintHits(query: string, limit: number): Promise<WebSearchHit[]> {
 const q = query.trim().replace(/^"(.*)"$/, "$1");
 const hits: WebSearchHit[] = [];
 const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q);
 const looksLikePhone = /^\+?[0-9][0-9\s().-]{6,19}$/.test(q);

 if (isEmail) {
 const hash = createHash("md5").update(q.toLowerCase()).digest("hex");
 try {
 const gravatar = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404&s=80`, {
 signal: AbortSignal.timeout(6_000),
 });
 if (gravatar.ok) {
 hits.push({
 url: `https://gravatar.com/${hash}`,
 title: `Gravatar profile — ${q}`,
 description: "Public Gravatar profile matched to this email address.",
 });
 }
 } catch {
 // ignore
 }
 }

 if (!isEmail && !looksLikePhone) {
 try {
 const response = await fetch(
 `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 10)}`,
 {
 signal: AbortSignal.timeout(8_000),
 headers: { Accept: "application/vnd.github+json", "User-Agent": "SocialCleaner/0.1" },
 },
 );
 if (response.ok) {
 const data = (await response.json()) as { items?: Array<{ login: string; html_url: string; type?: string }> };
 for (const item of data.items ?? []) {
 if (hits.length >= limit) break;
 hits.push({
 url: item.html_url,
 title: `GitHub — ${item.login}`,
 description: "Found in open-source GitHub user search (name match).",
 });
 }
 }
 } catch {
 // ignore
 }
 }

 return hits.slice(0, limit);
}

function notConfigured(): ApiError {
 return new ApiError(503, "PROVIDER_NOT_CONFIGURED", searchProviderStatus().message);
}

export async function searchWeb(query: string, limit = 20): Promise<WebSearchHit[]> {
 const provider = getEnv().providers.search;
 const name = provider.name.trim().toLowerCase();
 if (name === "test" && process.env.NODE_ENV !== "production") {
 return testHits(query, limit);
 }
 if (name === "free" || name === "osint") {
 return freeOsintHits(query, limit);
 }
 if (!provider.apiKey || (name !== "brave" && name !== "tavily")) throw notConfigured();

 if (name === "brave") {
 const url = new URL("https://api.search.brave.com/res/v1/web/search");
 url.searchParams.set("q", query);
 url.searchParams.set("count", String(Math.min(limit, 20)));
 url.searchParams.set("safesearch", "moderate");
 const response = await fetch(url, {
 signal: AbortSignal.timeout(12_000),
 headers: {
 accept: "application/json",
 "x-subscription-token": provider.apiKey,
 "user-agent": "SocialCleaner/0.1",
 },
 });
 if (!response.ok) {
 throw new ApiError(503, "PROVIDER_UNAVAILABLE", "The search provider is not responding right now.");
 }
 const data = (await response.json()) as {
 web?: { results?: Array<{ url?: string; title?: string; description?: string }> };
 };
 return (data.web?.results ?? [])
 .filter((item): item is { url: string; title?: string; description?: string } => typeof item.url === "string")
 .map((item) => ({
 url: item.url,
 title: (item.title ?? "").slice(0, 160),
 description: (item.description ?? "").slice(0, 300),
 }));
 }

 const response = await fetch("https://api.tavily.com/search", {
 method: "POST",
 signal: AbortSignal.timeout(12_000),
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 api_key: provider.apiKey,
 query,
 max_results: Math.min(limit, 20),
 search_depth: "basic",
 include_answer: false,
 }),
 });
 if (!response.ok) {
 throw new ApiError(503, "PROVIDER_UNAVAILABLE", "The search provider is not responding right now.");
 }
 const data = (await response.json()) as {
 results?: Array<{ url?: string; title?: string; content?: string }>;
 };
 return (data.results ?? [])
 .filter((item): item is { url: string; title?: string; content?: string } => typeof item.url === "string")
 .map((item) => ({
 url: item.url,
 title: (item.title ?? "").slice(0, 160),
 description: (item.content ?? "").slice(0, 300),
 }));
}

/** Prefix a field value so the provider looks for the exact quoted string. */
export function buildProviderQuery(fieldType: "email" | "name" | "phone", value: string): string {
 if (fieldType === "phone") {
 const digits = value.replace(/\D/g, "");
 return `"+${digits}" OR "${digits}"`;
 }
 return `"${value}"`;
}
