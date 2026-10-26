import { describe, expect, it } from "vitest";
import { loginRoute, logoutRoute, registerRoute, sessionRoute } from "@/server/api/auth-handlers";
import { makeRequest, readAuthCookies, readJson, registerTestUser, uniqueEmail } from "./helpers/http";

type SessionBody = {
  user: { id: string; emailMasked: string; displayName: string | null };
  csrfToken: string | null;
};

describe("kayıt", () => {
  it("201 döner, oturum cookie'leri set eder ve e-postayı maskeleyerek gösterir", async () => {
    const email = uniqueEmail("kayit");
    const response = await registerRoute(
      makeRequest("POST", "/api/auth/register", {
        body: { email, password: "Guclu-Parola-2026", displayName: "Ada Yılmaz" },
        ip: "203.0.113.10",
      }),
    );

    expect(response.status).toBe(201);
    const body = await readJson<SessionBody>(response);
    expect(body.user.emailMasked).toContain("@");
    expect(body.user.emailMasked).not.toBe(email);
    expect(JSON.stringify(body)).not.toContain(email);
    expect(body.csrfToken).toBeTruthy();

    const setCookies = response.headers.getSetCookie();
    const sessionCookie = setCookies.find((c) => c.startsWith("sc_session="));
    const csrfCookie = setCookies.find((c) => c.startsWith("sc_csrf="));
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("SameSite=Lax");
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).not.toContain("HttpOnly");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("aynı e-posta ile ikinci kayıtta 409 döner", async () => {
    const existing = await registerTestUser();
    const response = await registerRoute(
      makeRequest("POST", "/api/auth/register", {
        body: { email: existing.email, password: "Baska-Parola-2026" },
        ip: "203.0.113.11",
      }),
    );
    expect(response.status).toBe(409);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("EMAIL_TAKEN");
  });

  it("zayıf parolayı alan detayıyla reddeder", async () => {
    const response = await registerRoute(
      makeRequest("POST", "/api/auth/register", {
        body: { email: uniqueEmail("zayif"), password: "kisa" },
        ip: "203.0.113.12",
      }),
    );
    expect(response.status).toBe(400);
    const body = await readJson<{ error: { code: string; details: Array<{ path: string }> } }>(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.some((d) => d.path === "password")).toBe(true);
  });

  it("geçersiz e-postayı reddeder", async () => {
    const response = await registerRoute(
      makeRequest("POST", "/api/auth/register", {
        body: { email: "gecersiz", password: "Guclu-Parola-2026" },
        ip: "203.0.113.13",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("yabancı Origin başlığını reddeder", async () => {
    const response = await registerRoute(
      makeRequest("POST", "/api/auth/register", {
        body: { email: uniqueEmail("origin"), password: "Guclu-Parola-2026" },
        origin: "https://evil.example",
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe("giriş / çıkış", () => {
  it("yanlış parolada tek tip hata döner", async () => {
    const user = await registerTestUser();
    const response = await loginRoute(
      makeRequest("POST", "/api/auth/login", {
        body: { email: user.email, password: "Yanlis-Parola-999" },
        ip: "203.0.113.20",
      }),
    );
    expect(response.status).toBe(401);
    const body = await readJson<{ error: { code: string; message: string } }>(response);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(body.error.message).not.toContain("kullanıcı yok");
  });

  it("var olmayan hesap için de aynı kodu döner", async () => {
    const response = await loginRoute(
      makeRequest("POST", "/api/auth/login", {
        body: { email: uniqueEmail("yok"), password: "Yanlis-Parola-999" },
        ip: "203.0.113.21",
      }),
    );
    expect(response.status).toBe(401);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("doğru parolayla giriş yapar, oturum bilgisini döner ve çıkışta iptal eder", async () => {
    const user = await registerTestUser();

    const login = await loginRoute(
      makeRequest("POST", "/api/auth/login", {
        body: { email: user.email, password: user.password },
        ip: "203.0.113.22",
      }),
    );
    expect(login.status).toBe(200);
    const auth = readAuthCookies(login);
    const loginBody = await readJson<SessionBody>(login);
    expect(loginBody.csrfToken).toBe(auth.csrf);

    const session = await sessionRoute(makeRequest("GET", "/api/auth/session", { cookie: auth.cookie }));
    expect(session.status).toBe(200);
    const sessionBody = await readJson<SessionBody>(session);
    expect(sessionBody.user.id).toBe(user.userId);
    expect(sessionBody.csrfToken).toBe(auth.csrf);

    const logout = await logoutRoute(
      makeRequest("POST", "/api/auth/logout", {
        cookie: auth.cookie,
        csrf: auth.csrf,
        ip: "203.0.113.22",
      }),
    );
    expect(logout.status).toBe(204);
    expect(logout.headers.getSetCookie().some((c) => c.includes("Max-Age=0"))).toBe(true);

    const after = await sessionRoute(makeRequest("GET", "/api/auth/session", { cookie: auth.cookie }));
    expect(after.status).toBe(401);
  });

  it("CSRF başlığı olmadan da yerel oturum temizlenir", async () => {
    const user = await registerTestUser();
    const response = await logoutRoute(
      makeRequest("POST", "/api/auth/logout", { cookie: user.cookie, ip: "203.0.113.23" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie().some((c) => c.includes("Max-Age=0"))).toBe(true);
  });

  it("beş hatalı denemeden sonra hesabı kilitler", async () => {
    const user = await registerTestUser();
    for (let i = 0; i < 5; i += 1) {
      const attempt = await loginRoute(
        makeRequest("POST", "/api/auth/login", {
          body: { email: user.email, password: `Yanlis-Parola-${i}00` },
          ip: "203.0.113.30",
        }),
      );
      expect(attempt.status).toBe(401);
    }
    const locked = await loginRoute(
      makeRequest("POST", "/api/auth/login", {
        body: { email: user.email, password: user.password },
        ip: "203.0.113.30",
      }),
    );
    expect(locked.status).toBe(429);
    const body = await readJson<{ error: { code: string } }>(locked);
    expect(body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("IP bazlı giriş limitini uygular", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 22; i += 1) {
      const response = await loginRoute(
        makeRequest("POST", "/api/auth/login", {
          body: { email: `limit.${i}.${uniqueEmail("x")}`, password: "Yanlis-Parola-999" },
          ip: "198.51.100.77",
        }),
      );
      lastStatus = response.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});
