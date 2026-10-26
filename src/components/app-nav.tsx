"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { BrandLogo } from "@/components/brand";
import { Badge, buttonSecondary } from "@/components/ui";
import { GitHubIcon } from "@/components/support-cta";
import { GITHUB_HANDLE, GITHUB_URL } from "@/lib/site";
import type { PublicUser } from "@/server/auth/service";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/search", label: "Deep Search", icon: "search" },
  { href: "/removal", label: "Remove Guide", icon: "trash" },
  { href: "/pricing", label: "Pricing", icon: "sparkles" },
] as const;

type IconName = (typeof primaryNav)[number]["icon"] | "logout";

function NavIcon({ name, size = 17 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.6" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.6" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.6" />
        <rect x="14" y="14" width="6.5" height="6.5" rx="1.6" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    );
  }
  if (name === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
        <path d="m5 14 .7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M9 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H9" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Primary navigation">
      {primaryNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
              active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <NavIcon name={item.icon} size={14} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ user }: { user: PublicUser }) {
  const pathname = usePathname();
  const planLabel = user.plan === "pro" ? "Pro" : "Free";
  const initial = (user.displayName ?? user.emailMasked).slice(0, 1).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo href="/dashboard" size={34} subtitle="digital footprint" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Workspace">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg"
              }`}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-fg" />
              ) : null}
              <NavIcon name={item.icon} size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1 py-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-xs font-semibold text-fg">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-fg">
              {user.displayName ?? "Researcher"}
            </div>
            <div className="truncate text-xs text-muted">{user.emailMasked}</div>
          </div>
          <LogoutButton iconOnly />
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <Badge tone={user.plan === "pro" ? "accent" : "neutral"}>{planLabel}</Badge>
          <Link href="/pricing" className="text-xs font-medium text-muted transition hover:text-fg">
            View plans
          </Link>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 px-1 py-1 text-xs font-medium text-muted transition hover:text-fg"
        >
          <GitHubIcon size={14} />
          GitHub support
        </a>
      </div>
    </aside>
  );
}

export function AppMobileHeader({ user }: { user: PublicUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <BrandLogo href="/dashboard" compact subtitle={null} size={30} />
        <div className="ml-auto flex items-center gap-2">
          <Badge tone={user.plan === "pro" ? "accent" : "neutral"}>
            {user.plan === "pro" ? "Pro" : "Free"}
          </Badge>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Support on GitHub"
            aria-label={`Open github.com/${GITHUB_HANDLE} in a new tab`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <GitHubIcon size={15} />
          </a>
          <LogoutButton iconOnly />
        </div>
      </div>
      <div className="border-t border-line px-2 py-1.5">
        <AppNav />
      </div>
    </header>
  );
}

export function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      // A stale session still has to be able to clear local cookies; the API
      // clears them even when the CSRF check fails after a page refresh.
      console.warn(errorMessage(error));
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        title="Sign out"
        aria-label="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-danger disabled:opacity-50"
      >
        <NavIcon name="logout" size={15} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={`${buttonSecondary} px-3 py-2 text-xs`}
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}

export function ModeBadge() {
  return <Badge tone="success">Read-only audit</Badge>;
}
