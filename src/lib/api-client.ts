"use client";

/**
 * Browser-side API helper.
 *
 * The CSRF token lives in a readable cookie (double-submit); the session cookie
 * is HttpOnly and never touched by JavaScript. On 401 we send the user to the
 * login page instead of retrying.
 */

export class ApiClientError extends Error {
 readonly status: number;
 readonly code: string;
 readonly details?: unknown;

 constructor(status: number, code: string, message: string, details?: unknown) {
 super(message);
 this.name = "ApiClientError";
 this.status = status;
 this.code = code;
 this.details = details;
 }
}

function readCookie(name: string): string | null {
 if (typeof document === "undefined") return null;
 const parts = document.cookie.split(";");
 for (const part of parts) {
 const [rawName, ...rest] = part.trim().split("=");
 if (rawName === name) return decodeURIComponent(rest.join("="));
 }
 return null;
}

export async function apiFetch<T>(
 path: string,
 options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
 const headers: Record<string, string> = { Accept: "application/json" };
 if (options.body !== undefined) headers["Content-Type"] = "application/json";
 const csrf = readCookie("sc_csrf");
 if (csrf) headers["x-csrf-token"] = csrf;

 let response: Response;
 try {
 response = await fetch(path, {
 method: options.method ?? "GET",
 headers,
 credentials: "same-origin",
 body: options.body === undefined ? undefined : JSON.stringify(options.body),
 cache: "no-store",
 });
 } catch {
 throw new ApiClientError(0, "NETWORK_ERROR", "Could not reach the server");
 }

 if (response.status === 401) {
 if (typeof window !== "undefined") window.location.href = "/login";
 throw new ApiClientError(401, "UNAUTHENTICATED", "Session expired");
 }

 if (!response.ok) {
 let code = "UNKNOWN";
 let message = `Request failed (${response.status})`;
 let details: unknown;
 try {
 const parsed = (await response.json()) as {
 error?: { code?: string; message?: string; details?: unknown };
 };
 code = parsed.error?.code ?? code;
 message = parsed.error?.message ?? message;
 details = parsed.error?.details;
 } catch {
 // Non-JSON error body: keep the generic message.
 }
 throw new ApiClientError(response.status, code, message, details);
 }

 if (response.status === 204) return undefined as T;
 return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
 if (error instanceof ApiClientError) {
 if (Array.isArray(error.details) && error.details.length > 0) {
 const first = error.details[0] as { message?: unknown };
 if (typeof first.message === "string") return `${error.message}: ${first.message}`;
 }
 return error.message;
 }
 return error instanceof Error ? error.message : "An unexpected error occurred";
}
