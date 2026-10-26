# Contributing

Thanks for helping improve Social Cleaner. The project is free and open source under the
MIT License. By contributing, you agree that your contribution is licensed under the same
terms.

## Before you start

- Read the honesty and privacy rules in [README.md](README.md) and the launch limits in
  [docs/LAUNCH-READINESS.md](docs/LAUNCH-READINESS.md).
- Use synthetic test data. Do not commit real names, emails, phone numbers, profile URLs,
  database files, cookies, API keys, or `SC_MASTER_KEY`.
- Never add scraping of login-gated pages, CAPTCHAs, private data, or stolen data.
- Do not add coverage claims that the implementation does not support. A blocked page is
  never evidence of absence.

## Local setup

Requires Node.js **22.12+** and npm.

```bash
npm install
npm run setup        # creates .env.local with a random SC_MASTER_KEY
npm run db:migrate
npm run dev
```

Run the full gate before opening a pull request:

```bash
npm run verify       # typecheck + tests + production build
npm audit --audit-level=high
```

## Development rules

- Keep the user-facing site in English.
- Enforce Free/Pro limits and ownership checks on the server, not only in the UI.
- Preserve the evidence model: blocked, not found, manual, and provider results are
  distinct states.
- Keep the AMOLED visual system and the 12 px minimum label size / 14 px body rules.
- Add a regression test for security fixes and plan-boundary changes.
- Prefer small, focused pull requests with a clear description and test notes.
- Do not add a dependency unless it is necessary; run the audit and explain the tradeoff.

## Pull request checklist

- [ ] `npm run verify` passes.
- [ ] `npm audit --audit-level=high` passes.
- [ ] No secrets, personal data, generated databases, or test artifacts are included.
- [ ] New user-facing copy is English and does not overclaim coverage or deletion.
- [ ] Free/Pro behavior is enforced server-side and covered by a test.
- [ ] Security-sensitive changes are described without exposing an active exploit.

## Security reports

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Code of conduct

Participation is covered by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
