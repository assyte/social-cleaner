import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/server/auth/cookies";
import { findSessionByToken, type AuthedSession } from "@/server/auth/session";

/**
 * Server-component session access. Kept in its own module so that the framework
 * dependency (`next/headers`, `next/navigation`) never leaks into the core
 * services that the worker and tests use.
 */
export async function getCurrentSession(): Promise<AuthedSession | null> {
 const jar = await cookies();
 return findSessionByToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requirePageSession(): Promise<AuthedSession> {
 const session = await getCurrentSession();
 if (!session) redirect("/login");
 return session;
}

export async function redirectIfAuthenticated(): Promise<void> {
 const session = await getCurrentSession();
 if (session) redirect("/dashboard");
}
