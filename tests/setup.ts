import { afterAll } from "vitest";

/**
 * Each test file gets its own in-memory SQLite database, so tests cannot leak
 * state into one another, the real `data/app.db` is never touched, and no test
 * artifacts are left behind on disk (including on Windows, where SQLite WAL
 * handles can outlive the test process for a moment).
 */
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.SC_APP_URL = "http://localhost:3000";
process.env.SC_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.SC_DATABASE_URL = "file::memory:";
process.env.SC_SEARCH_PROVIDER = "mock";
process.env.SC_AI_PROVIDER = "mock";
process.env.SC_BREACH_PROVIDER = "disabled";

afterAll(async () => {
  const { closeDb } = await import("@/server/db/client");
  await closeDb();
});
