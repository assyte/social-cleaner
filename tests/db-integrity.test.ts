import { describe, expect, it } from "vitest";
import { addName, deleteUserAccount, exportUserData, getVault, declareOwnership } from "@/server/vault/service";
import { getClient } from "@/server/db/client";
import { makeRequest, registerTestUser } from "./helpers/http";

async function dump(table: string): Promise<string> {
  const client = await getClient();
  const result = await client.execute(`SELECT * FROM ${table}`);
  return JSON.stringify(result.rows);
}

describe("veritabanı bütünlüğü ve şifreleme", () => {
  it("P2 alanları düz metin olarak saklamaz", async () => {
    const user = await registerTestUser({ email: "duz-metin-kontrol@example.com", displayName: "Işık Yılmaz" });
    await addName(
      user.userId,
      { kind: "legal", value: "Işık Yılmaz", isPrimary: true },
      makeRequest("POST", "/api/vault/names", { cookie: user.cookie, csrf: user.csrf }),
    );

    const usersDump = await dump("users");
    expect(usersDump).not.toContain("duz-metin-kontrol@example.com");
    expect(usersDump).not.toContain("Işık Yılmaz");
    expect(usersDump).toContain("v1:");

    const namesDump = await dump("identity_names");
    expect(namesDump).not.toContain("Işık Yılmaz");
    expect(namesDump).toContain("v1:");
    expect(namesDump).toContain("bidx_v1:");
  });

  it("dışa aktarım çözülmüş değerleri içerir", async () => {
    const user = await registerTestUser();
    await addName(
      user.userId,
      { kind: "legal", value: "Ada Yılmaz", isPrimary: true },
      makeRequest("POST", "/api/vault/names", { cookie: user.cookie, csrf: user.csrf }),
    );
    const payload = await exportUserData(user.userId);
    expect(payload.names.map((n) => n.value)).toContain("Ada Yılmaz");
    expect(payload.user.email).toBe(user.email);
    expect(payload.limitations.join(" ")).toContain("evidence");
  });

  it("sahiplik beyanı profil sürümünü ve onay kaydını oluşturur", async () => {
    const user = await registerTestUser();
    const before = await getVault(user.userId);
    expect(before.profile.ownerDeclared).toBe(false);
    expect(before.scope.mode).toBe("read_only");
    expect(before.scope.searchContacts).toBe(false);

    await declareOwnership(user.userId, makeRequest("POST", "/api/vault/ownership"));
    const after = await getVault(user.userId);
    expect(after.profile.ownerDeclared).toBe(true);
    expect(after.consents.some((c) => c.scope === "ownership_declaration" && c.granted)).toBe(true);
  });

  it("kullanıcı silindiğinde tüm ilişkili kayıtlar cascade silinir", async () => {
    const user = await registerTestUser();
    await addName(
      user.userId,
      { kind: "legal", value: "Silinecek Kişi", isPrimary: true },
      makeRequest("POST", "/api/vault/names", { cookie: user.cookie, csrf: user.csrf }),
    );

    await deleteUserAccount(user.userId, makeRequest("DELETE", "/api/account"));

    const client = await getClient();
    const userCount = await client.execute({
      sql: "SELECT COUNT(*) AS c FROM users WHERE id = ?",
      args: [user.userId],
    });
    expect(Number(userCount.rows[0]!.c)).toBe(0);

    const profileCount = await client.execute({
      sql: "SELECT COUNT(*) AS c FROM identity_profiles WHERE user_id = ?",
      args: [user.userId],
    });
    expect(Number(profileCount.rows[0]!.c)).toBe(0);

    const auditCount = await client.execute({
      sql: "SELECT COUNT(*) AS c FROM audit_events WHERE user_id = ?",
      args: [user.userId],
    });
    expect(Number(auditCount.rows[0]!.c)).toBe(0);
  });

  it("migration'lar tekrar çalıştırılabilir", async () => {
    const client = await getClient();
    const before = await client.execute("SELECT COUNT(*) AS c FROM _migrations");
    const { closeDb, getClient: getClientAgain, getDb } = await import("@/server/db/client");
    await closeDb();
    await getDb();
    const reopened = await getClientAgain();
    const after = await reopened.execute("SELECT COUNT(*) AS c FROM _migrations");
    expect(Number(after.rows[0]!.c)).toBe(Number(before.rows[0]!.c));
  });
});
