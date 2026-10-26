import { describe, expect, it } from "vitest";
import {
  createAliasRoute,
  createContactRoute,
  createLinkRoute,
  createNameRoute,
  declareOwnershipRoute,
  deleteAliasRoute,
  deleteContactRoute,
  deleteLinkRoute,
  deleteNameRoute,
  getVaultRoute,
  setPrimaryNameRoute,
  updateAliasRoute,
  updateScopeRoute,
} from "@/server/api/vault-handlers";
import type { VaultView } from "@/server/vault/service";
import { makeRequest, readJson, registerTestUser } from "./helpers/http";

function vaultOf(response: Response): Promise<VaultView> {
  return readJson<VaultView>(response);
}

describe("Identity Vault API", () => {
  it("oturumsuz erişimi reddeder", async () => {
    const response = await getVaultRoute(makeRequest("GET", "/api/vault"));
    expect(response.status).toBe(401);
  });

  it("CSRF başlığı olmadan mutasyonu reddeder", async () => {
    const user = await registerTestUser();
    const response = await createNameRoute(
      makeRequest("POST", "/api/vault/names", {
        cookie: user.cookie,
        body: { kind: "legal", value: "Ada Yılmaz" },
      }),
    );
    expect(response.status).toBe(403);
    const body = await readJson<{ error: { code: string } }>(response);
    expect(body.error.code).toBe("CSRF_FAILED");
  });

  it("yabancı origin ile mutasyonu reddeder", async () => {
    const user = await registerTestUser();
    const response = await createNameRoute(
      makeRequest("POST", "/api/vault/names", {
        cookie: user.cookie,
        csrf: user.csrf,
        origin: "https://evil.example",
        body: { kind: "legal", value: "Ada Yılmaz" },
      }),
    );
    expect(response.status).toBe(403);
  });

  it("ad ekler, birincil yapar, tekrarı reddeder ve siler", async () => {
    const user = await registerTestUser();

    const created = await createNameRoute(
      makeRequest("POST", "/api/vault/names", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "legal", value: "Işık Yılmaz", isPrimary: true },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await readJson<{ id: string }>(created);

    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.names).toHaveLength(1);
    expect(vault.names[0]!.value).toBe("Işık Yılmaz");
    expect(vault.names[0]!.isPrimary).toBe(true);
    expect(vault.variants.names.map((v) => v.value)).toContain("Isik Yilmaz");
    expect(vault.variants.contacts).toHaveLength(0);

    // Aynı ad (Türkçe katlamadan sonra aynı) tekrar eklenemez.
    const duplicate = await createNameRoute(
      makeRequest("POST", "/api/vault/names", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "nickname", value: "isik yilmaz" },
      }),
    );
    expect(duplicate.status).toBe(409);

    const primary = await setPrimaryNameRoute(
      makeRequest("PATCH", `/api/vault/names/${id}`, {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { isPrimary: true },
      }),
      id,
    );
    expect(primary.status).toBe(200);

    const deleted = await deleteNameRoute(
      makeRequest("DELETE", `/api/vault/names/${id}`, { cookie: user.cookie, csrf: user.csrf }),
      id,
    );
    expect(deleted.status).toBe(204);

    const after = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(after.names).toHaveLength(0);
  });

  it("rumuz ekler, doğrulama durumunu günceller ve varyant üretir", async () => {
    const user = await registerTestUser();
    const created = await createAliasRoute(
      makeRequest("POST", "/api/vault/aliases", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: {
          handle: "@isik.yilmaz",
          platforms: ["github", "forum"],
          startPeriod: "2008",
          endPeriod: "2012",
        },
      }),
    );
    expect(created.status).toBe(201);
    const { id } = await readJson<{ id: string }>(created);

    const updated = await updateAliasRoute(
      makeRequest("PATCH", `/api/vault/aliases/${id}`, {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { verification: "verified" },
      }),
      id,
    );
    expect(updated.status).toBe(200);

    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.aliases[0]!.verification).toBe("verified");
    expect(vault.aliases[0]!.platforms).toEqual(["github", "forum"]);
    expect(vault.variants.aliases.map((v) => v.value)).toEqual(
      expect.arrayContaining(["isikyilmaz", "isik_yilmaz"]),
    );

    const deleted = await deleteAliasRoute(
      makeRequest("DELETE", `/api/vault/aliases/${id}`, { cookie: user.cookie, csrf: user.csrf }),
      id,
    );
    expect(deleted.status).toBe(204);
  });

  it("onaysız iletişim bilgisini maskeler ve varyantlara koymaz", async () => {
    const user = await registerTestUser();
    const email = `gizli.${Date.now()}@example.com`;

    const created = await createContactRoute(
      makeRequest("POST", "/api/vault/contacts", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "email", value: email, consentSearch: false, isPublic: false },
      }),
    );
    expect(created.status).toBe(201);

    const response = await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie }));
    const text = await response.clone().text();
    const vault = await vaultOf(response);

    expect(text).not.toContain(email);
    expect(vault.contacts[0]!.valueMasked).toContain("@example.com");
    expect(vault.contacts[0]!.consentSearch).toBe(false);
    expect(vault.variants.contacts).toHaveLength(0);
    expect(vault.stats.searchableContacts).toBe(0);
  });

  it("onaylı iletişim bilgisini arama varyantlarına ekler", async () => {
    const user = await registerTestUser();
    const email = `onayli.${Date.now()}@example.com`;
    await createContactRoute(
      makeRequest("POST", "/api/vault/contacts", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "email", value: email, consentSearch: true },
      }),
    );
    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.variants.contacts.map((v) => v.value)).toContain(email);
    expect(vault.variants.contacts.every((v) => v.usedAsEvidence === false)).toBe(true);
  });

  it("telefonu normalleştirir ve maskeler", async () => {
    const user = await registerTestUser();
    const created = await createContactRoute(
      makeRequest("POST", "/api/vault/contacts", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "phone", value: "0532 123 45 67" },
      }),
    );
    expect(created.status).toBe(201);
    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.contacts[0]!.valueMasked).toMatch(/4567$/);
    expect(vault.contacts[0]!.valueMasked).not.toContain("5321");
  });

  it("kapsamı günceller, iletişim onayını kaydeder ve geri alır", async () => {
    const user = await registerTestUser();
    const base = {
      mode: "read_only",
      depth: "deep",
      platforms: ["github", "reddit"],
      searchName: true,
      searchAliases: true,
      searchContacts: true,
      maxQueries: 150,
      maxDepth: 3,
      maxCostCents: 500,
    };

    const updated = await updateScopeRoute(
      makeRequest("PUT", "/api/vault/scope", { cookie: user.cookie, csrf: user.csrf, body: base }),
    );
    expect(updated.status).toBe(200);

    let vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.scope.depth).toBe("deep");
    expect(vault.scope.maxQueries).toBe(150);
    expect(vault.scope.searchContacts).toBe(true);
    expect(vault.consents.some((c) => c.scope === "contacts_search" && c.granted)).toBe(true);

    const revoked = await updateScopeRoute(
      makeRequest("PUT", "/api/vault/scope", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { ...base, searchContacts: false },
      }),
    );
    expect(revoked.status).toBe(200);
    vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.scope.searchContacts).toBe(false);
    expect(vault.consents.some((c) => c.scope === "contacts_search")).toBe(false);
  });

  it("limit dışı kapsam değerlerini reddeder", async () => {
    const user = await registerTestUser();
    const response = await updateScopeRoute(
      makeRequest("PUT", "/api/vault/scope", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: {
          mode: "read_only",
          depth: "standard",
          platforms: [],
          searchName: true,
          searchAliases: true,
          searchContacts: false,
          maxQueries: 0,
          maxDepth: 9,
          maxCostCents: -5,
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("özel IP'ye işaret eden bağlantıyı reddeder, geçerli bağlantıyı ekler", async () => {
    const user = await registerTestUser();
    const blocked = await createLinkRoute(
      makeRequest("POST", "/api/vault/links", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "website", url: "http://169.254.169.254/latest/meta-data" },
      }),
    );
    expect(blocked.status).toBe(400);

    const created = await createLinkRoute(
      makeRequest("POST", "/api/vault/links", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "website", url: "https://example.com/blog", label: "Blog" },
      }),
    );
    expect(created.status).toBe(201);

    const duplicate = await createLinkRoute(
      makeRequest("POST", "/api/vault/links", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "website", url: "https://example.com/blog" },
      }),
    );
    expect(duplicate.status).toBe(409);

    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.links).toHaveLength(1);
    const linkId = vault.links[0]!.id;
    const deleted = await deleteLinkRoute(
      makeRequest("DELETE", `/api/vault/links/${linkId}`, {
        cookie: user.cookie,
        csrf: user.csrf,
      }),
      linkId,
    );
    expect(deleted.status).toBe(204);
  });

  it("sahiplik beyanını kaydeder", async () => {
    const user = await registerTestUser();
    const response = await declareOwnershipRoute(
      makeRequest("POST", "/api/vault/ownership", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: {
          declared: true,
          confirmation: "I declare that this profile belongs to me",
        },
      }),
    );
    expect(response.status).toBe(200);
    const vault = await vaultOf(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: user.cookie })),
    );
    expect(vault.profile.ownerDeclared).toBe(true);
  });

  it("iletişim bilgisini siler", async () => {
    const user = await registerTestUser();
    const created = await createContactRoute(
      makeRequest("POST", "/api/vault/contacts", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { kind: "email", value: "silinecek@example.com" },
      }),
    );
    const { id } = await readJson<{ id: string }>(created);
    const deleted = await deleteContactRoute(
      makeRequest("DELETE", `/api/vault/contacts/${id}`, {
        cookie: user.cookie,
        csrf: user.csrf,
      }),
      id,
    );
    expect(deleted.status).toBe(204);
  });

  it("bozuk kimlik biçimini 404 ile reddeder", async () => {
    const user = await registerTestUser();
    const response = await deleteNameRoute(
      makeRequest("DELETE", "/api/vault/names/../../etc", {
        cookie: user.cookie,
        csrf: user.csrf,
      }),
      "../../etc",
    );
    expect(response.status).toBe(404);
  });
});
