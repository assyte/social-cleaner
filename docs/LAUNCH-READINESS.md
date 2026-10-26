# Release Readiness — Source Publication and Hosted Launch

Date: 2026-10-26<br>
Product: Social Cleaner<br>
Audit type: manual full-site product, security, compliance, and visual review<br>
Verdict: **the GitHub source repository is public at
<https://github.com/assyte/social-cleaner>. The initial commit is pushed, CI is green,
`main` is protected, and CodeQL, Dependabot, secret scanning, push protection, and private
vulnerability reporting are enabled. A hosted public launch is not ready; it remains blocked
by legal pages, transactional email, production infrastructure, and a real search-provider
key. Automated billing is intentionally out of scope for the free release; paid
hosting/support is manual via GitHub.**

## 1. Executive summary

Social Cleaner now has a coherent English product surface, a credible evidence model, a
working encrypted vault, real public-profile checks, a 115-platform Remove Guide, and
server-side Free/Pro enforcement. The AMOLED design remains premium, but small panels are
now compact and readable rather than decorative.

The remaining gaps are not "polish." **Source publication is complete:** the repository is
public, the initial commit is pushed, CI is green, the default branch is protected, and
security automation is enabled. For a **hosted public launch**, the gaps are launch
infrastructure and trust obligations: transactional email, legal terms/privacy, production
deployment, backups, a scheduled retention job, and a real search-provider key. The product is
free and open source under the MIT License, with paid hosting/support arranged manually through
GitHub. That removes automated billing from the free-launch critical path, but it does not
remove the need for a clear payment/support policy, invoices, and tax handling once money
changes hands.

### Readiness scorecard

| Area | State | Verdict |
| --- | --- | --- |
| Core username search + evidence | Working, tested | Ready for beta |
| Identity Vault + ownership flow | Working, tested | Ready for beta |
| Free/Pro plan enforcement | Working server-side | Ready technically; manual upgrade path |
| Billing and subscriptions | Manual via GitHub; no checkout | Intentional; not a free-launch blocker |
| License and distribution | MIT `LICENSE` added | Ready for open-source release |
| Dependency hygiene | Next.js 16.4.3, Vitest 5.0.5; `npm audit` reports 0 known vulnerabilities | Ready for release gate |
| Legal pages, privacy notice, DPA | Not present | **Blocker** |
| Email verification / password reset | Not implemented | **Blocker** |
| Production database, backups, retention schedule | Local SQLite only; retention script exists | **Blocker** |
| Search provider coverage | Missing key; default `mock` returns 503 | **Blocker for name/email/phone** |
| Source control and CI | Public GitHub repository; green CI; protected `main`; CodeQL, Dependabot, secret scanning, push protection, private vulnerability reporting | Ready for source release |
| Security automation | CI audit, CodeQL, Dependabot, secret scanning, push protection, private vulnerability reporting | Ready for source release |
| Monitoring, alerting, support | GitHub-only support; no monitoring/alerting/SLA | High |
| SEO / Open Graph / sitemap | Intentionally noindex; no assets | High |
| Accessibility and mobile regression | Manual smoke only | High |
| Remove Guide content review | 115 guides, not legally reviewed | High |
| Visual system | Compact corporate pass complete | Ready for beta |

## 2. What changed in this pass

### Product and security fixes

- **Closed the Free/Pro result leak.** `outcomes` previously included hidden profile URLs and
  titles even when `results` was trimmed to five. Hidden outcomes are now sanitized:
  `hidden: true`, no profile URL, no title, no confidence, no evidence marker beyond
  `plan_limit`. The UI shows a Pro lock instead of `Open`/`Preview`.
  Files: `src/server/search/service.ts`, `src/components/search-workspace.tsx`,
  `tests/search.test.ts`.
- **Fixed logout cookie handling.** Logout clears auth cookies even when a stale CSRF token
  prevents the server-side revoke, and production-cleared cookies now include `Secure`.
  File: `src/server/api/auth-handlers.ts`, `src/server/auth/cookies.ts`.
- **Keyed pseudonymous hashes.** IP and user-agent fingerprints now use HMAC-SHA256 with the
  master key instead of unkeyed SHA-256.
- **Capped checker response bodies.** Direct platform checks read at most 2 MB, preventing one
  oversized page from exhausting worker memory. File: `src/server/search/checker.ts`.
- **Completed account export.** JSON export now includes search runs, encrypted queries
  decrypted for the owner, results, evidence, and the full audit history. Schema version 2.
  File: `src/server/vault/service.ts`.
- **Added a retention sweep.** `npm run retention:sweep` removes search history outside the
  current plan window, expired/revoked sessions, stuck runs, and audit events older than 365
  days. Files: `src/server/retention/sweep.ts`, `scripts/retention.ts`.
- **Reduced provider PII leakage.** Email and phone values are no longer sent to GitHub user
  search; email lookups use Gravatar only. The Gravatar title is now English.
  File: `src/server/search/providers.ts`.
- **Removed false backup claims.** Settings and vault copy no longer claim a seven-day backup
  rotation that does not exist.
- **Corrected pricing/feature claims.** Pro now separates current entitlements from
  `Monitoring and removal drafts (planned)` and `Priority support (planned)`. The landing page
  no longer says "ongoing monitoring" as if it shipped. Pro visible results match the real
  40-platform ceiling.

### Visual system fixes

- 12 px minimum for labels; 14 px for body copy, notices, and form help.
- `Badge`/`StatusBadge` are compact `rounded-md` chips with a status dot.
- Removed the pill eyebrow from `PageHeader`.
- Search confidence is a labeled bar with a readable percentage.
- Dashboard found counts read `None` or `N found`.
- Removed the redundant `Activity` pill and off-brand teal checkbox accent.
- Replaced low-contrast `text-slate-600` and the light card shadow.
- Detail: [`docs/UI-AUDIT.md`](UI-AUDIT.md).

### Release engineering and dependency hygiene

- Upgraded Next.js from 15.5.28 to 16.4.3 and Vitest from 3.2.7 to 5.0.5. `npm audit`
  now reports **0 known vulnerabilities**.
- Migrated the CSP file convention from `src/middleware.ts` to `src/proxy.ts` for Next.js 16.
- Tests now use an isolated in-memory SQLite database. The previous on-disk test setup left
  909 `data/test-*.db*` artifacts on Windows; those were removed and no new artifacts are
  created.
- Added a Turbopack tracing opt-out for the dynamic database path so the whole repository is
  not bundled into the production output.
- Added `.github/workflows/ci.yml` (typecheck, tests, build, dependency audit),
  Dependabot, issue templates, `.editorconfig`, and `.gitattributes`.
- Added `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `docs/README.md`.
- Smoke-tested a disposable free account through registration, platform list, and
  password-confirmed deletion (201/200/204), and the Pro account through the authenticated
  app routes, export, and audit endpoints.

### Documentation

- `README.md` rewritten in English and updated for the current implementation, test count,
  retention command, and known limits.
- Added `docs/README.md` as an index and marked the older Turkish documents as historical;
  their old prices and plan claims are explicitly not current.

## 3. Findings

### Critical — must close before any public launch

| ID | Finding | Evidence | Action |
| --- | --- | --- | --- |
| C1 | **Manual payment path only; no automated billing.** `/pricing` says payment/support is arranged via GitHub and does not show a price or collect card details. Pro is switched with a local script. This is intentional for the free/open-source release but has no invoice automation, tax/VAT handling, cancellation, or refund workflow. | `src/app/pricing/page.tsx`, `src/server/billing/plans.ts`, `scripts/set-plan.ts` | Publish a short payment/support policy, scope, response target, invoice/receipt process, and refund terms before accepting money. Keep payment off-site. Add automated checkout only in Phase 3. |
| C2 | **No legal surface.** No Terms, Privacy Policy, KVKK/GDPR notice, subprocessor list, or DPA with Brave/Tavily. No legal entity or complaint contact beyond the GitHub profile. | repository root; `src/app` has no `/terms` or `/privacy` | Have counsel draft terms/privacy/KVKK-GDPR notices; publish subprocessors and retention; sign provider DPAs; add contact and complaint channels. |
| C3 | **No production deployment or recovery plan.** Local SQLite file; no managed database, backups, restore drill, or scheduled retention. The sweep script exists but is not scheduled. | `data/app.db` assumption; `src/server/db/client.ts`; `scripts/retention.ts` | Use managed Postgres/libSQL; enable encrypted backups and point-in-time recovery; schedule `retention:sweep` daily; document and test restore; separate `SC_MASTER_KEY` custody. |
| C4 | **No transactional email or account recovery.** No email verification, password reset, login notices, or support contact. | auth flows in `src/server/auth`, `src/server/api/auth-handlers.ts` | Add an email provider, verification tokens, reset tokens with single-use expiry, and security notifications. |

### Resolved in this release

- **C5 / H11 — source control, CI, and release gate.** The source is public at
  <https://github.com/assyte/social-cleaner>. The initial commit is pushed, CI is green,
  `main` requires the CI check, and CodeQL, Dependabot, secret scanning, push protection, and
  private vulnerability reporting are enabled. A hosted deploy/rollback pipeline remains part
  of Phase 1.

### High — close before public beta or immediately after

| ID | Finding | Evidence | Action |
| --- | --- | --- | --- |
| H1 | **Name/email/phone search is unavailable by default.** The repo ships with `mock`, which returns 503; no provider key is configured in the local environment. Pro shows `provider required` instead of pretending coverage. | `src/server/search/providers.ts`, `.env.example` | Add Brave/Tavily key; verify quota/cost; disclose provider processing; show provider status in the UI before the user starts. |
| H2 | **Rate limits are in-memory.** Multi-instance or serverless deployment would reset limits and allow abuse. | `src/server/auth/rate-limit.ts` | Move to Redis/DB with atomic counters and per-account + per-IP policies. |
| H3 | **Scans are synchronous and can run ~35 seconds.** No durable queue, retry, cancellation, or progress recovery. | `src/server/search/service.ts`, `checker.ts` | Add a job queue/worker, job states, retries, cancellation, and a scan detail page that survives refresh. |
| H4 | **No monitoring or alerting.** No error tracking, uptime checks, structured logs, or alert channel. | deployment absent | Add Sentry/OpenTelemetry or equivalent, uptime probes, database/storage alerts, and an on-call contact. |
| H5 | **No abuse/support operations.** Ownership is self-declared; there is no appeals, abuse, or takedown process. | `src/server/vault/service.ts` | Add terms prohibiting third-party searches, audit review, abuse contact, rate review, and suspension workflow. |
| H6 | **SEO and launch metadata are disabled.** `robots: { index: false, follow: false }`; no OG image, sitemap, or structured data. | `src/app/layout.tsx` | Prepare OG/sitemap/canonical metadata; remove noindex only at launch; submit sitemap. |
| H7 | **Search coverage is narrower than the catalogue.** 56 of 115 platforms have direct checks; the rest are manual/provider links. | `src/server/search/platforms.ts` (`PLATFORMS` 115, `DIRECT_PLATFORMS` 56) | Label coverage per platform in the picker and results; do not imply every platform is automatically verified. |
| H8 | **Encryption key lifecycle is manual.** `SC_MASTER_KEY` loss is unrecoverable; no KMS, rotation, or envelope re-wrap procedure. | `src/server/crypto/field-cipher.ts`, `.env.example` | Use a managed secret/KMS, document rotation, and test restore with the old key. |
| H9 | **Database encryption at rest is not guaranteed.** Field-level encryption protects selected columns, not the whole database file or backups. | `src/server/db/client.ts` | Use encrypted volumes/managed DB encryption and encrypted backups. |
| H10 | **Search provider PII processing needs a legal basis.** Queries and profile URLs leave the app for Brave/Tavily/GitHub/Gravatar. | `src/server/search/providers.ts` | Disclose subprocessors, data categories, retention, and opt-in; sign DPAs; avoid sending email/phone to services that do not need them. |
| H12 | **No backup/restore or incident-response drill.** | operations absent | Write runbooks for outage, data loss, key loss, provider outage, and account compromise; test quarterly. |
| H13 | **IP-based limits trust forwarding headers.** `clientIp()` reads `X-Forwarded-For` / `X-Real-IP` without a trusted-proxy setting; a direct deployment can spoof the bucket key and audit IP hash. | `src/server/http/errors.ts` | Terminate TLS at a proxy that overwrites both headers; add an explicit trusted-proxy configuration and test it. |

### Medium — should close before growth

| ID | Finding | Action |
| --- | --- | --- |
| M1 | Public pricing no longer shows a currency; paid access is manual. | Decide a billing currency, tax treatment, and invoice template before accepting paid work. |
| M2 | Pro entitlement flags for monitoring/removal drafts are now `false`; pricing labels them `Planned`. | Keep them false until the features ship; add feature flags and tests before enabling. |
| M3 | Older docs conflict with the implementation (Turkish, 56/98-test claims, light-theme references). Historical banners were added, but the files remain stale. | Translate, archive, or consolidate them into the current English docs before promoting the repository. |
| M4 | Accessibility has not been audited with axe/Lighthouse or keyboard/screen-reader testing. | Add automated and manual checks; verify focus order, labels, contrast, and error announcements. |
| M5 | Mobile regression is manual only. | Add 390/768/1280 visual checks for tables, filters, and Remove Guide detail. |
| M6 | 115 Remove Guide entries need editorial and legal review; platform flows change. | Add review dates, source links, and a quarterly freshness pass. |
| M7 | Support is GitHub-only; no status page, inbox, or response SLA. | Add a monitored support channel, status page, and response targets. |
| M8 | No privacy-friendly analytics or product telemetry. | Decide whether to use none or a privacy-first tool with consent; never add ad tech. |
| M9 | Export route and scan endpoints need explicit abuse quotas in production. | Add per-account export/search/download quotas and audit alerts. |
| M10 | No account email change flow or session management UI. | Add email change with verification and a sessions/devices list with revoke. |
| M11 | MIT license added; third-party notices and contribution rules are still thin. | Keep platform notices current; add `CONTRIBUTING.md`, a code of conduct, and a security-reporting policy. |

### Low — polish backlog

- Some true metadata remains 12 px; keep it only for timestamps, domains, and IDs.
- Add branded 404 and loading states.
- Add favicon/social preview assets.
- Review the neutral "medium" difficulty dot after content review.
- Add `aria-live` coverage to all async status panels, not only forms.
- Add empty-state copy for each vault section and each search outcome group.
- Define the paid-support scope and response target before publishing a payment contact.
- Add a public changelog and release notes.

## 4. Phased plan

### Phase 0 — Completed in this pass

- English UI and metadata.
- Compact corporate panel system.
- Free/Pro hidden-result leak closed.
- Logout cookie clearing, keyed hashes, checker body cap.
- Account export includes search history.
- Retention sweep script.
- Honest pricing/roadmap copy.
- MIT license, GitHub support/payment CTA, and free/open-source positioning.
- Current validation: typecheck, 102 tests, production build, route smoke, export, retention.

### Phase 1 — Launch blockers (target: 1–3 weeks)

1. **Manual commercial path**: publish payment/support scope, invoice/receipt process, tax
   treatment, cancellation/refund terms, and response targets. Keep card collection off-site.
   Automated checkout is Phase 3, not a free-launch blocker.
2. **Legal**: Terms, Privacy, KVKK/GDPR notice, subprocessors, DPA, company/contact, age limit,
   ownership/abuse policy.
3. **Production platform**: managed database, encrypted backups/PITR, secret manager, HTTPS,
   WAF, cron for retention, restore drill.
4. **Auth lifecycle**: email verification, reset, security notifications, session list/revoke.
5. **Provider**: Brave/Tavily key, quota/cost guard, provider status UI, DPA and disclosure.
6. **Release engineering**: completed for the source release (first commit, protected `main`,
   green CI, CodeQL, Dependabot, secret scanning, push protection, private vulnerability
   reporting). Still needed for hosted launch: staging deploy and rollback plan.
7. **Launch metadata**: OG image, sitemap, canonical URLs, remove noindex, smoke test in
   production.

### Phase 2 — Beta hardening (target: 2–4 weeks)

1. Redis/DB rate limits and durable scan queue/worker.
2. Error tracking, uptime checks, structured logs, alerts, status page.
3. Accessibility and mobile visual-regression suite.
4. Support inbox, abuse review, incident runbooks, backup restore drill.
5. Remove Guide editorial review and freshness metadata.
6. Per-platform coverage labels and clearer distinction between direct, provider, manual, and
   blocked.
7. Paid-support scope, currency, tax display, and invoice template review.

### Phase 3 — Revenue and expansion (after beta)

1. Automated billing: checkout, webhook idempotency, entitlements, invoices, tax/VAT,
   cancellation, refunds, and failed-payment handling.
2. Monitoring/rescans, removal drafts, PDF reports (only after they are genuinely shipped).
3. Provider coverage expansion and cost controls.
4. Privacy-first analytics and funnel measurement.
5. Localization and multi-currency billing.
6. Security review/pen test and formal data-processing review.
7. Optional SOC 2 readiness only if enterprise sales require it.

## 5. Launch verdict

- **Private invite-only beta:** viable after Phase 1 legal, production, auth lifecycle,
  provider, and release-engineering items, with a clear "beta / no payments" label.
- **Public free/open-source launch:** viable after Phase 1 items 1–7, including the manual
  payment/support policy. Automated billing is not required.
- **Public self-serve paid launch:** not viable until automated billing, legal, production
  infrastructure, email lifecycle, provider key, and release engineering are complete.
- **Manual paid hosting/support:** can start after the payment/support policy and legal review,
  without waiting for checkout.

Do not remove `noindex` until legal pages, production database/backups, retention schedule,
and monitoring are live.
