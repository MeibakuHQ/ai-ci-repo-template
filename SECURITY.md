# Security

## Reporting a vulnerability

Open a private [GitHub Security Advisory](https://docs.github.com/en/code-security/security-advisories) on this repository with steps to reproduce. Do not file public issues for secrets or exploitable flaws.

## What this template provides

- `scripts/ci/secret-scan.mjs` — scans tracked text for common secret patterns
- `scripts/ci/audit-critical.mjs` — critical dependency audit for **pnpm** apps (tolerates npm registry 410 on the legacy audit API)
- GitHub rulesets that require PRs + status checks on `staging` / `main`

Replace placeholders (`YOUR_ORG`, signing keys, service roles) before going to production. Never commit `.env*` or private keys.
