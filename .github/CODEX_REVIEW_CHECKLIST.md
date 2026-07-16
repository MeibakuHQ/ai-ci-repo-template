# Codex / AI review checklist

## Prompt

```text
Review this PR for bugs, regressions, missing tests, architecture violations,
and safety risks. Findings first; do not summarize first. Reference files and
lines. Treat non-actionable observations separately from required fixes.
```

## Required areas

- Correctness: state transitions, auth, null handling, idempotency
- Tests: unit / architecture / smoke for changed behavior
- Architecture: documented ownership boundaries and layer rules
- Security: no secrets, no overbroad roles, no unauthenticated writes
- Operations: CI parity, migration safety, observability

## Merge criteria

- Automated checks green (Architecture, Lint, Security, Build and test)
- Actionable AI findings fixed
- Non-actionable findings documented in the PR
- PR template checklist complete
