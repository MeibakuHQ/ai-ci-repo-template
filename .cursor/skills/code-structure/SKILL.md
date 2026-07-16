---
name: code-structure
description: >-
  Place code in the correct workspace layer (apps vs packages vs data/API).
  Use when deciding layer placement, extracting duplicates, or refactoring
  across apps and shared packages.
---

# Code structure

## Layer model

| Layer | Path pattern | May depend on |
| --- | --- | --- |
| Shared domain | `packages/*` | nothing in `apps/` |
| Apps | `apps/*` | shared packages via package name only |
| Data / edge | `backend/`, `services/`, etc. | DB, edge runtime |

## Rules

1. **Import domain only via package names** — no relative deep-imports into `packages/` from apps.
2. **No app → app imports** — shared packages are the only cross-app surface.
3. **Secrets and signing keys** — server / edge only; never ship private keys to clients.
4. **UI privacy** — keep sensitive domains (billing, admin, privileged data) out of surfaces that must not show them.

## Where new code goes

Customize for your monorepo:

- Domain types / pure rules → `packages/<shared>/`
- App UI / orchestration → `apps/<name>/`
- Schema / RLS / edge → `backend/` or your data layer
