import type { ReactNode } from "react";
import { GITHUB_URL, GITHUB_HANDLE, SUPPORT_LABEL } from "@/lib/site";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

export function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.55v-2.13c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.72 1.26 3.38.97.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.75.81 1.2 1.84 1.2 3.1 0 4.43-2.71 5.4-5.29 5.69.42.36.79 1.07.79 2.15v3.19c0 .31.21.66.8.55A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

export function GitHubButton({
  label = SUPPORT_LABEL,
  className = "",
  variant = "secondary",
}: {
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${variant === "primary" ? buttonPrimary : buttonSecondary} ${className}`}
    >
      <GitHubIcon />
      {label}
    </a>
  );
}

export function GitHubCallout({
  title = "Free and open source",
  children,
  buttonLabel = SUPPORT_LABEL,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  buttonLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg">
          <GitHubIcon size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          <div className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{children}</div>
        </div>
      </div>
      <GitHubButton label={buttonLabel} className="shrink-0" />
    </div>
  );
}

export function GitHubTextLink({
  className = "",
  children = "GitHub",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open github.com/${GITHUB_HANDLE} in a new tab`}
    >
      {children}
    </a>
  );
}
