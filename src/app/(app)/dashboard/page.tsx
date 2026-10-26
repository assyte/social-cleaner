import Link from "next/link";
import type { Metadata } from "next";
import { requirePageSession } from "@/server/auth/current";
import { toPublicUser } from "@/server/auth/service";
import { PLANS, planForUser } from "@/server/billing/plans";
import { getSearchTotals, getSearchUsage, listSearches } from "@/server/search/service";
import { formatScanDateTime } from "@/lib/format";
import { InfoPanel, StatusBadge, buttonPrimary, buttonSecondary } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
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
      width="12"
      height="12"
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

function MissionIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5 19 6v5.2c0 4.4-2.8 7.7-7 9.3-4.2-1.6-7-4.9-7-9.3V6l7-2.5Z" />
      <path d="m9.2 11.8 1.8 1.8 3.9-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-emerald-400"
    >
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
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

function handleInitial(handle: string): string {
  const first = handle.replace(/[^a-z0-9]/gi, "").slice(0, 1);
  return first ? first.toUpperCase() : "?";
}

export default async function DashboardPage() {
  const session = await requirePageSession();
  const plan = planForUser(session.user);
  const [searches, totals, usage] = await Promise.all([
    listSearches(session.user.id, plan),
    getSearchTotals(session.user.id),
    getSearchUsage(session.user.id, plan),
  ]);
  const user = toPublicUser(session.user);
  const recentSearches = searches.slice(0, 6);
  const greetingName = user.displayName ?? "researcher";
  const isPro = plan.id === "pro";
  const usagePercent =
    usage.runsPerDay > 0
      ? Math.min(100, Math.round((usage.usedToday / usage.runsPerDay) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <header className="animate-rise flex flex-wrap items-center justify-between gap-3 pt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Welcome back, {greetingName}
        </h1>
        <InfoPanel
          className="w-full sm:w-auto"
          items={[
            {
              label: "Plan",
              value: isPro ? "Pro" : "Free",
              tone: isPro ? "success" : "neutral",
            },
            { label: "Scans today", value: `${usage.usedToday} / ${usage.runsPerDay}` },
          ]}
        />
      </header>

      <section className="animate-rise delay-1 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg">
                <MissionIcon />
              </span>
              <span className="text-xs font-medium text-muted">Mission</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-fg">
              Take back your digital footprint.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Social Cleaner maps public accounts you own and helps you work through
              platform-specific removal steps.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-muted">
                  Usage quota
                </div>
                <div className="mt-1 text-sm font-semibold text-fg">
                  {isPro ? "Pro plan" : "Free plan"}
                </div>
              </div>
              <span className="text-xs text-muted">
                {usage.usedToday} / {usage.runsPerDay} today
              </span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-fg/80 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {isPro ? (
              <Link
                href="/pricing"
                className={`${buttonSecondary} mt-4 w-full px-3 py-2 text-xs`}
              >
                Plan details
              </Link>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className={`${buttonPrimary} mt-4 w-full px-3 py-2 text-xs`}
                >
                  Contact about Pro
                </Link>
                <ul className="mt-3 space-y-1.5 text-xs leading-snug text-muted">
                  <li className="flex gap-1.5">
                    <CheckIcon />
                    Full-name search where a provider is configured
                  </li>
                  <li className="flex gap-1.5">
                    <CheckIcon />
                    Every catalogue platform
                  </li>
                  <li className="flex gap-1.5">
                    <CheckIcon />
                    Up to {PLANS.pro.limits.maxPlatformsPerRun} platforms per scan
                  </li>
                </ul>
                <p className="mt-2 text-xs text-muted/70">
                  {PLANS.pro.limits.runsPerDay} scans/day ·{" "}
                  {PLANS.pro.limits.maxPlatformsPerRun} platforms per scan
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="animate-rise delay-2 rounded-2xl border border-line bg-surface p-2">
        <form action="/search" method="get" className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            <input
              name="q"
              aria-label="Username"
              placeholder="Enter username to trace..."
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              className="h-12 w-full rounded-xl border border-line bg-surface-2 pl-11 pr-4 text-[15px] font-medium text-fg placeholder:text-muted/70 focus:border-line-strong focus:outline-none"
            />
          </div>
          <button type="submit" className={`${buttonPrimary} h-12 shrink-0 px-5`}>
            Start scan
            <ArrowIcon />
          </button>
        </form>
      </section>

      <section className="animate-rise delay-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface px-5 py-5">
          <div className="text-xs font-medium text-muted">Total scans</div>
          <div className="tabular mt-2 text-3xl font-semibold tracking-tight text-fg">
            {totals.totalScans}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-5 py-5">
          <div className="text-xs font-medium text-muted">Active footprints found</div>
          <div className="tabular mt-2 text-3xl font-semibold tracking-tight text-fg">
            {totals.totalFound}
          </div>
        </div>
      </section>

      <section className="animate-rise delay-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">Recent scans</h2>
          </div>
          <Link href="/search" className="text-xs font-medium text-muted transition hover:text-fg">
            View all
          </Link>
        </div>

        {recentSearches.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-muted">No scans yet. Start with a username above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-2/30 text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Target handle</th>
                  <th className="px-5 py-3 font-medium">Scan date &amp; time</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Found accounts</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSearches.map((run) => {
                  const meta = statusMeta(run.status);
                  return (
                    <tr
                      key={run.id}
                      className="group border-b border-line transition-colors duration-150 last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs font-semibold text-fg transition group-hover:border-line-strong">
                            {handleInitial(run.queryMasked)}
                          </span>
                          <span className="font-mono text-xs font-medium text-fg">
                            {run.queryMasked}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        {formatScanDateTime(run.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge label={meta.label} tone={meta.tone} pulse={meta.pulse} />
                      </td>
                      <td className="px-5 py-4">
                        {run.foundCount > 0 ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="tabular text-sm font-semibold text-fg">
                              {run.foundCount}
                            </span>
                            <span className="text-xs text-muted">found</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/search?run=${run.id}`}
                          className="group/action inline-flex items-center gap-1.5 rounded-lg border border-line bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:bg-surface-2 hover:text-fg"
                        >
                          Inspect
                          <span className="transition-transform duration-150 group-hover/action:translate-x-0.5">
                            <ChevronIcon />
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
