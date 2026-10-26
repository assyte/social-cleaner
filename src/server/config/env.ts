import { z } from "zod";

/**
 * Runtime configuration. Everything is read lazily so that `next build` (which
 * imports modules without running the app) does not fail on missing secrets,
 * while any actual crypto or DB access fails loudly and early.
 */

const envSchema = z.object({
 NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
 SC_APP_URL: z.string().url().default("http://localhost:3000"),
 SC_MASTER_KEY: z.string().min(1, "SC_MASTER_KEY is required"),
 SC_DATABASE_URL: z.string().optional(),
 SC_SEARCH_PROVIDER: z.string().default("mock"),
 SC_SEARCH_API_KEY: z.string().optional(),
 SC_AI_PROVIDER: z.string().default("mock"),
 SC_AI_API_KEY: z.string().optional(),
 SC_AI_MODEL: z.string().optional(),
 SC_BREACH_PROVIDER: z.string().default("disabled"),
 SC_BREACH_API_KEY: z.string().optional(),
});

export type AppEnv = {
 nodeEnv: "development" | "test" | "production";
 appUrl: string;
 masterKey: Buffer;
 databaseUrl: string;
 providers: {
 search: { name: string; apiKey: string | null };
 ai: { name: string; apiKey: string | null; model: string | null };
 breach: { name: string; apiKey: string | null };
 };
 isProduction: boolean;
 isTest: boolean;
};

let cached: AppEnv | null = null;

export class ConfigError extends Error {
 constructor(message: string) {
 super(message);
 this.name = "ConfigError";
 }
}

function decodeMasterKey(raw: string): Buffer {
 let key: Buffer;
 try {
 key = Buffer.from(raw.trim(), "base64");
 } catch {
 throw new ConfigError("SC_MASTER_KEY is not valid base64.");
 }
 if (key.length !== 32) {
 throw new ConfigError(
 "SC_MASTER_KEY must be 32 bytes (base64). Generate a new key with `npm run setup`.",
 );
 }
 return key;
}

export function getEnv(): AppEnv {
 if (cached) return cached;

 const parsed = envSchema.safeParse(process.env);
 if (!parsed.success) {
 const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
 const hint = process.env.NODE_ENV === "production" ? "" : " Run `npm run setup`.";
 throw new ConfigError(`Environment variables are missing or invalid: ${fields}.${hint}`);
 }

 const v = parsed.data;
 cached = {
 nodeEnv: v.NODE_ENV,
 appUrl: v.SC_APP_URL.replace(/\/+$/, ""),
 masterKey: decodeMasterKey(v.SC_MASTER_KEY),
 databaseUrl: v.SC_DATABASE_URL?.trim() || "file:./data/app.db",
 providers: {
 search: { name: v.SC_SEARCH_PROVIDER, apiKey: v.SC_SEARCH_API_KEY?.trim() || null },
 ai: { name: v.SC_AI_PROVIDER, apiKey: v.SC_AI_API_KEY?.trim() || null, model: v.SC_AI_MODEL?.trim() || null },
 breach: { name: v.SC_BREACH_PROVIDER, apiKey: v.SC_BREACH_API_KEY?.trim() || null },
 },
 isProduction: v.NODE_ENV === "production",
 isTest: v.NODE_ENV === "test",
 };
 return cached;
}

/** Test-only: drop the memoised config so a new environment can be read. */
export function resetEnvCache(): void {
 cached = null;
}
