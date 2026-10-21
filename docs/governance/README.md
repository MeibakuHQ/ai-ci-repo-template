# Light governance (template)

This stub mirrors the **authority → projection** pattern used in production
MeibakuHQ monorepos, without product-specific registers (continuity, deploy trains).

## Files

| Path | Role |
| --- | --- |
| [`authority-map.json`](authority-map.json) | Names the single source of truth for each fact family |
| [`invariants.json`](invariants.json) | Short, testable product rules agents must not violate |
| [`generated-facts.md`](generated-facts.md) | Machine-projected catalogs (do not hand-edit marked sections) |
| [`ai-assistant-policy.md`](ai-assistant-policy.md) | Advisory / read-only assistant boundaries |
| [`invariant-profiles.json`](invariant-profiles.json) | Product classification of reusable high-risk safeguards |

## Workflow

1. Change the **authority** (usually root `package.json` workspaces/scripts).
2. Run `npm run docs:facts:generate`.
3. Commit the updated `generated-facts.md`.
4. CI runs `npm run docs:facts:check` (via `test:architecture`).

Never edit content between `<!-- facts:start … -->` and `<!-- facts:end … -->`
directly. Extend `scripts/governance/docs-facts.mjs` and the authority-map when
adding a new fact family.

## Product adoption

Replace example invariants with your domain rules and wire them to real
`tests/architecture/` checks. Classify every invariant profile as `enforced`
with existing test paths or `not-applicable` with a lasting rationale. Run
`npm run adoption:verify`; the canonical template alone may use the explicit
template self-check.
