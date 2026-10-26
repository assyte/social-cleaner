import type { ReactNode } from "react";

export function Card({
 children,
 className = "",
 id,
}: {
 children: ReactNode;
 className?: string;
 id?: string;
}) {
 return (
 <section
 id={id}
 className={`rounded-2xl border border-line/90 bg-surface shadow-soft ${className}`}
 >
 {children}
 </section>
 );
}

export type InfoPanelItem = {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warn" | "danger";
};

/**
 * Compact status panel for plan, usage and similar metadata. Replaces loose
 * pill rows so repeated information stays visually stable across pages.
 */
export function InfoPanel({
  items,
  className = "",
}: {
  items: InfoPanelItem[];
  className?: string;
}) {
  const toneClass: Record<NonNullable<InfoPanelItem["tone"]>, string> = {
    neutral: "text-fg",
    success: "text-emerald-400",
    warn: "text-amber-300",
    danger: "text-red-400",
  };

  return (
    <div
      className={`grid grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr ${className}`}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`min-w-0 px-4 py-2.5 ${index > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}
        >
          <div className="text-xs font-medium text-muted">{item.label}</div>
          <div
            className={`mt-0.5 truncate text-sm font-semibold tabular ${toneClass[item.tone ?? "neutral"]}`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardHeader({
 title,
 description,
 aside,
}: {
 title: string;
 description?: string;
 aside?: ReactNode;
}) {
 return (
 <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4 sm:px-6">
 <div>
 <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
 {description ? (
 <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
 ) : null}
 </div>
 {aside ? <div className="shrink-0">{aside}</div> : null}
 </div>
 );
}

const badgeTones = {
 neutral: "border-line bg-surface-2 text-muted",
 accent: "border-line-strong bg-white/[0.06] text-fg",
 success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
 warn: "border-warn/35 bg-warn/10 text-warn",
 danger: "border-danger/35 bg-danger/10 text-danger",
} as const;

export function Badge({
 children,
 tone = "neutral",
 className = "",
}: {
 children: ReactNode;
 tone?: keyof typeof badgeTones;
 className?: string;
}) {
 return (
 <span
 className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}
 >
 {children}
 </span>
 );
}

const statusTones = {
 neutral: {
 chip: "border-line bg-surface-2/60 text-muted",
 dot: "bg-muted",
 },
 accent: {
 chip: "border-line-strong bg-white/[0.055] text-fg",
 dot: "bg-fg/70",
 },
 success: {
 chip: "border-line bg-surface-2/60 text-fg",
 dot: "bg-emerald-400",
 },
 warn: {
 chip: "border-line bg-surface-2/60 text-amber-300",
 dot: "bg-amber-300",
 },
 danger: {
 chip: "border-line bg-surface-2/60 text-red-400",
 dot: "bg-red-400",
 },
} as const;

export function StatusBadge({
 label,
 tone = "neutral",
 pulse = false,
 className = "",
}: {
 label: string;
 tone?: keyof typeof statusTones;
 pulse?: boolean;
 className?: string;
}) {
 const meta = statusTones[tone];
 return (
 <span
 className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.chip} ${className}`}
 >
 <span className={`h-1.5 w-1.5 rounded-full ${pulse ? "animate-pulse" : ""} ${meta.dot}`} />
 {label}
 </span>
 );
}

export function StatCard({
 label,
 value,
 hint,
 tone = "neutral",
 icon,
}: {
 label: string;
 value: string | number;
 hint?: string;
 tone?: "neutral" | "accent" | "warn";
 icon?: ReactNode;
}) {
 const valueColor = tone === "accent" ? "text-fg" : tone === "warn" ? "text-warn" : "text-fg";
 return (
 <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface px-4 py-4 transition duration-200 hover:border-line-strong">
 <div
 className={`absolute inset-x-0 top-0 h-px ${
 tone === "accent" ? "bg-white/40" : tone === "warn" ? "bg-warn/60" : "bg-line"
 }`}
 />
 <div className="flex items-start justify-between gap-3">
 <div className="text-xs font-medium text-muted">{label}</div>
 {icon ? (
 <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-muted transition group-hover:bg-accent/10 group-hover:text-accent">
 {icon}
 </span>
 ) : null}
 </div>
 <div className={`tabular mt-2 text-2xl font-extrabold tracking-tight ${valueColor}`}>{value}</div>
 {hint ? <div className="mt-1 text-xs leading-snug text-muted">{hint}</div> : null}
 </div>
 );
}

export function PageHeader({
 eyebrow,
 title,
 description,
 actions,
}: {
 eyebrow: string;
 title: string;
 description?: string;
 actions?: ReactNode;
}) {
 return (
 <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
 <div>
 <div className="inline-flex items-center gap-2 text-xs font-medium text-muted">
 <span className="h-1.5 w-1.5 rounded-full bg-fg/70" />
 {eyebrow}
 </div>
 <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">{title}</h1>
 {description ? (
 <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
 ) : null}
 </div>
 {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
 </header>
 );
}

export function Skeleton({ className = "" }: { className?: string }) {
 return <div className={`animate-pulse rounded-xl bg-surface-2/80 ${className}`} />;
}

export function EmptyState({
 title,
 hint,
 icon,
}: {
 title: string;
 hint?: string;
 icon?: ReactNode;
}) {
 return (
 <div className="rounded-2xl border border-dashed border-line-strong/70 bg-surface-2/40 px-4 py-7 text-center">
 {icon ? (
 <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted shadow-soft">
 {icon}
 </div>
 ) : null}
 <p className="text-sm font-semibold text-fg/85">{title}</p>
 {hint ? <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">{hint}</p> : null}
 </div>
 );
}

export function InfoNote({
 tone = "neutral",
 children,
}: {
 tone?: "neutral" | "warn" | "accent";
 children: ReactNode;
}) {
 const styles =
 tone === "warn"
 ? "border-warn/30 bg-warn/[0.055] text-warn/90"
 : tone === "accent"
 ? "border-accent/25 bg-accent/[0.055] text-accent/90"
 : "border-line bg-surface-2/55 text-muted";
 return (
 <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
 {children}
 </div>
 );
}

export const inputClass =
 "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-fg " +
 "placeholder:text-muted/45 transition focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50";

export const labelClass =
 "mb-1.5 block text-xs font-medium text-muted";

export const buttonPrimary =
 "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black " +
 "transition-all duration-200 hover:bg-accent-strong active:scale-[0.985] " +
 "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent";

export const buttonSecondary =
 "inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 " +
 "text-sm font-semibold text-fg transition-all duration-200 " +
 "hover:border-white/25 hover:bg-surface-2 active:scale-[0.985] disabled:opacity-50";

export const buttonGhost =
 "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted " +
 "transition hover:bg-surface-2 hover:text-fg disabled:opacity-50";

export const buttonDanger =
 "inline-flex items-center justify-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 " +
 "text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:opacity-50";

export const buttonIcon =
 "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted shadow-soft " +
 "transition hover:-translate-y-0.5 hover:border-accent/35 hover:text-accent hover:shadow-soft active:translate-y-0";

export const chipClass =
 "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted " +
 "transition hover:border-accent/35 hover:text-accent";

export const linkClass =
 "font-semibold text-accent underline decoration-accent/30 underline-offset-2 transition hover:decoration-accent";
