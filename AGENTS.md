# YOUR_PROJECT monorepo — agent instructions

Package manager: **npm** or **pnpm** (document which in the root README). See [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Governance (read first in new sessions)

- [`docs/governance/authority-map.json`](docs/governance/authority-map.json) — single source of truth per fact family
- [`docs/governance/invariants.json`](docs/governance/invariants.json) — short enforceable rules
- [`docs/governance/ai-assistant-policy.md`](docs/governance/ai-assistant-policy.md) — advisory / read-only boundaries
- [`docs/operations/deployment.md`](docs/operations/deployment.md) + [`continuity.md`](docs/operations/continuity.md) — promote/deploy/rollback and continuity
- Do **not** edit content between `facts:start` / `facts:end` markers; change the authority, then run `npm run docs:facts:generate`
- Do not weaken architecture, security, deployment capability, or CI gates to make a build pass
- Digests only for releases — never mutable image tags
- Copied products must pass `adoption:verify`; do not use the template-only bypass outside this canonical repository
- A deploy or rollback cannot succeed without a validated immutable release manifest, configured adapter, and durable evidence

## Architecture skills

- **Layer placement:** [`.cursor/skills/code-structure/SKILL.md`](.cursor/skills/code-structure/SKILL.md)
- **Depth / refactoring reviews:** [`.cursor/skills/architecture-review/SKILL.md`](.cursor/skills/architecture-review/SKILL.md)
- **Small dependency source:** [`.cursor/skills/opensrc/SKILL.md`](.cursor/skills/opensrc/SKILL.md)
- **Domain glossary:** [`docs/CONTEXT.md`](docs/CONTEXT.md)
- **ADRs:** [`docs/adr/README.md`](docs/adr/README.md)

## Workspace map

| Path | Role |
| --- | --- |
| `apps/<name>` | Deployable apps (web, mobile, API, …) |
| `packages/<name>` | Shared libraries — the only cross-app domain import surface |
| `packages/deployment` | Fail-closed deploy contracts (digests, state machine) |
| `packages/governance` | Continuity assessment + register validators |
| `backend/` (or your data layer) | Schema, RLS, edge/API (if applicable) |

Replace this table with your real layout.

## Domain invariants

List product rules agents must not violate (auth model, PII boundaries, environment boundaries). Keep them short and testable via `tests/architecture/`. Seed examples live in [`docs/governance/invariants.json`](docs/governance/invariants.json).

Classify the four reusable safeguards in [`docs/governance/invariant-profiles.json`](docs/governance/invariant-profiles.json): tenant propagation, durable acknowledgement, single source of truth, and external authority. Mark each `enforced` with real test paths or `not-applicable` with an owner and lasting rationale.

## Documentation comments on touched files

When adding or changing code, agents (Codex, Cursor, Claude, or other AI tools)
must read the touched files and add concise docstrings/comments where they help
future maintenance: intent, invariants, privacy/safety boundaries, data ownership,
fallbacks, or non-obvious control flow. Do **not** add noisy comments that merely
repeat the code.

Prefer short TSDoc/JSDoc above exported functions, classes, types, interfaces, and
function-like consts when purpose is not obvious from the name. Preserve useful
existing comments; do not edit generated files.

Product repos: wire `npm run test:touched-tsdoc -- --base origin/<target>` (requires
`typescript`) so CI enforces this on PR diffs.

## Architecture gates

Cross-workspace invariants live in `tests/architecture/` plus `packages/*/tests`.
CI runs `test:architecture` before build (includes `docs:facts:check`). Keep agent
docs and Greptile rules aligned with those tests.

## Local commands

```bash
# npm
npm run dev:doctor
npm run onboarding:verify
npm run adoption:verify
npm run test:architecture
npm run deployment:capability:audit
npm run docs:facts:generate
npm run ci:lint
npm run ci:security

# pnpm
pnpm dev:doctor
pnpm onboarding:verify
pnpm adoption:verify
pnpm test:architecture
pnpm deployment:capability:audit
pnpm docs:facts:generate
pnpm ci:lint
pnpm ci:security
```
