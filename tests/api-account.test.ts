import { describe, expect, it } from "vitest";
import { auditLogRoute, deleteAccountRoute, exportAccountRoute } from "@/server/api/account-handlers";
import { loginRoute, sessionRoute } from "@/server/api/auth-handlers";
import { getClient } from "@/server/db/client";
import { makeRequest, readJson, registerTestUser } from "./helpers/http";

describe("hesap dışa aktarma ve silme", () => {
  it("dışa aktarım tüm veriyi açık değerlerle ve indirme başlığıyla döner", async () => {
    const user = await registerTestUser();
    const response = await exportAccountRoute(
      makeRequest("GET", "/api/account/export", { cookie: user.cookie }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await readJson<{
      user: { email: string };
      names: unknown[];
      variants: { notice: string };
      searchHistory: unknown[];
      limitations: string[];
      audit: Array<{ action: string }>;
    }>(response);
    expect(body.user.email).toBe(user.email);
    expect(body.variants.notice).toContain("none of them is evidence on its own");
    expect(body.searchHistory).toEqual([]);
    expect(body.limitations.join(" ")).toContain("Search history includes stored platform outcomes");
    expect(body.audit.some((e) => e.action === "account.export")).toBe(true);
  });

  it("dışa aktarım oturum gerektirir", async () => {
    const response = await exportAccountRoute(makeRequest("GET", "/api/account/export"));
    expect(response.status).toBe(401);
  });

  it("yanlış parola ile hesap silinemez", async () => {
    const user = await registerTestUser();
    const response = await deleteAccountRoute(
      makeRequest("DELETE", "/api/account", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { password: "Yanlis-Parola-999", confirmation: "DELETE MY ACCOUNT" },
      }),
    );
    expect(response.status).toBe(403);

    const stillThere = await sessionRoute(
      makeRequest("GET", "/api/auth/session", { cookie: user.cookie }),
    );
    expect(stillThere.status).toBe(200);
  });

  it("yanlış onay metnini reddeder", async () => {
    const user = await registerTestUser();
    const response = await deleteAccountRoute(
      makeRequest("DELETE", "/api/account", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { password: user.password, confirmation: "silmek istiyorum" },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("doğru parola ile hesabı ve tüm verisini siler", async () => {
    const user = await registerTestUser();
    const response = await deleteAccountRoute(
      makeRequest("DELETE", "/api/account", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { password: user.password, confirmation: "DELETE MY ACCOUNT" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie().some((c) => c.includes("Max-Age=0"))).toBe(true);

    const after = await sessionRoute(makeRequest("GET", "/api/auth/session", { cookie: user.cookie }));
    expect(after.status).toBe(401);

    const login = await loginRoute(
      makeRequest("POST", "/api/auth/login", {
        body: { email: user.email, password: user.password },
        ip: "198.51.100.90",
      }),
    );
    expect(login.status).toBe(401);

    const client = await getClient();
    const rows = await client.execute({
      sql: "SELECT COUNT(*) AS c FROM users WHERE id = ?",
      args: [user.userId],
    });
    expect(Number(rows.rows[0]!.c)).toBe(0);
  });

  it("denetim kaydı kişisel veri içermez ve sayfalanır", async () => {
    const user = await registerTestUser();
    const response = await auditLogRoute(
      makeRequest("GET", "/api/audit?limit=10", { cookie: user.cookie }),
    );
    expect(response.status).toBe(200);
    const body = await readJson<{
      events: Array<{ action: string; meta: Record<string, unknown> }>;
    }>(response);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events.some((e) => e.action === "account.register")).toBe(true);
    const text = JSON.stringify(body);
    expect(text).not.toContain(user.email);
    expect(text).not.toContain(user.password);
  });
});
