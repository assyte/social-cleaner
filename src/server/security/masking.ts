/**
 * Masking helpers. Anything that leaves the trust boundary (logs, audit metadata,
 * API responses for lists) goes through these functions.
 */

export function maskEmail(email: string): string {
 const at = email.lastIndexOf("@");
 if (at <= 0) return "***";
 const local = email.slice(0, at);
 const domain = email.slice(at + 1);
 const visible = local.slice(0, 1);
 return `${visible}${"*".repeat(Math.min(3, Math.max(1, local.length - 1)))}@${domain}`;
}

export function maskPhone(phone: string): string {
 const digits = phone.replace(/\D/g, "");
 if (digits.length <= 4) return "***";
 return `${phone.startsWith("+") ? "+" : ""}${"*".repeat(Math.max(3, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskName(name: string): string {
 return name
 .split(/\s+/)
 .filter(Boolean)
 .map((part) => `${part.slice(0, 1).toLocaleUpperCase("tr-TR")}${"•".repeat(Math.max(2, part.length - 1))}`)
 .join(" ");
}

export function maskHandle(handle: string): string {
 if (handle.length <= 3) return `${handle.slice(0, 1)}**`;
 return `${handle.slice(0, 2)}${"*".repeat(Math.min(4, handle.length - 3))}${handle.slice(-1)}`;
}

export type SensitiveKind = "email" | "phone" | "name" | "handle";

export function maskSensitive(value: string, kind: SensitiveKind): string {
 switch (kind) {
 case "email":
 return maskEmail(value);
 case "phone":
 return maskPhone(value);
 case "name":
 return maskName(value);
 case "handle":
 return maskHandle(value);
 }
}

/**
 * Audit metadata allow-list. Only these keys survive; everything else is dropped
 * so a careless caller cannot leak a name or e-mail into the audit trail.
 */
const AUDIT_META_KEYS = new Set([
 "field",
 "count",
 "provider",
 "reason",
 "depth",
 "mode",
 "platform",
 "kind",
 "changedFields",
 "via",
]);

export function sanitizeAuditMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
 if (!meta) return {};
 const out: Record<string, unknown> = {};
 for (const [key, value] of Object.entries(meta)) {
 if (!AUDIT_META_KEYS.has(key)) continue;
 if (typeof value === "string") {
 out[key] = value.slice(0, 120);
 } else if (typeof value === "number" || typeof value === "boolean") {
 out[key] = value;
 } else if (Array.isArray(value)) {
 out[key] = value.filter((v) => typeof v === "string").slice(0, 20);
 }
 }
 return out;
}
