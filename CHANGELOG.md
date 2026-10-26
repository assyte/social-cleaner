# Changelog

All notable changes to Social Cleaner are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project intends to use
[Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-10-26

Initial public source release.

### Added

- Privacy-first public footprint audit with a 115-platform catalogue and 56 direct
  public-page checks.
- Username search, evidence states (`found`, `not found`, `blocked`, `manual`), and real
  profile links without inventing accounts.
- Encrypted Identity Vault for names, aliases, contact details, links, research scope,
  ownership declarations, and variants.
- Platform-specific Remove Guide with deletion guidance for every catalogue platform.
- Free and Pro plans enforced on the server; manual `plan:set` switching and no checkout.
- Schema v2 JSON account export, password-confirmed account deletion, and retention sweep.
- English AMOLED interface with a compact corporate panel system, local fonts, and local
  platform icons.
- MIT license, font and trademark notices, contribution guide, code of conduct, security
  policy, issue templates, pull-request template, and Dependabot configuration.
- GitHub Actions CI, CodeQL analysis, secret scanning, push protection, private vulnerability
  reporting, and protected `main` branch.

### Security

- scrypt password hashing and opaque session tokens with `HttpOnly`/`Secure` cookies.
- Double-submit CSRF tokens plus same-origin checks on every mutation.
- AES-256-GCM field encryption and HMAC-SHA256 blind indexes for equality lookups.
- SSRF guard, response-size caps, timeout/redirect limits, output encoding, nonce-based CSP,
  and strict security headers.
- HMAC-hashed IP/user-agent audit fields and retention policies.

### Known limitations

- The hosted service is **not publicly launched**. A real search-provider key, legal pages,
  transactional email, production database/backups, monitoring, and a trusted proxy are still
  required. See `docs/LAUNCH-READINESS.md`.
- Name/email/phone search requires a configured provider; the default `mock` provider returns
  `503` rather than fabricated results.
- Monitoring, removal drafts, AI/visual assistance, and breach notifications are planned and
  are not sold as shipped features.
