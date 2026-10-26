import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
 identityProfiles,
 researchScopes,
 users,
 type UserRow,
} from "@/server/db/schema";
import { blindIndex } from "@/server/crypto/blind-index";
import { checkPasswordPolicy, dummyHash, hashPassword, verifyPassword } from "@/server/crypto/password";
import { normalizeEmail } from "@/server/security/canonical";
import { decryptField, encryptField, safeDecryptField } from "@/server/crypto/field-cipher";
import { maskEmail } from "@/server/security/masking";
import { ApiError, badRequest, conflict } from "@/server/http/errors";
import { newId, ID_PREFIXES } from "@/server/ids";
import { createSession } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import type { LoginInput, RegisterInput } from "@/server/auth/schemas";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type PublicUser = {
 id: string;
 emailMasked: string;
 displayName: string | null;
 role: string;
 plan: "free" | "pro";
 createdAt: number;
};

export function toPublicUser(user: UserRow): PublicUser {
 const email = safeDecryptField(user.emailEnc, "users.email", "");
 return {
 id: user.id,
 emailMasked: email ? maskEmail(email) : "[unavailable]",
 displayName: user.displayNameEnc
 ? safeDecryptField(user.displayNameEnc, "users.display_name", "")
 : null,
 role: user.role,
 plan: user.plan === "pro" ? "pro" : "free",
 createdAt: user.createdAt,
 };
}

export type AuthResult = {
 user: PublicUser;
 token: string;
 csrfToken: string;
 expiresAt: number;
};

export async function registerAccount(
 input: RegisterInput,
 request: Request,
): Promise<AuthResult> {
 const email = normalizeEmail(input.email);
 const issues = checkPasswordPolicy(input.password, email);
 if (issues.length > 0) {
 throw badRequest("Password policy not met", issues.map((i) => ({ path: "password", message: i.message })));
 }

 const db = await getDb();
 const emailBidx = blindIndex("email", email);
 const existing = await db
 .select({ id: users.id })
 .from(users)
 .where(eq(users.emailBidx, emailBidx))
 .limit(1);
 if (existing.length > 0) {
 throw conflict("EMAIL_TAKEN", "An account with this email already exists");
 }

 const passwordHash = await hashPassword(input.password);
 const userId = newId(ID_PREFIXES.user);
 const now = Date.now();

 try {
 await db.transaction(async (tx) => {
 await tx.insert(users).values({
 id: userId,
 emailEnc: encryptField(email, "users.email"),
 emailBidx,
 passwordHash,
 displayNameEnc: input.displayName
 ? encryptField(input.displayName, "users.display_name")
 : null,
 role: "user",
 status: "active",
 createdAt: now,
 updatedAt: now,
 });

 const profileId = newId(ID_PREFIXES.profile);
 await tx.insert(identityProfiles).values({
 id: profileId,
 userId,
 version: 1,
 createdAt: now,
 updatedAt: now,
 });

 await tx.insert(researchScopes).values({
 id: newId(ID_PREFIXES.scope),
 profileId,
 mode: "read_only",
 depth: "standard",
 createdAt: now,
 updatedAt: now,
 });
 });
 } catch (error) {
 // Unique index race between the SELECT above and the INSERT.
 if (error instanceof Error && /unique|constraint/i.test(error.message)) {
 throw conflict("EMAIL_TAKEN", "An account with this email already exists");
 }
 throw error;
 }

 const session = await createSession(userId, request);
 await recordAudit({
 userId,
 action: "account.register",
 entityType: "user",
 entityId: userId,
 request,
 });

 const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
 return {
 user: toPublicUser(rows[0]!),
 token: session.token,
 csrfToken: session.csrfToken,
 expiresAt: session.expiresAt,
 };
}

export async function loginAccount(input: LoginInput, request: Request): Promise<AuthResult> {
 const email = normalizeEmail(input.email);
 const db = await getDb();
 const rows = await db
 .select()
 .from(users)
 .where(eq(users.emailBidx, blindIndex("email", email)))
 .limit(1);

 const user = rows[0];
 if (!user) {
 // Equalise timing so account existence cannot be probed.
 await verifyPassword(await dummyHash(), input.password);
 throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
 }

 const now = Date.now();
 if (user.lockedUntil && user.lockedUntil > now) {
 const retryAfterSec = Math.ceil((user.lockedUntil - now) / 1000);
 await recordAudit({
 userId: user.id,
 action: "auth.login",
 outcome: "denied",
 meta: { reason: "locked" },
 request,
 });
 throw new ApiError(429, "ACCOUNT_LOCKED", "Too many failed attempts. Please try again later.", {
 retryAfterSec,
 });
 }

 const ok = await verifyPassword(user.passwordHash, input.password);
 if (!ok) {
 const failed = user.failedLoginCount + 1;
 await db
 .update(users)
 .set({
 failedLoginCount: failed,
 lockedUntil: failed >= MAX_FAILED_LOGINS ? now + LOCKOUT_MS : null,
 updatedAt: now,
 })
 .where(eq(users.id, user.id));
 await recordAudit({
 userId: user.id,
 action: "auth.login",
 outcome: "failure",
 meta: { reason: "bad_password" },
 request,
 });
 throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
 }

 if (user.status !== "active") {
 throw new ApiError(403, "ACCOUNT_DISABLED", "This account is disabled");
 }

 await db
 .update(users)
 .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now, updatedAt: now })
 .where(eq(users.id, user.id));

 const session = await createSession(user.id, request);
 await recordAudit({ userId: user.id, action: "auth.login", request });

 const decryptedEmail = safeDecryptField(user.emailEnc, "users.email", "");
 return {
 user: { ...toPublicUser(user), emailMasked: decryptedEmail ? maskEmail(decryptedEmail) : "[unavailable]" },
 token: session.token,
 csrfToken: session.csrfToken,
 expiresAt: session.expiresAt,
 };
}

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
 const db = await getDb();
 const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
 const user = rows[0];
 if (!user) return false;
 return verifyPassword(user.passwordHash, password);
}

export function revealEmail(user: UserRow): string | null {
 try {
 return decryptField(user.emailEnc, "users.email");
 } catch {
 return null;
 }
}
