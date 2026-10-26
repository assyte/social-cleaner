import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentSession } from "@/server/auth/current";
import { BrandLogo, MascotMark } from "@/components/brand";
import { Badge, Card, InfoPanel, buttonPrimary, buttonSecondary, linkClass } from "@/components/ui";
import { GitHubCallout, GitHubButton, GitHubTextLink } from "@/components/support-cta";
import { DIRECT_PLATFORMS, PLATFORMS } from "@/server/search/platforms";
import { FREE_CORE_PLATFORM_IDS, PLANS } from "@/server/billing/plans";

export const metadata: Metadata = {
  title: "Plans and pricing",
  description:
    "Social Cleaner is free and open source. Compare the Free and Pro / Hosted plans and contact @assyte on GitHub for paid support.",
};
export const dynamic = "force-dynamic";

const categoryOrder = [
  "social",
  "forum",
  "blog",
  "dev",
  "video",
  "gaming",
  "music",
  "professional",
  "commerce",
  "education",
] as const;

const categoryLabels: Record<(typeof categoryOrder)[number], string> = {
  social: "Social",
  forum: "Forums",
  blog: "Blogs",
  dev: "Developer",
  video: "Video",
  gaming: "Gaming",
  music: "Music",
  professional: "Professional",
  commerce: "Shopping",
  education: "Education",
};

export default async function PricingPage() {
  const session = await getCurrentSession();
  const appHref = session ? "/dashboard" : "/";
  const free = PLANS.free;
  const pro = PLANS.pro;

  const rows: Array<{ label: string; free: string; pro: string }> = [
  { label: "Username search", free: "✓", pro: "✓" },
  { label: "Full name search", free: "—", pro: "✓ (provider required)" },
  { label: "Email / phone search", free: "—", pro: "✓ (provider required)" },
  { label: "Catalogue listed", free: `${PLATFORMS.length} platforms`, pro: `${PLATFORMS.length} platforms` },
  { label: "Platforms available to scan", free: `${FREE_CORE_PLATFORM_IDS.length} core`, pro: `All ${PLATFORMS.length}` },
  { label: "Direct profile checks", free: `Core ${free.limits.maxPlatformsPerRun}`, pro: `${DIRECT_PLATFORMS.length} platforms` },
  { label: "Platforms / scan", free: String(free.limits.maxPlatformsPerRun), pro: String(pro.limits.maxPlatformsPerRun) },
  { label: "Scans per day", free: String(free.limits.runsPerDay), pro: String(pro.limits.runsPerDay) },
  { label: "Visible results", free: `First ${free.limits.visibleResults}`, pro: "All found" },
  { label: "History", free: `${free.limits.retentionDays} days · ${free.limits.historyRuns} scans`, pro: `${pro.limits.retentionDays} days · ${pro.limits.historyRuns} scans` },
  { label: "JSON account export", free: "✓", pro: "✓" },
  { label: "Search result export (CSV/PDF)", free: "—", pro: "Planned" },
  { label: "Monitoring / rescans", free: "—", pro: "Planned" },
  { label: "Removal drafts", free: "—", pro: "Planned" },
  { label: "Ads and data sales", free: "None", pro: "None" },
  ];

  const categoryCounts = categoryOrder
  .map((category) => ({
  category,
  label: categoryLabels[category],
  count: PLATFORMS.filter((platform) => platform.category === category).length,
  }))
  .filter((item) => item.count > 0);

  return (
  <main className="min-h-screen overflow-hidden bg-canvas">
  <div className="pointer-events-none fixed inset-0 -z-10 mesh-bg opacity-55" />
  <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
  <header className="flex flex-wrap items-center justify-between gap-4 animate-fade">
  <BrandLogo href={appHref} size={38} />
  <nav className="flex items-center gap-2">
  <GitHubTextLink className={`${buttonSecondary} hidden sm:inline-flex`} />
  {session ? (
  <Link href="/search" className={buttonPrimary}>
  Go to search
  </Link>
  ) : (
  <>
  <Link href="/login" className={buttonSecondary}>
  Sign in
  </Link>
  <Link href="/register" className={buttonPrimary}>
  Start free
  </Link>
  </>
  )}
  </nav>
  </header>

  <section className="mx-auto mt-12 max-w-3xl text-center animate-rise">
  <Badge tone="accent">Free and open source</Badge>
  <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
  Free and open source.
  <span className="gradient-text"> Yours to inspect.</span>
  </h1>
  <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
  Social Cleaner is free to use and MIT licensed. Run the hosted app or self-host it.
  For payment, a managed setup, or support, contact @assyte on GitHub. No card details
  are collected on this site.
  </p>
  <InfoPanel
  className="mx-auto mt-5 w-full max-w-2xl"
  items={[
  { label: "Direct checks", value: DIRECT_PLATFORMS.length },
  { label: "Platform catalogue", value: PLATFORMS.length },
  { label: "Encryption", value: "AES-256-GCM" },
  ]}
  />
  </section>

  <section className="mt-8 grid gap-4 lg:grid-cols-2">
  <Card className="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
  <div className="flex items-start justify-between">
  <div>
  <h2 className="text-lg font-extrabold">Free</h2>
  <p className="mt-1 text-xs text-muted">Start with your own usernames.</p>
  </div>
  <div className="text-right">
  <div className="text-3xl font-extrabold">Free</div>
  <div className="text-xs text-muted">Open source · MIT</div>
  </div>
  </div>
  <ul className="mt-5 space-y-2 text-sm text-muted">
  <li>✓ Username search</li>
  <li>✓ {free.limits.maxPlatformsPerRun} platforms / scan</li>
  <li>✓ {free.limits.runsPerDay} scans per day</li>
  <li>✓ First {free.limits.visibleResults} results + evidence links</li>
  <li>✓ Encrypted Identity Vault</li>
  <li>— Full name search</li>
  <li>— Search result export and monitoring</li>
  </ul>
  <Link href={session ? "/search" : "/register"} className={`${buttonSecondary} mt-6 w-full`}>
  {session ? "Go to search" : "Start free"}
  </Link>
  </Card>

  <Card className="relative overflow-hidden border-accent/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
  <div className="pointer-events-none absolute -right-6 -top-6 opacity-10">
  <MascotMark size={160} />
  </div>
  <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
  <div className="relative flex items-start justify-between">
  <div>
  <div className="flex items-center gap-2">
  <h2 className="text-lg font-extrabold">Pro / Hosted</h2>
  <Badge tone="accent">On request</Badge>
  </div>
  <p className="mt-1 text-xs text-muted">
  Full-name search, all results, longer history, and a managed setup.
  </p>
  </div>
  <div className="text-right">
  <div className="text-3xl font-extrabold">Contact</div>
  <div className="text-xs text-muted">paid hosting / support</div>
  </div>
  </div>
  <ul className="relative mt-5 space-y-2 text-sm text-muted">
  <li>✓ Full-name search where a provider is configured</li>
  <li>✓ {pro.limits.maxPlatformsPerRun} platforms / scan</li>
  <li>✓ {pro.limits.runsPerDay} scans per day</li>
  <li>✓ All found results + JSON account export</li>
  <li>✓ {pro.limits.retentionDays} days of history</li>
  <li>— Monitoring and removal drafts (planned)</li>
  <li>— Priority support (planned)</li>
  </ul>
  <GitHubButton
  label="Contact @assyte"
  variant="primary"
  className="relative mt-6 w-full"
  />
  <p className="relative mt-2 text-center text-xs text-muted">
  Manual onboarding · no card details on this site
  </p>
  </Card>
  </section>

  <section className="mt-8 overflow-hidden rounded-2xl border border-line/90 bg-surface shadow-soft">
  <div className="overflow-x-auto">
  <table className="w-full min-w-[640px] text-left text-sm">
  <thead className="bg-surface-2/70 text-xs text-muted">
  <tr>
  <th className="px-4 py-3 font-semibold">Feature</th>
  <th className="px-4 py-3 font-semibold">Free</th>
  <th className="px-4 py-3 font-semibold text-accent">Pro / Hosted</th>
  </tr>
  </thead>
  <tbody>
  {rows.map((row) => (
  <tr key={row.label} className="border-t border-line/80 transition hover:bg-surface-2/30">
  <td className="px-4 py-2.5 text-fg">{row.label}</td>
  <td className="px-4 py-2.5 text-muted">{row.free}</td>
  <td className="px-4 py-2.5 font-semibold text-fg">{row.pro}</td>
  </tr>
  ))}
  </tbody>
  </table>
  </div>
  </section>

  <section className="mt-10">
  <div className="flex flex-wrap items-end justify-between gap-2">
  <div>
  <div className="text-xs font-medium text-muted">Catalogue</div>
  <h2 className="mt-1 text-xl font-extrabold tracking-tight">What&apos;s in the catalogue?</h2>
  <p className="mt-1 text-sm text-muted">
  Popular social networks, forums, blogs, developer platforms and more.
  </p>
  </div>
  <Badge tone="accent">{PLATFORMS.length} platforms</Badge>
  </div>
  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
  {categoryCounts.map((item) => (
  <div
  key={item.category}
  className="rounded-2xl border border-line/90 bg-surface px-3.5 py-3 shadow-soft transition hover:-translate-y-0.5 hover:border-accent/30"
  >
  <div className="text-lg font-extrabold text-fg">{item.count}</div>
  <div className="text-xs font-medium text-muted">
  {item.label}
  </div>
  </div>
  ))}
  </div>
  </section>

  <section className="mt-8 grid gap-4 lg:grid-cols-3">
  <Card className="p-5">
  <h3 className="text-sm font-extrabold">Open source</h3>
  <p className="mt-2 text-sm leading-relaxed text-muted">
  The code is MIT licensed. You can inspect it, use it, or self-host it. Source and
  support live at GitHub @assyte.
  </p>
  </Card>
  <Card className="p-5">
  <h3 className="text-sm font-extrabold">Manual billing</h3>
  <p className="mt-2 text-sm leading-relaxed text-muted">
  Paid hosting and support are arranged directly on GitHub. This site does not collect
  card details or store payment data.
  </p>
  </Card>
  <Card className="p-5">
  <h3 className="text-sm font-extrabold">Data policy</h3>
  <p className="mt-2 text-sm leading-relaxed text-muted">
  No ads and no data sales, even on the Free plan. Search results follow your plan&apos;s
  retention period.
  </p>
  </Card>
  </section>

  <div className="mt-8">
  <GitHubCallout title="Payment, support, and source">
  Social Cleaner is free and open source. For paid hosting, priority support, or payment,
  contact <span className="text-fg">@assyte</span> on GitHub. Existing accounts stay on the{" "}
  <span className="text-fg">Free</span> plan unless a manual upgrade is arranged.
  </GitHubCallout>
  </div>

  <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted">
  <span>© 2026 Social Cleaner · MIT licensed.</span>
  <div className="flex gap-4">
  <Link href="/" className={linkClass}>
  Home
  </Link>
  <GitHubTextLink className={linkClass} />
  <Link href={session ? "/dashboard" : "/login"} className={linkClass}>
  {session ? "Overview" : "Sign in"}
  </Link>
  </div>
  </footer>
  </div>
  </main>
  );
}
