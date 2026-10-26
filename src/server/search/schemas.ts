import { z } from "zod";
import { SEARCH_FIELDS } from "@/server/billing/plans";

export const searchRequestSchema = z.object({
 fieldType: z.enum(SEARCH_FIELDS),
 query: z.string().trim().min(2, "Use at least 2 characters").max(120, "Use at most 120 characters"),
 /** Required for username scans; optional for web-search runs. */
 // Hard request cap; the per-plan limit (Free 8 / Pro 40) is enforced in the handler.
 platforms: z.array(z.string().trim().min(1).max(40)).max(40).optional().default([]),
});

export type SearchRequestInput = z.infer<typeof searchRequestSchema>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{6,19}$/;

export function validateSearchQuery(fieldType: (typeof SEARCH_FIELDS)[number], raw: string): string {
 const query = raw.trim();
 if (fieldType === "email" && !EMAIL_PATTERN.test(query)) {
 throw new Error("Enter a valid email address.");
 }
 if (fieldType === "phone") {
 const digits = query.replace(/\D/g, "");
 if (!PHONE_PATTERN.test(query) || digits.length < 7) {
 throw new Error("Enter a phone number with country code and at least 7 digits.");
 }
 }
 if (fieldType === "name") {
 if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,119}$/u.test(query)) {
 throw new Error("A full name may contain letters, spaces, apostrophes, and hyphens.");
 }
 }
 return query;
}
