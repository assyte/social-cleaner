/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth/current";
import { BrandLogo, MascotMark } from "@/components/brand";
import { Badge, Card, InfoNote, buttonPrimary, buttonSecondary, linkClass } from "@/components/ui";
import { GitHubCallout, GitHubTextLink } from "@/components/support-cta";
import { DIRECT_PLATFORMS, PLATFORMS } from "@/server/search/platforms";
import { PLANS } from "@/server/billing/plans";

export const metadata: Metadata = {
  title: "Digital Footprint Inventory",
  description:
    "Find the public accounts tied to your username, see the evidence behind every match, and clean up your digital footprint.",
};

export const dynamic = "force-dynamic";

const searchTypes = [
  {
    label: "Username",
    hint: `${DIRECT_PLATFORMS.length} platforms · live checks`,
    badge: "Live",
    active: true,
  },
  { label: "Full name", hint: "Pro · search provider key", badge: "Pro", active: false },
];

const showcaseIds = [
  "github",
  "youtube",
  "steam",
  "craftrise",
  "vimeo",
  "behance",
  "dribbble",
  "soundcloud",
  "huggingface",
  "kaggle",
  "substack",
  "patreon",
  "lastfm",
  "flickr",
  "chesscom",
  "lichess",
  "goodreads",
  "linktree",
];

const showcase = showcaseIds
  .map((id) => PLATFORMS.find((platform) => platform.id === id))
  .filter((platform): platform is (typeof PLATFORMS)[number] => Boolean(platform));

const marquee = [...showcase, ...showcase];

const working = [
  `Direct, public profile checks on ${DIRECT_PLATFORMS.length} platforms`,
  `A catalogue of ${PLATFORMS.length} social networks, forums, blogs and developer platforms`,
  "Platform logos, real profile links, and a confidence and evidence row",
  "AES-256-GCM encrypted Identity Vault + ownership attestation",
  "Free/Pro limits, daily quota, and plan-based server-side trimming",
  "Audit log, JSON export, account deletion",
];

const notYet = [
  "Full-name search needs a configured provider; email and phone coverage is limited",
  "AI correlation and identity scoring (planned)",
  "Automated removal requests (planned; the Remove Guide is available today)",
  "Scheduled monitoring and PDF reports (planned)",
];

export default async function LandingPage() {
  await redirectIfAuthenticated();
  const free = PLANS.free;
  const pro = PLANS.pro;

  return (
  <main className="min-h-screen overflow-hidden bg-canvas">
  <div className="pointer-events-none fixed inset-0 -z-10 mesh-bg opacity-60" />

  <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
  <header className="flex flex-wrap items-center justify-between gap-4 animate-fade">
  <BrandLogo size={40} />
  <nav className="flex flex-wrap items-center gap-2">
  <Link href="/pricing" className={`${buttonSecondary} hidden sm:inline-flex`}>
  Pricing
  </Link>
  <GitHubTextLink className={`${buttonSecondary} hidden sm:inline-flex`} />
  <Link href="/login" className={buttonSecondary}>
  Sign in
  </Link>
  <Link href="/register" className={buttonPrimary}>
  Start free
  </Link>
  </nav>
  </header>

  <section className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.12fr_0.88fr]">
  <div className="animate-rise">
  <div className="flex flex-wrap gap-2">
  <Badge tone="accent">{DIRECT_PLATFORMS.length} platforms with live verification</Badge>
  <Badge>Free and open source</Badge>
  </div>
  <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.04] tracking-tight text-fg sm:text-6xl">
  Find your <span className="gradient-text">digital footprint</span>.
  <br />
  See the evidence. Clean it up.
  </h1>
  <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
  Social Cleaner verifies the public accounts registered to your username at each
  platform&apos;s own address. Every result comes with a real profile link, platform logo
  and confidence signal. Accounts that do not exist are never invented.
  </p>

  <div className="mt-7 flex flex-wrap gap-3">
  <Link href="/register" className={`${buttonPrimary} px-5 py-3 text-base`}>
  Scan for free
  </Link>
  <Link href="/pricing" className={`${buttonSecondary} px-5 py-3 text-base`}>
  Compare plans
  </Link>
  </div>

  <div className="mt-7 grid grid-cols-3 gap-2">
  {[
  [String(DIRECT_PLATFORMS.length), "direct checks"],
  [String(PLATFORMS.length), "platform catalogue"],
  ["AES-256", "encrypted vault"],
  ].map(([value, label]) => (
  <div key={label} className="rounded-2xl border border-line/80 bg-surface/75 px-3 py-2.5 shadow-soft backdrop-blur">
  <div className="text-lg font-extrabold tracking-tight text-fg">{value}</div>
  <div className="text-xs font-medium text-muted">{label}</div>
  </div>
  ))}
  </div>

  <div className="mt-6 grid gap-2 sm:grid-cols-2">
  {searchTypes.map((type) => (
  <div
  key={type.label}
  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition ${
  type.active
  ? "border-accent/30 bg-surface shadow-soft"
  : "border-line bg-surface/60"
  }`}
  >
  <div>
  <div className="text-xs font-bold text-fg">{type.label}</div>
  <div className="text-xs text-muted">{type.hint}</div>
  </div>
  <span
  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
  type.active ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted"
  }`}
  >
  {type.badge}
  </span>
  </div>
  ))}
  </div>
  </div>

  <div className="relative animate-rise delay-2">
  <div className="absolute inset-8 -z-10 rounded-full bg-accent/15 blur-3xl" />
  <div className="absolute -left-4 top-10 h-16 w-16 rounded-2xl border border-line/80 bg-surface/70 shadow-soft backdrop-blur animate-float-slow" />
  <div className="absolute -right-3 bottom-16 h-20 w-20 rounded-3xl border border-line/80 bg-surface/70 shadow-soft backdrop-blur animate-float" />

  <Card className="relative overflow-hidden p-5 sm:p-6">
  <div className="flex items-start justify-between gap-3">
  <div>
  <div className="text-xs font-medium text-muted">
  Product preview
  </div>
  <div className="mt-1 text-lg font-extrabold tracking-tight">Your digital footprint scout</div>
  <p className="mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">
  It shows plainly what it found, why it found it, and why it cannot be certain.
  </p>
  </div>
  <Badge tone="accent">Beta</Badge>
  </div>

  <div className="relative mt-4 flex items-center justify-center overflow-hidden rounded-2xl bg-surface-2 py-7">
  <div className="absolute h-36 w-36 rounded-full bg-accent/10 blur-2xl" />
  <div className="relative animate-float">
  <MascotMark size={188} />
  </div>
  </div>

  <div className="mt-4 grid grid-cols-3 gap-2">
  {showcase.slice(0, 9).map((platform) => (
  <div
  key={platform.id}
  className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 transition hover:-translate-y-0.5 hover:shadow-soft"
  >
  <img src={platform.icon} alt="" width={16} height={16} className="h-4 w-4" />
  <span className="truncate text-xs font-medium text-fg">{platform.name}</span>
  </div>
  ))}
  </div>

  <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface-2/45 px-3 py-2 text-xs text-muted">
  <span>Real profile URL</span>
  <span className="font-mono font-medium text-accent">HTTP 200 · verified</span>
  </div>
  <p className="mt-2 text-center text-xs text-muted">Interface preview · sample values</p>
  </Card>
  </div>
  </section>

  <section className="mt-12 animate-fade delay-3">
  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
  <div>
  <div className="text-xs font-medium text-muted">
  Catalogue
  </div>
  <h2 className="mt-1 text-lg font-extrabold tracking-tight">
  Social networks, forums, blogs and more
  </h2>
  </div>
  <span className="text-xs text-muted">{PLATFORMS.length} platforms · local logos</span>
  </div>
  <div className="marquee-mask overflow-hidden rounded-2xl border border-line/80 bg-surface/70 py-3 shadow-soft">
  <div className="marquee-track flex w-max items-center gap-2 px-2">
  {marquee.map((platform, index) => (
  <span
  key={`${platform.id}-${index}`}
  className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-fg"
  >
  <img src={platform.icon} alt="" width={16} height={16} className="h-4 w-4" />
  {platform.name}
  </span>
  ))}
  </div>
  </div>
  </section>

  <section className="mt-12 grid gap-3 sm:grid-cols-3">
  {[
  {
  step: "01",
  title: "Enter your username",
  body: "Add the names in your vault or the handle you want to look up. You choose the platforms.",
  },
  {
  step: "02",
  title: "Verify public profiles",
  body: "Each platform's own profile address is checked; 404s and blocks are reported separately.",
  },
  {
  step: "03",
  title: "See the evidence",
  body: "Every card shows the logo, profile link, confidence score and check time.",
  },
  ].map((item, index) => (
  <Card
  key={item.step}
  className={`p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-rise delay-${index + 1}`}
  >
  <div className="flex items-center justify-between">
  <div className="font-mono text-xs font-semibold text-accent">{item.step}</div>
  <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
  </div>
  <h2 className="mt-2 text-sm font-extrabold">{item.title}</h2>
  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
  </Card>
  ))}
  </section>

  <section className="mt-12 grid gap-4 lg:grid-cols-2">
  <Card className="p-5">
  <div className="flex items-center justify-between">
  <h2 className="text-sm font-extrabold">Working today</h2>
  <Badge tone="accent">Live</Badge>
  </div>
  <ul className="mt-3 space-y-2 text-sm text-muted">
  {working.map((item) => (
  <li key={item} className="flex gap-2">
  <span className="mt-0.5 text-accent">✓</span>
  <span>{item}</span>
  </li>
  ))}
  </ul>
  </Card>

  <Card className="p-5">
  <div className="flex items-center justify-between">
  <h2 className="text-sm font-extrabold">Not working yet</h2>
  <Badge tone="warn">Roadmap</Badge>
  </div>
  <ul className="mt-3 space-y-2 text-sm text-muted">
  {notYet.map((item) => (
  <li key={item} className="flex gap-2">
  <span className="mt-0.5 text-warn">•</span>
  <span>{item}</span>
  </li>
  ))}
  </ul>
  <p className="mt-3 text-sm leading-relaxed text-muted">
  No result is ever invented. We never claim &quot;the whole internet was scanned&quot; or
  &quot;deletion guaranteed&quot;.
  </p>
  </Card>
  </section>

  <section className="mt-14">
  <div className="flex flex-wrap items-end justify-between gap-3">
  <div>
  <div className="text-xs font-medium text-muted">Plans</div>
  <h2 className="mt-1 text-xl font-extrabold tracking-tight">Free to start</h2>
  <p className="mt-1 text-sm text-muted">
  Use it free and open source. Contact about Pro for deeper search and every result.
  </p>
  </div>
  <Link href="/pricing" className={linkClass}>
  Full comparison →
  </Link>
  </div>

  <div className="mt-4 grid gap-4 sm:grid-cols-2">
  <Card className="p-5 transition hover:-translate-y-1 hover:shadow-lift">
  <div className="flex items-baseline justify-between">
  <h3 className="text-sm font-extrabold">Free</h3>
  <div className="text-2xl font-extrabold">Free</div>
  </div>
  <p className="mt-2 text-sm text-muted">Open source and free to use.</p>
  <ul className="mt-4 space-y-1.5 text-sm text-muted">
  <li>• Username search</li>
  <li>• {free.limits.maxPlatformsPerRun} platforms / scan</li>
  <li>• {free.limits.runsPerDay} scans per day</li>
  <li>• First {free.limits.visibleResults} results</li>
  </ul>
  <Link href="/register" className={`${buttonSecondary} mt-5 w-full`}>
  Start free
  </Link>
  </Card>

  <Card className="relative overflow-hidden border-accent/40 p-5 transition hover:-translate-y-1 hover:shadow-lift">
  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
  <div className="absolute right-4 top-4">
  <Badge tone="accent">Recommended</Badge>
  </div>
  <div className="flex items-baseline justify-between">
  <h3 className="text-sm font-extrabold">Pro / Hosted</h3>
  <div className="text-2xl font-extrabold">Contact</div>
  </div>
  <p className="mt-2 text-sm text-muted">
  Full-name search, all results, longer history. Paid hosting is arranged manually.
  </p>
  <ul className="mt-4 space-y-1.5 text-sm text-muted">
  <li>• Username + full name search</li>
  <li>• {pro.limits.maxPlatformsPerRun} platforms / scan</li>
  <li>• {pro.limits.runsPerDay} scans per day</li>
  <li>• All found results + JSON account export</li>
  </ul>
  <Link href="/pricing" className={`${buttonPrimary} mt-5 w-full`}>
  See Pro options
  </Link>
  </Card>
  </div>
  </section>

  <div className="mt-8">
  <GitHubCallout>
  Social Cleaner is free and open source. For payment, a managed setup, or support, contact{" "}
  <span className="text-fg">@assyte</span> on GitHub. No card details are collected on this
  site.
  </GitHubCallout>
  </div>

  <div className="mt-8">
  <InfoNote tone="warn">
  <strong className="font-bold">For your own identity only.</strong> Ownership
  attestation is required. Login-gated pages, CAPTCHAs and stolen data are never used;
  a profile with the same username may belong to someone else. A match is not proof of
  ownership.
  </InfoNote>
  </div>

  <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted">
  <span>© 2026 Social Cleaner · Public sources only · MIT licensed.</span>
  <div className="flex gap-4">
  <Link href="/pricing" className={linkClass}>
  Pricing
  </Link>
  <GitHubTextLink className={linkClass} />
  <Link href="/login" className={linkClass}>
  Sign in
  </Link>
  </div>
  </footer>
  </div>
  </main>
  );
}
