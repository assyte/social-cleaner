import Link from "next/link";

/**
 * "Temiz" — the Social Cleaner mascot.
 *
 * A friendly teal digital-cleaning companion: shield-shaped body, magnifier and
 * a sparkle. Kept as inline SVG so it stays crisp, theme-independent and needs
 * no external image request.
 */
export function MascotMark({ size = 36, className = "" }: { size?: number; className?: string }) {
 return (
 <svg
 width={size}
 height={size}
 viewBox="0 0 64 64"
 role="img"
 aria-label="Social Cleaner mascot"
 className={className}
 >
 <defs>
 <linearGradient id="sc-mascot-body" x1="12" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
 <stop stopColor="#2dd4bf" />
 <stop offset="1" stopColor="#525252" />
 </linearGradient>
 <linearGradient id="sc-mascot-glass" x1="44" y1="38" x2="58" y2="56" gradientUnits="userSpaceOnUse">
 <stop stopColor="#ffffff" />
 <stop offset="1" stopColor="#ccfbf1" />
 </linearGradient>
 </defs>

 <path
 d="M32 4.5c-6.2 0-10.4 3.1-14.2 6.1C14 13.7 11 17 11 23.5v10.8c0 9.4 6.4 16.4 14.1 21.1 2.2 1.3 4.6 2.6 6.9 4.1 2.3-1.5 4.7-2.8 6.9-4.1C46.6 50.7 53 43.7 53 34.3V23.5c0-6.5-3-9.8-6.8-12.9C42.4 7.6 38.2 4.5 32 4.5Z"
 fill="url(#sc-mascot-body)"
 />
 <path
 d="M32 9.5c-4.9 0-8.2 2.4-11.7 5.3-3 2.5-5 4.6-5 8.7v10.8c0 7.4 5.2 13.3 11.9 17.4 1.7 1 3.3 2 4.8 3 1.5-1 3.1-2 4.8-3 6.7-4.1 11.9-10 11.9-17.4V23.5c0-4.1-2-6.2-5-8.7C40.2 11.9 36.9 9.5 32 9.5Z"
 fill="#f0fdfa"
 opacity="0.22"
 />

 <rect x="18.5" y="22" width="27" height="18.5" rx="8.5" fill="#f0fdfa" />
 <circle cx="26.5" cy="31" r="2.1" fill="#0f172a" />
 <circle cx="37.5" cy="31" r="2.1" fill="#0f172a" />
 <path d="M27.5 36.4c1.3 1.5 2.8 2.2 4.5 2.2s3.2-.7 4.5-2.2" stroke="#525252" strokeWidth="2" strokeLinecap="round" fill="none" />
 <circle cx="22.4" cy="35.4" r="2.2" fill="#fbbf24" opacity="0.45" />
 <circle cx="41.6" cy="35.4" r="2.2" fill="#fbbf24" opacity="0.45" />

 <circle cx="48.5" cy="44.5" r="7.2" fill="url(#sc-mascot-glass)" stroke="#525252" strokeWidth="2.6" />
 <path d="M53.8 49.8 58.2 54.2" stroke="#525252" strokeWidth="3.2" strokeLinecap="round" />
 <path d="M45.6 44.6l1.8 1.9 3.4-3.7" stroke="#525252" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />

 <path d="M50 12.5l1.3 3.2 3.2 1.3-3.2 1.3L50 21.5l-1.3-3.2-3.2-1.3 3.2-1.3L50 12.5Z" fill="#f59e0b" />
 <circle cx="32" cy="5.2" r="2.1" fill="#f59e0b" />
 <path d="M32 7v4.5" stroke="#525252" strokeWidth="2.4" strokeLinecap="round" />
 </svg>
 );
}

export function BrandLogo({
 href = "/",
 size = 36,
 subtitle = "digital footprint",
 compact = false,
}: {
 href?: string;
 size?: number;
 subtitle?: string | null;
 compact?: boolean;
}) {
 return (
 <Link href={href} className="group flex items-center gap-2.5" aria-label="Social Cleaner home">
 <span className="transition-transform duration-200 group-hover:-rotate-3">
 <img src="/logo.png" alt="Social Cleaner" width={size} height={size} className="h-9 w-9 rounded-xl object-contain" />
 </span>
 <span className="leading-tight">
 <span className={`block font-semibold tracking-tight text-fg ${compact ? "text-sm" : "text-[15px]"}`}>
 Social Cleaner
 </span>
 {subtitle ? (
 <span className="block text-xs font-medium text-muted">{subtitle}</span>
 ) : null}
 </span>
 </Link>
 );
}
