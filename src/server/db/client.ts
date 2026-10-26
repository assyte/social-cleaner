import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { getEnv } from "@/server/config/env";
import { MIGRATIONS } from "@/server/db/migrations";
import * as schema from "@/server/db/schema";

export type Database = LibSQLDatabase<typeof schema>;

type Init = { client: Client; db: Database };

let initPromise: Promise<Init> | null = null;

/**
 * Resolve a `file:` URL to an absolute path so the app behaves the same no
 * matter which directory the process was started from, and create the directory.
 */
export function resolveDatabaseUrl(raw: string): string {
 if (!raw.startsWith("file:")) return raw; // remote libsql or :memory: forms
 let filePart = raw.slice("file:".length);
 if (filePart.startsWith("//")) filePart = filePart.slice(2);
 if (filePart === ":memory:" || filePart.startsWith(":memory:")) return "file::memory:";
 if (!isAbsolute(filePart)) {
 // The path can point anywhere on disk at runtime; keep Turbopack's static
 // tracing out of it so the whole repository is not bundled into the build.
 filePart = resolve(/* turbopackIgnore: true */ process.cwd(), filePart);
 }
 mkdirSync(dirname(filePart), { recursive: true });
 return `file:${filePart.replace(/\\/g, "/")}`;
}

async function runMigrations(client: Client): Promise<void> {
 await client.execute(
 "CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
 );
 const appliedResult = await client.execute("SELECT id FROM _migrations");
 const applied = new Set(appliedResult.rows.map((row) => String(row.id)));

 for (const migration of MIGRATIONS) {
 if (applied.has(migration.id)) continue;
 await client.batch(
 migration.statements.map((statement) => ({ sql: statement, args: [] })),
 "write",
 );
 await client.execute({
 sql: "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)",
 args: [migration.id, Date.now()],
 });
 }
}

async function init(): Promise<Init> {
 const env = getEnv();
 const url = resolveDatabaseUrl(env.databaseUrl);
 const client = createClient({ url });
 await client.execute("PRAGMA foreign_keys = ON");
 await client.execute("PRAGMA busy_timeout = 5000");
 if (!url.includes(":memory:")) {
 await client.execute("PRAGMA journal_mode = WAL");
 await client.execute("PRAGMA synchronous = NORMAL");
 }
 await runMigrations(client);
 const db = drizzle(client, { schema });
 return { client, db };
}

function ensureInit(): Promise<Init> {
 initPromise ??= init();
 return initPromise;
}

export function getDb(): Promise<Database> {
 return ensureInit().then((r) => r.db);
}

export function getClient(): Promise<Client> {
 return ensureInit().then((r) => r.client);
}

/** Test-only teardown: closes the connection and forgets the singleton. */
export async function closeDb(): Promise<void> {
 const current = initPromise;
 initPromise = null;
 if (!current) return;
 try {
 const { client } = await current;
 client.close();
 } catch {
 // already closed
 }
}
