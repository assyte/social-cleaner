import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * Prefixed, 128-bit random identifier. The prefix makes audit logs and support
 * conversations readable; the entropy makes identifiers unguessable (defence in
 * depth — authorization still filters by user_id).
 */
export function newId(prefix: string): string {
 const bytes = randomBytes(16);
 let out = "";
 for (let i = 0; i < bytes.length; i += 2) {
 const word = (bytes[i]! << 8) | bytes[i + 1]!;
 out += ALPHABET[word & 31]!;
 out += ALPHABET[(word >> 5) & 31]!;
 out += ALPHABET[(word >> 10) & 31]!;
 }
 return `${prefix}_${out}`;
}

export const ID_PREFIXES = {
 user: "usr",
 session: "ses",
 profile: "prf",
 name: "nam",
 alias: "als",
 contact: "cnt",
 link: "lnk",
 scope: "scp",
 consent: "cns",
 audit: "aud",
 finding: "fnd",
 evidence: "evd",
 job: "job",
 removal: "rmv",
 searchRun: "srch",
 searchResult: "srs",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/**
 * Shape check for identifiers arriving from the client. Prevents odd values from
 * reaching SQL and keeps logs clean; authorization still does the real work.
 */
export function isValidId(id: string, prefix: IdPrefix): boolean {
 return new RegExp(`^${prefix}_[0-9a-hj-km-np-tv-z]{24}$`).test(id);
}
