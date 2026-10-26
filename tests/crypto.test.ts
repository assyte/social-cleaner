import { describe, expect, it } from "vitest";
import {
  FieldDecryptError,
  decryptField,
  encryptField,
  resetFieldCipherCache,
  safeDecryptField,
} from "@/server/crypto/field-cipher";
import { blindIndex } from "@/server/crypto/blind-index";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/server/crypto/password";
import { getEnv, resetEnvCache } from "@/server/config/env";
import { randomToken, secretsEqual, sha256Hex } from "@/server/crypto/tokens";

describe("alan şifreleme (AES-256-GCM)", () => {
  it("gidiş-dönüş yapar ve her seferinde farklı şifreli metin üretir", () => {
    const a = encryptField("Ada Yılmaz", "identity_names.value");
    const b = encryptField("Ada Yılmaz", "identity_names.value");
    expect(a).not.toBe(b);
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toContain("Ada");
    expect(decryptField(a, "identity_names.value")).toBe("Ada Yılmaz");
    expect(decryptField(b, "identity_names.value")).toBe("Ada Yılmaz");
  });

  it("farklı alan (AAD) ile çözmez", () => {
    const payload = encryptField("gizli@example.com", "identity_contacts.value");
    expect(() => decryptField(payload, "users.email")).toThrow(FieldDecryptError);
  });

  it("kurcalanmış şifreli metni reddeder", () => {
    const payload = encryptField("Ada", "identity_names.value");
    const parts = payload.split(":");
    const ct = Buffer.from(parts[3]!, "base64url");
    ct[0] = ct[0]! ^ 0xff;
    parts[3] = ct.toString("base64url");
    expect(() => decryptField(parts.join(":"), "identity_names.value")).toThrow(FieldDecryptError);
  });

  it("bozuk zarfta hata verir, safeDecryptField yedek değer döner", () => {
    expect(() => decryptField("v1:abc", "identity_names.value")).toThrow(FieldDecryptError);
    expect(safeDecryptField("bozuk", "identity_names.value")).toBe("[unavailable]");
    expect(safeDecryptField("bozuk", "identity_names.value", "yok")).toBe("yok");
  });

  it("farklı anahtar eski veriyi çözemez", () => {
    const payload = encryptField("Ada", "identity_names.value");
    const original = getEnv().masterKey;
    try {
      process.env.SC_MASTER_KEY = Buffer.alloc(32, 9).toString("base64");
      resetEnvCache();
      resetFieldCipherCache();
      expect(() => decryptField(payload, "identity_names.value")).toThrow(FieldDecryptError);
    } finally {
      process.env.SC_MASTER_KEY = original.toString("base64");
      resetEnvCache();
      resetFieldCipherCache();
    }
  });
});

describe("kör indeks", () => {
  it("deterministik ve alan ayrımlıdır", () => {
    const a = blindIndex("email", "ada@example.com");
    const b = blindIndex("email", "ada@example.com");
    const c = blindIndex("name", "ada@example.com");
    const d = blindIndex("email", "bora@example.com");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
    expect(a.startsWith("bidx_v1:")).toBe(true);
    expect(a).not.toContain("ada");
  });
});

describe("parola özeti ve politikası", () => {
  it("scrypt özeti doğrular, yanlış parolayı reddeder", async () => {
    const hash = await hashPassword("Doğru-Parola-9876");
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(hash).not.toContain("Doğru-Parola-9876");
    await expect(verifyPassword(hash, "Doğru-Parola-9876")).resolves.toBe(true);
    await expect(verifyPassword(hash, "yanlis-parola-123")).resolves.toBe(false);
  });

  it("bozuk özet biçimini reddeder", async () => {
    await expect(verifyPassword("düz-metin", "x")).resolves.toBe(false);
    await expect(verifyPassword("scrypt$1$1$1$aa$bb", "x")).resolves.toBe(false);
  });

  it("politika: uzunluk, yaygın parola ve e-posta içerme", () => {
    expect(checkPasswordPolicy("kisa")).not.toHaveLength(0);
    expect(checkPasswordPolicy("password1234")).not.toHaveLength(0);
    expect(checkPasswordPolicy("parola123456")).not.toHaveLength(0);
    expect(checkPasswordPolicy("aaaaaabbbbbb")).not.toHaveLength(0);
    expect(checkPasswordPolicy("Guclu-Parola-2026", "ada@example.com")).toHaveLength(0);
    expect(checkPasswordPolicy("Guclu-Parola-2026", "guclu@example.com").map((i) => i.code)).toContain(
      "contains_email",
    );
  });
});

describe("token yardımcıları", () => {
  it("yeterli entropi üretir ve sabit zamanlı karşılaştırır", () => {
    const token = randomToken(32);
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(new Set(Array.from({ length: 20 }, () => randomToken(16))).size).toBe(20);
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(sha256Hex("abc")).toHaveLength(64);
  });
});
