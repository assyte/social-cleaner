import { describe, expect, it } from "vitest";
import {
  canonicalName,
  foldTurkish,
  normalizeEmail,
  normalizeHandle,
  normalizePhone,
} from "@/server/security/canonical";
import { generateVariants } from "@/server/vault/variants";

describe("Türkçe normalizasyon", () => {
  it("karakterleri doğru katlar", () => {
    expect(foldTurkish("Işık Yılmaz")).toBe("Isik Yilmaz");
    expect(foldTurkish("ÇAĞLA ÖZTÜRK")).toBe("CAGLA OZTURK");
    expect(foldTurkish("Şükrü Güneş")).toBe("Sukru Gunes");
    expect(canonicalName("  Işık   Yılmaz ")).toBe("isik yilmaz");
    expect(canonicalName("Ayşe-Nur ÖZTÜRK")).toBe("ayse nur ozturk");
  });

  it("e-posta ve kullanıcı adını kanonikleştirir", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeHandle(" @Işık_Y. ")).toBe("isik_y.");
    expect(normalizeHandle("çagla.öz")).toBe("cagla.oz");
  });

  it("telefonu E.164 biçimine yaklaştırır", () => {
    expect(normalizePhone("0532 123 45 67")).toBe("+905321234567");
    expect(normalizePhone("+90 (532) 123 45 67")).toBe("+905321234567");
    expect(normalizePhone("0090 532 123 45 67")).toBe("+905321234567");
    expect(normalizePhone("5321234567")).toBe("+905321234567");
  });
});

describe("varyasyon üretimi", () => {
  const base = {
    names: ["Işık Yılmaz"],
    aliases: ["isik.yilmaz"],
    contacts: [
      { kind: "email" as const, value: "isik@example.com", consentSearch: false },
      { kind: "phone" as const, value: "+905321234567", consentSearch: false },
    ],
  };

  it("Türkçe katlama, sıra ve baş harf varyantları üretir", () => {
    const result = generateVariants(base);
    const values = result.names.map((v) => v.value);
    expect(values).toContain("Işık Yılmaz");
    expect(values).toContain("Isik Yilmaz");
    expect(values).toContain("Yılmaz Işık");
    expect(values).toContain("I. Yılmaz");
    expect(result.names.every((v) => v.usedAsEvidence === false)).toBe(true);
    expect(result.notice).toContain("none of them is evidence on its own");
  });

  it("ayraç varyantları üretir ve tekrarları temizler", () => {
    const result = generateVariants({
      names: [],
      aliases: ["isik.yilmaz"],
      contacts: [],
    });
    const values = result.aliases.map((v) => v.value);
    expect(values).toEqual(expect.arrayContaining(["isik_yilmaz", "isik-yilmaz", "isikyilmaz"]));
    expect(new Set(values).size).toBe(values.length);
  });

  it("onaysız iletişim bilgisini hiçbir varyanta koymaz", () => {
    const result = generateVariants(base);
    expect(result.contacts).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain("isik@example.com");
    expect(JSON.stringify(result)).not.toContain("905321234567");
  });

  it("onaylı iletişim bilgisini arama hipotezi olarak ekler", () => {
    const result = generateVariants({
      names: [],
      aliases: [],
      contacts: [
        { kind: "email", value: "isik@example.com", consentSearch: true },
        { kind: "phone", value: "+905321234567", consentSearch: true },
      ],
    });
    expect(result.contacts.map((v) => v.value)).toContain("isik@example.com");
    expect(result.contacts.map((v) => v.value)).toContain("905321234567");
  });

  it("çok kısa ve boş değerleri yok sayar", () => {
    const result = generateVariants({ names: ["A", " "], aliases: ["@", "x"], contacts: [] });
    expect(result.names).toHaveLength(0);
    expect(result.aliases).toHaveLength(0);
  });

  it("üretim üst sınırını aşmaz", () => {
    const names = Array.from({ length: 30 }, (_, i) => `Deneme İsim ${i}`);
    const result = generateVariants({ names, aliases: [], contacts: [] });
    expect(result.names.length).toBeLessThanOrEqual(24);
  });
});
