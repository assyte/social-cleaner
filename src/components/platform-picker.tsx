"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import type { PublicPlatform } from "@/server/search/platforms";

const CATEGORY_ORDER = [
  "social",
  "dev",
  "gaming",
  "forum",
  "video",
  "messaging",
  "music",
  "streaming",
  "professional",
  "education",
  "commerce",
  "photos",
  "reading",
  "blog",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  social: "Social",
  dev: "Tech",
  gaming: "Gaming",
  forum: "Forums",
  video: "Video",
  messaging: "Messaging",
  music: "Music",
  streaming: "Streaming",
  professional: "Professional",
  education: "Learning",
  commerce: "Commerce",
  photos: "Photos",
  reading: "Reading",
  blog: "Blog",
  other: "Other",
};

const MODE_LABELS: Record<string, string> = {
  direct: "Direct",
  provider: "Provider",
  manual: "Manual",
};

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
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

export function PlatformPicker({
  platforms,
  selected,
  max,
  planId,
  allowedPlatformIds,
  onToggle,
  onLocked,
  onSelectRecommended,
  onSelectAll,
  onClear,
}: {
  platforms: PublicPlatform[];
  selected: string[];
  max: number;
  planId: "free" | "pro";
  allowedPlatformIds: string[] | null;
  onToggle: (id: string) => void;
  onLocked: (platform: PublicPlatform) => void;
  onSelectRecommended: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const [filter, setFilter] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const isLocked = (platform: PublicPlatform) =>
    Boolean(allowedPlatformIds && !allowedPlatformIds.includes(platform.id));

  const categories = useMemo(() => {
    const counts = new Map<string, { total: number; locked: number }>();
    for (const platform of platforms) {
      const current = counts.get(platform.category) ?? { total: 0, locked: 0 };
      current.total += 1;
      if (allowedPlatformIds && !allowedPlatformIds.includes(platform.id)) {
        current.locked += 1;
      }
      counts.set(platform.category, current);
    }
    return CATEGORY_ORDER.filter((key) => (counts.get(key)?.total ?? 0) > 0).map((key) => ({
      key,
      label: CATEGORY_LABELS[key] ?? key,
      total: counts.get(key)?.total ?? 0,
      locked: counts.get(key)?.locked ?? 0,
    }));
  }, [allowedPlatformIds, platforms]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return platforms
      .filter((platform) => category === "all" || platform.category === category)
      .filter((platform) => {
        if (!needle) return true;
        return (
          platform.name.toLowerCase().includes(needle) ||
          platform.domain.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const lockedA = allowedPlatformIds && !allowedPlatformIds.includes(a.id);
        const lockedB = allowedPlatformIds && !allowedPlatformIds.includes(b.id);
        if (lockedA !== lockedB) return lockedA ? 1 : -1;
        const rankA = a.recommendedRank ?? 999;
        const rankB = b.recommendedRank ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name, "en");
      });
  }, [allowedPlatformIds, category, filter, platforms]);

  const lockedCount = allowedPlatformIds
    ? platforms.filter((platform) => !allowedPlatformIds.includes(platform.id)).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectRecommended}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg transition hover:border-line-strong"
          >
            Recommended
          </button>
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-line-strong hover:text-fg"
          >
            {planId === "pro" ? `Select ${max}` : "Select core"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            Clear
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="tabular font-medium">
            {selected.length}/{max} selected
          </span>
          {lockedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs">
              <LockIcon size={12} />
              {lockedCount} Pro
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search platforms or domains..."
            className="w-full rounded-xl border border-line bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted/60 transition focus:border-line-strong focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              category === "all"
                ? "border-line-strong bg-white/[0.08] text-fg"
                : "border-transparent text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            All ({platforms.length})
          </button>
          {categories.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                category === item.key
                  ? "border-line-strong bg-white/[0.08] text-fg"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {item.label} ({item.total})
                {item.locked === item.total ? <LockIcon size={9} /> : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-xs text-muted">
          No platforms match this filter.
        </div>
      ) : (
        <div className="grid max-h-[25rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((platform) => {
            const active = selectedSet.has(platform.id);
            const locked = isLocked(platform);
            const full = !active && !locked && selected.length >= max;

            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => (locked ? onLocked(platform) : onToggle(platform.id))}
                aria-pressed={active}
                aria-label={
                  locked ? `Contact about Pro for ${platform.name}` : `Toggle ${platform.name}`
                }
                title={
                  locked
                    ? `${platform.name} is available on Pro.`
                    : `${platform.name} · ${MODE_LABELS[platform.mode] ?? platform.mode}`
                }
                className={`group flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                  locked
                    ? "border-line/70 bg-surface/35 hover:border-line-strong hover:bg-surface-2/60"
                    : active
                      ? "border-white/25 bg-white/[0.045]"
                      : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/50"
                } ${full ? "cursor-not-allowed opacity-45" : ""}`}
                disabled={full}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2">
                  <img
                    src={platform.icon}
                    alt=""
                    width={18}
                    height={18}
                    className={`h-[18px] w-[18px] ${locked ? "opacity-55" : ""}`}
                    loading="lazy"
                    draggable={false}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-xs font-medium ${
                        locked ? "text-muted" : "text-fg"
                      }`}
                    >
                      {platform.name}
                    </span>
                    {locked ? (
                      <span className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-muted">
                        Pro
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-muted">
                    {platform.domain} · {MODE_LABELS[platform.mode] ?? platform.mode}
                  </span>
                </span>

                {locked ? (
                  <span className="shrink-0 text-muted">
                    <LockIcon />
                  </span>
                ) : (
                  <span
                    className={`relative h-5 w-8 shrink-0 rounded-full border transition ${
                      active ? "border-fg bg-fg" : "border-line-strong bg-surface-2"
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full transition-all ${
                        active ? "left-3.5 bg-black text-white" : "left-0.5 bg-muted/50 text-black"
                      }`}
                    >
                      {active ? <CheckIcon /> : null}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        <span className="font-medium text-fg">Direct</span> checks a public profile live.{" "}
        <span className="font-medium text-fg">Provider</span> uses an exact profile URL match when a
        search provider is configured. <span className="font-medium text-fg">Manual</span> opens a
        real profile link for you to verify. A blocked result is never proof of absence.
      </p>
    </div>
  );
}
