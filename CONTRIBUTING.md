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
3. If you changed root scripts/workspaces, run `docs:facts:generate` and commit `docs/governance/generated-facts.md`.
4. Run architecture + lint + security locally; copied products must also pass `adoption:verify`.
5. Push and open PR into `staging` (`npm run pr:create` / `pnpm pr:create`).
6. Promote with `pr:promote` when ready.

### npm

```bash
npm run docs:facts:check
npm run test:architecture
npm run ci:lint
npm run ci:security
npm run pr:create -- --title "feat(scope): ..."
```

### pnpm

```bash
pnpm docs:facts:check
pnpm test:architecture
pnpm ci:lint
pnpm ci:security
pnpm pr:create -- --title "feat(scope): ..."
```

## Touched TSDoc (when TypeScript is in the repo)

Add `typescript` as a root/devDependency, then:

```bash
npm run test:touched-tsdoc -- --base origin/staging
```

New/changed exported declarations in the PR diff need a short non-empty TSDoc/JSDoc (see `AGENTS.md`).

## Light governance

See [`docs/governance/README.md`](docs/governance/README.md). Agents must not hand-edit
`facts:start` / `facts:end` sections or weaken CI gates to force a green build.

## Production / ops

1. `npm run dev:doctor`
2. `npm run onboarding:verify`
3. Replace `YOUR_ORG` artifact repos in `docs/operations/deployment-config.json`
4. Promote with `release.yml` → deploy with `deploy.yml` (digests only)
5. Keep capability register honest (`npm run deployment:capability:audit`)

Runbooks: [`docs/operations/deployment.md`](docs/operations/deployment.md),
[`docs/operations/continuity.md`](docs/operations/continuity.md).

## Required CI checks (job names must match rulesets)

| Job name | Typical command |
| --- | --- |
| Architecture invariants | `test:architecture` |
| Lint and typecheck | `ci:lint` |
| Security gates | `ci:security` |
| Build and test | `ci:build` (+ `ci:test` if present) |

Both **staging** and **main** require Architecture, Lint, Security, and Build. **main** also requires a current-head approval and resolved review threads. Greptile is opt-in through `rulesets:apply --with-greptile`.

## Code review

| When | Tool |
| --- | --- |
| Local architecture | Cursor skills under `.cursor/skills/` |
| Feature PR → `staging` | AI review (Codex/Greptile) + required CI |
| Promotion → `main` | Release-risk review + required CI |

## Secrets

Never commit `.env*`, signing keys, or service-role credentials. CI runs `scripts/ci/secret-scan.mjs`.
