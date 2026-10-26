import { z } from "zod";
import { isValidEmail, normalizePhone } from "@/server/security/canonical";
import { assertUrlAllowed } from "@/server/security/ssrf-guard";

const period = z
 .string()
 .trim()
 .regex(/^(\d{4})(-\d{4})?$/, "Period must be in YYYY or YYYY-YYYY format")
 .optional();

export const nameKindSchema = z.enum(["legal", "former", "nickname", "transliteration"]);

export const addNameSchema = z.object({
 kind: nameKindSchema,
 value: z.string().trim().min(2, "At least 2 characters").max(120),
 isPrimary: z.boolean().optional().default(false),
 notes: z.string().trim().max(1000).optional(),
});

export const aliasOriginSchema = z.enum(["user_provided", "generated_variant"]);
export const aliasVerificationSchema = z.enum(["verified", "unverified", "rejected"]);

export const addAliasSchema = z.object({
 handle: z
 .string()
 .trim()
 .min(2, "At least 2 characters")
 .max(64)
 .regex(/^@?[\p{L}\p{N}._-]+$/u, "Use only letters, numbers, dots, underscores, and hyphens"),
 origin: aliasOriginSchema.optional().default("user_provided"),
 platforms: z.array(z.string().trim().min(1).max(32)).max(12).optional().default([]),
 startPeriod: period,
 endPeriod: period,
 notes: z.string().trim().max(1000).optional(),
});

export const updateAliasSchema = z
 .object({
 verification: aliasVerificationSchema.optional(),
 platforms: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
 startPeriod: period,
 endPeriod: period,
 notes: z.string().trim().max(1000).optional(),
 })
 .refine((v) => Object.keys(v).length > 0, "No fields to update");

export const contactSchema = z
 .object({
 kind: z.enum(["email", "phone"]),
 value: z.string().trim().min(3).max(254),
 consentSearch: z.boolean().optional().default(false),
 isPublic: z.boolean().optional().default(false),
 })
 .superRefine((value, ctx) => {
 if (value.kind === "email" && !isValidEmail(value.value)) {
 ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a valid email address" });
 }
 if (value.kind === "phone" && normalizePhone(value.value).replace(/\D/g, "").length < 8) {
 ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a valid phone number" });
 }
 });

export const linkKindSchema = z.enum(["profile", "website", "blog", "forum", "game", "other"]);

export const addLinkSchema = z.object({
 kind: linkKindSchema,
 url: z
 .string()
 .trim()
 .min(8)
 .max(2000)
 .refine((value) => {
 try {
 assertUrlAllowed(value);
 return true;
 } catch {
 return false;
 }
 }, "Only public http/https addresses can be added (private IPs and local addresses are not accepted)"),
 label: z.string().trim().max(120).optional(),
});

export const scopeSchema = z.object({
 mode: z.enum(["read_only", "remediation_enabled"]),
 depth: z.enum(["quick", "standard", "deep"]),
 platforms: z
 .array(z.string().trim().min(1).max(32).regex(/^[a-z0-9._-]+$/))
 .max(60)
 .optional()
 .default([]),
 searchName: z.boolean(),
 searchAliases: z.boolean(),
 searchContacts: z.boolean(),
 maxQueries: z.number().int().min(1).max(1000),
 maxDepth: z.number().int().min(1).max(5),
 maxCostCents: z.number().int().min(0).max(100_000),
});

export const ownershipSchema = z.object({
 declared: z.literal(true),
 confirmation: z.literal("I declare that this profile belongs to me"),
});

export const deleteAccountSchema = z.object({
 password: z.string().min(1).max(500),
 confirmation: z.literal("DELETE MY ACCOUNT"),
});

export const verificationDecisionSchema = z.object({
 verification: z.enum(["verified", "unverified", "rejected"]),
});

export type AddNameInput = z.infer<typeof addNameSchema>;
export type AddAliasInput = z.infer<typeof addAliasSchema>;
export type UpdateAliasInput = z.infer<typeof updateAliasSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type AddLinkInput = z.infer<typeof addLinkSchema>;
export type ScopeInput = z.infer<typeof scopeSchema>;
