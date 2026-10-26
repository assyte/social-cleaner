/**
 * Deletes the local database file (and WAL/SHM siblings).
 * Requires an explicit confirmation flag: `npm run db:reset -- --yes`
 */
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

if (!process.argv.includes("--yes")) {
  console.error("Bu komut tüm yerel veriyi siler. Onaylamak için: npm run db:reset -- --yes");
  process.exit(1);
}

const base = resolve(process.cwd(), "data", "app.db");
let removed = 0;
for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${base}${suffix}`;
  if (existsSync(file)) {
    rmSync(file);
    removed += 1;
    console.log(`Silindi: ${file}`);
  }
}
console.log(removed === 0 ? "Silinecek veritabanı bulunamadı." : "Yerel veritabanı sıfırlandı.");
