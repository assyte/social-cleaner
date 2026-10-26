"use client";

import { useState, type FormEvent } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { buttonDanger, buttonSecondary, inputClass, labelClass } from "@/components/ui";

export function ExportButton() {
 return (
 <a href="/api/account/export" download className={buttonSecondary}>
 Download as JSON
 </a>
 );
}

export function DeleteAccountForm({ emailMasked }: { emailMasked: string }) {
 const [password, setPassword] = useState("");
 const [confirmation, setConfirmation] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [busy, setBusy] = useState(false);

 const ready = password.length > 0 && confirmation === "DELETE MY ACCOUNT";

 async function onSubmit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 if (!ready) return;
 if (
 !window.confirm(
 `The ${emailMasked} account and all vault data will be permanently deleted. This action cannot be undone.`,
 )
 ) {
 return;
 }
 setBusy(true);
 setError(null);
 try {
 await apiFetch("/api/account", {
 method: "DELETE",
 body: { password, confirmation },
 });
 window.location.href = "/login";
 } catch (err) {
 setError(errorMessage(err));
 setBusy(false);
 }
 }

 return (
 <form onSubmit={onSubmit} className="space-y-3">
 <div>
 <label htmlFor="delete-password" className={labelClass}>
 Password
 </label>
 <input
 id="delete-password"
 type="password"
 autoComplete="current-password"
 className={inputClass}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 />
 </div>
 <div>
 <label htmlFor="delete-confirmation" className={labelClass}>
 Confirmation phrase <span className="normal-case text-muted/70">(DELETE MY ACCOUNT)</span>
 </label>
 <input
 id="delete-confirmation"
 className={inputClass}
 value={confirmation}
 onChange={(e) => setConfirmation(e.target.value)}
 placeholder="DELETE MY ACCOUNT"
 autoComplete="off"
 />
 </div>

 {error ? (
 <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
 {error}
 </p>
 ) : null}

 <button type="submit" className={`${buttonDanger} w-full`} disabled={!ready || busy}>
 {busy ? "Deleting…" : "Permanently delete account and all data"}
 </button>
 <p className="text-xs leading-relaxed text-muted">
 Deletion revokes your sessions and removes the encrypted vault, search history, consent
 records, and audit log. This action cannot be undone.
 </p>
 </form>
 );
}
