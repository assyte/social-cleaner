import { randomBytes } from "node:crypto";
import { registerRoute } from "@/server/api/auth-handlers";

export const TEST_ORIGIN = "http://localhost:3000";

export type TestSession = {
  cookie: string;
  csrf: string;
  userId: string;
  email: string;
  password: string;
};

export function makeRequest(
  method: string,
  path: string,
  options: {
    body?: unknown;
    cookie?: string;
    csrf?: string;
    origin?: string | null;
    ip?: string;
    omitJsonHeader?: boolean;
  } = {},
): Request {
  const headers = new Headers();
  if (options.body !== undefined && !options.omitJsonHeader) {
    headers.set("content-type", "application/json");
  }
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.csrf) headers.set("x-csrf-token", options.csrf);
  if (options.origin !== null) headers.set("origin", options.origin ?? TEST_ORIGIN);
  headers.set("sec-fetch-site", options.origin === null ? "cross-site" : "same-origin");
  headers.set("x-forwarded-for", options.ip ?? `10.0.0.${Math.floor(Math.random() * 200) + 1}`);

  return new Request(`${TEST_ORIGIN}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export function readAuthCookies(response: Response): { cookie: string; csrf: string } {
  const setCookies = response.headers.getSetCookie();
  let session = "";
  let csrf = "";
  for (const raw of setCookies) {
    const pair = raw.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name === "sc_session") session = `sc_session=${value}`;
    if (name === "sc_csrf") csrf = value;
  }
  return {
    cookie: [session, csrf ? `sc_csrf=${csrf}` : ""].filter(Boolean).join("; "),
    csrf,
  };
}

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}.${randomBytes(6).toString("hex")}@example.com`;
}

export async function registerTestUser(
  options: { email?: string; password?: string; displayName?: string; ip?: string } = {},
): Promise<TestSession> {
  const email = options.email ?? uniqueEmail();
  const password = options.password ?? "Test-Parola-12345";
  const response = await registerRoute(
    makeRequest("POST", "/api/auth/register", {
      body: { email, password, displayName: options.displayName ?? "Test Kullanıcı" },
      ip: options.ip,
    }),
  );
  if (response.status !== 201) {
    throw new Error(`Kayıt başarısız (${response.status}): ${await response.text()}`);
  }
  const body = (await response.json()) as { user: { id: string } };
  const { cookie, csrf } = readAuthCookies(response);
  return { cookie, csrf, userId: body.user.id, email, password };
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
