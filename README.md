# AI + CI repo template

[![CI](https://github.com/MeibakuHQ/ai-ci-repo-template/actions/workflows/ci.yml/badge.svg)](https://github.com/MeibakuHQ/ai-ci-repo-template/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Use this template](https://img.shields.io/badge/GitHub-Use_this_template-2ea44f?logo=github)](https://github.com/MeibakuHQ/ai-ci-repo-template/generate)

Public scaffold for **agent-ready monorepos**: Cursor/`AGENTS.md` skills, conventional commits, GitHub Actions gates, rulesets (`feature/*` → `staging` → `main`), Greptile stubs, and secret scanning — without husky/commitlint.

Patterns distilled from production MeibakuHQ monorepos — generic enough for any product team.

## Quick start

1. Click **Use this template** → create your repo (or clone and copy files into an existing project).
2. Replace `YOUR_ORG`, `YOUR_REPO`, `YOUR_TEAM`, and product names.
3. Merge the **npm** or **pnpm** block from [`package.json.snippet`](package.json.snippet) into your root `package.json`.
4. Keep CI job **`name:`** strings exact; wire install steps to your package manager (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
5. Push `main` + `staging`, then apply rulesets:

   ```bash
   npm run rulesets:apply -- YOUR_ORG/YOUR_REPO
   # or: gh api -X POST repos/YOUR_ORG/YOUR_REPO/rulesets --input .github/rulesets/staging.json
   gh repo edit YOUR_ORG/YOUR_REPO --default-branch staging
   ```

6. Set default PR base to `staging`; install Greptile on the org when ready.

## What’s included

| Path | Role |
| --- | --- |
| `AGENTS.md` | Agent entrypoint (skills + docstring policy) |
| `CONTRIBUTING.md` | Branching, CI parity, conventional commits |
| `.cursor/skills/` | Layer placement, architecture review, opensrc |
| `docs/governance/` | Authority-map, invariants, docs-facts, drills |
| `docs/operations/` | Deploy/continuity registers + runbooks |
| `docs/CONTEXT.md` / `docs/adr/` | Glossary + ADR stubs |
| `packages/deployment` | Fail-closed deploy contracts (digests, state machine) |
| `packages/governance` | Continuity assessment + register validators |
| `.github/workflows/ci.yml` | Node 24 CI — npm default, pnpm documented |
| `.github/workflows/{release,deploy,rollback,developer-onboarding}.yml` | Manual promote/deploy/rollback + onboarding |
| `.github/pull_request_template.md` | Feature → staging checklist |
| `.github/PULL_REQUEST_TEMPLATE/promotion.md` | staging → main promotion |
| `.github/ISSUE_TEMPLATE/developer-takeover-drill.yml` | Continuity drill form (no secrets) |
| `.github/CODEOWNERS` | Team ownership placeholder |
| `.github/rulesets/*.json` | GitHub Rulesets API–shaped JSON |
| `.github/branch-protection.md` | Operator checklist |
| `.greptile/` | AI review config stubs |
| `deploy/app/compose.production.yml` | Placeholder compose (digest pins) |
| `scripts/ci/secret-scan.mjs` | Dependency-free secret scanner |
| `scripts/ci/audit-critical.mjs` | pnpm critical audit (tolerates registry 410) |
| `scripts/ci/check-touched-tsdoc.mjs` | PR-diff TSDoc gate (needs `typescript` in product repos) |
| `scripts/ci/evaluate-artifact-gate.mjs` | Architecture + capability aggregator |
| `scripts/governance/docs-facts.mjs` | Generate/check workspace + command catalogs |
| `scripts/deploy/*` / `scripts/release/*` / `scripts/operations/*` | Deploy/ops stubs |
| `scripts/dev/doctor.mjs` / `onboarding-verify.mjs` | Clean-machine readiness |
| `scripts/opensrc-*.mjs` | Optional OpenSRC helpers (soft-skip) |
| `scripts/gh-ruleset-apply.mjs` | Apply staging + main rulesets via `gh` |
| `scripts/gh-pr-*.mjs` | PR helpers (`pr:create` / `pr:promote`) |
| `package.json.snippet` | Scripts / engines for npm **and** pnpm |
| `tests/architecture/` | Architecture gate + docs inventory sync |
| `SECURITY.md` | Vulnerability reporting |

## Branching model

```text
feature/* | fix/* | chore/*  →  staging  →  main
```

- Default PR base: `staging`
- Promote with `promotion.md` (`staging` → `main`)
- Hotfix: PR to `main`, then back-merge into `staging`
- After rulesets are **active**, do not push directly to `staging`/`main`

## CI job names (must match rulesets)

| Job name | Typical script |
| --- | --- |
| Architecture invariants | `test:architecture` |
| Lint and typecheck | `ci:lint` |
| Security gates | `ci:security` |
| Build and test | `ci:build` (+ optional `ci:test`) |

Staging usually requires **Architecture** + **Build**. Main adds ≥1 approval (and Greptile when enabled).

## Touched TSDoc (product repos)

Wire `test:touched-tsdoc` after adding `typescript` as a root/devDependency. CI comment block in [`ci.yml`](.github/workflows/ci.yml) shows an optional job; do **not** rename the four required job `name:` strings. Locally:

```bash
npm run test:touched-tsdoc -- --base origin/staging
```

## Light governance / docs-facts

[`docs/governance/`](docs/governance/) names authorities in `authority-map.json`. After changing root `package.json` scripts or workspaces:

```bash
npm run docs:facts:generate
npm run docs:facts:check   # also runs inside test:architecture
```

Do not hand-edit `facts:start` / `facts:end` sections.

## Production / ops ladder

```bash
npm run dev:doctor
npm run onboarding:verify
npm run deployment:capability:audit
npm run ci:artifact-gate
# Manual workflows: release.yml → deploy.yml → rollback.yml
```

See [`docs/operations/deployment.md`](docs/operations/deployment.md). Digests only; optional deploy checks stay out of required rulesets until real targets exist.

## Hard-won tips (from production use)

1. **pnpm + `packageManager`:** Do **not** set `version:` on `pnpm/action-setup` when `package.json` already has `"packageManager": "pnpm@…"`. The action fails with “Multiple versions of pnpm specified.”
2. **Apply rulesets last:** Activate rulesets only after the first push of `main`/`staging`, or you’ll need a feature-branch PR to land follow-ups.
3. **pnpm audit 410:** The legacy npm audit API may return 410. Use `scripts/ci/audit-critical.mjs` so secret-scan stays the hard gate while advisories are soft-skipped.
4. **Job names are contracts:** Ruleset `context` strings must match workflow `name:` fields character-for-character.
5. **Don’t nest this template inside a product git tree** as a subfolder you commit — use “Use this template” or copy files once.

## Intentionally omitted

- Husky / lefthook / commitlint
- Product domain architecture tests (extend `tests/architecture/`)
- Live institutional continuity evidence / Keycloak / clinical adapters
- Project-board PAT automation; forcing deploy jobs onto default rulesets
- Org-wide Greptile install (manual org step)

## Validate this repo locally

```bash
npm run docs:facts:generate
npm run test:architecture
npm run deployment:capability:audit
npm run ci:artifact-gate
npm run onboarding:verify
npm run ci:lint
npm run ci:security
```

## License

[MIT](LICENSE) © MeibakuHQ
