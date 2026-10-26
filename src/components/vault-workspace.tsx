"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, errorMessage } from "@/lib/api-client";
import type { VaultView } from "@/server/vault/service";
import {
 Badge,
 Card,
 CardHeader,
 EmptyState,
 InfoNote,
 InfoPanel,
 PageHeader,
 buttonPrimary,
 buttonSecondary,
 inputClass,
 labelClass,
} from "@/components/ui";

const NAME_KINDS: Array<{ value: string; label: string }> = [
 { value: "legal", label: "Legal name" },
 { value: "former", label: "Former name / surname" },
 { value: "nickname", label: "Nickname" },
 { value: "transliteration", label: "Transliteration" },
];

const LINK_KINDS: Array<{ value: string; label: string }> = [
 { value: "profile", label: "Profile" },
 { value: "website", label: "Website" },
 { value: "blog", label: "Blog" },
 { value: "forum", label: "Forum" },
 { value: "game", label: "Game" },
 { value: "other", label: "Other" },
];

function labelFor(list: Array<{ value: string; label: string }>, value: string): string {
 return list.find((item) => item.value === value)?.label ?? value;
}

const VERIFICATION_LABELS: Record<string, string> = {
 user_provided: "user-provided",
 unverified: "needs review",
 verified: "verified",
 rejected: "unrelated",
};

function verificationLabel(value: string): string {
 return VERIFICATION_LABELS[value] ?? value;
}

function useAction() {
 const router = useRouter();
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [notice, setNotice] = useState<string | null>(null);

 async function run(action: () => Promise<unknown>, message?: string): Promise<boolean> {
 setBusy(true);
 setError(null);
 setNotice(null);
 try {
 await action();
 if (message) setNotice(message);
 router.refresh();
 return true;
 } catch (err) {
 setError(errorMessage(err));
 return false;
 } finally {
 setBusy(false);
 }
 }

 return { busy, error, notice, run };
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
 if (!error && !notice) return null;
 return (
 <p
 role="status"
 aria-live="polite"
 className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
 error ? "border-danger/40 bg-danger/10 text-danger" : "border-accent/30 bg-accent/10 text-accent"
 }`}
 >
 {error ?? notice}
 </p>
 );
}

export function VaultWorkspace({ vault }: { vault: VaultView }) {
 return (
 <div>
 <PageHeader
 eyebrow="Identity Vault"
 title="Your identity vault"
 description="The single source of truth for your research. Every field here is stored encrypted; contact details are used in searches only when you explicitly allow it."
 actions={
 <>
 <Badge tone={vault.profile.ownerDeclared ? "accent" : "warn"}>
 {vault.profile.ownerDeclared ? "ownership declared" : "declaration pending"}
 </Badge>
 <Badge>v{vault.profile.version}</Badge>
 </>
 }
 />

 <InfoPanel
 className="mb-4 w-full"
 items={[
 { label: "Records", value: `${vault.stats.names + vault.stats.aliases} names + handles` },
 { label: "Searchable contacts", value: `${vault.stats.searchableContacts} / ${vault.stats.contacts}` },
 { label: "Generated hypotheses", value: vault.variants.total },
 ]}
 />

 <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
 <div className="space-y-4">
 <NamesCard vault={vault} />
 <AliasesCard vault={vault} />
 <ContactsCard vault={vault} />
 <LinksCard vault={vault} />
 </div>
 <div className="space-y-4">
 <VariantsCard vault={vault} />
 <ScopeCard vault={vault} />
 <OwnershipCard vault={vault} />
 <InfoNote>
 <strong className="font-semibold">Retention note:</strong> The vault is retained until you
 delete your account. Export and deletion are handled on the account page. Backup retention
 is defined by the deployment and must be configured before production launch.
 </InfoNote>
 </div>
 </div>
 </div>
 );
}

function NamesCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [kind, setKind] = useState("legal");
 const [value, setValue] = useState("");
 const [isPrimary, setIsPrimary] = useState(vault.names.length === 0);

 async function submit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 const ok = await action.run(
 () =>
 apiFetch("/api/vault/names", {
 method: "POST",
 body: { kind, value, isPrimary },
 }),
 "Name saved.",
 );
 if (ok) {
 setValue("");
 setIsPrimary(false);
 }
 }

 return (
 <Card>
 <CardHeader
 title="Names & variations"
 description="Your legal name, previous surnames, nicknames, and transliterations. Duplicate names are rejected after case folding."
 aside={<Badge>{vault.names.length}</Badge>}
 />

 <div className="divide-y divide-line">
 {vault.names.length === 0 ? (
 <div className="p-4">
 <EmptyState title="No names added yet" hint="Research requires at least one legal name." />
 </div>
 ) : (
 vault.names.map((name) => (
 <div key={name.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-1.5">
 <span className="text-sm text-fg">{name.value}</span>
 {name.isPrimary ? <Badge tone="accent">primary</Badge> : null}
 <Badge>{labelFor(NAME_KINDS, name.kind)}</Badge>
 </div>
 {name.notes ? <p className="mt-0.5 text-xs text-muted">{name.notes}</p> : null}
 </div>
 <div className="ml-auto flex items-center gap-2">
 {!name.isPrimary ? (
 <button
 type="button"
 className="text-xs text-muted hover:text-accent"
 disabled={action.busy}
 onClick={() =>
 action.run(() =>
 apiFetch(`/api/vault/names/${name.id}`, {
 method: "PATCH",
 body: { isPrimary: true },
 }),
 )
 }
 >
 Make primary
 </button>
 ) : null}
 <button
 type="button"
 className="text-xs text-muted hover:text-danger"
 disabled={action.busy}
 onClick={() => {
 if (!window.confirm(`Delete "${name.value}"?`)) return;
 void action.run(() => apiFetch(`/api/vault/names/${name.id}`, { method: "DELETE" }));
 }}
 >
 Delete
 </button>
 </div>
 </div>
 ))
 )}
 </div>

 <form onSubmit={submit} className="border-t border-line px-4 py-3">
 <div className="grid gap-2 sm:grid-cols-[130px_1fr]">
 <div>
 <label className={labelClass} htmlFor="name-kind">
 Type
 </label>
 <select
 id="name-kind"
 className={inputClass}
 value={kind}
 onChange={(e) => setKind(e.target.value)}
 >
 {NAME_KINDS.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelClass} htmlFor="name-value">
 Full name
 </label>
 <input
 id="name-value"
 className={inputClass}
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder="e.g. Jordan Lee"
 maxLength={120}
 required
 />
 </div>
 </div>
 <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
 <label className="flex items-center gap-2 text-sm text-muted">
 <input
 type="checkbox"
 checked={isPrimary}
 onChange={(e) => setIsPrimary(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 Mark as primary name
 </label>
 <button type="submit" className={buttonPrimary} disabled={action.busy || value.trim().length < 2}>
 {action.busy ? "Saving…" : "Add name"}
 </button>
 </div>
 <Feedback error={action.error} notice={action.notice} />
 </form>
 </Card>
 );
}

function AliasesCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [handle, setHandle] = useState("");
 const [platforms, setPlatforms] = useState("");
 const [startPeriod, setStartPeriod] = useState("");
 const [endPeriod, setEndPeriod] = useState("");

 async function submit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 const ok = await action.run(
 () =>
 apiFetch("/api/vault/aliases", {
 method: "POST",
 body: {
 handle,
 platforms: platforms
 .split(",")
 .map((s) => s.trim())
 .filter(Boolean)
 .slice(0, 12),
 startPeriod: startPeriod || undefined,
 endPeriod: endPeriod || undefined,
 },
 }),
 "Username saved.",
 );
 if (ok) {
 setHandle("");
 setPlatforms("");
 setStartPeriod("");
 setEndPeriod("");
 }
 }

 async function setVerification(id: string, verification: string) {
 await action.run(() =>
 apiFetch(`/api/vault/aliases/${id}`, { method: "PATCH", body: { verification } }),
 );
 }

 return (
 <Card>
 <CardHeader
 title="Username history"
 description="Primary handle, old gaming nicknames, forum names… Period and platform details make correlations more reliable."
 aside={<Badge>{vault.aliases.length}</Badge>}
 />

 <div className="divide-y divide-line">
 {vault.aliases.length === 0 ? (
 <div className="p-4">
 <EmptyState title="No handles added" hint="Add old gaming and forum names as well." />
 </div>
 ) : (
 vault.aliases.map((alias) => (
 <div key={alias.id} className="px-4 py-3">
 <div className="flex flex-wrap items-center gap-2">
 <code className="font-mono text-sm text-fg">{alias.handle}</code>
 {alias.origin === "generated_variant" ? <Badge tone="warn">generated</Badge> : null}
 <Badge tone={alias.verification === "verified" ? "accent" : "neutral"}>
 {verificationLabel(alias.verification)}
 </Badge>
 <div className="ml-auto flex items-center gap-2">
 <select
 aria-label={`${alias.handle} verification status`}
 className="rounded-lg border border-line-strong bg-canvas px-2 py-1 text-xs text-fg"
 value={alias.verification}
 disabled={action.busy}
 onChange={(e) => void setVerification(alias.id, e.target.value)}
 >
 <option value="unverified">Needs review</option>
 <option value="verified">Verified</option>
 <option value="rejected">Unrelated</option>
 </select>
 <button
 type="button"
 className="text-xs text-muted hover:text-danger"
 disabled={action.busy}
 onClick={() => {
 if (!window.confirm(`Delete "${alias.handle}"?`)) return;
 void action.run(() => apiFetch(`/api/vault/aliases/${alias.id}`, { method: "DELETE" }));
 }}
 >
 Delete
 </button>
 </div>
 </div>
 <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
 {alias.platforms.length > 0 ? (
 <span className="flex flex-wrap gap-1">
 {alias.platforms.map((platform) => (
 <span key={platform} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
 {platform}
 </span>
 ))}
 </span>
 ) : (
 <span>no platforms specified</span>
 )}
 {alias.startPeriod || alias.endPeriod ? (
 <span className="font-mono">
 {alias.startPeriod ?? "?"} – {alias.endPeriod ?? "?"}
 </span>
 ) : null}
 </div>
 </div>
 ))
 )}
 </div>

 <form onSubmit={submit} className="border-t border-line px-4 py-3">
 <div className="grid gap-2 sm:grid-cols-2">
 <div>
 <label className={labelClass} htmlFor="alias-handle">
 Username
 </label>
 <input
 id="alias-handle"
 className={inputClass}
 value={handle}
 onChange={(e) => setHandle(e.target.value)}
 placeholder="e.g. jordan.lee"
 maxLength={64}
 required
 />
 </div>
 <div>
 <label className={labelClass} htmlFor="alias-platforms">
 Platforms <span className="normal-case text-muted/70">(comma-separated)</span>
 </label>
 <input
 id="alias-platforms"
 className={inputClass}
 value={platforms}
 onChange={(e) => setPlatforms(e.target.value)}
 placeholder="github, forum, gaming"
 maxLength={200}
 />
 </div>
 <div>
 <label className={labelClass} htmlFor="alias-start">
 Start <span className="normal-case text-muted/70">(YYYY)</span>
 </label>
 <input
 id="alias-start"
 className={inputClass}
 value={startPeriod}
 onChange={(e) => setStartPeriod(e.target.value)}
 placeholder="2008"
 maxLength={9}
 />
 </div>
 <div>
 <label className={labelClass} htmlFor="alias-end">
 End <span className="normal-case text-muted/70">(YYYY)</span>
 </label>
 <input
 id="alias-end"
 className={inputClass}
 value={endPeriod}
 onChange={(e) => setEndPeriod(e.target.value)}
 placeholder="2012"
 maxLength={9}
 />
 </div>
 </div>
 <div className="mt-2 flex justify-end">
 <button type="submit" className={buttonPrimary} disabled={action.busy || handle.trim().length < 2}>
 {action.busy ? "Saving…" : "Add handle"}
 </button>
 </div>
 <Feedback error={action.error} notice={action.notice} />
 </form>
 </Card>
 );
}

function ContactsCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [kind, setKind] = useState<"email" | "phone">("email");
 const [value, setValue] = useState("");
 const [consentSearch, setConsentSearch] = useState(false);
 const [isPublic, setIsPublic] = useState(false);

 async function submit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 const ok = await action.run(
 () =>
 apiFetch("/api/vault/contacts", {
 method: "POST",
 body: { kind, value, consentSearch, isPublic },
 }),
 "Contact detail saved.",
 );
 if (ok) {
 setValue("");
 setConsentSearch(false);
 setIsPublic(false);
 }
 }

 return (
 <Card>
 <CardHeader
 title="Email & phone"
 description="Shown masked; the full value is revealed only in exports. If you do not grant search consent, it is never included in a query."
 aside={<Badge>{vault.contacts.length}</Badge>}
 />

 <div className="divide-y divide-line">
 {vault.contacts.length === 0 ? (
 <div className="p-4">
 <EmptyState title="No contact details" hint="Optional, but useful for risk analysis." />
 </div>
 ) : (
 vault.contacts.map((contact) => (
 <div key={contact.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
 <Badge>{contact.kind === "email" ? "email" : "phone"}</Badge>
 <code className="font-mono text-xs text-fg/90">{contact.valueMasked}</code>
 <Badge tone={contact.consentSearch ? "accent" : "neutral"}>
 {contact.consentSearch ? "search enabled" : "search disabled"}
 </Badge>
 {contact.isPublic ? <Badge tone="warn">public</Badge> : null}
 <button
 type="button"
 className="ml-auto text-xs text-muted hover:text-danger"
 disabled={action.busy}
 onClick={() => {
 if (!window.confirm("Delete this contact detail?")) return;
 void action.run(() =>
 apiFetch(`/api/vault/contacts/${contact.id}`, { method: "DELETE" }),
 );
 }}
 >
 Delete
 </button>
 </div>
 ))
 )}
 </div>

 <form onSubmit={submit} className="border-t border-line px-4 py-3">
 <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
 <div>
 <label className={labelClass} htmlFor="contact-kind">
 Type
 </label>
 <select
 id="contact-kind"
 className={inputClass}
 value={kind}
 onChange={(e) => setKind(e.target.value === "phone" ? "phone" : "email")}
 >
 <option value="email">Email</option>
 <option value="phone">Phone</option>
 </select>
 </div>
 <div>
 <label className={labelClass} htmlFor="contact-value">
 Value
 </label>
 <input
 id="contact-value"
 className={inputClass}
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder={kind === "email" ? "jordan@example.com" : "+1 555 123 4567"}
 maxLength={254}
 required
 />
 </div>
 </div>
 <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={consentSearch}
 onChange={(e) => setConsentSearch(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 Allow use in searches
 </label>
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={isPublic}
 onChange={(e) => setIsPublic(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 This information is public
 </label>
 <button type="submit" className={`${buttonPrimary} ml-auto`} disabled={action.busy || value.trim().length < 3}>
 {action.busy ? "Saving…" : "Add"}
 </button>
 </div>
 <Feedback error={action.error} notice={action.notice} />
 </form>
 </Card>
 );
}

function LinksCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [kind, setKind] = useState("website");
 const [url, setUrl] = useState("");
 const [label, setLabel] = useState("");

 async function submit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 const ok = await action.run(
 () => apiFetch("/api/vault/links", { method: "POST", body: { kind, url, label: label || undefined } }),
 "Link saved.",
 );
 if (ok) {
 setUrl("");
 setLabel("");
 }
 }

 return (
 <Card>
 <CardHeader
 title="Profile & site links"
 description="Public http/https URLs only. Private IPs and local network addresses are rejected."
 aside={<Badge>{vault.links.length}</Badge>}
 />

 <div className="divide-y divide-line">
 {vault.links.length === 0 ? (
 <div className="p-4">
 <EmptyState title="No links" hint="Personal site, GitHub, blog, or profile URLs." />
 </div>
 ) : (
 vault.links.map((link) => (
 <div key={link.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
 <Badge>{labelFor(LINK_KINDS, link.kind)}</Badge>
 <a
 href={link.url}
 target="_blank"
 rel="noopener noreferrer nofollow"
 className="min-w-0 truncate font-mono text-xs text-accent hover:underline"
 >
 {link.label ? `${link.label} — ${link.url}` : link.url}
 </a>
 <button
 type="button"
 className="ml-auto text-xs text-muted hover:text-danger"
 disabled={action.busy}
 onClick={() => {
 if (!window.confirm("Delete this link?")) return;
 void action.run(() => apiFetch(`/api/vault/links/${link.id}`, { method: "DELETE" }));
 }}
 >
 Delete
 </button>
 </div>
 ))
 )}
 </div>

 <form onSubmit={submit} className="border-t border-line px-4 py-3">
 <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
 <div>
 <label className={labelClass} htmlFor="link-kind">
 Type
 </label>
 <select id="link-kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
 {LINK_KINDS.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelClass} htmlFor="link-url">
 URL
 </label>
 <input
 id="link-url"
 className={inputClass}
 value={url}
 onChange={(e) => setUrl(e.target.value)}
 placeholder="https://…"
 maxLength={2000}
 required
 />
 </div>
 </div>
 <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
 <div>
 <label className={labelClass} htmlFor="link-label">
 Label <span className="normal-case text-muted/70">(optional)</span>
 </label>
 <input
 id="link-label"
 className={inputClass}
 value={label}
 onChange={(e) => setLabel(e.target.value)}
 placeholder="e.g. Personal blog"
 maxLength={120}
 />
 </div>
 <button type="submit" className={buttonPrimary} disabled={action.busy || url.trim().length < 8}>
 {action.busy ? "Saving…" : "Add link"}
 </button>
 </div>
 <Feedback error={action.error} notice={action.notice} />
 </form>
 </Card>
 );
}

function VariantsCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [tab, setTab] = useState<"names" | "aliases" | "contacts">("names");
 const groups = {
 names: vault.variants.names,
 aliases: vault.variants.aliases,
 contacts: vault.variants.contacts,
 };
 const current = groups[tab];

 async function addAsAlias(value: string) {
 await action.run(
 () =>
 apiFetch("/api/vault/aliases", {
 method: "POST",
 body: { handle: value, origin: "generated_variant", platforms: [] },
 }),
 "Variant added to the query list.",
 );
 }

 return (
 <Card>
 <CardHeader
 title="Search hypotheses"
 description="Turkish character, separator, and word-order variants. None of these is evidence; they are used only to generate queries."
 aside={<Badge tone="accent">{vault.variants.total}</Badge>}
 />

 <div className="flex border-b border-line px-4">
 {(
 [
 ["names", "Names", groups.names.length],
 ["aliases", "Handles", groups.aliases.length],
 ["contacts", "Contacts", groups.contacts.length],
 ] as const
 ).map(([key, label, count]) => (
 <button
 key={key}
 type="button"
 onClick={() => setTab(key)}
 className={`-mb-px border-b px-3 py-2 text-sm font-medium transition ${
 tab === key ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
 }`}
 >
 {label} <span className="tabular text-xs text-muted">{count}</span>
 </button>
 ))}
 </div>

 <div className="max-h-72 overflow-auto px-4 py-3">
 {current.length === 0 ? (
 <EmptyState
 title="No variants"
 hint={
 tab === "contacts"
 ? "Add a contact detail and grant search consent."
 : "They appear here as you add the relevant records."
 }
 />
 ) : (
 <ul className="space-y-1.5">
 {current.map((variant) => (
 <li key={`${variant.kind}-${variant.value}`} className="flex items-center gap-2">
 <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg/85">{variant.value}</code>
 <span className="shrink-0 text-xs text-muted">
 {variant.reason}
 </span>
 {variant.kind === "alias" ? (
 <button
 type="button"
 className="shrink-0 text-xs text-accent hover:underline disabled:opacity-50"
 disabled={action.busy}
 onClick={() => void addAsAlias(variant.value)}
 >
 add to query
 </button>
 ) : null}
 </li>
 ))}
 </ul>
 )}
 </div>

 <div className="border-t border-line px-4 py-3">
 <p className="text-sm leading-relaxed text-muted">{vault.variants.notice}</p>
 <Feedback error={action.error} notice={action.notice} />
 </div>
 </Card>
 );
}

function ScopeCard({ vault }: { vault: VaultView }) {
 const action = useAction();
 const [mode, setMode] = useState(vault.scope.mode);
 const [depth, setDepth] = useState(vault.scope.depth);
 const [searchName, setSearchName] = useState(vault.scope.searchName);
 const [searchAliases, setSearchAliases] = useState(vault.scope.searchAliases);
 const [searchContacts, setSearchContacts] = useState(vault.scope.searchContacts);
 const [maxQueries, setMaxQueries] = useState(vault.scope.maxQueries);
 const [maxDepth, setMaxDepth] = useState(vault.scope.maxDepth);
 const [maxCostCents, setMaxCostCents] = useState(vault.scope.maxCostCents);
 const [platforms, setPlatforms] = useState(vault.scope.platforms.join(", "));

 async function submit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 await action.run(
 () =>
 apiFetch("/api/vault/scope", {
 method: "PUT",
 body: {
 mode,
 depth,
 platforms: platforms
 .split(",")
 .map((s) => s.trim().toLowerCase())
 .filter(Boolean)
 .slice(0, 60),
 searchName,
 searchAliases,
 searchContacts,
 maxQueries,
 maxDepth,
 maxCostCents,
 },
 }),
 "Research scope updated.",
 );
 }

 return (
 <Card id="scope" className="scroll-mt-20">
 <CardHeader
 title="Research scope"
 description="In Phase 2 these settings will feed the query planner. For now they only record your intent and limits."
 />
 <form onSubmit={submit} className="space-y-3 px-4 py-3">
 <div className="grid gap-2 sm:grid-cols-2">
 <div>
 <label className={labelClass} htmlFor="scope-mode">
 Mode
 </label>
 <select id="scope-mode" className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
 <option value="read_only">Read-only audit</option>
 <option value="remediation_enabled">Remediation enabled</option>
 </select>
 </div>
 <div>
 <label className={labelClass} htmlFor="scope-depth">
 Depth
 </label>
 <select id="scope-depth" className={inputClass} value={depth} onChange={(e) => setDepth(e.target.value)}>
 <option value="quick">Quick</option>
 <option value="standard">Standard</option>
 <option value="deep">Deep</option>
 </select>
 </div>
 </div>

 <fieldset className="space-y-1.5">
 <legend className={labelClass}>Data categories to research</legend>
 <label className="flex items-center gap-2 text-sm text-muted">
 <input
 type="checkbox"
 checked={searchName}
 onChange={(e) => setSearchName(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 Name and surname variations
 </label>
 <label className="flex items-center gap-2 text-sm text-muted">
 <input
 type="checkbox"
 checked={searchAliases}
 onChange={(e) => setSearchAliases(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 Usernames
 </label>
 <label className="flex items-center gap-2 text-sm text-muted">
 <input
 type="checkbox"
 checked={searchContacts}
 onChange={(e) => setSearchContacts(e.target.checked)}
 className="h-3.5 w-3.5 accent-white"
 />
 Email / phone <span className="text-warn">(sensitive — creates a consent record)</span>
 </label>
 </fieldset>

 <div className="grid gap-2 sm:grid-cols-3">
 <div>
 <label className={labelClass} htmlFor="scope-queries">
 Query limit
 </label>
 <input
 id="scope-queries"
 type="number"
 min={1}
 max={1000}
 className={inputClass}
 value={maxQueries}
 onChange={(e) => setMaxQueries(Number(e.target.value))}
 />
 </div>
 <div>
 <label className={labelClass} htmlFor="scope-maxdepth">
 Max depth
 </label>
 <input
 id="scope-maxdepth"
 type="number"
 min={1}
 max={5}
 className={inputClass}
 value={maxDepth}
 onChange={(e) => setMaxDepth(Number(e.target.value))}
 />
 </div>
 <div>
 <label className={labelClass} htmlFor="scope-cost">
 Budget (cents)
 </label>
 <input
 id="scope-cost"
 type="number"
 min={0}
 max={100000}
 className={inputClass}
 value={maxCostCents}
 onChange={(e) => setMaxCostCents(Number(e.target.value))}
 />
 </div>
 </div>

 <div>
 <label className={labelClass} htmlFor="scope-platforms">
 Preferred platforms <span className="normal-case text-muted/70">(comma-separated)</span>
 </label>
 <input
 id="scope-platforms"
 className={inputClass}
 value={platforms}
 onChange={(e) => setPlatforms(e.target.value)}
 placeholder="github, reddit, forum"
 maxLength={400}
 />
 </div>

 <button type="submit" className={`${buttonPrimary} w-full`} disabled={action.busy}>
 {action.busy ? "Saving…" : "Save scope"}
 </button>
 <Feedback error={action.error} notice={action.notice} />
 </form>
 </Card>
 );
}

function OwnershipCard({ vault }: { vault: VaultView }) {
 const action = useAction();

 return (
 <Card id="ownership" className="scroll-mt-20 border-warn/25">
 <CardHeader
 title="Ownership declaration"
 description="A prerequisite for research and removal actions. Declaring ownership of someone else's identity is prohibited."
 aside={
 <Badge tone={vault.profile.ownerDeclared ? "accent" : "warn"}>
 {vault.profile.ownerDeclared ? "on file" : "required"}
 </Badge>
 }
 />
 <div className="px-4 py-3">
 {vault.profile.ownerDeclared ? (
 <p className="text-xs text-muted">
 Recorded on{" "}
 <span className="font-mono text-xs text-fg/90">
 {vault.profile.ownerDeclaredAt
 ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
 new Date(vault.profile.ownerDeclaredAt),
 )
 : "—"}
 </span>{"."}
 </p>
 ) : (
 <>
 <button
 type="button"
 className={`${buttonSecondary} w-full`}
 disabled={action.busy}
 onClick={() =>
 action.run(
 () =>
 apiFetch("/api/vault/ownership", {
 method: "POST",
 body: {
 declared: true,
 confirmation: "I declare that this profile belongs to me",
 },
 }),
 "Ownership declaration saved.",
 )
 }
 >
 {action.busy ? "Saving…" : "I declare that this profile belongs to me"}
 </button>
 <p className="mt-2 text-sm leading-relaxed text-muted">
 This creates a consent record and is written to the audit log. A false declaration can harm
 third parties.
 </p>
 </>
 )}
 <Feedback error={action.error} notice={action.notice} />
 </div>
 </Card>
 );
}
