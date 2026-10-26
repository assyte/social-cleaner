import { createHmac, hkdfSync } from "node:crypto";
import { getEnv } from "@/server/config/env";

/**
 * Blind index: deterministic, keyed HMAC over a canonicalised value.
 *
 * Used to answer equality questions ("is this e-mail already registered?",
 * "which rows share this name?") without storing or comparing plaintext.
 * The domain is part of the message so that an e-mail and a name with the same
 * canonical form never collide, and an index from one field cannot be replayed
 * into another.
 */

export const BLIND_INDEX_PREFIX = "bidx_v1";
const BLIND_INDEX_INFO = "social-cleaner/blind-index/v1";

export type BlindIndexDomain = "email" | "phone" | "name" | "handle" | "domain";

let cachedKey: { raw: Buffer; key: Buffer } | null = null;

function indexKey(): Buffer {
 const env = getEnv();
 if (cachedKey && cachedKey.raw.equals(env.masterKey)) return cachedKey.key;
 const derived = Buffer.from(hkdfSync("sha256", env.masterKey, Buffer.alloc(0), BLIND_INDEX_INFO, 32));
 cachedKey = { raw: env.masterKey, key: derived };
 return derived;
}

export function blindIndex(domain: BlindIndexDomain, canonicalValue: string): string {
 const mac = createHmac("sha256", indexKey());
 mac.update(domain);
 mac.update("\u0000");
 mac.update(canonicalValue);
 return `${BLIND_INDEX_PREFIX}:${mac.digest("base64url")}`;
}

export function blindIndexesEqual(a: string, b: string): boolean {
 return a === b;
}

export function resetBlindIndexCache(): void {
 cachedKey = null;
}
