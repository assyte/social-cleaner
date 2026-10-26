import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { checkPlatform } from "@/server/search/checker";
import { PLATFORMS, getPlatform, normalizeHandle } from "@/server/search/platforms";
import { createSearchRoute, deleteSearchRoute, getSearchRoute, listSearchesRoute } from "@/server/api/search-handlers";
import { declareOwnershipRoute } from "@/server/api/vault-handlers";
import type { SearchRunView } from "@/server/search/service";
import { makeRequest, readJson, registerTestUser } from "./helpers/http";

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html" } });
}

function fakeFetch(handler: (url: string) => Response): typeof fetch {
  return (async (input: RequestInfo | URL) => handler(String(input))) as typeof fetch;
}

async function declareOwner(cookie: string, csrf: string): Promise<void> {
  const response = await declareOwnershipRoute(
    makeRequest("POST", "/api/vault/ownership", {
      cookie,
      csrf,
      body: { declared: true, confirmation: "I declare that this profile belongs to me" },
    }),
  );
  expect(response.status).toBe(200);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("platform catalogue", () => {
  it("kimlikleri benzersiz ve logoları yerel", () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const platform of PLATFORMS) {
      expect(platform.icon.startsWith("/brand/platforms/")).toBe(true);
      expect(existsSync(resolve(process.cwd(), "public", platform.icon.slice(1)))).toBe(true);
    }
  });

  it("115 katalog kaydı ve 56 doğrudan kontrol içerir", () => {
    expect(PLATFORMS.length).toBe(115);
    const direct = PLATFORMS.filter((p) => p.check);
    expect(direct.length).toBe(56);
    for (const platform of direct) {
      expect(platform.limitation).toBeUndefined();
    }
    for (const platform of PLATFORMS.filter((p) => !p.check)) {
      expect(platform.limitation?.length).toBeGreaterThan(10);
    }
    expect(new Set(PLATFORMS.map((p) => p.category)).size).toBeGreaterThanOrEqual(10);
  });

  it("kullanıcı adını normalize eder ve geçersizleri reddeder", () => {
    expect(normalizeHandle(" @Isik_Yilmaz ")).toBe("Isik_Yilmaz");
    expect(normalizeHandle("a")).toBe("a");
    expect(normalizeHandle("boşluk var")).toBe("boşluk var");
    expect(normalizeHandle("https://x.com/a")).toBe("https://x.com/a");
  });
});

describe("doğrudan profil kontrolü", () => {
  it("HTTP 200 profil bulundu sayılır", async () => {
    const result = await checkPlatform(getPlatform("github")!, "aday", fakeFetch(() => html("ok")));
    expect(result.outcome).toBe("found");
    expect(result.confidence).toBeGreaterThanOrEqual(90);
    expect(result.profileUrl).toBe("https://github.com/aday");
  });

  it("HTTP 404 bulunamadı sayılır", async () => {
    const result = await checkPlatform(getPlatform("codeberg")!, "aday", fakeFetch(() => html("", 404)));
    expect(result.outcome).toBe("not_found");
  });

  it("403 engellendi olarak raporlanır, bulundu değil", async () => {
    const result = await checkPlatform(getPlatform("github")!, "aday", fakeFetch(() => html("", 403)));
    expect(result.outcome).toBe("blocked");
    expect(result.confidence).toBe(0);
  });

  it("Steam XML hatasını bulunamadı olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("steam")!,
      "aday",
      fakeFetch(() =>
        html(
          '<?xml version="1.0"?><response><error><![CDATA[The specified profile could not be found.]]></error></response>',
        ),
      ),
    );
    expect(result.outcome).toBe("not_found");
  });

  it("Steam XML kimliğini bulundu olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("steam")!,
      "aday",
      fakeFetch(() => html("<response><steamID64>76561198000000000</steamID64></response>")),
    );
    expect(result.outcome).toBe("found");
    expect(result.verification).toBe("verified");
    expect(result.profileUrl).toBe("https://steamcommunity.com/id/aday");
  });

  it("Instagram mobil profil başlığını bulundu olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("instagram")!,
      "nasa",
      fakeFetch(() => html('<meta property="og:title" content="NASA (&#064;nasa) &#x2022; Instagram">')),
    );
    expect(result.outcome).toBe("found");
    expect(result.verification).toBe("verified");
  });

  it("Instagram httpErrorPage yanıtını bulunamadı olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("instagram")!,
      "aday",
      fakeFetch(() => html('<script>{"pageID":"httpErrorPage"}</script>')),
    );
    expect(result.outcome).toBe("not_found");
  });

  it("TikTok gömülü kullanıcı bilgisini bulundu olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("tiktok")!,
      "aday",
      fakeFetch(() => html('{"webapp.user-detail":{"userInfo":{"user":{"uniqueId":"aday"}}}}')),
    );
    expect(result.outcome).toBe("found");
  });

  it("TikTok 10221 durum kodunu bulunamadı olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("tiktok")!,
      "aday",
      fakeFetch(() => html('{"webapp.user-detail":{"statusCode":10221}}')),
    );
    expect(result.outcome).toBe("not_found");
  });

  it("Facebook 200 önizlemesini muhtemel bulgu sayar", async () => {
    const result = await checkPlatform(
      getPlatform("facebook")!,
      "aday",
      fakeFetch(() => html('<meta property="og:title" content="Aday">')),
    );
    expect(result.outcome).toBe("found");
    expect(result.verification).toBe("possible");
  });

  it("Facebook giriş yönlendirmesini engellendi sayar", async () => {
    const result = await checkPlatform(
      getPlatform("facebook")!,
      "aday",
      fakeFetch(() => new Response("", { status: 302, headers: { location: "https://m.facebook.com/login" } })),
    );
    expect(result.outcome).toBe("blocked");
  });

  it("Telegram başlık bloğunu bulundu olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("telegram")!,
      "aday",
      fakeFetch(() => html('<div class="tgme_page_title">Aday</div>')),
    );
    expect(result.outcome).toBe("found");
  });

  it("X 404 yanıtını bulunamadı olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("x")!,
      "aday",
      fakeFetch(() => html("", 404)),
    );
    expect(result.outcome).toBe("not_found");
  });

  it("CraftRise profil işaretini bulundu olarak tanır", async () => {
    const result = await checkPlatform(
      getPlatform("craftrise")!,
      "Kurucu",
      fakeFetch(() => html('<div class="profileTitle-gene"></div><img src="/gets/get-head.php?s=256&u=Kurucu">')),
    );
    expect(result.outcome).toBe("found");
    expect(result.evidence.httpStatus).toBe(200);
  });

  it("Hacker News 'No such user' işaretini tanır", async () => {
    const result = await checkPlatform(
      getPlatform("hackernews")!,
      "aday",
      fakeFetch(() => html("<html><body>No such user.</body></html>")),
    );
    expect(result.outcome).toBe("not_found");
  });

  it("ağ hatasını bulundu olarak saymaz", async () => {
    const result = await checkPlatform(
      getPlatform("github")!,
      "aday",
      fakeFetch(() => {
        throw new Error("network down");
      }),
    );
    expect(result.outcome).toBe("error");
  });
});

describe("arama API", () => {
  it("sahiplik beyanı olmadan arama reddedilir", async () => {
    const user = await registerTestUser();
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "aday", platforms: ["github"] },
      }),
    );
    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("OWNERSHIP_NOT_DECLARED");
  });

  it("CSRF olmadan arama reddedilir", async () => {
    const user = await registerTestUser();
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        body: { fieldType: "username", query: "aday", platforms: ["github"] },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("bulunan sonuçları kanıtla kaydeder ve listeler", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    vi.stubGlobal(
      "fetch",
      fakeFetch((url) => {
        if (url.includes("github.com/aday")) return html("<title>GitHub - aday</title>");
        return html("", 404);
      }),
    );

    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "aday", platforms: ["github", "x", "youtube"] },
      }),
    );
    expect(response.status).toBe(201);
    const run = await readJson<SearchRunView>(response);
    expect(run.foundCount).toBe(1);
    expect(run.results).toHaveLength(1);
    expect(run.results[0]?.platformId).toBe("github");
    expect(run.results[0]?.profileUrl).toBe("https://github.com/aday");
    expect(run.results[0]?.verification).toBe("verified");
    expect(run.outcomes).toHaveLength(3);
    expect(run.outcomes.find((outcome) => outcome.platformId === "github")?.status).toBe("found");
    expect(run.outcomes.find((outcome) => outcome.platformId === "youtube")?.status).toBe("not_found");

    const list = await listSearchesRoute(makeRequest("GET", "/api/search", { cookie: user.cookie }));
    const body = await readJson<{ runs: Array<{ id: string }> }>(list);
    expect(body.runs.some((item) => item.id === run.id)).toBe(true);
  });

  it("sağlayıcı yokken doğrudan doğrulanamayan platformu manuel işaretler", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    vi.stubGlobal(
      "fetch",
      fakeFetch((url) => {
        if (url.includes("github.com/aday")) return html("<title>GitHub - aday</title>");
        return html("", 404);
      }),
    );

    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "aday", platforms: ["github", "reddit"] },
      }),
    );
    expect(response.status).toBe(201);
    const run = await readJson<SearchRunView>(response);
    const reddit = run.outcomes.find((outcome) => outcome.platformId === "reddit");
    expect(reddit?.status).toBe("unsupported");
    expect(reddit?.method).toBe("manual");
    expect(reddit?.profileUrl).toBe("https://www.reddit.com/user/aday");
  });

  it("ücretsiz planda 5'ten fazla sonuç göndermez", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    vi.stubGlobal(
      "fetch",
      fakeFetch((url) => {
        if (url.includes("instagram.com")) return html("<title>&#064;aday)</title>");
        if (url.includes("tiktok.com")) {
          return html('<script>{"webapp.user-detail":{"userInfo":{}}}</script>');
        }
        return html("ok");
      }),
    );

    const platforms = ["github", "youtube", "x", "facebook", "instagram", "tiktok"];
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "aday", platforms },
      }),
    );
    expect(response.status).toBe(201);
    const run = await readJson<SearchRunView>(response);
    expect(run.foundCount).toBe(6);
    expect(run.hiddenCount).toBe(1);
    expect(run.results).toHaveLength(5);
    const hidden = run.outcomes.find((outcome) => outcome.hidden);
    expect(hidden).toBeDefined();
    expect(hidden?.profileUrl).not.toContain("aday");
    expect(hidden?.evidence.title).toBeNull();

    // A stored run must be sanitized again on GET; the database keeps the full
    // evidence for the owner, but the Free response must not leak it.
    const storedResponse = await getSearchRoute(
      makeRequest("GET", `/api/search/${run.id}`, { cookie: user.cookie }),
      run.id,
    );
    expect(storedResponse.status).toBe(200);
    const stored = await readJson<SearchRunView>(storedResponse);
    expect(stored.results).toHaveLength(5);
    const storedHidden = stored.outcomes.find((outcome) => outcome.hidden);
    expect(storedHidden?.profileUrl).not.toContain("aday");
    expect(storedHidden?.evidence.title).toBeNull();
  });

  it("ücretsiz planda 8'den fazla platform reddedilir", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: {
          fieldType: "username",
          query: "aday",
          platforms: ["github", "gitlab", "codeberg", "hackernews", "devto", "npm", "soundcloud", "youtube", "steam"],
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("ücretsiz planda Pro platformunu reddeder", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: {
          fieldType: "username",
          query: "aday",
          platforms: ["github", "codeberg"],
        },
      }),
    );
    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("PLAN_REQUIRED");
  });

  it("başka kullanıcının taraması 404 döner", async () => {
    const owner = await registerTestUser();
    await declareOwner(owner.cookie, owner.csrf);
    vi.stubGlobal("fetch", fakeFetch(() => html("ok")));
    const created = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: owner.cookie,
        csrf: owner.csrf,
        body: { fieldType: "username", query: "aday", platforms: ["github"] },
      }),
    );
    const run = await readJson<SearchRunView>(created);

    const stranger = await registerTestUser();
    const response = await getSearchRoute(
      makeRequest("GET", `/api/search/${run.id}`, { cookie: stranger.cookie }),
      run.id,
    );
    expect(response.status).toBe(404);
  });

  it("ücretsiz planda e-posta araması PLAN_REQUIRED döner", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "email", query: "ada@example.com", platforms: [] },
      }),
    );
    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("PLAN_REQUIRED");
  });

  it("Pro planda sağlayıcı yoksa 503 döner, sahte sonuç üretmez", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    const db = await getDb();
    await db.update(users).set({ plan: "pro" }).where(eq(users.id, user.userId));

    const response = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "email", query: "ada@example.com", platforms: [] },
      }),
    );
    expect(response.status).toBe(503);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("günlük kota aşılırsa 429 döner", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    vi.stubGlobal("fetch", fakeFetch(() => html("", 404)));

    for (let i = 0; i < 3; i += 1) {
      const ok = await createSearchRoute(
        makeRequest("POST", "/api/search", {
          cookie: user.cookie,
          csrf: user.csrf,
          body: { fieldType: "username", query: `aday${i}`, platforms: ["github"] },
        }),
      );
      expect(ok.status).toBe(201);
    }

    const blocked = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "adayx", platforms: ["github"] },
      }),
    );
    expect(blocked.status).toBe(429);
    const body = await readJson<{ error: { code: string } }>(blocked);
    expect(body.error.code).toBe("QUOTA_EXCEEDED");
  });

  it("tarama silindiğinde sonuçları da silinir", async () => {
    const user = await registerTestUser();
    await declareOwner(user.cookie, user.csrf);
    vi.stubGlobal("fetch", fakeFetch(() => html("ok")));
    const created = await createSearchRoute(
      makeRequest("POST", "/api/search", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { fieldType: "username", query: "aday", platforms: ["github"] },
      }),
    );
    const run = await readJson<SearchRunView>(created);

    const deleted = await deleteSearchRoute(
      makeRequest("DELETE", `/api/search/${run.id}`, { cookie: user.cookie, csrf: user.csrf }),
      run.id,
    );
    expect(deleted.status).toBe(204);

    const gone = await getSearchRoute(
      makeRequest("GET", `/api/search/${run.id}`, { cookie: user.cookie }),
      run.id,
    );
    expect(gone.status).toBe(404);
  });
});
