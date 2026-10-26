# Security Policy

Social Cleaner handles identity data, session cookies, and an encrypted vault. Please
report security issues privately and do not include real personal data in a report.

## Supported versions

The project is pre-release. Security fixes are applied to the current default branch only;
there are no maintained release branches yet.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. If that is not available,
contact [@assyte](https://github.com/assyte) on GitHub and ask for a private channel.

Please include:

- the affected route, component, or commit;
- reproduction steps using **synthetic test data**;
- impact and any required preconditions;
- a suggested fix, if you have one.

Do **not** open a public issue for a vulnerability, and do not test against accounts,
profiles, or data that you do not own. Do not send `SC_MASTER_KEY`, database files,
session cookies, or third-party personal data.

## Scope

In scope:

- authentication, session, CSRF, and authorization bypasses;
- encryption, blind-index, export, and account-deletion flaws;
- SSRF, unsafe URL handling, CSP gaps, and unsafe rendering;
- Free/Pro enforcement bypasses or hidden-result leaks;
- accidental exposure of secrets, logs, or personal data.

Out of scope:

- findings that require a compromised device or browser extension;
- denial-of-service reports that only demonstrate expected rate limits;
- platform pages changing, blocking, or returning CAPTCHAs;
- missing features that are already documented as planned or unsupported.

## Response

This is a volunteer, pre-release project. Reports are reviewed on a best-effort basis; no
response or remediation SLA is offered. Please allow time for a fix before public
disclosure. Credit is given on request.

## Safe testing

Use a local instance, synthetic accounts, and `SC_SEARCH_PROVIDER=mock`. Never run
third-party identity searches or add real personal data to a test database.
