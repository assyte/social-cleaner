"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import type { RemovalGuide as RemovalGuideItem } from "@/server/removal/guides";

const DIFFICULTY_META = {
  easy: {
    label: "Easy",
    tone: "neutral" as const,
    effort: "Quick",
    hint: "Mostly self-serve",
    dot: "bg-emerald-400",
  },
  medium: {
    label: "Medium",
    tone: "accent" as const,
    effort: "Moderate",
    hint: "A few extra steps",
    dot: "bg-fg/50",
  },
  hard: {
    label: "Support",
    tone: "warn" as const,
    effort: "Support request",
    hint: "The platform must process it",
    dot: "bg-warn",
  },
  limited: {
    label: "Limited",
    tone: "danger" as const,
    effort: "Limited options",
    hint: "Permanent deletion may not exist",
    dot: "bg-danger",
  },
};

const METHOD_META = {
  "self-serve": {
    label: "Self-serve",
    hint: "Start in account settings",
  },
  support: {
    label: "Support request",
    hint: "The platform processes it",
  },
  limited: {
    label: "Limited",
    hint: "Permanent deletion may not be available",
  },
};

const POPULAR_IDS = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "youtube",
  "reddit",
  "discord",
  "linkedin",
  "github",
  "spotify",
  "netflix",
  "steam",
];

const POPULAR_RANK = new Map(POPULAR_IDS.map((id, index) => [id, index]));

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
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function InfoIcon() {
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
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/45 px-3.5 py-3 text-sm leading-relaxed text-fg/85">
      <span className="mt-0.5 text-emerald-400">
        <CheckIcon />
      </span>
      <span>{children}</span>
    </li>
  );
}

function PlatformRow({
  guide,
  selected,
  onSelect,
}: {
  guide: RemovalGuideItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const difficulty = DIFFICULTY_META[guide.difficulty];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
        selected ? "bg-white/[0.055]" : "hover:bg-surface-2/55"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
        <img
          src={guide.icon}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px]"
          loading="lazy"
          draggable={false}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg">{guide.name}</span>
          {selected ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg" /> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">{guide.domain}</span>
      </span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${difficulty.dot}`} aria-hidden />
    </button>
  );
}

function DetailPanel({ guide }: { guide: RemovalGuideItem }) {
  const difficulty = DIFFICULTY_META[guide.difficulty];
  const method = METHOD_META[guide.method];
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [guide.id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guide.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2">
              <img
                src={guide.icon}
                alt=""
                width={30}
                height={30}
                className="h-[30px] w-[30px]"
                draggable={false}
              />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-extrabold tracking-tight text-fg sm:text-2xl">
                  {guide.name}
                </h2>
                <Badge tone={difficulty.tone}>{difficulty.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {guide.domain} <span className="mx-1.5 text-line-strong">·</span>{" "}
                {guide.categoryLabel}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button type="button" onClick={copyLink} className={buttonSecondary}>
              <CopyIcon copied={copied} />
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={guide.link}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonPrimary}
            >
              Open official page
              <ExternalIcon />
            </a>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface-2/45 px-4 py-3">
            <div className="text-xs font-medium text-muted">Method</div>
            <div className="mt-1 text-sm font-semibold text-fg">{method.label}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted">{method.hint}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/45 px-4 py-3">
            <div className="text-xs font-medium text-muted">Effort</div>
            <div className="mt-1 text-sm font-semibold text-fg">{difficulty.effort}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted">{difficulty.hint}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/45 px-4 py-3">
            <div className="text-xs font-medium text-muted">Steps</div>
            <div className="mt-1 text-sm font-semibold text-fg">{guide.steps.length} steps</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted">Follow them in order</div>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-6">
        <section>
          <h3 className="text-sm font-bold text-fg">Before you start</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <ChecklistItem>Download a copy of your data if the platform offers an export.</ChecklistItem>
            <ChecklistItem>Cancel paid subscriptions and memberships first.</ChecklistItem>
            <ChecklistItem>Check connected apps and OAuth logins that may keep access.</ChecklistItem>
            <ChecklistItem>Keep access to your email and phone until deletion is confirmed.</ChecklistItem>
          </ul>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-sm font-bold text-fg">How to delete it</h3>
            <span className="text-xs text-muted">{guide.steps.length} steps</span>
          </div>
          <ol className="mt-4">
            {guide.steps.map((step, index) => (
              <li key={`${guide.id}-${index}`} className="relative flex gap-4 pb-5 last:pb-0">
                {index < guide.steps.length - 1 ? (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-line"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-xs font-bold text-fg tabular">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-fg/90">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {guide.note ? (
          <section className="rounded-xl border border-line bg-surface-2/55 px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-muted">
                <InfoIcon />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-fg">Good to know</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{guide.note}</p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-relaxed text-muted">
            You start the request on {guide.name}. Social Cleaner never deletes an account for you.
          </p>
          <a
            href={guide.link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg transition hover:text-muted"
          >
            Open deletion page
            <ExternalIcon />
          </a>
        </div>
      </div>
    </article>
  );
}

export function RemovalGuide({ guides }: { guides: RemovalGuideItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(
    guides.find((guide) => guide.id === "instagram")?.id ?? guides[0]?.id ?? "",
  );
  const detailRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, { id: string; label: string; count: number }>();
    for (const guide of guides) {
      const current = counts.get(guide.category);
      if (current) {
        current.count += 1;
      } else {
        counts.set(guide.category, {
          id: guide.category,
          label: guide.categoryLabel,
          count: 1,
        });
      }
    }
    return [...counts.values()].sort((left, right) => left.label.localeCompare(right.label, "en"));
  }, [guides]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en");
    return guides
      .filter((guide) => {
        const inCategory = category === "all" || guide.category === category;
        if (!inCategory) return false;
        if (!needle) return true;
        return (
          guide.name.toLocaleLowerCase("en").includes(needle) ||
          guide.domain.toLocaleLowerCase("en").includes(needle) ||
          guide.categoryLabel.toLocaleLowerCase("en").includes(needle)
        );
      })
      .sort((left, right) => {
        const leftRank = POPULAR_RANK.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = POPULAR_RANK.get(right.id) ?? Number.MAX_SAFE_INTEGER;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return left.name.localeCompare(right.name, "en");
      });
  }, [guides, query, category]);

  useEffect(() => {
    const first = filtered[0];
    if (!first) return;
    if (!filtered.some((guide) => guide.id === selectedId)) {
      setSelectedId(first.id);
    }
  }, [filtered, selectedId]);

  const selected =
    filtered.length > 0
      ? guides.find((guide) => guide.id === selectedId) ?? filtered[0]
      : undefined;

  function selectGuide(id: string) {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface px-4 py-4">
          <div className="text-xs font-medium text-muted">1 · Find the platform</div>
          <p className="mt-1 text-sm font-semibold text-fg">
            Search {guides.length} official deletion paths
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Filter by category or search by platform name and domain.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-4">
          <div className="text-xs font-medium text-muted">2 · Prepare the account</div>
          <p className="mt-1 text-sm font-semibold text-fg">Export data and cancel paid plans</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Some platforms remove public content but keep billing or messages.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-4">
          <div className="text-xs font-medium text-muted">3 · Open the official flow</div>
          <p className="mt-1 text-sm font-semibold text-fg">You stay in control</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Social Cleaner never deletes the account or asks for your password.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <aside className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft xl:sticky xl:top-6 xl:self-start">
          <div className="border-b border-line p-4">
            <label className="relative block">
              <span className="sr-only">Search platforms</span>
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="Search a platform or domain"
                type="search"
              />
            </label>
            <p className="mt-2 text-xs text-muted">
              <span className="font-semibold text-fg">{filtered.length}</span> of {guides.length}{" "}
              platforms
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                category === "all"
                  ? "border-line-strong bg-white/[0.06] text-fg"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              All <span className="ml-1 text-muted">{guides.length}</span>
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  category === item.id
                    ? "border-line-strong bg-white/[0.06] text-fg"
                    : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                {item.label} <span className="ml-1 text-muted">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="max-h-[52vh] overflow-y-auto xl:max-h-[calc(100vh-19rem)]">
            {filtered.length > 0 ? (
              filtered.map((guide) => (
                <PlatformRow
                  key={guide.id}
                  guide={guide}
                  selected={selected?.id === guide.id}
                  onSelect={() => selectGuide(guide.id)}
                />
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-semibold text-fg">No platforms found</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Try a different platform name, domain, or category.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div ref={detailRef}>
          {selected ? (
            <DetailPanel guide={selected} />
          ) : (
            <div className="rounded-2xl border border-line bg-surface px-5 py-10 text-center">
              <p className="text-sm font-semibold text-fg">No platform selected</p>
              <p className="mt-1 text-sm text-muted">Choose a platform from the list to see its guide.</p>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-fg">Platform not in the catalogue?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Open its privacy settings or support page and request deletion under GDPR or the
              privacy law that applies to you. Avoid third-party deletion services that ask for your
              password.
            </p>
          </div>
          <Badge tone="neutral">Official links only</Badge>
        </div>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          Links go to the platform's own settings, help, or support pages. Menu names can vary by
          app version and language. Only start a deletion request for an account you own. Long-tail
          links were cross-checked against the JustDeleteMe dataset (MIT).
        </p>
      </section>
    </div>
  );
}
