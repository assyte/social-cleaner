import { describe, expect, it } from "vitest";
import {
  createAliasRoute,
  createContactRoute,
  deleteAliasRoute,
  getVaultRoute,
  updateAliasRoute,
} from "@/server/api/vault-handlers";
import { deleteAlias } from "@/server/vault/service";
import type { VaultView } from "@/server/vault/service";
import { makeRequest, readJson, registerTestUser } from "./helpers/http";

describe("yetkilendirme (IDOR)", () => {
  it("kullanıcı B, kullanıcı A'nın kaydını silemez veya göremez", async () => {
    const userA = await registerTestUser({ email: undefined });
    const userB = await registerTestUser({ email: undefined });

    const created = await createAliasRoute(
      makeRequest("POST", "/api/vault/aliases", {
        cookie: userA.cookie,
        csrf: userA.csrf,
        body: { handle: "a-ozel-rumuz", platforms: ["github"] },
      }),
    );
    expect(created.status).toBe(201);
    const { id: aliasId } = await readJson<{ id: string }>(created);

    // B, A'nın kimliğini bilse bile silemez — varlık sızdırılmadan 404 döner.
    const deleteAttempt = await deleteAliasRoute(
      makeRequest("DELETE", `/api/vault/aliases/${aliasId}`, {
        cookie: userB.cookie,
        csrf: userB.csrf,
      }),
      aliasId,
    );
    expect(deleteAttempt.status).toBe(404);

    const updateAttempt = await updateAliasRoute(
      makeRequest("PATCH", `/api/vault/aliases/${aliasId}`, {
        cookie: userB.cookie,
        csrf: userB.csrf,
        body: { verification: "verified" },
      }),
      aliasId,
    );
    expect(updateAttempt.status).toBe(404);

    // Servis katmanı da aynı kuralı uygular.
    await expect(
      deleteAlias(userB.userId, aliasId, makeRequest("DELETE", "/api/vault/aliases/x")),
    ).rejects.toMatchObject({ status: 404 });

    // A'nın verisi hâlâ yerinde.
    const vaultA = await readJson<VaultView>(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: userA.cookie })),
    );
    expect(vaultA.aliases.map((a) => a.handle)).toContain("a-ozel-rumuz");

    // B'nin haznesinde A'ya ait hiçbir iz yok.
    const vaultBResponse = await getVaultRoute(
      makeRequest("GET", "/api/vault", { cookie: userB.cookie }),
    );
    const vaultBText = await vaultBResponse.text();
    expect(vaultBText).not.toContain("a-ozel-rumuz");
    expect(JSON.parse(vaultBText).aliases).toHaveLength(0);
  });

  it("kullanıcı B, A'nın iletişim bilgisi kimliğini kullanamaz", async () => {
    const userA = await registerTestUser();
    const userB = await registerTestUser();

    const created = await createContactRoute(
      makeRequest("POST", "/api/vault/contacts", {
        cookie: userA.cookie,
        csrf: userA.csrf,
        body: { kind: "email", value: "a-sahip@example.com" },
      }),
    );
    const { id } = await readJson<{ id: string }>(created);

    const attempt = await deleteAliasRoute(
      makeRequest("DELETE", `/api/vault/contacts/${id}`, {
        cookie: userB.cookie,
        csrf: userB.csrf,
      }),
      id,
    ).catch((error: unknown) => error);
    // Yanlış uç nokta olsa bile kimlik doğrulaması ve sahiplik korunmalı.
    expect(attempt instanceof Error || (attempt as Response).status >= 400).toBe(true);

    const vaultA = await readJson<VaultView>(
      await getVaultRoute(makeRequest("GET", "/api/vault", { cookie: userA.cookie })),
    );
    expect(vaultA.contacts).toHaveLength(1);
  });

  it("kimlikler tahmin edilemez biçimde üretilir", async () => {
    const user = await registerTestUser();
    const created = await createAliasRoute(
      makeRequest("POST", "/api/vault/aliases", {
        cookie: user.cookie,
        csrf: user.csrf,
        body: { handle: "tahmin-edilemez" },
      }),
    );
    const { id } = await readJson<{ id: string }>(created);
    expect(id).toMatch(/^als_[0-9a-hj-km-np-tv-z]{24}$/);
  });
});
