# UI Audit — Compact Corporate Panel Pass

Date: 2026-10-26<br>
Scope: every user-facing page (`/`, `/pricing`, `/login`, `/register`, `/dashboard`,
`/search`, `/vault`, `/removal`, `/settings`, authenticated navigation, shared UI kit).

## Goal

Keep the premium AMOLED-black identity, but remove the "tiny AI dashboard" feel:

- No 10–11 px labels in user-facing panels.
- Compact, readable status and count displays.
- Corporate structure: clear hierarchy, quiet borders, restrained accent.
- No unnecessary pills, neon glow, or decorative full-caps text.
- Every result must show what was checked and why it can or cannot be trusted.

## What was wrong

| Area | Finding | Impact |
| --- | --- | --- |
| Dashboard result count | A lone `0` badge looked like a broken test state | Users could not tell "no accounts found" from "not checked" |
| Status chips | Mix of `rounded-full` pills, arbitrary colors, and 10–11 px text | Felt like a prototype, not a product |
| Page headers | Eyebrow was a rounded pill | Added visual noise without information |
| Card descriptions | 12 px body copy under 16 px titles | Weak hierarchy and poor readability |
| Search confidence | `72/100` in monospace next to a 4 px bar | Hard to parse quickly |
| Search coverage | "Blocked", "manual", and hidden results looked similar | Made evidence quality ambiguous |
| Landing copy | `text-slate-600` on black and a light shadow | Low contrast and an off-theme glow |
| Pricing | Pro promised monitoring/removal drafts that do not exist; currency and monthly prices implied a checkout that did not exist | Trust and consumer-protection problem |
| Support / source | No visible GitHub or payment-contact path | Users could not find source, support, or a way to arrange paid hosting |
| Vault controls | Teal checkbox accent and small notices | Off-brand and hard to read |

## Design rules applied

1. **Type scale**
   - 12 px (`text-xs`) is the minimum for metadata and badges.
   - 14 px (`text-sm`) is the default for body copy, form help, notices, and table meta.
   - 16–18 px for panel titles; 24–30 px for page titles.
2. **Shape**
   - Outer cards: `rounded-2xl` (premium surface).
   - Inner controls, badges, notices: `rounded-md`/`rounded-lg`.
   - Full pills are reserved for dots and progress bars only.
3. **Color**
   - Neutral monochrome for structure.
   - Accent reserved for primary CTA and selected state.
   - Semantic colors only for success/warn/danger.
   - No glow; shadows are nearly invisible and only on elevated controls.
4. **Status language**
   - Every status has a label plus a dot, not color alone.
   - Found counts read `None` or `N found`.
   - Hidden results read `Locked` and link to `/pricing`.
   - Blocked is never presented as absent.
5. **Claims**
   - Roadmap features are labeled `Planned`.
   - Pricing lists only current entitlements as included.
   - Sample/preview values are labeled as samples.

## Key changes

- `src/components/ui.tsx`
  - `Badge` and `StatusBadge` are compact `rounded-md` chips with a status dot.
  - `PageHeader` eyebrow is plain text, not a pill.
  - `CardHeader` description is 14 px.
  - `InfoNote` is 14 px with more comfortable padding.
  - `chipClass` is `rounded-md`; icon buttons use the soft shadow token.
- `src/components/search-workspace.tsx`
  - Confidence is a labeled bar with a 14 px percentage.
  - Coverage outcomes expose `Open`/`Preview` only for visible results; hidden results
    show `Unlock with Pro`.
  - Search-type buttons and recent-scan rows are 14 px.
  - Ownership warning is 14 px.
- `src/app/(app)/dashboard/page.tsx`
  - Found count reads `None` or `18 found`.
  - Removed the redundant `Activity` pill.
- `src/components/support-cta.tsx`
  - Added a compact GitHub icon, support button, footer text link, and a callout with a
    plain-language payment/support explanation.
  - All external links open in a new tab with `noopener noreferrer`.
- `src/app/page.tsx`
  - Replaced low-contrast slate copy with `text-muted`.
  - Removed the light card shadow.
  - Added the free/open-source badge and GitHub support/payment callout.
  - Removed hard-coded currency from the Free and Pro cards; Pro is now `Contact`.
- `src/components/vault-workspace.tsx`
  - White checkbox accent, `rounded-lg` feedback, larger notices and labels.
- `src/app/pricing/page.tsx`
  - Repositioned as free and open source, MIT licensed.
  - Pro / Hosted is contact-only via GitHub; no price, checkout, or card form.
  - Pro card separates current entitlements from `Planned` features.
  - Table distinguishes JSON account export (available) from search-result export,
    monitoring, and removal drafts (planned).
- `src/components/platform-picker.tsx`
  - Pro lock badge is compact and uses a 12 px lock icon.

## Remaining visual TODOs

- Run an automated accessibility pass (axe/Lighthouse) on all routes and fix focus order,
  labels, and contrast findings.
- Add a 390 px and 768 px visual-regression pass for tables, filters, and the remove-guide
  detail panel.
- Decide whether table metadata should move from 12 px to 13–14 px on large screens.
- Add empty, loading, and error states for every panel; some tables still rely on a single
  generic empty state.
- Add a real Open Graph image, favicon set, and social preview metadata at launch.
- Review the GitHub/payment CTA wording after the legal and paid-support policy are written.
- Replace the current generic 404 page with branded navigation.
- Revisit the remove-guide difficulty dots after a content/legal review; they currently use
  a neutral dot for "medium" to avoid off-brand blue.
- Keep `text-xs` for true metadata only (timestamps, platform domains, IDs). Do not use it
  for sentences or instructions.
