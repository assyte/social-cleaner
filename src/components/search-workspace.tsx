"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatScanDateTime } from "@/lib/format";
import type { PlanSummary, SearchField } from "@/server/billing/plans";
import type { PublicPlatform } from "@/server/search/platforms";
import type { ProviderStatus } from "@/server/search/providers";
import type {
  PlatformOutcomeView,
  SearchRunSummary,
  SearchRunView,
  SearchUsage,
} from "@/server/search/service";
import { PlatformPicker } from "@/components/platform-picker";
import {
  Badge,
  InfoPanel,
  StatusBadge,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
} from "@/components/ui";

const FIELD_LABELS: Record<SearchField, string> = {
  username: "Username",
  email: "Email",
  name: "Full name",
  phone: "Phone",
};

const FIELD_PLACEHOLDERS: Record<SearchField, string> = {
  username: "Enter username to trace...",
  email: "name@example.com",
  name: "Full name",
  phone: "+90 532 000 00 00",
};

const FIELD_PREFIX: Record<SearchField, string> = {
  username: "@",
  email: "@",
  name: "Aa",
  phone: "+",
};

/** First-release search types. Email and phone stay in the backend for later. */
const FIELD_ORDER: SearchField[] = ["username", "name"];

/** Core consumer set used by the quick action on both plans. */
const SOCIAL_PRESET = [
  "instagram",
  "tiktok",
  "facebook",
  "reddit",
  "telegram",
  "youtube",
  "steam",
  "epicgames",
] as const;

type Props = {
  platforms: PublicPlatform[];
  plan: PlanSummary;
  usage: SearchUsage;
  provider: ProviderStatus;
  ownerDeclared: boolean;
  initialRuns: SearchRunSummary[];
  suggestedHandles: string[];
  initialQuery?: string;
  initialRunId?: string;
};

type ResultFilter = "all" | "verified" | "possible" | "mention";

function summaryFromRun(run: SearchRunView): SearchRunSummary {
  return {
    id: run.id,
    fieldType: run.fieldType,
    queryMasked: run.queryMasked,
    status: run.status,
    createdAt: run.createdAt,
    finishedAt: run.finishedAt,
    checkedCount: run.checkedCount,
    foundCount: run.foundCount,
    hiddenCount: run.hiddenCount,
    blockedCount: run.blockedCount,
    errorCount: run.errorCount,
    visibleResults: run.visibleResults,
  };
}

function statusMeta(status: string): {
  label: string;
  tone: "success" | "neutral" | "danger";
  pulse?: boolean;
} {
  if (status === "completed") {
    return { label: "Completed", tone: "success" };
  }
  if (status === "running") {
    return { label: "Scanning", tone: "neutral", pulse: true };
  }
  if (status === "failed") {
    return { label: "Failed", tone: "danger" };
  }
  return { label: status, tone: "neutral" };
}

function outcomeLabel(outcome: PlatformOutcomeView): string {
  if (outcome.hidden) return "Locked";
  if (outcome.status === "found") {
    if (outcome.verification === "mention") return "Mention";
    if (outcome.verification === "possible") return "Possible";
    return "Verified";
  }
  if (outcome.status === "blocked") return "Blocked";
  if (outcome.status === "unsupported") return "Manual";
  if (outcome.status === "error") return "Error";
  return "Not found";
}

function outcomeTone(
  outcome: PlatformOutcomeView,
): "success" | "warn" | "danger" | "neutral" {
  if (outcome.hidden) return "neutral";
  if (outcome.status === "found") {
    if (outcome.verification === "verified") return "success";
    if (outcome.verification === "mention") return "warn";
    return "neutral";
  }
  if (outcome.status === "blocked") return "warn";
  if (outcome.status === "error") return "danger";
  return "neutral";
}

function outcomeHint(outcome: PlatformOutcomeView): string {
  if (outcome.hidden) {
    return "This profile link is hidden on the Free plan. Contact about Pro to reveal it.";
  }
  if (outcome.status === "found") {
    return outcome.method === "provider"
      ? "The search provider found an exact profile URL. A match is not proof of ownership."
      : "A public profile response was checked directly.";
  }
  if (outcome.status === "blocked") {
    return "The platform blocked the unauthenticated request. This is not proof of absence.";
  }
  if (outcome.status === "unsupported") {
    return "No search provider is connected. Open the profile link manually to verify it.";
  }
  if (outcome.status === "error") {
    return "A network or provider error occurred. No result was invented.";
  }
  return outcome.method === "provider"
    ? "No exact profile match was found by the provider. This does not prove absence."
    : "No public profile was found for this handle.";
}

function verificationTone(
  verification: string,
): "success" | "warn" | "neutral" {
  if (verification === "verified") return "success";
  if (verification === "mention") return "warn";
  return "neutral";
}

function verificationLabel(verification: string): string {
  if (verification === "verified") return "Verified";
  if (verification === "mention") return "Mention";
  return "Possible";
}

function evidenceText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function evidenceHttpMeta(evidence: Record<string, unknown>): {
  label: string;
  tone: "success" | "warn" | "danger" | "neutral";
} {
  const status = evidence.httpStatus;
  if (typeof status === "number") {
    if (status >= 200 && status < 300) {
      return { label: `HTTP ${status}`, tone: "success" };
    }
    if (status === 403 || status === 429) {
      return { label: `HTTP ${status} · blocked`, tone: "warn" };
    }
    if (status >= 500) {
      return { label: `HTTP ${status} · error`, tone: "danger" };
    }
    return { label: `HTTP ${status}`, tone: "neutral" };
  }
  if (evidence.method === "web_search") {
    return { label: "Web search", tone: "neutral" };
  }
  if (evidence.method === "manual") {
    return { label: "Manual check", tone: "neutral" };
  }
  return { label: "No response", tone: "neutral" };
}

function evidenceMethodLabel(value: unknown): string {
  if (value === "public_api") return "Public API";
  if (value === "public_profile") return "Public profile";
  if (value === "web_search") return "Web search";
  if (value === "manual") return "Manual";
  return "Public check";
}

function evidenceSignalLabel(value: unknown): string {
  const marker = evidenceText(value);
  if (!marker) return "No match signal";
  if (marker === "http_ok") return "HTTP status confirmed";
  if (marker === "api_username_match") return "Username matched in the public API";
  if (marker === "api_empty") return "Public API returned no match";
  if (marker === "exact_profile_url") return "Exact profile URL found";
  if (marker === "provider_not_configured") return "No search provider connected";
  if (marker === "provider_no_exact_profile") return "No exact profile URL found";
  if (marker === "provider_error") return "Search provider error";
  if (marker.includes("{handle}")) return "Handle marker matched";
  return "Page marker matched";
}

function EvidencePanel({ evidence }: { evidence: Record<string, unknown> }) {
  const http = evidenceHttpMeta(evidence);
  const marker = evidenceText(evidence.marker);
  const title = evidenceText(evidence.title);
  const checkedAt = evidenceText(evidence.checkedAt);
  const checkedLabel =
    checkedAt && !Number.isNaN(new Date(checkedAt).getTime())
      ? formatScanDateTime(checkedAt)
      : null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-start justify-between gap-2 border-b border-line bg-surface-2/35 px-3 py-2">
        <div>
          <div className="text-sm font-semibold text-fg">Evidence</div>
          <div className="mt-0.5 text-xs text-muted">
            {checkedLabel ? `Checked ${checkedLabel}` : "Live evidence"}
          </div>
        </div>
        <Badge tone={http.tone}>{http.label}</Badge>
      </div>
      <dl className="divide-y divide-line">
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 px-3 py-2">
          <dt className="text-xs text-muted">Source</dt>
          <dd className="text-sm font-medium text-fg">{evidenceMethodLabel(evidence.method)}</dd>
        </div>
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 px-3 py-2">
          <dt className="text-xs text-muted">Signal</dt>
          <dd className="text-sm font-medium text-fg" title={marker ?? undefined}>
            {evidenceSignalLabel(marker)}
          </dd>
        </div>
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2 px-3 py-2">
          <dt className="text-xs text-muted">Page title</dt>
          <dd
            className={`min-h-[2.5rem] text-sm leading-relaxed ${title ? "text-fg/90" : "text-muted"}`}
            title={title ?? undefined}
          >
            <span className="line-clamp-2 break-words">{title ?? "No title available"}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function coverageNotice(run: SearchRunView): string {
  const count = (status: PlatformOutcomeView["status"]) =>
    run.outcomes.filter((outcome) => outcome.status === status).length;
  const parts = [
    `${count("found")} found`,
    `${count("not_found")} not found`,
    `${count("blocked")} blocked`,
    `${count("unsupported")} manual`,
  ];
  if (count("error") > 0) parts.push(`${count("error")} error`);
  return `Scan complete: ${parts.join(" · ")}. Blocked and manual platforms are not counted as absent.`;
}

function initialFor(value: string): string {
  const first = value.replace(/[^a-z0-9]/gi, "").slice(0, 1);
  return first ? first.toUpperCase() : "?";
}

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ScanIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="m14.4 14.4 1.8 1.8" />
    </svg>
  );
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="m9 7 .6-2h4.8l.6 2" />
      <path d="m6.5 7 .8 12.5h9.4L17.5 7" />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
  return <StatusBadge label={meta.label} tone={meta.tone} pulse={meta.pulse} />;
}

export function SearchWorkspace({
  platforms,
  plan,
  usage,
  provider,
  ownerDeclared,
  initialRuns,
  suggestedHandles,
  initialQuery,
  initialRunId,
}: Props) {
  const orderedPlatforms = useMemo(
    () =>
      [...platforms].sort((a, b) => {
        const rankA = a.recommendedRank ?? 999;
        const rankB = b.recommendedRank ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name, "en");
      }),
    [platforms],
  );

  const isLocked = (platform: PublicPlatform) =>
    Boolean(plan.allowedPlatformIds && !plan.allowedPlatformIds.includes(platform.id));

  const defaultSelection = useMemo(() => {
    const available = orderedPlatforms.filter((platform) => !isLocked(platform));
    const recommended = available.filter((platform) => platform.recommended);
    const pool = plan.id === "free" || recommended.length === 0 ? available : recommended;
    const limit = plan.id === "free" ? available.length : Math.min(plan.maxPlatformsPerRun, 12);
    return pool.slice(0, limit).map((platform) => platform.id);
    // isLocked is derived from plan.allowedPlatformIds and the catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedPlatforms, plan.allowedPlatformIds, plan.id, plan.maxPlatformsPerRun]);

  const [fieldType, setFieldType] = useState<SearchField>("username");
  const [query, setQuery] = useState(initialQuery ?? suggestedHandles[0] ?? "");
  const [selected, setSelected] = useState<string[]>(defaultSelection);
  const [usedToday, setUsedToday] = useState(usage.usedToday);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null);
  const [lockedPlatformNotice, setLockedPlatformNotice] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<SearchRunView | null>(null);
  const [runs, setRuns] = useState<SearchRunSummary[]>(initialRuns);
  const [recentOpen, setRecentOpen] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedPlatforms = useMemo(
    () => platforms.filter((platform) => selectedSet.has(platform.id)),
    [platforms, selectedSet],
  );
  const selectedNeedsProvider = selectedPlatforms.some((platform) => platform.mode !== "direct");
  const fieldAllowed = plan.fields.includes(fieldType);
  const canRun =
    ownerDeclared &&
    !busy &&
    fieldAllowed &&
    query.trim().length >= 2 &&
    (fieldType !== "username" || selected.length > 0);

  const lockedCount = plan.allowedPlatformIds
    ? platforms.filter((platform) => !plan.allowedPlatformIds?.includes(platform.id)).length
    : 0;

  const notFoundCount = activeRun
    ? activeRun.outcomes.filter((outcome) => outcome.status === "not_found").length
    : 0;
  const manualCount = activeRun
    ? activeRun.outcomes.filter((outcome) => outcome.status === "unsupported").length
    : 0;
  const filteredResults = activeRun
    ? activeRun.results.filter((result) => resultFilter === "all" || result.verification === resultFilter)
    : [];
  const filterCounts = activeRun
    ? {
        all: activeRun.results.length,
        verified: activeRun.results.filter((result) => result.verification === "verified").length,
        possible: activeRun.results.filter((result) => result.verification === "possible").length,
        mention: activeRun.results.filter((result) => result.verification === "mention").length,
      }
    : { all: 0, verified: 0, possible: 0, mention: 0 };

  function chooseField(next: SearchField) {
    setError(null);
    setNotice(null);
    setUpgradeNotice(null);
    if (!plan.fields.includes(next)) {
      setUpgradeNotice(`${FIELD_LABELS[next]} search is available on Pro.`);
      return;
    }
    if (next !== "username" && !provider.configured) {
      setError(provider.message);
      return;
    }
    setFieldType(next);
  }

  function togglePlatform(id: string) {
    setError(null);
    setLockedPlatformNotice(null);
    if (selectedSet.has(id)) {
      setSelected(selected.filter((value) => value !== id));
      return;
    }
    if (selected.length >= plan.maxPlatformsPerRun) {
      setError(
        `The ${plan.id === "pro" ? "Pro" : "Free"} plan allows up to ${plan.maxPlatformsPerRun} platforms per scan.`,
      );
      return;
    }
    setSelected([...selected, id]);
  }

  function handleLockedPlatform(platform: PublicPlatform) {
    setLockedPlatformNotice(
      `${platform.name} is Pro-only. Contact about Pro to add every category and platform to your scans.`,
    );
  }

  function selectRecommended() {
    const available = orderedPlatforms.filter((platform) => !isLocked(platform));
    const recommended = available.filter((platform) => platform.recommended);
    setSelected(
      (recommended.length > 0 ? recommended : available)
        .slice(0, plan.maxPlatformsPerRun)
        .map((platform) => platform.id),
    );
    setError(null);
    setLockedPlatformNotice(null);
  }

  function selectAll() {
    setSelected(
      orderedPlatforms
        .filter((platform) => !isLocked(platform))
        .slice(0, plan.maxPlatformsPerRun)
        .map((platform) => platform.id),
    );
    setError(null);
    setLockedPlatformNotice(null);
  }

  function selectSocialPreset() {
    const available = new Set(platforms.map((platform) => platform.id));
    setSelected(
      SOCIAL_PRESET.filter((id) => available.has(id) && !isLocked(platforms.find((p) => p.id === id)!))
        .slice(0, plan.maxPlatformsPerRun),
    );
    setError(null);
    setLockedPlatformNotice(null);
  }

  function clearSelection() {
    setSelected([]);
    setError(null);
    setLockedPlatformNotice(null);
  }

  async function runSearch() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setUpgradeNotice(null);
    setResultFilter("all");
    try {
      const run = await apiFetch<SearchRunView>("/api/search", {
        method: "POST",
        body: {
          fieldType,
          query: query.trim(),
          platforms: fieldType === "username" ? selected : [],
        },
      });
      setActiveRun(run);
      setRuns((current) =>
        [summaryFromRun(run), ...current.filter((item) => item.id !== run.id)].slice(
          0,
          plan.historyRuns,
        ),
      );
      setUsedToday((current) => Math.min(usage.runsPerDay, current + 1));
      if (run.foundCount === 0) {
        setNotice(coverageNotice(run));
      }
      window.requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openRun(id: string) {
    setBusy(true);
    setError(null);
    setResultFilter("all");
    try {
      const run = await apiFetch<SearchRunView>(`/api/search/${id}`);
      setActiveRun(run);
      setFieldType(FIELD_ORDER.includes(run.fieldType) ? run.fieldType : "username");
      setRecentOpen(false);
      window.requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRun(id: string) {
    if (!window.confirm("Delete this scan and its results permanently?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/search/${id}`, { method: "DELETE" });
      setRuns((current) => current.filter((item) => item.id !== id));
      if (activeRun?.id === id) setActiveRun(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const openedInitialRun = useRef(false);
  useEffect(() => {
    if (!initialRunId || openedInitialRun.current) return;
    openedInitialRun.current = true;
    void openRun(initialRunId);
    // openRun is intentionally read once for the server-provided run id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRunId]);

  useEffect(() => {
    if (!recentOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRecentOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [recentOpen]);

  return (
    <div className="space-y-5">
      {!ownerDeclared ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-3 text-sm leading-relaxed text-amber-200/90">
          <span className="font-medium text-amber-200">Ownership declaration required.</span>{" "}
          Complete the{" "}
          <Link href="/vault#ownership" className="underline decoration-amber-400/35 underline-offset-2">
            Identity Vault ownership declaration
          </Link>{" "}
          before running a search. Searching another person&apos;s identity is not allowed.
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4 pt-1">
        <div>
          <div className="text-xs font-medium text-muted">Deep Search</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Trace your digital footprint.
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Search public profiles by username or full name. Matches are evidence to inspect, never
            automatic proof of ownership.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <InfoPanel
            className="w-full sm:w-auto sm:min-w-[270px]"
            items={[
              {
                label: "Plan",
                value: plan.id === "pro" ? "Pro" : "Free",
                tone: plan.id === "pro" ? "success" : "neutral",
              },
              { label: "Scans today", value: `${usedToday} / ${usage.runsPerDay}` },
            ]}
          />
          <button
            type="button"
            onClick={() => setRecentOpen(true)}
            className={`${buttonSecondary} px-3 py-2 text-sm`}
          >
            Recent scans ({runs.length})
            <ChevronIcon />
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-muted">Search type</div>
          <div className="text-xs text-muted">
            {FIELD_ORDER.filter((field) => plan.fields.includes(field))
              .map((field) => FIELD_LABELS[field])
              .join(" / ")}{" "}
            · {plan.maxPlatformsPerRun} platforms per scan
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FIELD_ORDER.map((field) => {
            const allowed = plan.fields.includes(field);
            const active = fieldType === field;
            return (
              <button
                key={field}
                type="button"
                onClick={() => chooseField(field)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-line-strong bg-white/[0.08] text-fg"
                    : allowed
                      ? "border-transparent text-muted hover:bg-surface-2 hover:text-fg"
                      : "border-transparent text-muted/65 hover:bg-surface-2 hover:text-muted"
                }`}
              >
                {FIELD_LABELS[field]}
                {!allowed ? <LockIcon size={13} /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs font-medium text-muted">
              {FIELD_PREFIX[fieldType]}
            </span>
            <input
              id="search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={FIELD_PLACEHOLDERS[fieldType]}
              maxLength={120}
              autoComplete="off"
              spellCheck={false}
              aria-label={FIELD_LABELS[fieldType]}
              className="h-12 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-4 text-sm font-medium text-fg placeholder:font-normal placeholder:text-muted/60 transition focus:border-line-strong focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={!canRun}
            className={`${buttonPrimary} h-12 shrink-0 px-5`}
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                Scanning...
              </>
            ) : (
              <>
                Start scan
                <ArrowIcon />
              </>
            )}
          </button>
        </div>

        {busy ? (
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/2 animate-shimmer rounded-full" />
          </div>
        ) : null}

        {suggestedHandles.length > 0 && fieldType === "username" ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">From your vault</span>
            {suggestedHandles.slice(0, 8).map((handle) => (
              <button
                key={handle}
                type="button"
                onClick={() => setQuery(handle)}
                className="rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted transition hover:border-line-strong hover:text-fg"
              >
                {handle}
              </button>
            ))}
          </div>
        ) : null}

        {upgradeNotice ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <LockIcon size={11} />
              {upgradeNotice}
            </span>
            <Link href="/pricing" className="text-xs font-medium text-fg hover:underline">
              Contact about Pro
            </Link>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-500/25 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted"
          >
            {notice}
          </p>
        ) : null}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted">
            {plan.id === "pro" ? <ScanIcon size={14} /> : <LockIcon size={13} />}
          </span>
          <div>
            <div className="text-xs font-medium text-fg">
              {plan.id === "pro" ? "Pro workspace active" : "Full catalogue on Pro"}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {plan.id === "pro"
                ? "All categories, full-name search where a provider is configured, and up to 40 platforms per scan."
                : "Pro adds all categories, full-name search where a provider is configured, and up to 40 platforms per scan."}
            </p>
          </div>
        </div>
        {plan.id === "pro" ? (
          <Link href="/pricing" className={`${buttonSecondary} px-3 py-2 text-xs`}>
            Plan details
          </Link>
        ) : (
          <Link href="/pricing" className={`${buttonPrimary} px-3 py-2 text-xs`}>
            Contact about Pro
          </Link>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">Platforms</h2>
            <p className="mt-0.5 text-xs text-muted">
              {selected.length} selected · {lockedCount > 0 ? `${lockedCount} more on Pro` : "full catalogue unlocked"}
            </p>
          </div>
          <button
            type="button"
            onClick={selectSocialPreset}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-fg"
          >
            Social media set
          </button>
        </div>

        <div className="p-5">
          <PlatformPicker
            platforms={platforms}
            selected={selected}
            max={plan.maxPlatformsPerRun}
            planId={plan.id}
            allowedPlatformIds={plan.allowedPlatformIds}
            onToggle={togglePlatform}
            onLocked={handleLockedPlatform}
            onSelectRecommended={selectRecommended}
            onSelectAll={selectAll}
            onClear={clearSelection}
          />

          {lockedPlatformNotice ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <LockIcon size={11} />
                {lockedPlatformNotice}
              </span>
              <Link href="/pricing" className="text-xs font-medium text-fg hover:underline">
                Contact about Pro
              </Link>
            </div>
          ) : null}

          {selectedNeedsProvider ? (
            <p className="mt-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-xs leading-relaxed text-muted">
              Some selected platforms use provider or manual verification. You will always get a
              real profile link, never an invented result.
            </p>
          ) : null}
        </div>
      </section>

      {activeRun ? (
        <section id="results" className="scroll-mt-24 rounded-2xl border border-line bg-surface animate-rise">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <div className="text-xs text-muted">Scan result</div>
              <h2 className="mt-1 truncate text-lg font-semibold text-fg">{activeRun.queryMasked}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {FIELD_LABELS[activeRun.fieldType]} · {formatScanDateTime(activeRun.createdAt)} ·{" "}
                {activeRun.checkedCount} checks
              </p>
            </div>
            <InfoPanel
              className="w-full sm:w-auto"
              items={[
                { label: "Found", value: activeRun.foundCount },
                { label: "Not found", value: notFoundCount },
                ...(activeRun.blockedCount > 0
                  ? [{ label: "Blocked", value: activeRun.blockedCount, tone: "warn" as const }]
                  : []),
                ...(manualCount > 0 ? [{ label: "Manual", value: manualCount }] : []),
              ]}
            />
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted">Result filters</div>
              {plan.id === "pro" ? (
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["all", "All"],
                      ["verified", "Verified"],
                      ["possible", "Possible"],
                      ["mention", "Mentions"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setResultFilter(key)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        resultFilter === key
                          ? "border-line-strong bg-white/[0.08] text-fg"
                          : "border-transparent text-muted hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      {label} ({filterCounts[key]})
                    </button>
                  ))}
                </div>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-fg"
                >
                  <LockIcon size={11} />
                  Pro result filters
                </Link>
              )}
            </div>

            {filteredResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-2/30 px-4 py-8 text-center">
                <p className="text-sm font-medium text-fg">
                  {activeRun.results.length === 0 ? "No positive profile findings" : "No results match this filter"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {activeRun.results.length === 0
                    ? coverageNotice(activeRun)
                    : "Try another filter or review the platform coverage below."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredResults.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-xl border border-line bg-surface-2/35 p-4 transition hover:border-line-strong hover:bg-surface-2/60"
                  >
                    <div className="flex items-start gap-3">
                      {result.platformIcon ? (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                          <img
                            src={result.platformIcon}
                            alt=""
                            width={22}
                            height={22}
                            className="h-[22px] w-[22px]"
                          />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-xs text-fg">
                          {result.platformName.slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-medium text-fg">{result.platformName}</h3>
                          <Badge tone={verificationTone(result.verification)}>
                            {verificationLabel(result.verification)}
                          </Badge>
                        </div>
                        <div className="truncate font-mono text-xs text-muted">{result.domain}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-line bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs font-medium text-fg">
                          {activeRun.fieldType === "username" ? `@${result.handle}` : `Query: ${result.handle}`}
                        </span>
                        <span className="shrink-0 text-xs text-muted">Confidence</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-fg/70"
                            style={{ width: `${Math.max(0, Math.min(100, result.confidence))}%` }}
                          />
                        </div>
                        <span className="tabular shrink-0 text-sm font-semibold text-fg">
                          {result.confidence}%
                        </span>
                      </div>
                    </div>

                    <EvidencePanel evidence={result.evidence} />

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <a
                        href={result.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                      >
                        Open profile
                      </a>
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(result.profileUrl)}
                        className={`${buttonGhost} px-2.5 py-1.5 text-xs`}
                      >
                        Preview
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted">A match is not proof of ownership.</p>
                  </article>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-line bg-surface-2/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-fg">Platform coverage</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Every selected platform has a real outcome. Blocked is not the same as absent.
                  </p>
                </div>
                <Badge>{activeRun.outcomes.length} checked</Badge>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {activeRun.outcomes.map((outcome) => (
                  <div
                    key={outcome.platformId}
                    title={outcomeHint(outcome)}
                    className="flex items-start gap-2 rounded-lg border border-line bg-surface px-2.5 py-2"
                  >
                    {outcome.platformIcon ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2">
                        <img
                          src={outcome.platformIcon}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4"
                          loading="lazy"
                        />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-fg">
                          {outcome.platformName}
                        </span>
                        <Badge tone={outcomeTone(outcome)}>{outcomeLabel(outcome)}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                        {outcome.hidden ? (
                          <Link href="/pricing" className="font-medium text-fg transition hover:underline">
                            Contact about Pro
                          </Link>
                        ) : (
                          <>
                            <a
                              href={outcome.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="transition hover:text-fg"
                            >
                              Open
                            </a>
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(outcome.profileUrl)}
                              className="transition hover:text-fg"
                            >
                              Preview
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {activeRun.hiddenCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-4">
                <div>
                  <div className="text-sm font-medium text-fg">
                    {activeRun.hiddenCount} more results found
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    The Free plan shows the first {activeRun.visibleResults} results. Profile links for
                    the rest are hidden. Contact about Pro to reveal them.
                  </p>
                </div>
                <Link href="/pricing" className={`${buttonPrimary} px-3 py-2 text-xs`}>
                  See Pro options
                </Link>
              </div>
            ) : null}

            <p className="text-xs leading-relaxed text-muted">
              A profile with the same username is not proof that the account belongs to you. Only
              evaluate results for your own identity. Platform bot protection (403/429) does not mean
              an account is absent.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted">
            <ScanIcon size={19} />
          </div>
          <h2 className="mt-3 text-sm font-medium text-fg">Results will appear here</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
            Enter a target, choose platforms, and start a scan. Every checked platform shows a real
            profile link and an evidence row.
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("search-query")?.focus()}
            className={`${buttonGhost} mt-3 text-xs`}
          >
            Focus search
          </button>
        </section>
      )}

      {recentOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close recent scans"
            onClick={() => setRecentOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="recent-scans-title"
            className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-line bg-surface animate-drawer"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 id="recent-scans-title" className="text-sm font-semibold text-fg">
                  Recent scans
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {runs.length} saved · {plan.historyRuns} run limit · {plan.retentionDays} day retention
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecentOpen(false)}
                aria-label="Close recent scans"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-surface-2 hover:text-fg"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {runs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center">
                  <p className="text-sm font-medium text-fg">No scans yet</p>
                  <p className="mt-1 text-xs text-muted">Start your first scan and it will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {runs.map((run) => (
                    <li key={run.id} className="rounded-xl border border-line bg-surface-2/30 p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-xs font-medium text-fg">
                          {initialFor(run.queryMasked)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openRun(run.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-xs font-medium text-fg">
                              {run.queryMasked}
                            </span>
                            <StatusPill status={run.status} />
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
                            <span className="truncate">
                              {FIELD_LABELS[run.fieldType]} · {formatScanDateTime(run.createdAt)}
                            </span>
                            <span
                              className="shrink-0 text-xs text-muted"
                              title={`${run.foundCount} found · ${run.checkedCount} checked`}
                            >
                              <span
                                className={`tabular font-medium ${
                                  run.foundCount > 0 ? "text-fg" : "text-muted"
                                }`}
                              >
                                {run.foundCount}
                              </span>{" "}
                              found
                            </span>
                          </div>
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => openRun(run.id)}
                          className="text-xs font-medium text-fg transition hover:underline"
                        >
                          View results
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRun(run.id)}
                          aria-label={`Delete scan ${run.queryMasked}`}
                          className="text-muted transition hover:text-red-400"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted">
              History stays inside your account. Deleting a scan removes its stored results
              permanently.
            </div>
          </aside>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade">
          <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-fg">Profile preview</div>
                <div className="truncate font-mono text-xs text-muted">{previewUrl}</div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className={`${buttonSecondary} px-2.5 py-1.5 text-xs`}
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className={`${buttonGhost} px-2.5 py-1.5 text-xs`}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-surface-2/40">
              <iframe
                src={previewUrl}
                title="Profile preview"
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="border-t border-line px-4 py-2 text-xs text-muted">
              Some platforms block embedding. Use Open in new tab if the preview stays empty.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
