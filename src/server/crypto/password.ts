import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
 password: string | Buffer,
 salt: string | Buffer,
 keylen: number,
 options: ScryptOptions,
) => Promise<Buffer>;

/**
 * scrypt parameters. N=2^15 with r=8 needs ~32 MiB; maxmem is raised so the
 * derivation does not fail. These values are stored inside each hash so a future
 * increase can be applied without invalidating existing passwords.
 */
const PARAMS = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 } as const;
const SALT_BYTES = 16;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

export function hashPassword(password: string): Promise<string> {
 const salt = randomBytes(SALT_BYTES);
 return scryptAsync(password.normalize("NFKC"), salt, PARAMS.keylen, {
 N: PARAMS.N,
 r: PARAMS.r,
 p: PARAMS.p,
 maxmem: PARAMS.maxmem,
 }).then(
 (hash) =>
 `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`,
 );
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
 const parts = stored.split("$");
 if (parts.length !== 6 || parts[0] !== "scrypt") return false;
 const n = Number(parts[1]);
 const r = Number(parts[2]);
 const p = Number(parts[3]);
 // Bound the work factor read from storage so a tampered row cannot cause a DoS.
 if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
 if (n < 16384 || n > 131072 || r < 8 || r > 16 || p < 1 || p > 4) return false;

 let salt: Buffer;
 let expected: Buffer;
 try {
 salt = Buffer.from(parts[4]!, "base64url");
 expected = Buffer.from(parts[5]!, "base64url");
 } catch {
 return false;
 }
 if (salt.length < 8 || expected.length < 32) return false;

 const actual = (await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
 N: n,
 r,
 p,
 maxmem: PARAMS.maxmem,
 })) as Buffer;
 return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Used to equalise timing when the e-mail does not exist. */
let dummyHashPromise: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
 dummyHashPromise ??= hashPassword("dummy-password-for-timing-equalisation");
 return dummyHashPromise;
}

const COMMON_PASSWORDS = new Set([
 "password",
 "password1",
 "password123",
 "123456789012",
 "qwertyuiop12",
 "letmein12345",
 "admin123456",
 "welcome12345",
 "iloveyou1234",
 "socialcleaner",
 "sifre123456",
 "parola123456",
 "123456789abc",
 "aaaaaaaaaaaa",
]);

export type PasswordIssue = { code: string; message: string };

/**
 * Password policy. Deliberately length-first: no forced character classes, which
 * pushes users toward predictable patterns. Offline guessing is mitigated by
 * scrypt, online guessing by rate limiting and lockout.
 */
export function checkPasswordPolicy(password: string, email?: string): PasswordIssue[] {
 const issues: PasswordIssue[] = [];
 const value = password.normalize("NFKC");

 if (value.length < PASSWORD_MIN_LENGTH) {
 issues.push({
 code: "too_short",
 message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
 });
 }
 if (value.length > PASSWORD_MAX_LENGTH) {
 issues.push({ code: "too_long", message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` });
 }
 if (COMMON_PASSWORDS.has(value.toLowerCase())) {
 issues.push({ code: "common", message: "This password appears on known password lists" });
 }
 // Common stem + optional digits/symbols, e.g. "Password1234!", "parola_2026".
 if (/^(password|parola|sifre|şifre|qwerty|letmein|admin|welcome|iloveyou|123456)[\W_]*\d*[!._-]*$/i.test(value)) {
 issues.push({ code: "common", message: "This password contains an easily guessed pattern" });
 }
 if (new Set(value).size < 5) {
 issues.push({ code: "low_entropy", message: "Password contains too few distinct characters" });
 }
 if (email) {
 const local = email.split("@")[0]?.toLowerCase() ?? "";
 if (local.length >= 3 && value.toLowerCase().includes(local)) {
 issues.push({ code: "contains_email", message: "Password must not contain your email address" });
 }
 }
 return issues;
}
