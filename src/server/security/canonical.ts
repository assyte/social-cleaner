/**
 * Canonicalisation used by blind indexes, variant generation and dedupe.
 * Deliberately dependency-free so the same rules can run on the client preview.
 */

const TURKISH_MAP: Record<string, string> = {
 ç: "c",
 Ç: "C",
 ğ: "g",
 Ğ: "G",
 ı: "i",
 İ: "I",
 ö: "o",
 Ö: "O",
 ş: "s",
 Ş: "S",
 ü: "u",
 Ü: "U",
 â: "a",
 Â: "A",
 î: "i",
 Î: "I",
 û: "u",
 Û: "U",
};

/** Turkish-aware ASCII folding. Order matters: map before NFD normalisation. */
export function foldTurkish(input: string): string {
 let out = "";
 for (const ch of input.normalize("NFC")) {
 out += TURKISH_MAP[ch] ?? ch;
 }
 return out.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeWhitespace(input: string): string {
 return input.replace(/\s+/g, " ").trim();
}

/** Canonical name: folded, lower-case, punctuation removed, single spaces. */
export function canonicalName(input: string): string {
 return normalizeWhitespace(
 foldTurkish(input)
 .toLowerCase()
 .replace(/[^\p{L}\p{N}\s]/gu, " ")
 .replace(/\s+/g, " "),
 ).trim();
}

export function normalizeEmail(input: string): string {
 return input.trim().toLowerCase().normalize("NFKC");
}

export function isValidEmail(input: string): boolean {
 const value = normalizeEmail(input);
 if (value.length > 254) return false;
 // Intentionally conservative: no quoted local parts, no IP literals.
 return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
 value,
 );
}

/**
 * Phone canonicalisation to E.164-ish form. Turkish local numbers (`05xx…`),
 * `0090…` and `90…` inputs converge to `+90…`. Anything unparseable is returned
 * digit-only with a leading `+` when it was present.
 */
export function normalizePhone(input: string): string {
 const hasPlus = input.trim().startsWith("+");
 let digits = input.replace(/[^\d]/g, "");
 if (!digits) return "";
 if (digits.startsWith("00")) digits = digits.slice(2);
 if (digits.startsWith("0") && digits.length === 11) digits = `90${digits.slice(1)}`;
 else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
 if (hasPlus || digits.length > 11) return `+${digits}`;
 return `+${digits}`;
}

/** Handle canonical form used for exact-match correlation. */
export function normalizeHandle(input: string): string {
 return foldTurkish(input)
 .toLowerCase()
 .trim()
 .replace(/^@+/, "")
 .replace(/[\s]+/g, "")
 .replace(/[^\p{L}\p{N}._-]/gu, "");
}

/** Hostname canonical form: lowercase, strip `www.`, trailing dot. */
export function normalizeHostname(input: string): string {
 return input.trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}
