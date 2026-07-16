# Contributing

## Branching model

```text
feature/* | fix/* | chore/*  →  staging  →  main (production)
```

| Branch | Role |
| --- | --- |
| `feature/*`, `fix/*`, `chore/*` | Short-lived work branches |
| `staging` | Integration; **default PR target** |
| `main` | Production-ready releases only |

Promotion: open `staging` → `main` when release exit criteria pass.
Hotfix: branch from `main`, PR to `main`, then back-merge into `staging`.

Repo settings: [`.github/branch-protection.md`](.github/branch-protection.md).

## Conventional commits

```text
feat(scope): …
fix(scope): …
chore(scope): …
docs: …
test: …
```

No husky/commitlint required — CI and review enforce quality.

## Development workflow

1. `git fetch origin && git checkout -b feature/name origin/staging`
2. Change the relevant workspace.
3. Run architecture + lint + security locally (see package manager below).
4. Push and open PR into `staging` (`npm run pr:create` / `pnpm pr:create`).
5. Promote with `pr:promote` when ready.

### npm

```bash
npm run test:architecture
npm run ci:lint
npm run ci:security
npm run pr:create -- --title "feat(scope): ..."
```

### pnpm

```bash
pnpm test:architecture
pnpm ci:lint
pnpm ci:security
pnpm pr:create -- --title "feat(scope): ..."
```

## Required CI checks (job names must match rulesets)

| Job name | Typical command |
| --- | --- |
| Architecture invariants | `test:architecture` |
| Lint and typecheck | `ci:lint` |
| Security gates | `ci:security` |
| Build and test | `ci:build` (+ `ci:test` if present) |

Live **staging** often requires Architecture + Build only. **main** typically adds ≥1 approval and optionally Greptile Review.

## Code review

| When | Tool |
| --- | --- |
| Local architecture | Cursor skills under `.cursor/skills/` |
| Feature PR → `staging` | AI review (Codex/Greptile) + required CI |
| Promotion → `main` | Release-risk review + required CI |

## Secrets

Never commit `.env*`, signing keys, or service-role credentials. CI runs `scripts/ci/secret-scan.mjs`.
