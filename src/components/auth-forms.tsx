"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Card, InfoNote, buttonPrimary, inputClass, labelClass, linkClass } from "@/components/ui";
import { GitHubTextLink } from "@/components/support-cta";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError(null);
  setBusy(true);
  try {
  await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
  router.replace("/dashboard");
  router.refresh();
  } catch (err) {
  setError(errorMessage(err));
  } finally {
  setBusy(false);
  }
  }

  return (
  <Card className="p-6">
  <h1 className="text-lg font-semibold">Sign in</h1>
  <p className="mt-1 text-sm text-muted">
  Your identity vault and research scope are tied to your account.
  </p>

  <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
  <div>
  <label htmlFor="login-email" className={labelClass}>
  Email
  </label>
  <input
  id="login-email"
  type="email"
  autoComplete="email"
  required
  className={inputClass}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  />
  </div>
  <div>
  <label htmlFor="login-password" className={labelClass}>
  Password
  </label>
  <input
  id="login-password"
  type="password"
  autoComplete="current-password"
  required
  className={inputClass}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  />
  </div>

  {error ? (
  <p role="alert" aria-live="polite" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
  {error}
  </p>
  ) : null}

  <button type="submit" className={`${buttonPrimary} w-full`} disabled={busy}>
  {busy ? "Signing in…" : "Sign in"}
  </button>
  </form>

  <p className="mt-4 text-sm text-muted">
  New to Social Cleaner?{" "}
  <Link href="/register" className={linkClass}>
  Create an account
  </Link>
  </p>
  <div className="mt-4">
  <InfoNote>
  After five failed attempts, the account is locked for 15 minutes. Sessions expire after
  seven days.
  </InfoNote>
  </div>
  <p className="mt-4 text-sm text-muted">
  Free and open source. <GitHubTextLink className={linkClass}>Support on GitHub</GitHubTextLink>.
  </p>
  </Card>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError(null);

  if (password.length < 12) {
  setError("Password must be at least 12 characters.");
  return;
  }
  if (password !== confirm) {
  setError("Passwords do not match.");
  return;
  }

  setBusy(true);
  try {
  await apiFetch("/api/auth/register", {
  method: "POST",
  body: { email, password, displayName: displayName.trim() || undefined },
  });
  router.replace("/dashboard");
  router.refresh();
  } catch (err) {
  setError(errorMessage(err));
  } finally {
  setBusy(false);
  }
  }

  return (
  <Card className="p-6">
  <h1 className="text-lg font-semibold">Create your research profile</h1>
  <p className="mt-1 text-sm text-muted">
  For your own identity only. Your profile is private by default and never visible to
  other users.
  </p>

  <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
  <div>
  <label htmlFor="reg-email" className={labelClass}>
  Email
  </label>
  <input
  id="reg-email"
  type="email"
  autoComplete="email"
  required
  className={inputClass}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  />
  </div>
  <div>
  <label htmlFor="reg-name" className={labelClass}>
  Display name <span className="normal-case text-muted/70">(optional)</span>
  </label>
  <input
  id="reg-name"
  type="text"
  autoComplete="nickname"
  maxLength={80}
  className={inputClass}
  value={displayName}
  onChange={(e) => setDisplayName(e.target.value)}
  />
  </div>
  <div>
  <label htmlFor="reg-password" className={labelClass}>
  Password
  </label>
  <input
  id="reg-password"
  type="password"
  autoComplete="new-password"
  required
  minLength={12}
  className={inputClass}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  />
  <p className="mt-1 text-sm text-muted">
  At least 12 characters. A long passphrase is safer than a short, complex password.
  </p>
  </div>
  <div>
  <label htmlFor="reg-confirm" className={labelClass}>
  Confirm password
  </label>
  <input
  id="reg-confirm"
  type="password"
  autoComplete="new-password"
  required
  className={inputClass}
  value={confirm}
  onChange={(e) => setConfirm(e.target.value)}
  />
  </div>

  {error ? (
  <p role="alert" aria-live="polite" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
  {error}
  </p>
  ) : null}

  <button type="submit" className={`${buttonPrimary} w-full`} disabled={busy}>
  {busy ? "Creating account…" : "Create account"}
  </button>
  </form>

  <p className="mt-4 text-sm text-muted">
  Already have an account?{" "}
  <Link href="/login" className={linkClass}>
  Sign in
  </Link>
  </p>
  <p className="mt-4 text-sm text-muted">
  Free and open source. <GitHubTextLink className={linkClass}>Support on GitHub</GitHubTextLink>.
  </p>
  </Card>
  );
}
