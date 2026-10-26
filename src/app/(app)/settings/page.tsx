import type { Metadata } from "next";
import { requirePageSession } from "@/server/auth/current";
import { toPublicUser } from "@/server/auth/service";
import { listAuditEvents } from "@/server/vault/service";
import { getEnv } from "@/server/config/env";
import { planForUser } from "@/server/billing/plans";
import { searchProviderStatus } from "@/server/search/providers";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, CardHeader, InfoNote, PageHeader, buttonSecondary } from "@/components/ui";
import { GitHubButton } from "@/components/support-cta";
import { DeleteAccountForm, ExportButton } from "@/components/settings-actions";
import Link from "next/link";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
 const session = await requirePageSession();
 const user = toPublicUser(session.user);
 const plan = planForUser(session.user);
 const audit = await listAuditEvents(session.user.id, 25);
 const providers = getEnv().providers;
 const searchProvider = searchProviderStatus();

 const providerRows = [
 { label: "Search provider", name: providers.search.name, configured: searchProvider.configured },
 { label: "AI provider", name: providers.ai.name, configured: providers.ai.name !== "mock" },
 { label: "Breach monitoring", name: providers.breach.name, configured: providers.breach.name !== "disabled" },
 ];

 return (
 <div>
 <PageHeader
 eyebrow="Settings & Security"
 title="Settings & security"
 description="Session details, data retention, provider status, audit logs, and account deletion."
 actions={<Badge tone="accent">Encrypted vault</Badge>}
 />

 <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
 <div className="space-y-4">
 <Card>
 <CardHeader title="Account & session" description="The session cookie is inaccessible to JavaScript (HttpOnly)." />
 <dl className="divide-y divide-line text-xs">
 {[
 ["Email", user.emailMasked],
 ["Plan", plan.name],
 ["Role", user.role],
 ["Account created", formatDateTime(user.createdAt)],
 ["Session expires", formatDateTime(session.session.expiresAt)],
 ["Session ID", session.session.id],
 ["Cookie policy", "HttpOnly · SameSite=Lax · 7 days"],
 ].map(([label, value]) => (
 <div key={label} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
 <dt className="text-muted">{label}</dt>
 <dd className="font-mono text-xs text-fg/90">{value}</dd>
 </div>
 ))}
 </dl>
 </Card>

 <Card id="audit">
 <CardHeader
 title="Audit log"
 description="The 25 most recent events. Personal data is masked; records are retained for 365 days."
 aside={<Badge>{audit.events.length}</Badge>}
 />
 {audit.events.length === 0 ? (
 <p className="px-5 py-4 text-xs text-muted">No events yet.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="border-b border-line text-xs text-muted">
 <tr>
 <th className="px-5 py-2 font-medium">Action</th>
 <th className="px-5 py-2 font-medium">Entity</th>
 <th className="px-5 py-2 font-medium">Outcome</th>
 <th className="px-5 py-2 text-right font-medium">Time</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-line">
 {audit.events.map((event) => (
 <tr key={event.id}>
 <td className="px-5 py-2 font-mono text-xs text-fg/90">{event.action}</td>
 <td className="px-5 py-2 text-xs text-muted">{event.entityType ?? "—"}</td>
 <td className="px-5 py-2">
 <Badge tone={event.outcome === "success" ? "accent" : "warn"}>{event.outcome}</Badge>
 </td>
 <td className="px-5 py-2 text-right text-xs text-muted">
 {formatDateTime(event.createdAt)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>

 <Card>
 <CardHeader
 title="Danger zone"
 description="Account deletion cannot be undone. Both your password and the confirmation phrase are required."
 aside={<Badge tone="danger">caution</Badge>}
 />
 <div className="px-5 py-4">
 <DeleteAccountForm emailMasked={user.emailMasked} />
 </div>
 </Card>
 </div>

 <div className="space-y-4">
 <Card>
 <CardHeader
 title="Plan & limits"
 description="Plan limits are enforced server-side and cannot be changed on the client."
 aside={<Badge tone={plan.id === "pro" ? "accent" : "neutral"}>{plan.name}</Badge>}
 />
 <div className="space-y-2 px-5 py-4 text-xs text-muted">
 <div className="flex justify-between gap-3">
 <span>Scans per day</span>
 <span className="font-mono text-fg/90">{plan.limits.runsPerDay}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span>Platforms / scan</span>
 <span className="font-mono text-fg/90">{plan.limits.maxPlatformsPerRun}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span>Visible results</span>
 <span className="font-mono text-fg/90">{plan.limits.visibleResults}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span>History</span>
 <span className="font-mono text-fg/90">
 {plan.limits.historyRuns} scans · {plan.limits.retentionDays} days
 </span>
 </div>
 <Link href="/pricing" className={`${buttonSecondary} mt-2 w-full`}>
 View plans
 </Link>
 </div>
 </Card>

 <Card>
 <CardHeader
 title="Support & payments"
 description="Free and open source. Paid hosting or priority support is arranged on GitHub."
 />
 <div className="px-5 py-4">
 <GitHubButton label="Contact @assyte on GitHub" className="w-full" />
 <p className="mt-3 text-xs leading-relaxed text-muted">
 This app never asks for card details. Payment and invoices are arranged directly with
 @assyte.
 </p>
 </div>
 </Card>

 <Card>
 <CardHeader title="Data & privacy" />
 <div className="space-y-3 px-5 py-4 text-sm text-muted">
 <p>
 <span className="text-fg/90">Encryption:</span> AES-256-GCM, field-level AAD, and
 HKDF-derived keys. Email/phone equality searches use an HMAC blind index; plaintext is
 never stored.
 </p>
 <p>
 <span className="text-fg/90">Retention:</span> Your vault until you delete it; sessions for
 7 days; audit log for 365 days. Production backups must be configured separately.
 </p>
 <p>
 <span className="text-fg/90">Sharing:</span> Your data is never sold, used for ad
 profiling, or shared with other users.
 </p>
 </div>
 <div className="border-t border-line px-5 py-4">
 <ExportButton />
 <p className="mt-2 text-xs leading-relaxed text-muted">
 The export contains your entire vault in plaintext. Keep the file somewhere safe; it is
 not encrypted.
 </p>
 </div>
 </Card>

 <Card>
 <CardHeader
 title="Providers"
 description="API keys are kept only in the server environment and are never shown in the interface."
 />
 <ul className="divide-y divide-line text-xs">
 {providerRows.map((row) => (
 <li key={row.label} className="flex items-center justify-between gap-3 px-5 py-3">
 <span className="text-muted">{row.label}</span>
 <span className="flex items-center gap-2">
 <code className="font-mono text-xs text-fg/90">{row.name}</code>
 <Badge tone={row.configured ? "accent" : "warn"}>
 {row.configured ? "connected" : "simulation"}
 </Badge>
 </span>
 </li>
 ))}
 </ul>
 <div className="border-t border-line px-5 py-3">
 <Link href="/research" className={buttonSecondary}>
 Provider requirements
 </Link>
 </div>
 </Card>

 <InfoNote tone="warn">
 <strong className="font-semibold">Missing security features:</strong> 2FA, email
 verification, password reset, and a session list are not available yet (Phase 6). Use this
 version in a local or single-user setup.
 </InfoNote>

 <Card className="p-5">
 <h2 className="text-sm font-semibold">Legal boundary</h2>
 <p className="mt-1 text-xs leading-relaxed text-muted">
 You may only research your own identity. The system does not access private accounts,
 bypass CAPTCHAs or access controls, use stolen datasets, or generate account removal
 requests without proof of ownership.
 </p>
 </Card>
 </div>
 </div>
 </div>
 );
}
