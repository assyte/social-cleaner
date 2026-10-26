import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { sessions, users, type SessionRow, type UserRow } from "@/server/db/schema";
import { randomToken, sha256Hex } from "@/server/crypto/tokens";
import { newId, ID_PREFIXES } from "@/server/ids";
import { SESSION_TTL_MS, ipHashFromRequest, userAgentHashFromRequest } from "@/server/auth/cookies";

export type AuthedSession = {
 user: UserRow;
 session: SessionRow;
 token: string;
};

export async function createSession(
 userId: string,
 request: Request,
): Promise<{ token: string; csrfToken: string; expiresAt: number }> {
 const db = await getDb();
 const token = randomToken(32);
 const csrfToken = randomToken(32);
 const now = Date.now();
 const expiresAt = now + SESSION_TTL_MS;

 await db.insert(sessions).values({
 id: newId(ID_PREFIXES.session),
 userId,
 tokenHash: sha256Hex(token),
 csrfHash: sha256Hex(csrfToken),
 ipHash: ipHashFromRequest(request),
 userAgentHash: userAgentHashFromRequest(request),
 createdAt: now,
 lastSeenAt: now,
 expiresAt,
 });

 // Opportunistic cleanup: expired sessions older than a day.
 await db
 .delete(sessions)
 .where(lt(sessions.expiresAt, now - 24 * 60 * 60 * 1000))
 .catch(() => undefined);

 return { token, csrfToken, expiresAt };
}

export async function findSessionByToken(token: string | undefined | null): Promise<AuthedSession | null> {
 if (!token || token.length < 20) return null;
 const db = await getDb();
 const rows = await db
 .select({ session: sessions, user: users })
 .from(sessions)
 .innerJoin(users, eq(users.id, sessions.userId))
 .where(
 and(
 eq(sessions.tokenHash, sha256Hex(token)),
 isNull(sessions.revokedAt),
 gt(sessions.expiresAt, Date.now()),
 ),
 )
 .limit(1);

 const row = rows[0];
 if (!row) return null;
 if (row.user.status !== "active") return null;

 // Avoid a write on every request: refresh activity at most every 5 minutes.
 if (Date.now() - row.session.lastSeenAt > 5 * 60 * 1000) {
 await db
 .update(sessions)
 .set({ lastSeenAt: Date.now() })
 .where(eq(sessions.id, row.session.id))
 .catch(() => undefined);
 }

 return { user: row.user, session: row.session, token };
}

export async function revokeSession(sessionId: string): Promise<void> {
 const db = await getDb();
 await db.update(sessions).set({ revokedAt: Date.now() }).where(eq(sessions.id, sessionId));
}

export async function revokeAllSessions(userId: string): Promise<void> {
 const db = await getDb();
 await db
 .update(sessions)
 .set({ revokedAt: Date.now() })
 .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
