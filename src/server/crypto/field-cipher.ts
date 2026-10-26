import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";

/**
 * Field-level encryption for P2 data (names, e-mails, phones, free-text notes).
 *
 * Format: `v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>`
 *
 * - AES-256-GCM, 12-byte IV, 16-byte auth tag.
 * - `aad` is the field path (e.g. `identity_names.value`) and is authenticated,
 * so ciphertext cannot be moved between fields or rows without detection.
 * - The `v1` envelope allows a future key rotation migration.
 */

export const CIPHER_PREFIX = "v1";
export const ENCRYPTION_INFO = "social-cleaner/field/v1";

export class FieldDecryptError extends Error {
 constructor(message = "Encrypted field could not be decrypted") {
 super(message);
 this.name = "FieldDecryptError";
 }
}

let cachedMaster: { raw: Buffer; key: Buffer } | null = null;

function fieldKey(): Buffer {
 const env = getEnv();
 if (cachedMaster && cachedMaster.raw.equals(env.masterKey)) return cachedMaster.key;
 const derived = Buffer.from(hkdfSync("sha256", env.masterKey, Buffer.alloc(0), ENCRYPTION_INFO, 32));
 cachedMaster = { raw: env.masterKey, key: derived };
 return derived;
}

export function encryptField(plaintext: string, aad: string): string {
 const iv = randomBytes(12);
 const cipher = createCipheriv("aes-256-gcm", fieldKey(), iv);
 cipher.setAAD(Buffer.from(aad, "utf8"));
 const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
 const tag = cipher.getAuthTag();
 return [
 CIPHER_PREFIX,
 iv.toString("base64url"),
 tag.toString("base64url"),
 ct.toString("base64url"),
 ].join(":");
}

export function decryptField(payload: string, aad: string): string {
 const parts = payload.split(":");
 if (parts.length !== 4 || parts[0] !== CIPHER_PREFIX) {
 throw new FieldDecryptError("Unknown encryption envelope");
 }
 const [, ivB64, tagB64, ctB64] = parts;
 try {
 const iv = Buffer.from(ivB64!, "base64url");
 const tag = Buffer.from(tagB64!, "base64url");
 const ct = Buffer.from(ctB64!, "base64url");
 if (iv.length !== 12 || tag.length !== 16) throw new FieldDecryptError();
 const decipher = createDecipheriv("aes-256-gcm", fieldKey(), iv);
 decipher.setAAD(Buffer.from(aad, "utf8"));
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
 } catch (err) {
 if (err instanceof FieldDecryptError) throw err;
 throw new FieldDecryptError();
 }
}

/** Never let one corrupted field break a whole page. */
export function safeDecryptField(payload: string, aad: string, fallback = "[unavailable]"): string {
 try {
 return decryptField(payload, aad);
 } catch {
 return fallback;
 }
}

/** Test helper: clear memoised derived key after an environment change. */
export function resetFieldCipherCache(): void {
 cachedMaster = null;
}
