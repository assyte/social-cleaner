"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { Card, CardHeader, EmptyState, InfoNote } from "@/components/ui";
import type { SearchRunSummary, SearchRunView } from "@/server/search/service";

type RemovalDraft = {
 platform: string;
 profileUrl: string;
 text: string;
};

function buildDraft(result: SearchRunView["results"][number]): string {
 const today = new Date().toISOString().slice(0, 10);
 return `Subject: Request to remove my personal data / public profile

Platform: ${result.platformName}
Profile URL: ${result.profileUrl}
Username / handle: ${result.handle}
Request date: ${today}

Dear ${result.platformName} Privacy Team,

I request that my personal data associated with the profile above be removed
from public access. I declare that this profile belongs to me. I am ready to
complete any identity-verification steps you require.

I request deletion of my data or restriction of access under GDPR or the
privacy law that applies to me. I look forward to your response.

Sincerely`;
}

export function RemovalWorkspace() {
 const [runs, setRuns] = useState<SearchRunSummary[]>([]);
 const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
 const [run, setRun] = useState<SearchRunView | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [copied, setCopied] = useState<string | null>(null);

 useEffect(() => {
 let active = true;
 (async () => {
 try {
 const response = (await apiFetch("/api/search")) as Response;
 const body = (await response.json()) as { runs?: SearchRunSummary[]; error?: { message?: string } };
 if (!response.ok) throw new Error(body.error?.message ?? "Could not load scans");
 if (!active) return;
 setRuns(body.runs ?? []);
 if (body.runs?.length) setSelectedRunId(body.runs[0]?.id ?? null);
 } catch (err) {
 if (active) setError(errorMessage(err));
 } finally {
 if (active) setLoading(false);
 }
 })();
 return () => {
 active = false;
 };
 }, []);

 useEffect(() => {
 if (!selectedRunId) {
 setRun(null);
 return;
 }
 let active = true;
 (async () => {
 try {
 const response = (await apiFetch(`/api/search/${selectedRunId}`)) as Response;
 const body = (await response.json()) as SearchRunView & { error?: { message?: string } };
 if (!response.ok) throw new Error(body.error?.message ?? "Could not load the scan");
 if (active) setRun(body);
 } catch (err) {
 if (active) setError(errorMessage(err));
 }
 })();
 return () => {
 active = false;
 };
 }, [selectedRunId]);

 const drafts = useMemo<RemovalDraft[]>(
 () =>
 (run?.results ?? []).map((result) => ({
 platform: result.platformName,
 profileUrl: result.profileUrl,
 text: buildDraft(result),
 })),
 [run],
 );

 async function copy(text: string, key: string) {
 try {
 await navigator.clipboard.writeText(text);
 setCopied(key);
 window.setTimeout(() => setCopied(null), 1500);
 } catch {
 setError("Could not copy to the clipboard.");
 }
 }

 if (loading) {
 return <p className="text-sm text-muted">Loading scans…</p>;
 }

 if (error) {
 return <p className="text-sm text-danger">{error}</p>;
 }

 if (!runs.length) {
 return (
 <EmptyState
 title="No scans yet"
 hint="Run a Deep Search scan first to create a removal draft."
 icon={<span className="text-xl">🗑️</span>}
 />
 );
 }

 return (
 <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
 <Card>
 <CardHeader title="Scans" description="Choose a scan." />
 <div className="max-h-[32rem] space-y-1 overflow-y-auto p-3">
 {runs.map((item) => (
 <button
 key={item.id}
 type="button"
 onClick={() => setSelectedRunId(item.id)}
 className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
 selectedRunId === item.id
 ? "border-accent/40 bg-accent/10 text-accent"
 : "border-line bg-surface text-fg hover:border-accent/30"
 }`}
 >
 <div className="font-bold">{item.queryMasked}</div>
 <div className="mt-0.5 text-xs text-muted">
 {item.foundCount} findings · {new Date(item.createdAt).toLocaleDateString("en-US")}
 </div>
 </button>
 ))}
 </div>
 </Card>

 <div className="space-y-3">
 <InfoNote>
 Removal drafts are never sent automatically. Copy the draft and send it to the
 platform's privacy or support page yourself. Some platforms may require
 identity verification.
 </InfoNote>

 {drafts.length === 0 ? (
 <EmptyState
 title="No positive results in this scan"
 hint="A positive profile match is required to create a removal draft."
 icon={<span className="text-xl">🗑️</span>}
 />
 ) : (
 drafts.map((draft) => (
 <Card key={draft.profileUrl}>
 <CardHeader
 title={draft.platform}
 description={draft.profileUrl}
 aside={
 <button
 type="button"
 onClick={() => void copy(draft.text, draft.profileUrl)}
 className="rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/15"
 >
 {copied === draft.profileUrl ? "Copied" : "Copy draft"}
 </button>
 }
 />
 <div className="p-4">
 <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2/40 p-3 font-mono text-xs leading-relaxed text-fg">
 {draft.text}
 </pre>
 </div>
 </Card>
 ))
 )}
 </div>
 </div>
 );
}
