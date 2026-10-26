#!/usr/bin/env node
/**
 * One-time local setup: creates .env.local with a fresh 32-byte master key.
 * Never overwrites an existing file — rotating the key without a migration would
 * make every encrypted field unreadable.
 */
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  console.log(".env.local zaten var — değiştirilmedi.");
  console.log("Yeni anahtar gerekiyorsa önce mevcut veriyi dışa aktarın, sonra dosyayı silin.");
  process.exit(0);
}

const masterKey = randomBytes(32).toString("base64");

const content = `# Social Cleaner — yerel yapılandırma (git'e eklenmez)
# Bu anahtar tüm şifreli alanları korur. Kaybederseniz veriler çözülemez.
SC_MASTER_KEY=${masterKey}
SC_APP_URL=http://localhost:3000
SC_SEARCH_PROVIDER=mock
SC_AI_PROVIDER=mock
SC_BREACH_PROVIDER=disabled
`;

writeFileSync(envPath, content, { encoding: "utf8", mode: 0o600 });

console.log("Oluşturuldu: .env.local");
console.log("Sonraki adım: npm run db:migrate && npm run dev");
