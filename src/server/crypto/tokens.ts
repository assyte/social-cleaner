import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
 return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(value: string | Buffer): string {
 return createHash("sha256").update(value).digest("hex");
}

/** Constant-time comparison of two secrets of arbitrary length. */
export function secretsEqual(a: string, b: string): boolean {
 const ha = createHash("sha256").update(a).digest();
 const hb = createHash("sha256").update(b).digest();
 return timingSafeEqual(ha, hb);
}
