"use client";

import { useId, useState, type ReactNode } from "react";

function Chevron({ open }: { open: boolean }) {
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
 aria-hidden="true"
 className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
 >
 <path d="m6 9 6 6 6-6" />
 </svg>
 );
}

export function Collapsible({
 title,
 description,
 badge,
 defaultOpen = false,
 children,
 className = "",
}: {
 title: string;
 description?: string;
 badge?: ReactNode;
 defaultOpen?: boolean;
 children: ReactNode;
 className?: string;
}) {
 const [open, setOpen] = useState(defaultOpen);
 const panelId = useId();

 return (
 <section
 className={`overflow-hidden rounded-2xl border border-line/90 bg-surface shadow-soft ${className}`}
 >
 <button
 type="button"
 onClick={() => setOpen((value) => !value)}
 aria-expanded={open}
 aria-controls={panelId}
 className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/45 sm:px-5"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2/70 text-muted">
 <svg
 width="17"
 height="17"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="1.9"
 strokeLinecap="round"
 strokeLinejoin="round"
 aria-hidden="true"
 >
 <path d="M4 7h16M4 12h10M4 17h7" />
 <circle cx="18" cy="16" r="2.4" />
 <path d="m20 18 1.5 1.5" />
 </svg>
 </span>
 <span className="min-w-0 flex-1">
 <span className="flex flex-wrap items-center gap-2">
 <span className="text-sm font-bold tracking-tight text-fg">{title}</span>
 {badge}
 </span>
 {description ? (
 <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
 ) : null}
 </span>
 <span className="text-muted">
 <Chevron open={open} />
 </span>
 </button>

 <div
 id={panelId}
 className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
 open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
 }`}
 >
 <div className="overflow-hidden">
 <div className="border-t border-line/80 px-4 py-4 sm:px-5">{children}</div>
 </div>
 </div>
 </section>
 );
}
