import { foldTurkish, normalizeHandle, normalizeWhitespace } from "@/server/security/canonical";

/**
 * Query-variant generation.
 *
 * IMPORTANT: these values are HYPOTHESES, never evidence. Nothing here proves a
 * person used a handle. Every variant carries `usedAsEvidence: false` and the
 * research pipeline must treat `generated_variant` rows as queries only.
 */

export type VariantKind = "name" | "alias" | "contact";

export type Variant = {
 value: string;
 kind: VariantKind;
 reason: string;
 usedAsEvidence: false;
};

export type ContactLike = {
 kind: "email" | "phone";
 value: string;
 consentSearch: boolean;
};

export type VariantInput = {
 names: string[];
 aliases: string[];
 contacts: ContactLike[];
};

const MAX_NAMES = 24;
const MAX_ALIASES = 30;
const MAX_CONTACTS = 10;

function titleCaseAscii(value: string): string {
 return value
 .split(/\s+/)
 .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : word))
 .join(" ");
}

function nameVariants(raw: string): Variant[] {
 const base = normalizeWhitespace(raw);
 if (base.length < 2) return [];
 const tokens = base.split(" ").filter(Boolean);
 const folded = normalizeWhitespace(foldTurkish(base));
 const out: Array<{ value: string; reason: string }> = [
 { value: base, reason: "original" },
 { value: folded, reason: "turkish_fold" },
 ];
 if (folded !== base) out.push({ value: folded.toLowerCase(), reason: "turkish_fold_lower" });
 if (folded !== base) out.push({ value: titleCaseAscii(folded), reason: "turkish_fold_title" });

 if (tokens.length >= 2) {
 out.push({ value: [...tokens].reverse().join(" "), reason: "token_order" });
 out.push({ value: `${tokens[0]![0]}. ${tokens.slice(1).join(" ")}`, reason: "initial" });
 if (tokens.length >= 3) {
 out.push({
 value: `${tokens[0]} ${tokens[tokens.length - 1]}`,
 reason: "middle_removed",
 });
 }
 }

 return out.map((v) => ({ ...v, kind: "name" as const, usedAsEvidence: false as const }));
}

function aliasVariants(raw: string): Variant[] {
 const base = normalizeWhitespace(raw).replace(/^@+/, "");
 if (base.length < 2) return [];
 const normalized = normalizeHandle(base);
 if (!normalized) return [];

 const out: Array<{ value: string; reason: string }> = [
 { value: base, reason: "original" },
 { value: normalized, reason: "normalized" },
 ];

 if (/[._-]/.test(normalized)) {
 for (const sep of [".", "_", "-", ""]) {
 out.push({
 value: normalized.replace(/[._-]+/g, sep),
 reason: sep === "" ? "separator_none" : `separator_${sep === "." ? "dot" : sep === "_" ? "underscore" : "hyphen"}`,
 });
 }
 }

 // Common user-added noise around a handle.
 if (/\d{2,4}$/.test(normalized)) {
 out.push({ value: normalized.replace(/\d{2,4}$/, ""), reason: "suffix_digits_removed" });
 }

 return out.map((v) => ({ ...v, kind: "alias" as const, usedAsEvidence: false as const }));
}

function contactVariants(contact: ContactLike): Variant[] {
 if (!contact.consentSearch) return [];
 const value = normalizeWhitespace(contact.value);
 if (!value) return [];
 const out: Variant[] = [
 { value, kind: "contact", reason: "provided_contact", usedAsEvidence: false },
 ];
 if (contact.kind === "phone") {
 const digits = value.replace(/\D/g, "");
 if (digits) out.push({ value: digits, kind: "contact", reason: "digits_only", usedAsEvidence: false });
 }
 return out;
}

function dedupe(variants: Variant[], limit: number): Variant[] {
 const seen = new Set<string>();
 const out: Variant[] = [];
 for (const variant of variants) {
 const key = variant.value.toLocaleLowerCase("tr-TR");
 if (!key || seen.has(key)) continue;
 seen.add(key);
 out.push(variant);
 if (out.length >= limit) break;
 }
 return out;
}

export function generateVariants(input: VariantInput): {
 names: Variant[];
 aliases: Variant[];
 contacts: Variant[];
 total: number;
 notice: string;
} {
 const names = dedupe(input.names.flatMap(nameVariants), MAX_NAMES);
 const aliases = dedupe(input.aliases.flatMap(aliasVariants), MAX_ALIASES);
 const contacts = dedupe(input.contacts.flatMap(contactVariants), MAX_CONTACTS);
 return {
 names,
 aliases,
 contacts,
 total: names.length + aliases.length + contacts.length,
 notice:
 "These values are search hypotheses only; none of them is evidence on its own. " +
 "Contact information is listed only when explicit consent was given.",
 };
}
