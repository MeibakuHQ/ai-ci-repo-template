---
name: architecture-review
description: >-
  Review changes for layer violations, privacy leaks, and domain invariant
  breakage. Use when reviewing a PR or local diff.
---

# Architecture review

When reviewing a PR or local diff:

## Checklist

1. **Tenant / scope isolation** — queries and tokens scoped correctly.
2. **Layering** — no app deep-imports into another app; shared is the only cross-cut domain package.
3. **Secrets** — no `.env`, service-role keys, or private key material in the diff.
4. **Domain invariants** — changes would not fail `test:architecture` or documented AGENTS rules.
5. **Privacy** — UI surfaces do not leak data they must not show.
6. **Resilience** (if applicable) — idempotent writes; graceful degradation when dependencies are unavailable.

## Output format

Findings first (bugs, privacy, architecture), then non-blocking nits. Cite file paths.
