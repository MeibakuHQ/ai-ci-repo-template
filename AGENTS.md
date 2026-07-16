# YOUR_PROJECT monorepo — agent instructions

Package manager: **npm** or **pnpm** (document which in the root README). See [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Architecture skills

- **Layer placement:** [`.cursor/skills/code-structure/SKILL.md`](.cursor/skills/code-structure/SKILL.md)
- **Depth / refactoring reviews:** [`.cursor/skills/architecture-review/SKILL.md`](.cursor/skills/architecture-review/SKILL.md)
- **Product docs:** [`docs/`](docs/) (add your index / E2E walkthrough)

## Workspace map

| Path | Role |
| --- | --- |
| `apps/<name>` | Deployable apps (web, mobile, API, …) |
| `packages/<name>` | Shared libraries — the only cross-app domain import surface |
| `backend/` (or your data layer) | Schema, RLS, edge/API (if applicable) |

Replace this table with your real layout.

## Domain invariants

List product rules agents must not violate (auth model, PII boundaries, environment boundaries). Keep them short and testable via `tests/architecture/`.

## Documentation comments on touched files

When adding or changing code, agents (Codex, Cursor, Claude, or other AI tools)
must add concise docstrings/comments where they help future maintenance: intent,
invariants, privacy/safety boundaries, data ownership, fallbacks, or non-obvious
control flow. Do **not** add noisy comments that merely repeat the code.

Prefer short TSDoc/JSDoc above exported functions and shared types when purpose
is not obvious from the name. Preserve useful existing comments; do not edit
generated files.

## Architecture gates

Cross-workspace invariants live in `tests/architecture/`. CI runs
`test:architecture` before build. Keep agent docs and Greptile rules aligned
with those tests.

## Local commands

```bash
# npm
npm ci
npm run test:architecture
npm run ci:lint
npm run ci:security

# pnpm
pnpm install --frozen-lockfile
pnpm test:architecture
pnpm ci:lint
pnpm ci:security
```
